"""Who the rate limiter thinks a request came from.

This is the question that decides whether per-IP limiting works at all, and it
is easy to get wrong in a way nothing else notices: the limits still function,
the tests still pass, and the only symptom is strangers rate-limiting each
other under load.

It has been wrong once already. `client_key` took the trailing X-Forwarded-For
entry because on Cloud Run that was the value Google's front end appended and
the only part a client could not forge. Putting a Cloudflare Worker in front
silently invalidated that: Google then sees a Cloudflare edge address, so every
visitor collapsed onto a single key.

These tests pin the rule that replaced it - CF-Connecting-IP, but only for a
request that proved it came through the edge.
"""

import pytest
from fastapi import Request
from starlette.testclient import TestClient

import main
from rate_limit import client_key


SECRET = "test-secret-value"
VISITOR = "203.0.113.7"
EDGE = "172.70.200.152"


# A probe route, registered once for this module. The propagation of
# `edge_verified` from the middleware to the endpoint runs through Starlette's
# scope, which is exactly the mechanism worth testing rather than assuming, so
# these go through the real app instead of a hand-built Request.
@main.app.get("/__probe_identity")
async def _probe_identity(request: Request):
    return {
        "edge_verified": getattr(request.state, "edge_verified", None),
        "key": client_key(request),
    }


@pytest.fixture
def guarded(monkeypatch):
    monkeypatch.setattr(main, "ORIGIN_SHARED_SECRET", SECRET)
    return TestClient(main.app)


@pytest.fixture
def unguarded(monkeypatch):
    monkeypatch.setattr(main, "ORIGIN_SHARED_SECRET", "")
    return TestClient(main.app)


def test_edge_verified_reaches_the_endpoint(guarded):
    # The middleware writes this onto the request scope; if it did not survive
    # to the handler, every branch below would silently take the fallback.
    body = guarded.get("/__probe_identity", headers={"X-Edge-Auth": SECRET}).json()
    assert body["edge_verified"] is True


def test_verified_request_is_attributed_to_the_visitor_not_the_edge(guarded):
    # The regression this file exists for. X-Forwarded-For ends with the
    # Cloudflare address Google's front end appended; using it would put every
    # visitor in one bucket.
    body = guarded.get(
        "/__probe_identity",
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
            "/__probe_identity",
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
        "/__probe_identity",
        headers={"X-Edge-Auth": SECRET, "X-Forwarded-For": f"{VISITOR}, {EDGE}"},
    ).json()
    assert body["key"] == EDGE


def test_unverified_request_may_not_claim_an_identity(unguarded):
    # CF-Connecting-IP is trivially forgeable by anyone reaching the origin, so
    # without the proof it must be ignored - otherwise a caller could mint a
    # fresh bucket per request and the limit would mean nothing.
    body = unguarded.get(
        "/__probe_identity",
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
        "/__probe_identity", headers={"X-Forwarded-For": f"1.2.3.4, {EDGE}"}
    ).json()["key"]
    second = unguarded.get(
        "/__probe_identity", headers={"X-Forwarded-For": f"5.6.7.8, {EDGE}"}
    ).json()["key"]
    assert first == second == EDGE
