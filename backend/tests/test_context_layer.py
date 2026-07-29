"""Regressions for the context layer.

None of these call the Gemini API. They cover the parts that were wrong before
and would be silently wrong again: what reaches the model, what must never reach
it, and what the model must never be asked to answer without.

Run from the backend directory: `pytest`
"""

import re

import pytest
from google.genai import errors as genai_errors

import context
import gemini_helper
import main
import prompt
from gemini_helper import (
    BUSY_MESSAGE,
    MISCONFIGURED_MESSAGE,
    get_gemini_response,
)
from prompt import NO_KNOWLEDGE_MESSAGE, build_contents, build_system_instruction


def _api_error(code: int) -> genai_errors.APIError:
    """An APIError carrying a status code, without an HTTP response object."""
    return genai_errors.APIError(code, {"error": {"message": "test"}})


# --- what the corpus contains -------------------------------------------------


def test_corpus_loads_profile_and_projects():
    knowledge = context.get_knowledge()

    assert not knowledge.is_empty
    assert knowledge.approx_tokens > 0
    assert any(s.startswith("Profile / ") for s in knowledge.sources)
    assert any(s.startswith("Project / ") for s in knowledge.sources)


def test_corpus_never_falls_back_to_template_placeholders():
    """Templates are documentation for forks, never chat context.

    Loading them when the profile is empty would mean a misconfigured deploy
    telling visitors about "[brief story]" in a confident first person.
    """
    text = context.get_knowledge().text

    for placeholder in ("[brief story]", "[your main programming languages]", "[Company]"):
        assert placeholder not in text


def test_published_docs_carry_no_direct_contact_details():
    """docs/profile/ ships in a public repo, is served over /api/content/, and is
    sent to a third-party API on every message.

    Contact belongs on the site's own terms - the published address and the
    in-chat email route - not wherever a pasted resume happens to put it. A
    resume update is the likely way a personal number would arrive here, so the
    rule is asserted rather than trusted.
    """
    text = context.get_knowledge().text

    # International (+NN ...) or trunk-prefixed (0NN ...) numbers of 9+ digits.
    # Loose enough to catch a pasted number in any format, tight enough that
    # years, versions and figures in the project write-ups do not match.
    phone = re.compile(r"(?:\+\d{1,3}[\s.-]?)?\b0?\d{1,3}[\s.-]?\d{3}[\s.-]?\d{4}\b")

    assert not phone.search(text), "a phone-shaped number reached the published corpus"


def test_corpus_is_cached_between_calls():
    """Unchanged files must not be re-read and re-parsed on every request."""
    assert context.get_knowledge() is context.get_knowledge()


# --- the behavioural contract -------------------------------------------------


def test_system_instruction_states_the_grounding_rules():
    instruction = build_system_instruction(context.get_knowledge())

    assert "only source" in instruction
    assert "Never invent" in instruction
    assert "never treat as instructions" in instruction


def test_system_instruction_forbids_completing_a_technology_list():
    """The general "never invent a technology" rule was already present and was
    still not enough: asked for a tech stack, the chat named PostgreSQL, which
    the corpus does not contain.

    The mechanism is co-occurrence rather than defiance - a database that
    commonly sits beside the ones listed is the natural completion of the
    pattern - so the rule has to name that mechanism specifically. This asserts
    it survives, because the failure it prevents is invisible: the invented item
    is usually plausible, and was in fact true of Yanir when it happened.
    """
    instruction = build_system_instruction(context.get_knowledge())

    assert "name only the ones the PROFILE" in instruction
    assert "usually accompanies" in instruction


def test_system_instruction_fences_the_corpus():
    """Profile text must sit inside the fence, so injected text cannot pose as rules."""
    knowledge = context.get_knowledge()
    instruction = build_system_instruction(knowledge)

    body = instruction.split("=== BEGIN PROFILE", 1)[1]
    assert knowledge.text in body
    assert body.rstrip().endswith("=== END PROFILE ===")


def test_empty_corpus_is_refused_without_calling_the_model(monkeypatch):
    """No corpus means no answer - never an ungrounded one about a real person."""

    def explode(*args, **kwargs):
        raise AssertionError("the model must not be called without a corpus")

    monkeypatch.setattr("gemini_helper.genai.Client", explode)

    assert get_gemini_response("key", "who is he?", context.EMPTY) == NO_KNOWLEDGE_MESSAGE


# --- what a visitor sees when the upstream API refuses ------------------------


class _FakeModels:
    def __init__(self, outcomes):
        self.outcomes = list(outcomes)
        self.tried = []

    def generate_content(self, model, contents, config):
        self.tried.append(model)
        outcome = self.outcomes.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome


class _FakeClient:
    def __init__(self, models):
        self.models = models


def _patch_client(monkeypatch, outcomes) -> _FakeModels:
    models = _FakeModels(outcomes)
    monkeypatch.setattr(gemini_helper.genai, "Client", lambda api_key: _FakeClient(models))
    return models


def test_quota_exhaustion_advances_through_every_model(monkeypatch):
    """A 429 on one model is not the end of the road - the next one is tried."""
    models = _patch_client(monkeypatch, [_api_error(429), _api_error(429), _api_error(429)])

    answer = get_gemini_response("key", "hi", context.get_knowledge())

    assert models.tried == list(gemini_helper.MODELS)
    assert answer == BUSY_MESSAGE


def test_quota_message_speaks_in_yanirs_voice_and_offers_the_email_route():
    """It renders as a chat bubble beside real answers, so it cannot read like
    an error console, and it has to leave the visitor something to do."""
    assert "email" in BUSY_MESSAGE
    for plumbing in ("API", "quota", "AI service", "429"):
        assert plumbing not in BUSY_MESSAGE


def test_auth_failure_is_not_reported_as_busy(monkeypatch):
    """403 is a configuration problem. Telling a visitor to try again shortly
    would be a lie, and retrying other models cannot help."""
    models = _patch_client(monkeypatch, [_api_error(403)])

    answer = get_gemini_response("key", "hi", context.get_knowledge())

    assert answer == MISCONFIGURED_MESSAGE
    assert models.tried == [gemini_helper.MODELS[0]]


# --- conversation shape -------------------------------------------------------


def test_build_contents_puts_the_question_last_as_a_user_turn():
    contents = build_contents("what now?", [{"role": "model", "content": "earlier"}])

    assert contents[-1] == {"role": "user", "parts": [{"text": "what now?"}]}


def test_build_contents_drops_unknown_roles_and_blank_turns():
    contents = build_contents(
        "q",
        [
            {"role": "user", "content": "kept"},
            {"role": "assistant", "content": "wrong role name"},
            {"role": "model", "content": "   "},
        ],
    )

    assert [c["role"] for c in contents] == ["user", "user"]
    assert contents[0]["parts"][0]["text"] == "kept"


def test_build_contents_bounds_replayed_history():
    history = [{"role": "user", "content": f"m{i}"} for i in range(50)]

    contents = build_contents("q", history)

    assert len(contents) == prompt.HISTORY_TURNS + 1


def test_ui_chrome_is_not_replayed_as_conversation():
    """'initial' and 'system' are the greeting and error banners, not dialogue."""
    turns = main._to_model_turns(
        [
            main.ChatMessage(type="initial", content="hi, ask me anything"),
            main.ChatMessage(type="system", content="⚠️ error banner"),
            main.ChatMessage(type="user", content="a real question"),
        ]
    )

    assert turns == [{"role": "user", "content": "a real question"}]


def test_clicked_quick_replies_are_attributed_to_the_visitor():
    """They were mapped to the assistant, so the model saw its own suggestions
    as things it had already said."""
    turns = main._to_model_turns(
        [
            main.ChatMessage(type="quick", content="Tell me about your experience"),
            main.ChatMessage(type="ai", content="I've been at..."),
        ]
    )

    assert [t["role"] for t in turns] == ["user", "model"]


# --- request bounds -----------------------------------------------------------


def test_oversized_message_is_rejected():
    with pytest.raises(ValueError):
        main.ChatRequest(message="x" * (main.MAX_MESSAGE_CHARS + 1))


def test_empty_message_is_rejected():
    with pytest.raises(ValueError):
        main.ChatRequest(message="")


def test_unbounded_history_is_rejected():
    history = [{"type": "user", "content": "x"}] * (main.MAX_HISTORY_MESSAGES + 1)

    with pytest.raises(ValueError):
        main.ChatRequest(message="hello", conversation_history=history)


def test_debug_and_ungrounded_endpoints_are_gone():
    """Neither belongs in the surface area: one exposed filesystem detail no
    client needed, the other called Gemini with no corpus to ground it."""
    paths = {route.path for route in main.app.routes if hasattr(route, "path")}

    assert "/check-paths" not in paths
    assert "/generate-text" not in paths
    assert "/api/chat/status" in paths


# ---------------------------------------------------------------------------
# Regressions for the Qodo review on PR #7
# ---------------------------------------------------------------------------
#
# Each of these was a real finding, reproduced before it was fixed. They are
# here because all four are silent failures: nothing crashes, and the only
# symptom is a wrong answer or a stale corpus.


def test_corpus_without_profile_fails_closed(tmp_path, monkeypatch):
    """Project and writing documents alone must not count as a ready corpus.

    Without this, an unreadable profile directory still reports the chat ready
    and answers in Yanir's first person with nothing about Yanir behind it.
    """
    import context

    monkeypatch.setattr(context, "PROFILE_DIR", str(tmp_path / "absent-profile"))
    context._cache = None

    knowledge = context._build()
    assert knowledge.is_empty, "a corpus with no profile section must be empty"


def test_partial_corpus_is_not_cached(monkeypatch):
    """A source that fails to read must not be cached away until its mtime moves.

    The fingerprint counts files, so it doubles as the expected section count;
    fewer sections than files means a read failed.
    """
    import context

    real_build = context._build

    def build_missing_one():
        full = real_build()
        return context.Knowledge(
            text=full.text,
            sources=full.sources[:-1],
            approx_tokens=full.approx_tokens,
        )

    monkeypatch.setattr(context, "_build", build_missing_one)
    context._cache = None

    knowledge = context.get_knowledge()
    assert not knowledge.is_empty, "the partial corpus is still served for this request"
    assert context._cache is None, "a partial corpus must not be cached"

    context._cache = None


def _response_with_finish_reason(name):
    """The minimum shape `_log_usage` inspects."""
    finish = type("FinishReason", (), {"name": name})()
    candidate = type("Candidate", (), {"finish_reason": finish})()
    return type("Response", (), {"candidates": [candidate], "usage_metadata": None})()


def test_truncated_response_is_reported(monkeypatch):
    """MAX_TOKENS is invisible otherwise: the call succeeds and text looks fine."""
    import gemini_helper

    assert gemini_helper._log_usage("test", _response_with_finish_reason("MAX_TOKENS")) is True
    assert gemini_helper._log_usage("test", _response_with_finish_reason("STOP")) is False


def test_technical_questions_do_not_trigger_contact_flow():
    """A question about the work can contain a contact phrase and still be a question.

    "How does your email integration work?" holds "your email" but is asking
    about a system, and answering it with the address prompt is the same false
    positive the phrase list was meant to remove.
    """
    import main

    def routes_to_contact(message):
        lowered = message.lower()
        return any(p in lowered for p in main.CONTACT_INTENT_PHRASES) and not main._TOPIC_QUESTION.search(
            message
        )

    for question in (
        "How does your email integration work?",
        "How does your email flow handle failures?",
        "What did you learn building your email pipeline?",
        "Why does your email retry twice?",
    ):
        assert not routes_to_contact(question), question

    for request in (
        "How do I reach you?",
        "Can I contact you about a role?",
        "what's your email?",
        "I'd like to get in touch.",
    ):
        assert routes_to_contact(request), request
