"""Behaviour when the upstream quota is spent or the fallback chain is slow.

An exhausted quota must degrade to a fast, honest "busy" reply rather than to
queued requests. The failure worth preventing is not the chat being
unavailable - that is a degradation - but the rest of the site going down with
it: the backend runs a handful of instances of one process each, so requests
that re-attempt every model and pay a round-trip to be refused by each hold
workers long enough for endpoints that never call Gemini, /api/chat/status
among them, to start timing out.

Cooldown state is reset for every test by tests/conftest.py.
"""

import time

import gemini_helper
from conftest import ApiError
from gemini_helper import BUSY_MESSAGE


def test_a_refused_model_is_not_retried_while_cooling():
    now = time.monotonic()
    gemini_helper._start_cooldown("gemini-flash-latest", now)

    assert gemini_helper._model_is_cooling("gemini-flash-latest", now) is True
    # Untouched models stay available; one model refusing must not sideline the
    # rest of the fallback chain.
    assert gemini_helper._model_is_cooling("gemini-3.5-flash", now) is False


def test_cooldown_expires_and_its_entry_is_discarded():
    now = time.monotonic()
    gemini_helper._start_cooldown("gemini-flash-latest", now)
    later = now + gemini_helper.MODEL_COOLDOWN_SECONDS + 1

    assert gemini_helper._model_is_cooling("gemini-flash-latest", later) is False
    # The entry is cleaned up rather than accumulating one per model per
    # refusal for the life of the process.
    assert "gemini-flash-latest" not in gemini_helper._model_cooldowns


def test_429_puts_every_attempted_model_on_cooldown(stub_gemini, stub_knowledge):
    models = stub_gemini(ApiError(429, "quota"), repeat=True)

    gemini_helper.get_gemini_response("k", "hi", stub_knowledge)

    # The whole chain is tried once...
    assert models.tried == list(gemini_helper.MODELS)
    # ...and none of it is tried again until it cools off.
    now = time.monotonic()
    assert all(gemini_helper._model_is_cooling(m, now) for m in gemini_helper.MODELS)


def test_second_request_answers_busy_without_calling_upstream(stub_gemini, stub_knowledge):
    models = stub_gemini(ApiError(429, "quota"), repeat=True)

    gemini_helper.get_gemini_response("k", "hi", stub_knowledge)
    calls_after_first = len(models.tried)

    reply = gemini_helper.get_gemini_response("k", "hi again", stub_knowledge)

    # This is what stops the starvation: while the chain is cooling, a request
    # costs no upstream call at all, so requests stop queueing behind refusals.
    assert len(models.tried) == calls_after_first
    assert reply.text == BUSY_MESSAGE


def test_404_does_not_put_a_model_on_cooldown(stub_gemini, stub_knowledge):
    # A retired model is not a busy one: no cooldown brings it back, and
    # sidelining the chain for a minute over it would be wrong.
    models = stub_gemini(ApiError(404, "not found"), repeat=True)

    gemini_helper.get_gemini_response("k", "hi", stub_knowledge)

    assert models.tried == list(gemini_helper.MODELS), "404 still advances the chain"
    now = time.monotonic()
    assert not any(gemini_helper._model_is_cooling(m, now) for m in gemini_helper.MODELS)


def test_cooldowns_do_not_leak_into_the_next_test():
    # Guards the autouse reset in conftest.py rather than any behaviour of its
    # own: the 429 tests above put every model on cooldown, so deleting that
    # fixture makes this assertion fail. With the fixture in place it passes by
    # construction, which is the point - the cost of keeping it is one cheap
    # assertion, and what it catches is a whole file inheriting a chain where
    # nothing is callable and answering BUSY_MESSAGE for reasons of its own
    # file's making.
    assert gemini_helper._model_cooldowns == {}


def test_a_slow_chain_stops_at_the_deadline_rather_than_multiplying_the_wait(
    monkeypatch, stub_gemini, stub_knowledge
):
    """Three sequential timeouts is three times the wait, and the visitor is
    watching a chat bubble. Once the total budget is spent, the remaining models
    are not tried."""
    base = gemini_helper.time.monotonic()

    def spend_the_whole_budget():
        # Simulate a call that consumed the visitor's entire deadline.
        monkeypatch.setattr(
            gemini_helper.time,
            "monotonic",
            lambda: base + gemini_helper.TOTAL_DEADLINE_SECONDS + 1,
        )
        raise ApiError(503, "slow")

    models = stub_gemini(spend_the_whole_budget, repeat=True)

    gemini_helper.get_gemini_response("k", "hi", stub_knowledge)

    assert models.tried == [gemini_helper.MODELS[0]]


def test_the_per_call_timeout_leaves_room_for_a_real_answer():
    # A successful answer was measured at 16.4s on this deployment, so a ceiling
    # near that would cut off good replies - worse than a wasted worker. The
    # whole-chain deadline has to exceed a single call, or one slow model would
    # spend it entirely.
    assert gemini_helper.REQUEST_TIMEOUT_MS >= 40_000
    assert gemini_helper.TOTAL_DEADLINE_SECONDS * 1000 > gemini_helper.REQUEST_TIMEOUT_MS
