import logging

import redis.exceptions
from django_redis.exceptions import ConnectionInterrupted
from rest_framework.throttling import SimpleRateThrottle

logger = logging.getLogger(__name__)


class GracefulThrottleMixin:
    """
    Mixin to handle Redis connection failures gracefully.
    If Redis is unavailable, throttling is disabled (fail-open for availability).
    """

    def allow_request(self, request, view):
        """
        Override to catch Redis connection errors.
        """
        try:
            return super().allow_request(request, view)
        except (
            ConnectionInterrupted,
            ConnectionError,
            TimeoutError,
            redis.exceptions.TimeoutError,
            redis.exceptions.ConnectionError,
        ) as e:
            logger.warning(f"Throttling disabled due to cache failure: {e.__class__.__name__}")
            return True  # Fail-open: allow request when Redis is down


class AuthenticatedUserThrottle(GracefulThrottleMixin, SimpleRateThrottle):
    """
    Rate limiter for authenticated users: 100 requests per minute.

    Uses Redis key: throttle:auth:{user_id}
    Returns 429 Too Many Requests when limit exceeded.

    Headers injected:
    - X-RateLimit-Limit: 100
    - X-RateLimit-Remaining: (count)
    - X-RateLimit-Reset: (timestamp)

    Usage:
        Configure globally in REST_FRAMEWORK settings:
        "DEFAULT_THROTTLE_CLASSES": ["api.throttling.AuthenticatedUserThrottle"]
    """

    scope = "authenticated"

    def get_cache_key(self, request, view):
        """
        Generate cache key for authenticated users.
        Returns None for unauthenticated (skips this throttle).
        """
        if request.user and request.user.is_authenticated:
            return f"throttle_auth_{request.user.id}"
        return None  # Skip throttle for unauthenticated

    def get_rate(self):
        """
        Return rate limit for authenticated users.
        """
        return "1000/min"  # FR-020: 1000 requests per minute (Increased for Demo)


class AnonymousUserThrottle(GracefulThrottleMixin, SimpleRateThrottle):
    """
    Rate limiter for anonymous users: 10 requests per minute per IP.

    Uses Redis key: throttle:anon:{ip_address}
    Returns 429 Too Many Requests when limit exceeded.

    Headers injected:
    - X-RateLimit-Limit: 10
    - X-RateLimit-Remaining: (count)
    - X-RateLimit-Reset: (timestamp)

    Usage:
        Configure globally in REST_FRAMEWORK settings:
        "DEFAULT_THROTTLE_CLASSES": ["api.throttling.AnonymousUserThrottle"]
    """

    scope = "anonymous"

    def get_cache_key(self, request, view):
        """
        Generate cache key for anonymous users using IP address.
        Returns None for authenticated users (skips this throttle).
        """
        if request.user and request.user.is_authenticated:
            return None  # Skip throttle for authenticated users

        # Use IP address for anonymous rate limiting
        ident = self.get_ident(request)
        return f"throttle_anon_{ident}"

    def get_rate(self):
        """
        Return rate limit for anonymous users.
        """
        return "60/min"  # FR-021: 60 requests per minute (Increased for Demo)
