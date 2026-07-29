"""Shared fixtures and stubs for the backend tests.

Two pieces of module-level mutable state leak between tests unless they are
reset: gemini_helper's model cooldown table and context's corpus cache. A test
that exhausts the fallback chain leaves every model marked unusable, and the
next test in the same process gets BUSY_MESSAGE for a request that should have
reached the model - a failure with nothing to do with the behaviour under test,
in a file that never mentions cooldowns.

Resetting centrally rather than in the file that introduced the state is the
point: the next person to add a test should not have to know this exists.
"""

import pytest
from google.genai import errors as genai_errors

import context
import gemini_helper


class ApiError(genai_errors.APIError):
    """An APIError carrying a status code, without an HTTP response object.

    Built by setting the one attribute the code under test reads, rather than by
    calling the SDK's constructor. The constructor form - `APIError(code, {...})`
    - depends on the shape of the SDK's own __init__, which on some versions
    parses the dict as an HTTP response and raises `AttributeError: 'dict'
    object has no attribute 'body_segments'` before the test reaches its
    assertion. A test that fails for the wrong reason protects nothing.
    """

    def __init__(self, code: int, message: str = "test"):
        self.code = code
        self.message = message
        Exception.__init__(self, f"{code} {message}")


class StubModels:
    """Stands in for `client.models`, recording every model it is asked for.

    An outcome is an exception to raise, a response object to return, or a
    zero-argument callable invoked in place of the upstream call - which lets a
    test make time pass from inside it. With `repeat`, one outcome answers every
    call; otherwise outcomes are consumed in order, one per model tried.
    """

    def __init__(self, outcomes, repeat: bool):
        self.outcomes = list(outcomes)
        self.repeat = repeat
        self.tried = []

    def generate_content(self, model, contents, config):
        self.tried.append(model)
        outcome = self.outcomes[0] if self.repeat else self.outcomes.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        if callable(outcome):
            return outcome()
        return outcome


@pytest.fixture(autouse=True)
def reset_model_cooldowns():
    gemini_helper._model_cooldowns.clear()
    yield
    gemini_helper._model_cooldowns.clear()


@pytest.fixture
def stub_gemini(monkeypatch):
    """Installs a stub Gemini client and returns the StubModels behind it.

    Call as `stub_gemini(a, b, c)` for one outcome per model in the fallback
    chain, or `stub_gemini(x, repeat=True)` when every call should behave the
    same way.

    The stub constructor takes **kwargs rather than a fixed signature: the real
    client is built with whatever configuration the caller needs - http_options
    carries the request timeout, for one - and pinning the argument list turns
    every future addition into a failure about the stub rather than about the
    behaviour under test.
    """

    def install(*outcomes, repeat: bool = False) -> StubModels:
        models = StubModels(outcomes, repeat)
        client = type("StubClient", (), {"models": models})()
        monkeypatch.setattr(gemini_helper.genai, "Client", lambda **kwargs: client)
        return models

    return install


@pytest.fixture
def stub_knowledge(monkeypatch):
    """A non-empty corpus, with prompt assembly stubbed out.

    For tests about the upstream call and its failure handling, where the
    content of the system instruction is irrelevant and building it from the
    real corpus would only couple them to prompt.py.
    """
    monkeypatch.setattr(gemini_helper, "build_system_instruction", lambda k: "sys")
    monkeypatch.setattr(gemini_helper, "build_contents", lambda q, h: ["q"])
    return type("Knowledge", (), {"is_empty": False})()


@pytest.fixture
def fresh_corpus_cache():
    """Empties context's module-level corpus cache around a test that rebuilds it.

    Both the cache the test starts from and the one it leaves behind would
    otherwise be someone else's problem.
    """
    context._cache = None
    yield
    context._cache = None
