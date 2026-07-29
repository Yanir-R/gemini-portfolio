"""Rate limiting for endpoints that cost money or quota to serve.

The chat endpoints are unauthenticated and call the Gemini API on every request,
so without a limit a single client can exhaust the API quota (and, on a paid
tier, spend real money). Two windows are enforced:

- per-client, so one abuser cannot deny service to everyone else
- global, which caps total upstream calls per instance regardless of how many
  distinct source addresses are used. This is the cost guard: it still holds
  when the per-client key is spoofed or when traffic is spread across a botnet.

State is per-process and in-memory, so the effective global ceiling is

    global_limit x processes-per-instance x max-instances

Both deployment paths run a single process per instance (the workflow's
generated Dockerfile and backend/Dockerfile both use plain uvicorn), and Cloud
Run is capped at 4 instances, so the chat ceiling is 12 x 4 = 48 answers a day.
Switching to gunicorn with multiple workers would multiply it again - see the
note in backend/Dockerfile.

Keeping the state in-process is intentional: a shared counter would mean running
Redis for a portfolio site.

The windows are deliberately different lengths, because the two limiters answer
different questions. Contact is a rate: how often may somebody send. Chat is a
budget: how many answers is one visitor entitled to - which is only meaningful
over a span long enough to matter, so it runs over a day.

The chat budget is set by what is upstream, and upstream is a daily volume
rather than a per-minute throughput: Gemini's free tier grants 20 requests per
DAY per model, so this site's real capacity is roughly 20 chat answers a day per
model, 60 across the three the fallback chain tries. A per-minute window would
renew 1,440 times a day and cap nothing that matters. Everything below is sized
to fit inside the daily ceiling rather than to look generous.
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

    def __init__(self, per_key_limit: int, global_limit: int, window_seconds: int = WINDOW_SECONDS):
        self.per_key_limit = per_key_limit
        self.global_limit = global_limit
        # Per-limiter rather than a module constant: contact is a rate, so a
        # minute is right, while chat is a daily budget. See the module docstring.
        self.window_seconds = window_seconds
        self._keys: Dict[str, Deque[float]] = {}
        self._global: Deque[float] = deque()
        self._lock = threading.Lock()
        # Saturation persists across many requests, so the warning is throttled
        # to once per window rather than emitted per request.
        self._last_saturation_log = 0.0

    def _prune(self, window: Deque[float], now: float) -> None:
        cutoff = now - self.window_seconds
        while window and window[0] <= cutoff:
            window.popleft()

    def _sweep_idle_keys(self, now: float) -> None:
        """Drops keys whose windows have fully aged out."""
        cutoff = now - self.window_seconds
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
                    retry_after = int(self.window_seconds - (now - self._global[0])) + 1
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
                        retry_after = int(self.window_seconds - (now - window[0])) + 1
                        return False, max(1, retry_after)
                    window.append(now)

            if self.global_limit:
                self._global.append(now)

        return True, 0


def client_key(request: Request) -> str:
    """Identifies the caller for per-client limiting.

    Two cases, because the API can be reached two ways and the trustworthy
    identifier is different in each.

    Through the Cloudflare Worker, CF-Connecting-IP carries the real visitor and
    is used - but only when the request proved it came through the edge by
    presenting the shared secret, which main.py records as
    `request.state.edge_verified`. On its own that header means nothing: anyone
    talking to the origin directly can invent one. The proof is what makes it
    usable, so the two mechanisms are deliberately coupled.

    Without that proof, the LAST X-Forwarded-For entry, not the first. Proxies
    append the peer they received from, so on Cloud Run the trailing entry is
    the one Google's front end added and is the only part a client cannot forge
    - a request carrying a handcrafted `X-Forwarded-For: 1.2.3.4` arrives as
    "1.2.3.4, <real client>". Reading the first entry would let anyone reset
    their own bucket at will.

    That trailing entry is only the visitor when the visitor is the peer. Behind
    the Worker it is a Cloudflare edge address shared by everyone at that PoP, so
    the per-IP budget would become one budget for all of them - which is why a
    verified request uses CF-Connecting-IP instead.
    """
    if getattr(request.state, "edge_verified", False):
        cf_connecting_ip = request.headers.get("cf-connecting-ip", "").strip()
        if cf_connecting_ip:
            return cf_connecting_ip
        # Fall through rather than fail closed. If the header ever stops
        # arriving, sharing a bucket is a degradation; refusing service is an
        # outage.

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


# Ten answers per visitor per day: enough to hold a real conversation about the
# work, few enough that nobody drains the quota.
#
# The global ceiling is per instance and Cloud Run runs up to four, so the worst
# case is 4 x 12 = 48 upstream calls a day, under the ~60 the three-model
# fallback chain can serve on the free tier. It is a cost guard rather than a
# fairness one: it still holds when the per-visitor key is spoofed or when
# traffic is spread across many addresses.
DAY_SECONDS = 24 * 60 * 60

chat_limiter = SlidingWindowLimiter(
    per_key_limit=_int_env("RATE_LIMIT_CHAT_PER_IP_PER_DAY", 10),
    global_limit=_int_env("RATE_LIMIT_CHAT_GLOBAL_PER_DAY", 12),
    window_seconds=_int_env("RATE_LIMIT_CHAT_WINDOW_SECONDS", DAY_SECONDS),
)

contact_limiter = SlidingWindowLimiter(
    per_key_limit=_int_env("RATE_LIMIT_CONTACT_PER_IP_PER_MINUTE", 3),
    global_limit=_int_env("RATE_LIMIT_CONTACT_GLOBAL_PER_MINUTE", 15),
)
