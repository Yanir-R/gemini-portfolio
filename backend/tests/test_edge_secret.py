"""The guard that keeps the API reachable only through Cloudflare.

The failure this protects against is not data theft - everything the API
returns is public. It is cost and availability: the chat endpoint spends Gemini
quota per call, and the global rate limiter is a shared 40/minute budget, so
anyone able to call the origin directly can exhaust it and leave real visitors
holding 429s.

These tests do not reach the network. They set the secret on the module and
drive the app through Starlette's test client.
"""

import pytest
from starlette.testclient import TestClient

import main


SECRET = "test-secret-value"


@pytest.fixture
def guarded_client(monkeypatch):
    """The app with enforcement switched on."""
    monkeypatch.setattr(main, "ORIGIN_SHARED_SECRET", SECRET)
    return TestClient(main.app)


@pytest.fixture
def unguarded_client(monkeypatch):
    """The app as it runs before the secret is set anywhere."""
    monkeypatch.setattr(main, "ORIGIN_SHARED_SECRET", "")
    return TestClient(main.app)


def test_request_without_the_header_is_refused(guarded_client):
    assert guarded_client.get("/api/chat/status").status_code == 403


def test_request_with_a_wrong_secret_is_refused(guarded_client):
    response = guarded_client.get("/api/chat/status", headers={"X-Edge-Auth": "not-it"})
    assert response.status_code == 403


def test_request_carrying_the_secret_is_let_through(guarded_client):
    response = guarded_client.get("/api/chat/status", headers={"X-Edge-Auth": SECRET})
    assert response.status_code != 403


def test_health_stays_reachable_so_platform_probes_do_not_break(guarded_client):
    # Cloud Run and any uptime check call these without the header. They cost
    # no quota and disclose nothing, so they are deliberately outside the guard.
    for path in ("/", "/health"):
        assert guarded_client.get(path).status_code == 200


def test_preflight_is_not_refused(guarded_client):
    # A browser sends OPTIONS to ask whether it may send X-Edge-Auth at all, so
    # it cannot carry the header yet. Refusing preflights would break CORS for
    # the legitimate frontend while doing nothing for security - the actual
    # request that follows is still checked.
    response = guarded_client.options(
        "/api/chat/status",
        headers={
            "Origin": "https://yanirrot.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code != 403


def test_unset_secret_means_no_enforcement(unguarded_client):
    # This is what makes the rollout safe in any order: the header can appear
    # at the edge and the frontend can be repointed before enforcement starts,
    # so no sequence of deploys strands the site against an API already
    # rejecting it.
    assert unguarded_client.get("/api/chat/status").status_code != 403
