"""Shared test setup.

The model cooldown table in gemini_helper is module-level mutable state, which
makes it exactly the kind of thing that leaks between tests: a test that
exhausts the models leaves every one of them marked unusable, and the next test
- in the same process - gets "busy" for a request that should have reached the
model at all.

That is not hypothetical. Without this fixture,
test_quota_exhaustion_advances_through_every_model cools down all three models
with its 429s, and test_auth_failure_is_not_reported_as_busy then runs into a
chain where nothing is callable and answers BUSY_MESSAGE instead of
MISCONFIGURED_MESSAGE - a failure with nothing to do with the behaviour under
test, in a file that never mentions cooldowns.

Resetting for every test rather than only in the file that introduced the state
is the point: the next person to add a test should not have to know this exists.
"""

import pytest
from google.genai import errors as genai_errors

import gemini_helper


class ApiError(genai_errors.APIError):
    """An APIError carrying a status code, without an HTTP response object.

    Built by setting the one attribute the code under test reads, rather than
    by calling the SDK's constructor. The constructor form -
    `APIError(code, {...})` - depends on the shape of the SDK's own __init__,
    which changed: on some versions it parses the dict as an HTTP response and
    raises `AttributeError: 'dict' object has no attribute 'body_segments'`
    before a test reaches its assertion. That made two tests in this suite fail
    for a reason unrelated to what they check, and a test failing for the wrong
    reason has stopped protecting anything.
    """

    def __init__(self, code: int, message: str = "test"):
        self.code = code
        self.message = message
        Exception.__init__(self, f"{code} {message}")


@pytest.fixture(autouse=True)
def reset_model_cooldowns():
    gemini_helper._model_cooldowns.clear()
    yield
    gemini_helper._model_cooldowns.clear()
