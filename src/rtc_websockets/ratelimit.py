from asgiref.sync import sync_to_async
from django.core.cache import cache


class AsyncRateLimiter:
    """
    Async rate limiter using Django cache.
    """

    def __init__(self, limit=100, window=60):
        self.limit = limit
        self.window = window

    async def check_limit(self, key: str) -> tuple[bool, int]:
        """
        Check if rate limit is exceeded.
        Returns (is_allowed, remaining).
        """
        return await sync_to_async(self._check_limit_sync)(key)

    def _check_limit_sync(self, key: str) -> tuple[bool, int]:
        cache_key = f"ws_ratelimit:{key}"
        current = cache.get(cache_key, 0)

        if current >= self.limit:
            return False, 0

        if current == 0:
            cache.set(cache_key, 1, self.window)
        else:
            try:
                cache.incr(cache_key)
            except ValueError:
                # Key might have expired between get and incr
                cache.set(cache_key, 1, self.window)

        return True, self.limit - (current + 1)
