"""Rate limiting utilities for organisation management."""

from django.core.cache import cache
from django.utils import timezone


def check_rate_limit(key: str, limit: int, window_seconds: int) -> tuple[bool, int, float]:
    """
    Check if a rate limit has been exceeded.

    Args:
        key: Cache key for this rate limit
        limit: Maximum number of allowed requests
        window_seconds: Time window in seconds

    Returns:
        Tuple of (allowed, remaining, reset_timestamp)
        - allowed: True if request is allowed, False if rate limit exceeded
        - remaining: Number of remaining requests in current window
        - reset_timestamp: Unix timestamp when the rate limit window resets
    """
    current = cache.get(key, 0)

    if current >= limit:
        ttl = cache.ttl(key)
        reset_time = timezone.now().timestamp() + ttl
        return False, 0, reset_time

    if current == 0:
        cache.set(key, 1, window_seconds)
    else:
        cache.incr(key)

    remaining = limit - (current + 1)
    reset_time = timezone.now().timestamp() + window_seconds
    return True, remaining, reset_time
