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

import gemini_helper


@pytest.fixture(autouse=True)
def reset_model_cooldowns():
    gemini_helper._model_cooldowns.clear()
    yield
    gemini_helper._model_cooldowns.clear()
