"""What happens when the upstream quota runs out.

Written after it happened. Twenty-odd chat requests exhausted Gemini's free
tier - 20 per day per model, not per minute - and the failure did not stay in
the chat. Every request re-attempted all three models, each paid a round-trip
to be refused, and with four Cloud Run instances running one process each the
queue backed up until /api/chat/status, which never calls Gemini at all,
started timing out.

The chat being unavailable is a degradation. Taking the rest of the site with
it is an outage, and nothing in the code distinguished the two.
"""

import time

import pytest
from google.genai import errors as genai_errors

import gemini_helper
from gemini_helper import BUSY_MESSAGE


class _Refusal(genai_errors.APIError):
    """An APIError carrying a status code, built without the SDK constructor.

    test_context_layer builds these as `APIError(code, {...})`, which depends on
    the shape of the SDK's own __init__ and breaks across versions - it is why
    two tests in that file fail on an older local SDK while passing in CI.
    Setting the one attribute the code under test reads keeps this independent
    of that.
    """

    def __init__(self, code: int):
        self.code = code
        self.message = "quota"
        Exception.__init__(self, f"{code} quota")


class _Refusing:
    """A stand-in client whose every call raises the given status."""

    def __init__(self, status: int):
        self.status = status
        self.calls = []
        self.models = self

    def generate_content(self, model, contents, config):
        self.calls.append(model)
        raise _Refusal(self.status)


# Cooldown state is reset for every test by tests/conftest.py.


def test_a_refused_model_is_not_retried_while_cooling():
    now = time.monotonic()
    gemini_helper._start_cooldown("gemini-flash-latest", now)
    assert gemini_helper._model_is_cooling("gemini-flash-latest", now) is True
    # Untouched models stay available; one model refusing must not sideline the
    # fallback chain.
    assert gemini_helper._model_is_cooling("gemini-3.5-flash", now) is False


def test_cooldown_expires_rather_than_sticking():
    now = time.monotonic()
    gemini_helper._start_cooldown("gemini-flash-latest", now)
    later = now + gemini_helper.MODEL_COOLDOWN_SECONDS + 1
    assert gemini_helper._model_is_cooling("gemini-flash-latest", later) is False
    # And the entry is cleaned up rather than accumulating one per model
    # per refusal forever.
    assert "gemini-flash-latest" not in gemini_helper._model_cooldowns


def test_429_puts_every_attempted_model_on_cooldown(monkeypatch):
    client = _Refusing(429)
    monkeypatch.setattr(gemini_helper.genai, "Client", lambda **kwargs: client)

    knowledge = type("K", (), {"is_empty": False})()
    monkeypatch.setattr(gemini_helper, "build_system_instruction", lambda k: "sys")
    monkeypatch.setattr(gemini_helper, "build_contents", lambda q, h: ["q"])

    gemini_helper.get_gemini_response("k", "hi", knowledge)

    # It tried the whole chain once...
    assert client.calls == list(gemini_helper.MODELS)
    # ...and will not try any of them again until they cool off.
    now = time.monotonic()
    assert all(gemini_helper._model_is_cooling(m, now) for m in gemini_helper.MODELS)


def test_second_request_answers_busy_without_calling_upstream(monkeypatch):
    client = _Refusing(429)
    monkeypatch.setattr(gemini_helper.genai, "Client", lambda **kwargs: client)

    knowledge = type("K", (), {"is_empty": False})()
    monkeypatch.setattr(gemini_helper, "build_system_instruction", lambda k: "sys")
    monkeypatch.setattr(gemini_helper, "build_contents", lambda q, h: ["q"])

    gemini_helper.get_gemini_response("k", "hi", knowledge)
    calls_after_first = len(client.calls)

    reply = gemini_helper.get_gemini_response("k", "hi again", knowledge)

    # This is the fix for the starvation: the second request costs no upstream
    # call at all, so requests stop queueing behind refusals.
    assert len(client.calls) == calls_after_first
    assert reply == BUSY_MESSAGE


def test_404_does_not_cool_down(monkeypatch):
    # A retired model is not a busy one - no cooldown will bring it back, and
    # sidelining the chain for a minute over it would be wrong.
    client = _Refusing(404)
    monkeypatch.setattr(gemini_helper.genai, "Client", lambda **kwargs: client)

    knowledge = type("K", (), {"is_empty": False})()
    monkeypatch.setattr(gemini_helper, "build_system_instruction", lambda k: "sys")
    monkeypatch.setattr(gemini_helper, "build_contents", lambda q, h: ["q"])

    gemini_helper.get_gemini_response("k", "hi", knowledge)

    now = time.monotonic()
    assert not any(gemini_helper._model_is_cooling(m, now) for m in gemini_helper.MODELS)


# These two run in definition order and exist as a pair. The first deliberately
# leaves every model cooling; the second asserts it did not inherit that. It is
# the regression conftest.py prevents - without the reset, a 429 test poisons
# whatever runs next, and the failure surfaces in an unrelated file.
def test_exhausting_the_chain_leaves_cooldowns_set(monkeypatch):
    client = _Refusing(429)
    monkeypatch.setattr(gemini_helper.genai, "Client", lambda **kwargs: client)
    knowledge = type("K", (), {"is_empty": False})()
    monkeypatch.setattr(gemini_helper, "build_system_instruction", lambda k: "sys")
    monkeypatch.setattr(gemini_helper, "build_contents", lambda q, h: ["q"])

    gemini_helper.get_gemini_response("k", "hi", knowledge)
    assert gemini_helper._model_cooldowns, "precondition: this test must leave state behind"


def test_the_next_test_starts_with_a_clean_chain():
    assert gemini_helper._model_cooldowns == {}


def test_a_slow_chain_stops_at_the_deadline_rather_than_multiplying_the_wait(monkeypatch):
    """Three sequential timeouts is three times the wait, and the visitor is
    watching a chat bubble. Once the budget is spent, remaining models are not
    tried."""
    attempted = []

    class _Slow:
        models = None

        def generate_content(self, model, contents, config):
            attempted.append(model)
            # Simulate a call that consumed most of the visitor's budget.
            monkeypatch.setattr(
                gemini_helper.time,
                "monotonic",
                lambda: base + gemini_helper.TOTAL_DEADLINE_SECONDS + 1,
            )
            raise _Refusal(503)

    slow = _Slow()
    slow.models = slow
    base = gemini_helper.time.monotonic()
    monkeypatch.setattr(gemini_helper.genai, "Client", lambda **kwargs: slow)
    knowledge = type("K", (), {"is_empty": False})()
    monkeypatch.setattr(gemini_helper, "build_system_instruction", lambda k: "sys")
    monkeypatch.setattr(gemini_helper, "build_contents", lambda q, h: ["q"])

    gemini_helper.get_gemini_response("k", "hi", knowledge)

    # Only the first model was tried; the deadline stopped the rest.
    assert attempted == [gemini_helper.MODELS[0]]


def test_the_per_call_timeout_leaves_room_for_a_real_answer():
    # A successful answer was measured at 16.4s on this deployment. A ceiling
    # near that would cut off good replies, which is worse than a wasted worker.
    assert gemini_helper.REQUEST_TIMEOUT_MS >= 40_000
    assert gemini_helper.TOTAL_DEADLINE_SECONDS * 1000 > gemini_helper.REQUEST_TIMEOUT_MS
