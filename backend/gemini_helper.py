"""The Gemini call: model selection, generation config, and failure mapping.

Prompt content lives in prompt.py and corpus assembly in context.py. What
remains here is the part that talks to the API and decides what to do when it
refuses.

Failure handling turns on the SDK's structured status code rather than the text
of the message. Which codes are worth falling back on is the whole question: a
chain that treats only 503 as retryable never falls back at all, because a
retired model answers 404.
"""

from dataclasses import dataclass
from google import genai
from google.genai import errors as genai_errors
from google.genai import types
from typing import Dict, Iterable, Optional
import logging
import threading
import time

from context import Knowledge
from prompt import NO_KNOWLEDGE_MESSAGE, build_contents, build_system_instruction

logger = logging.getLogger(__name__)

# Fallback models in order of preference. The "-latest" aliases track the
# current generation, so a retirement upstream does not take chat down the way a
# pinned name would; the pinned entry in the middle is the escape hatch if an
# alias itself starts misbehaving.
MODELS = (
    "gemini-flash-latest",
    "gemini-3.5-flash",
    "gemini-flash-lite-latest",
)

# Status codes that mean "this model is not usable for us right now", so the next
# candidate is worth trying: retired/unknown model, exhausted quota, or a
# transient server-side failure.
RETRYABLE_STATUS_CODES = frozenset({404, 429, 500, 502, 503, 504})

# How long one upstream call may take before it is abandoned. The SDK counts in
# milliseconds.
#
# A ceiling on pathology, not a latency target: it only has to be low enough that
# a wedged connection cannot hold a worker indefinitely. Real answers on this
# deployment land around 16 seconds, so the generous margin is deliberate.
# Cutting off a slow-but-working reply is the worse failure - a hung call wastes
# a worker, but a truncated good answer tells a visitor the site is broken when
# it was about to work.
REQUEST_TIMEOUT_MS = 45_000

# The visitor's ceiling, across the whole fallback chain.
#
# A per-call timeout alone is not enough: three models timing out in sequence is
# three times the wait, and nobody watching a chat bubble waits that long. Once
# this much time has gone, remaining models are skipped and the busy reply is
# returned - the answer is not coming, and saying so is better than continuing
# to spend the visitor's patience on it.
#
# The frontend sets no timeout of its own, so this is the only bound a visitor
# actually experiences. It sits well under Cloud Run's 300s request ceiling.
TOTAL_DEADLINE_SECONDS = 70

# How long a model is left alone after it refuses.
#
# Without it, every request re-attempts every exhausted model and pays the
# round-trip to be told "no" again, so a spent daily quota becomes queued
# requests and a starved service instead of a fast, honest "I'm getting more
# questions than I can keep up with".
#
# Deliberately short, and deliberately not parsed from the quota metadata. A
# 429 may mean the per-minute burst or the per-day allowance, and distinguishing
# them means reading a quotaId string out of an error body that Google is free
# to reword. A minute of cooldown is right for the transient case and, for an
# exhausted day, costs one wasted call a minute instead of one per request.
MODEL_COOLDOWN_SECONDS = 60

# model id -> monotonic time before which it should not be tried again.
_model_cooldowns: Dict[str, float] = {}
_cooldown_lock = threading.Lock()


def _model_is_cooling(model_id: str, now: float) -> bool:
    with _cooldown_lock:
        until = _model_cooldowns.get(model_id)
        if until is None:
            return False
        if now >= until:
            del _model_cooldowns[model_id]
            return False
        return True


def _start_cooldown(model_id: str, now: float) -> None:
    with _cooldown_lock:
        _model_cooldowns[model_id] = now + MODEL_COOLDOWN_SECONDS

# Low but not zero: answers should be stable and factual across reloads, while
# still reading as conversation rather than a canned response.
TEMPERATURE = 0.3

# A hard stop on cost per request. It is NOT a length control, and sizing it as
# one truncates answers: on Gemini 3.x this budget is shared with the model's
# internal thinking tokens, which are spent first. At a 400-token budget the
# model spends ~382 of them thinking and has 14 left, so the visitor gets half a
# sentence returned as a complete-looking success with finish_reason=MAX_TOKENS.
#
# Answer length is the prompt's job ("two to four sentences"). This number only
# needs enough headroom that thinking plus a normal answer fits; observed usage
# is ~600 thinking + ~110 answer.
MAX_OUTPUT_TOKENS = 1_500

# User-facing copy per failure category, so an auth or configuration problem is
# not reported to visitors as if the service were merely busy.
#
# These render as ordinary chat bubbles, so they are written in the same first
# person as every other answer. Naming the plumbing ("the AI service is over its
# quota") breaks that voice and tells a visitor nothing they can act on - the
# thing they can act on is whether to wait or to leave an email.
BUSY_MESSAGE = (
    "I'm getting more questions than I can keep up with at the moment. "
    "Give it a minute and ask me again - or leave your email here and "
    "I'll come back to you directly."
)
MISCONFIGURED_MESSAGE = (
    "Something on my end isn't working right now, so I can't answer properly. "
    "Leave your email here and I'll get back to you directly."
)
GENERIC_ERROR_MESSAGE = (
    "That didn't go through on my end. Mind trying again?"
)
# Shown instead of a half-finished answer. `finish_reason=MAX_TOKENS` is the only
# signal that one happened: the call succeeds and `response.text` reads like a
# normal reply right up to the point it stops.
TRUNCATED_RESPONSE_MESSAGE = (
    "That answer ran past its length limit and got cut off mid-thought, so I'd "
    "rather not leave you with half of it. Ask me again in a narrower way and "
    "I'll keep it tighter."
)

EMPTY_RESPONSE_MESSAGE = (
    "I didn't manage to put an answer together for that one. "
    "Could you try rephrasing it?"
)


@dataclass(frozen=True)
class Answer:
    """The reply, and what producing it actually cost.

    Everything past `text` is optional because not every reply comes from a
    model. A refusal to answer without a corpus, or a busy message returned
    while every model is still cooling down, never reaches the API at all -
    those arrive with `model` unset and no counts behind them.

    That distinction is the point. The site's argument is that it does not
    overstate, so a reply the model never produced must not be able to display
    numbers describing how it was produced. Nothing here is derived, rounded up
    or filled in: a figure the API did not report stays `None` rather than
    becoming a plausible zero.
    """

    text: str
    model: Optional[str] = None
    prompt_tokens: Optional[int] = None
    thinking_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    finish_reason: Optional[str] = None
    latency_ms: Optional[int] = None

    @property
    def from_model(self) -> bool:
        """Whether an upstream call produced this reply."""
        return self.model is not None


def get_gemini_response(
    api_key: str,
    user_question: str,
    knowledge: Knowledge,
    conversation_history: Optional[Iterable[Dict[str, str]]] = None,
) -> Answer:
    """Answers a visitor's question in Yanir's voice, grounded in `knowledge`.

    Returns an `Answer` in every case, including failure: `.text` is always
    user-facing copy, so callers render it as the assistant's reply rather than
    distinguishing error paths. The metadata is what separates them - a failure
    carries no model and no counts.
    """
    if knowledge.is_empty:
        # Nothing to ground an answer in. Calling the model here would produce
        # confident invention about a real person, which is worse than an outage.
        logger.error("Refusing to answer: knowledge corpus is empty")
        return Answer(text=NO_KNOWLEDGE_MESSAGE)

    # The per-call timeout is what keeps a hung upstream call from holding a
    # worker. Cloud Run runs at most four instances, each a single uvicorn
    # process, so a handful of stalled calls occupy the whole service and
    # endpoints that never touch Gemini - /api/chat/status among them - start
    # timing out behind them. Chat being unavailable is a degradation; taking the
    # rest of the site with it is an outage.
    client = genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(timeout=REQUEST_TIMEOUT_MS),
    )
    config = types.GenerateContentConfig(
        system_instruction=build_system_instruction(knowledge),
        temperature=TEMPERATURE,
        max_output_tokens=MAX_OUTPUT_TOKENS,
    )
    contents = build_contents(user_question, conversation_history)

    last_error: Optional[Exception] = None
    skipped_all = True
    started = time.monotonic()
    for model_id in MODELS:
        now = time.monotonic()

        # Out of time for the visitor. Trying another model can only make the
        # wait longer for an answer that is already late.
        if now - started >= TOTAL_DEADLINE_SECONDS:
            logger.warning(
                "Giving up after %.1fs without an answer; %s and any models after it not tried",
                now - started,
                model_id,
            )
            break

        # A model that just refused is skipped without a call. Asking again
        # inside the cooldown buys nothing and costs the round-trip, which is
        # how an exhausted quota queues requests up behind it.
        if _model_is_cooling(model_id, now):
            logger.info("Skipping %s: still cooling down after a recent refusal", model_id)
            continue

        skipped_all = False
        call_started = time.monotonic()
        try:
            response = client.models.generate_content(
                model=model_id,
                contents=contents,
                config=config,
            )
            # Measured around the call itself rather than the whole function, so
            # it reports what the model took and not how long a cooling-down
            # model was skipped for.
            latency_ms = int((time.monotonic() - call_started) * 1000)
            usage = _read_usage(model_id, response)

            text = (response.text or "").strip()
            if not text:
                return Answer(
                    text=EMPTY_RESPONSE_MESSAGE,
                    model=model_id,
                    latency_ms=latency_ms,
                    **usage,
                )

            # A MAX_TOKENS finish means the visitor is looking at half a
            # sentence. The call succeeded and `response.text` is a plausible
            # string, which is exactly why this has to be checked rather than
            # trusted: handing over a truncated answer in Yanir's voice presents
            # an incomplete claim as a complete one.
            #
            # The prompt asks for two to four sentences, so hitting a 1,500
            # token ceiling means something already went wrong - usually
            # thinking tokens consuming the shared budget. Saying so is more use
            # than a fragment.
            if usage["finish_reason"] == "MAX_TOKENS":
                return Answer(
                    text=TRUNCATED_RESPONSE_MESSAGE,
                    model=model_id,
                    latency_ms=latency_ms,
                    **usage,
                )

            return Answer(
                text=text,
                model=model_id,
                latency_ms=latency_ms,
                **usage,
            )

        except Exception as e:
            last_error = e
            logger.exception("Gemini API error with model %s", model_id)

            # Decide from the SDK's structured status code rather than substring
            # matching, so an unrelated message containing "404" cannot be
            # mistaken for a retired model.
            status_code = e.code if isinstance(e, genai_errors.APIError) else None

            if status_code in RETRYABLE_STATUS_CODES:
                # Rate limiting and exhausted quota are the cases worth
                # remembering. A 404 means the model is retired, which no
                # cooldown fixes, and a 5xx is usually a one-off.
                if status_code == 429:
                    _start_cooldown(model_id, time.monotonic())
                logger.warning(
                    "Model %s unavailable (HTTP %s), trying next model", model_id, status_code
                )
                continue

            # Anything else (auth, malformed request, network) is not a
            # model-availability problem, so trying another model won't help.
            #
            # No usage travels with this: the call raised, so there are no
            # counts to report and inventing any would describe work that never
            # happened.
            return Answer(text=_failure_message(e))

    if skipped_all:
        # Every model was still cooling down, so nothing was even attempted.
        # That is the busy case by definition, and saying so immediately is the
        # point of the cooldown - the visitor gets an honest answer in
        # milliseconds instead of waiting out three refusals.
        logger.warning("All models cooling down; answering busy without calling upstream")
        return Answer(text=BUSY_MESSAGE)

    # Every candidate model failed; report the category of the last failure.
    return Answer(text=_failure_message(last_error))


def _read_usage(model_id: str, response) -> Dict[str, Optional[object]]:
    """Reads what the request cost, logs it, and hands it back to the caller.

    These numbers were computed and dropped for a year: logged to Cloud Run
    where nobody reads them, then discarded at the return boundary because the
    function answered with a bare string. Returning them is the whole of what
    the trace rail needed - no new measurement, only stopping the old one from
    being thrown away.

    Every field is read straight off the SDK response, so a count the API did
    not report comes back `None`. That matters more here than the tidiness of a
    zero: the numbers are shown to visitors as evidence, and a fabricated one
    would be the exact overstatement this site exists to argue against.

    The truncation warning stays because truncation is otherwise invisible: the
    call succeeds, `response.text` is a plausible string, and only
    `finish_reason` says the visitor got half a sentence.
    """
    usage = getattr(response, "usage_metadata", None)
    fields: Dict[str, Optional[object]] = {
        "prompt_tokens": getattr(usage, "prompt_token_count", None),
        "thinking_tokens": getattr(usage, "thoughts_token_count", None),
        "output_tokens": getattr(usage, "candidates_token_count", None),
        "total_tokens": getattr(usage, "total_token_count", None),
    }

    if usage is not None:
        logger.info(
            "Gemini usage model=%s prompt=%s thinking=%s output=%s total=%s",
            model_id,
            fields["prompt_tokens"],
            fields["thinking_tokens"],
            fields["output_tokens"],
            fields["total_tokens"],
        )

    candidates = getattr(response, "candidates", None) or []
    finish_reason = getattr(candidates[0], "finish_reason", None) if candidates else None
    # The enum's name, not the enum: this crosses a JSON boundary on its way to
    # the browser, and `str(enum)` renders as "FinishReason.STOP" rather than
    # something a rail can print.
    name = getattr(finish_reason, "name", "") if finish_reason is not None else ""
    fields["finish_reason"] = name or None

    if name == "MAX_TOKENS":
        logger.warning(
            "Model %s hit MAX_TOKENS - the answer was truncated mid-sentence. "
            "Thinking tokens share MAX_OUTPUT_TOKENS (%d); raise it.",
            model_id,
            MAX_OUTPUT_TOKENS,
        )

    return fields


def _failure_message(error: Optional[Exception]) -> str:
    """Maps a failure to user-facing copy without leaking the raw error text."""
    if isinstance(error, genai_errors.APIError):
        if error.code in (429, 503):
            return BUSY_MESSAGE
        if error.code in (400, 401, 403, 404):
            return MISCONFIGURED_MESSAGE
    return GENERIC_ERROR_MESSAGE
