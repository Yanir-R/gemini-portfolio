"""Who the rate limiter thinks a request came from.

This decides whether per-IP limiting works at all, and it is easy to get wrong
in a way nothing else notices: the limits still function, the tests still pass,
and the only symptom is strangers rate-limiting each other under load.

The rule pinned here has two halves, and both matter. A request that proved it
came through the edge is attributed to CF-Connecting-IP; anything else falls
back to the trailing X-Forwarded-For entry, the one the platform appends and a
client cannot forge. Using the trailing entry unconditionally collapses every
visitor onto one key as soon as a proxy sits in front of the origin, because
that entry is then the edge's own address. Trusting CF-Connecting-IP
unconditionally lets anyone reaching the origin directly mint a fresh bucket
per request.
"""

import pytest
from fastapi import Request
from starlette.testclient import TestClient

import main
from rate_limit import client_key


SECRET = "test-secret-value"
VISITOR = "203.0.113.7"
EDGE = "172.70.200.152"


PROBE_PATH = "/__probe_identity"


async def _probe_identity(request: Request):
    return {
        "edge_verified": getattr(request.state, "edge_verified", None),
        "key": client_key(request),
    }


@pytest.fixture
def probe_app():
    """The real app with a route that reports how a request was identified.

    `edge_verified` travels from the middleware to the handler through
    Starlette's request scope, so these go through the real application rather
    than a hand-built Request - the propagation is the part worth testing rather
    than assuming.

    The route is added and removed per test. Registering it at import time
    would leave it on the shared app for every other module in the session.
    """
    main.app.add_api_route(PROBE_PATH, _probe_identity, methods=["GET"])
    try:
        yield main.app
    finally:
        main.app.router.routes = [
            route for route in main.app.router.routes if getattr(route, "path", None) != PROBE_PATH
        ]


@pytest.fixture
def guarded(monkeypatch, probe_app):
    monkeypatch.setattr(main, "ORIGIN_SHARED_SECRET", SECRET)
    return TestClient(probe_app)


@pytest.fixture
def unguarded(monkeypatch, probe_app):
    monkeypatch.setattr(main, "ORIGIN_SHARED_SECRET", "")
    return TestClient(probe_app)


def test_edge_verified_reaches_the_endpoint(guarded):
    # The middleware writes this onto the request scope; if it did not survive
    # to the handler, every branch below would silently take the fallback.
    body = guarded.get(PROBE_PATH, headers={"X-Edge-Auth": SECRET}).json()
    assert body["edge_verified"] is True


def test_verified_request_is_attributed_to_the_visitor_not_the_edge(guarded):
    # X-Forwarded-For ends with the edge address the platform appended, so
    # preferring it here would put every visitor in one bucket.
    body = guarded.get(
        PROBE_PATH,
        headers={
            "X-Edge-Auth": SECRET,
            "CF-Connecting-IP": VISITOR,
            "X-Forwarded-For": f"{VISITOR}, {EDGE}",
        },
    ).json()
    assert body["key"] == VISITOR


def test_two_visitors_behind_one_edge_get_separate_buckets(guarded):
    other = "203.0.113.99"
    keys = {
        guarded.get(
            PROBE_PATH,
            headers={
                "X-Edge-Auth": SECRET,
                "CF-Connecting-IP": ip,
                "X-Forwarded-For": f"{ip}, {EDGE}",
            },
        ).json()["key"]
        for ip in (VISITOR, other)
    }
    assert keys == {VISITOR, other}


def test_missing_cf_header_degrades_rather_than_fails(guarded):
    # Sharing a bucket is a degradation; refusing service is an outage. If the
    # header ever stops arriving the old behaviour must still apply.
    body = guarded.get(
        PROBE_PATH,
        headers={"X-Edge-Auth": SECRET, "X-Forwarded-For": f"{VISITOR}, {EDGE}"},
    ).json()
    assert body["key"] == EDGE


def test_unverified_request_may_not_claim_an_identity(unguarded):
    # CF-Connecting-IP is trivially forgeable by anyone reaching the origin, so
    # without the proof it must be ignored - otherwise a caller could mint a
    # fresh bucket per request and the limit would mean nothing.
    body = unguarded.get(
        PROBE_PATH,
        headers={
            "CF-Connecting-IP": "198.51.100.1",
            "X-Forwarded-For": f"{VISITOR}, {EDGE}",
        },
    ).json()
    assert body["edge_verified"] is False
    assert body["key"] == EDGE


def test_forged_forwarded_for_cannot_reset_the_bucket(unguarded):
    # The original rule, still holding: a handcrafted first entry is ignored
    # because the trailing entry is the one the platform appended.
    first = unguarded.get(
        PROBE_PATH, headers={"X-Forwarded-For": f"1.2.3.4, {EDGE}"}
    ).json()["key"]
    second = unguarded.get(
        PROBE_PATH, headers={"X-Forwarded-For": f"5.6.7.8, {EDGE}"}
    ).json()["key"]
    assert first == second == EDGE


def test_the_probe_route_does_not_outlive_its_fixture():
    """The probe is added to the shared app, so it has to come off again.

    A route registered at import time stays on `main.app` for the whole
    session and shows up in every other module's view of the application.
    """
    assert all(getattr(r, "path", None) != PROBE_PATH for r in main.app.router.routes)
