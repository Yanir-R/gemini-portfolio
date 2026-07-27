"""Rate limiting for endpoints that cost money or quota to serve.

The chat endpoints are unauthenticated and call the Gemini API on every request,
so without a limit a single client can exhaust the API quota (and, on a paid
tier, spend real money). Two windows are enforced:

- per-client, so one abuser cannot deny service to everyone else
- global, which caps total upstream calls per instance regardless of how many
  distinct source addresses are used. This is the cost guard: it still holds
  when the per-client key is spoofed or when traffic is spread across a botnet.

State is per-process and in-memory, so the effective global ceiling is

    GLOBAL_PER_MINUTE x processes-per-instance x max-instances

Both deployment paths run a single process per instance (the workflow's
generated Dockerfile and backend/Dockerfile both use plain uvicorn), and Cloud
Run is capped at 4 instances, so the real ceiling is GLOBAL_PER_MINUTE x 4.
Switching to gunicorn with multiple workers would multiply it again - see the
note in backend/Dockerfile.

Keeping the state in-process is intentional: a shared counter would mean running
Redis for a portfolio site. It is also why the global default sits well below
the upstream free-tier quota rather than at it.
"""

import logging
import os
import threading
import time
from collections import deque
from typing import Deque, Dict, Tuple

from fastapi import Request

logger = logging.getLogger(__name__)

WINDOW_SECONDS = 60

# Number of distinct client keys tracked before idle entries are swept. Bounds
# memory so that spraying unique source addresses cannot exhaust the instance.
MAX_TRACKED_KEYS = 10_000


def _int_env(name: str, default: int) -> int:
    """Reads a non-negative int from the environment; 0 disables that limit."""
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        value = int(raw)
    except ValueError:
        logger.warning("%s=%r is not an integer, using default %d", name, raw, default)
        return default
    return max(0, value)


class SlidingWindowLimiter:
    """Fixed-cost sliding window over request timestamps."""

    def __init__(self, per_key_limit: int, global_limit: int):
        self.per_key_limit = per_key_limit
        self.global_limit = global_limit
        self._keys: Dict[str, Deque[float]] = {}
        self._global: Deque[float] = deque()
        self._lock = threading.Lock()
        # Saturation persists across many requests, so the warning is throttled
        # to once per window rather than emitted per request.
        self._last_saturation_log = 0.0

    @staticmethod
    def _prune(window: Deque[float], now: float) -> None:
        cutoff = now - WINDOW_SECONDS
        while window and window[0] <= cutoff:
            window.popleft()

    def _sweep_idle_keys(self, now: float) -> None:
        """Drops keys whose windows have fully aged out."""
        cutoff = now - WINDOW_SECONDS
        stale = [key for key, window in self._keys.items() if not window or window[-1] <= cutoff]
        for key in stale:
            del self._keys[key]

    def check(self, key: str) -> Tuple[bool, int]:
        """Records a request. Returns (allowed, retry_after_seconds)."""
        now = time.monotonic()

        with self._lock:
            if self.global_limit:
                self._prune(self._global, now)
                if len(self._global) >= self.global_limit:
                    retry_after = int(WINDOW_SECONDS - (now - self._global[0])) + 1
                    return False, max(1, retry_after)

            if self.per_key_limit:
                window = self._keys.get(key)

                if window is None:
                    if len(self._keys) >= MAX_TRACKED_KEYS:
                        self._sweep_idle_keys(now)

                    if len(self._keys) >= MAX_TRACKED_KEYS:
                        # The sweep freed nothing, so every tracked key is still
                        # active. Track no further keys rather than growing the
                        # map without bound; the global window below is what
                        # actually caps cost, and it still applies. Rejecting
                        # instead would let a key-spraying client deny service to
                        # every new legitimate visitor.
                        if now - self._last_saturation_log >= WINDOW_SECONDS:
                            self._last_saturation_log = now
                            logger.warning(
                                "Client key table saturated at %d entries; "
                                "falling back to global-only limiting",
                                MAX_TRACKED_KEYS,
                            )
                    else:
                        window = self._keys.setdefault(key, deque())

                if window is not None:
                    self._prune(window, now)
                    if len(window) >= self.per_key_limit:
                        retry_after = int(WINDOW_SECONDS - (now - window[0])) + 1
                        return False, max(1, retry_after)
                    window.append(now)

            if self.global_limit:
                self._global.append(now)

        return True, 0


def client_key(request: Request) -> str:
    """Identifies the caller for per-client limiting.

    Uses the LAST X-Forwarded-For entry, not the first. Proxies append the peer
    they received from, so on Cloud Run the trailing entry is the one Google's
    front end added and is the only part a client cannot forge - a request
    carrying a handcrafted `X-Forwarded-For: 1.2.3.4` arrives as
    "1.2.3.4, <real client>". Reading the first entry would let anyone reset
    their own bucket at will.
    """
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        parts = [part.strip() for part in forwarded.split(",") if part.strip()]
        if parts:
            return parts[-1]

    return request.client.host if request.client else "unknown"


def enforce_rate_limit(request: Request, limiter: "SlidingWindowLimiter", label: str) -> None:
    """Raises 429 with Retry-After when the caller is over budget."""
    # Imported here to keep this module importable without FastAPI's app wiring.
    from fastapi import HTTPException

    key = client_key(request)
    allowed, retry_after = limiter.check(key)
    if allowed:
        return

    logger.warning("Rate limit hit on %s for %s (retry in %ss)", label, key, retry_after)
    raise HTTPException(
        status_code=429,
        detail="Too many requests. Please wait a moment before trying again.",
        headers={"Retry-After": str(retry_after)},
    )


chat_limiter = SlidingWindowLimiter(
    per_key_limit=_int_env("RATE_LIMIT_CHAT_PER_IP_PER_MINUTE", 10),
    global_limit=_int_env("RATE_LIMIT_CHAT_GLOBAL_PER_MINUTE", 40),
)

contact_limiter = SlidingWindowLimiter(
    per_key_limit=_int_env("RATE_LIMIT_CONTACT_PER_IP_PER_MINUTE", 3),
    global_limit=_int_env("RATE_LIMIT_CONTACT_GLOBAL_PER_MINUTE", 15),
)
