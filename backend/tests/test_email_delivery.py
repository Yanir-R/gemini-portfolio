"""Delivery of an address collected in chat.

This is the path a visitor actually takes: they type an address into the chat,
the backend emails it to Yanir, and the reply they see depends on whether that
send succeeded. No SMTP server is involved here - the transport is stubbed and
these assert what is handed to it and what the visitor is told.
"""

import asyncio

import pytest

import main


SENDER = "site@example.com"
RECEIVER = "yanir@example.com"


class _FakeSMTP:
    """Records the message instead of sending it."""

    sent = []

    def __init__(self, host, port):
        self.host = host
        self.port = port

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def login(self, user, password):
        self.user = user

    def send_message(self, msg):
        _FakeSMTP.sent.append(msg)


@pytest.fixture
def smtp(monkeypatch):
    _FakeSMTP.sent = []
    monkeypatch.setenv("EMAIL_ADDRESS", SENDER)
    monkeypatch.setenv("EMAIL_PASSWORD", "app-password")
    monkeypatch.setenv("YOUR_EMAIL", RECEIVER)
    monkeypatch.setattr(main.smtplib, "SMTP_SSL", _FakeSMTP)
    return _FakeSMTP


def test_a_collected_address_is_emailed_and_confirmed(smtp):
    reply = asyncio.run(
        main._deliver_collected_email("visitor@example.com", "wants to talk", "chat")
    )

    assert len(smtp.sent) == 1
    message = smtp.sent[0]
    assert message["To"] == RECEIVER
    assert message["From"] == SENDER
    # The visitor's address has to survive into the body, or the notification
    # arrives with no way to reply to it.
    # MIMEMultipart holds parts, not text; the body is the first one.
    body = message.get_payload()[0].get_payload()
    assert "visitor@example.com" in body
    assert "wants to talk" in body

    assert reply["response"] == main.EMAIL_RECEIVED_MESSAGE
    assert reply["email_collected"] is True


def test_a_failed_send_tells_the_visitor_where_to_write_instead(smtp, monkeypatch):
    def refuse(*args, **kwargs):
        raise OSError("connection refused")

    monkeypatch.setattr(main.smtplib, "SMTP_SSL", refuse)

    reply = asyncio.run(
        main._deliver_collected_email("visitor@example.com", "wants to talk", "chat")
    )

    # Reporting a 500 would leave the visitor with a generic error and no idea
    # their message went nowhere, so the failure is answered in Yanir's voice
    # with the address to use instead.
    assert reply["response"] == main.EMAIL_SEND_FAILED_MESSAGE
    assert reply.get("email_collected") is not True


def test_missing_email_configuration_does_not_pretend_to_have_sent(smtp, monkeypatch):
    monkeypatch.delenv("EMAIL_PASSWORD", raising=False)

    reply = asyncio.run(
        main._deliver_collected_email("visitor@example.com", "wants to talk", "chat")
    )

    assert smtp.sent == []
    assert reply["response"] == main.EMAIL_SEND_FAILED_MESSAGE
