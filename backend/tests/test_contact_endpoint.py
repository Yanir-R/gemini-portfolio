"""The public contact route.

The address submitted here is interpolated into an outbound email body, so it is
validated at the schema and rejected before the handler runs. These cases stop
short of delivery: an invalid address never reaches SMTP, which is the property
worth pinning without a mail server in the loop.
"""

import pytest
from starlette.testclient import TestClient

import main


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(main, "ORIGIN_SHARED_SECRET", "")
    return TestClient(main.app)


@pytest.mark.parametrize(
    "address",
    ["not-an-address", "missing@domain", "@example.com", "spaces in@example.com", ""],
)
def test_an_invalid_address_is_refused_before_anything_is_sent(client, address, monkeypatch):
    def explode(*args, **kwargs):
        raise AssertionError("delivery must not be attempted for an invalid address")

    monkeypatch.setattr(main, "_send_contact_email", explode)

    response = client.post("/api/contact", json={"email": address, "message": "hello"})

    assert response.status_code == 422


def test_an_oversized_message_is_refused(client, monkeypatch):
    def explode(*args, **kwargs):
        raise AssertionError("delivery must not be attempted for an oversized message")

    monkeypatch.setattr(main, "_send_contact_email", explode)

    response = client.post(
        "/api/contact",
        json={"email": "visitor@example.com", "message": "x" * (main.MAX_MESSAGE_CHARS + 1)},
    )

    assert response.status_code == 422


def test_a_rejected_request_does_not_spend_a_rate_limit_slot(client, monkeypatch):
    """Validation runs before the endpoint, so a malformed body costs nothing.

    The limiter exists to protect a scarce resource. Letting requests that were
    never going to be delivered consume it would let anyone exhaust the budget
    with input that fails at the schema.
    """
    calls = []
    monkeypatch.setattr(main, "enforce_rate_limit", lambda *a, **k: calls.append(a))

    response = client.post("/api/contact", json={"email": "nope", "message": "hello"})

    assert response.status_code == 422
    assert calls == []
