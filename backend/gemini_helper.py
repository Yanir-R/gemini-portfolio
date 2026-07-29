"""The Gemini call: model selection, generation config, and failure mapping.

Prompt content lives in prompt.py and corpus assembly in context.py. What
remains here is the part that talks to the API and decides what to do when it
refuses.

The fallback chain and its status-code handling are unchanged from the fix that
established them: a chain that retried only on 503 never fell back at all,
because retired models answer 404. It reads the SDK's structured status code
rather than substring-matching the message.
"""

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
# current generation, so a model retirement upstream does not break chat the way
# the pinned gemini-1.5-* names did; the pinned entry in the middle is the
# escape hatch if an alias itself starts misbehaving.
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
# milliseconds. Generous enough for a slow answer, short enough that three
# sequential attempts cannot outlive a visitor's patience or Cloud Run's own
# 300s request ceiling.
REQUEST_TIMEOUT_MS = 20_000

# How long a model is left alone after it refuses.
#
# Without this, every request re-attempted every exhausted model and paid the
# round-trip to be told "no" again - which is how a spent daily quota turned
# into queued requests and a starved service rather than a fast, honest "I'm
# getting more questions than I can keep up with".
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
# internal thinking tokens, which are spent first. Measured at a 400 budget,
# gemini-flash-latest spent 382 tokens thinking and had 14 left for the answer,
# so visitors got "I'm currently a Full Stack Developer at Moonsite, where" and
# nothing else - a complete-looking success with finish_reason=MAX_TOKENS.
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


def get_gemini_response(
    api_key: str,
    user_question: str,
    knowledge: Knowledge,
    conversation_history: Optional[Iterable[Dict[str, str]]] = None,
) -> str:
    """Answers a visitor's question in Yanir's voice, grounded in `knowledge`.

    Returns user-facing text in every case, including failure - callers render
    the string as the assistant's reply rather than distinguishing error paths.
    """
    if knowledge.is_empty:
        # Nothing to ground an answer in. Calling the model here would produce
        # confident invention about a real person, which is worse than an outage.
        logger.error("Refusing to answer: knowledge corpus is empty")
        return NO_KNOWLEDGE_MESSAGE

    # A ceiling on how long one upstream call may hold a worker.
    #
    # There was none, and it mattered more than it looks. Cloud Run runs at most
    # four instances, each a single uvicorn process, so a handful of calls that
    # hang occupy the whole service - and when the daily quota ran out, requests
    # queued behind three sequential model attempts until endpoints that never
    # touch Gemini, /api/chat/status among them, started timing out too. The
    # chat being unavailable is a degradation; taking the rest of the site with
    # it is an outage, and nothing in the code prevented that.
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
    for model_id in MODELS:
        # A model that just refused is skipped without a call. Asking again
        # inside the cooldown buys nothing and costs the round-trip, which is
        # the whole reason an exhausted quota was able to queue requests up
        # behind it.
        if _model_is_cooling(model_id, time.monotonic()):
            logger.info("Skipping %s: still cooling down after a recent refusal", model_id)
            continue

        skipped_all = False
        try:
            response = client.models.generate_content(
                model=model_id,
                contents=contents,
                config=config,
            )
            truncated = _log_usage(model_id, response)

            text = (response.text or "").strip()
            if not text:
                return EMPTY_RESPONSE_MESSAGE

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
            if truncated:
                return TRUNCATED_RESPONSE_MESSAGE

            return text

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
            return _failure_message(e)

    if skipped_all:
        # Every model was still cooling down, so nothing was even attempted.
        # That is the busy case by definition, and saying so immediately is the
        # point of the cooldown - the visitor gets an honest answer in
        # milliseconds instead of waiting out three refusals.
        logger.warning("All models cooling down; answering busy without calling upstream")
        return BUSY_MESSAGE

    # Every candidate model failed; report the category of the last failure.
    return _failure_message(last_error)


def _log_usage(model_id: str, response) -> bool:
    """Records what the request actually cost, and whether it was cut short.

    Nothing measured how many tokens a chat message consumed, which is why the
    question of whether the corpus needs trimming has only ever been answered by
    guesswork. These numbers are the input to that decision.

    The truncation warning exists because truncation is otherwise invisible: the
    call succeeds, `response.text` is a plausible string, and only
    `finish_reason` says the visitor got half a sentence.
    """
    usage = getattr(response, "usage_metadata", None)
    if usage is not None:
        logger.info(
            "Gemini usage model=%s prompt=%s thinking=%s output=%s total=%s",
            model_id,
            getattr(usage, "prompt_token_count", None),
            getattr(usage, "thoughts_token_count", None),
            getattr(usage, "candidates_token_count", None),
            getattr(usage, "total_token_count", None),
        )

    candidates = getattr(response, "candidates", None) or []
    finish_reason = getattr(candidates[0], "finish_reason", None) if candidates else None
    if finish_reason is not None and getattr(finish_reason, "name", "") == "MAX_TOKENS":
        logger.warning(
            "Model %s hit MAX_TOKENS - the answer was truncated mid-sentence. "
            "Thinking tokens share MAX_OUTPUT_TOKENS (%d); raise it.",
            model_id,
            MAX_OUTPUT_TOKENS,
        )
        return True

    return False


def _failure_message(error: Optional[Exception]) -> str:
    """Maps a failure to user-facing copy without leaking the raw error text."""
    if isinstance(error, genai_errors.APIError):
        if error.code in (429, 503):
            return BUSY_MESSAGE
        if error.code in (400, 401, 403, 404):
            return MISCONFIGURED_MESSAGE
    return GENERIC_ERROR_MESSAGE
