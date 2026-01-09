"""Cache service with circuit breaker resilience."""

from __future__ import annotations

import logging
from typing import Any, Callable, TypeVar

from django.core.cache import caches
from django.core.cache.backends.base import BaseCache

from .circuit_breaker import CircuitBreaker

T = TypeVar("T")

logger = logging.getLogger(__name__)


class CacheService:
    """
    Centralized cache service with circuit breaker protection.

    Provides a resilient wrapper around Django's cache framework that gracefully
    handles Redis outages by falling back to executing the underlying function.

    Args:
        cache_alias: Django cache alias to use (default: 'default')
        failure_threshold: Number of failures before opening circuit
        timeout: Seconds to wait before attempting reset
    """

    def __init__(
        self,
        cache_alias: str = "default",
        failure_threshold: int = 5,
        timeout: int = 30,
    ) -> None:
        """Initialize the cache service."""
        self.cache_alias = cache_alias
        self.circuit_breaker = CircuitBreaker(
            failure_threshold=failure_threshold,
            timeout=timeout,
        )

    @property
    def cache(self) -> BaseCache:
        """Get the cache backend instance."""
        return caches[self.cache_alias]

    def get(
        self,
        key: str,
        default: Any = None,  # noqa: ANN401
    ) -> Any:  # noqa: ANN401
        """
        Get a value from cache with circuit breaker protection.

        Args:
            key: Cache key
            default: Default value if key not found or cache unavailable

        Returns:
            Cached value or default
        """

        def _get_from_cache() -> Any:  # noqa: ANN401
            value = self.cache.get(key, default)
            # Treat None as a cache miss for consistent semantics (and to
            # behave sensibly with mocked cache backends).
            return default if value is None else value

        def _fallback() -> Any:  # noqa: ANN401
            logger.warning(
                "Cache unavailable (circuit open), returning default",
                extra={"key": key, "cache_alias": self.cache_alias},
            )
            return default

        try:
            return self.circuit_breaker.call(_get_from_cache, _fallback)
        except Exception:  # noqa: BLE001
            logger.exception(
                "Unexpected error in cache get",
                extra={"key": key, "cache_alias": self.cache_alias},
            )
            return default

    def set(
        self,
        key: str,
        value: Any,  # noqa: ANN401
        timeout: int | None = None,
    ) -> bool:
        """
        Set a value in cache with circuit breaker protection.

        Args:
            key: Cache key
            value: Value to cache
            timeout: Timeout in seconds (None = default)

        Returns:
            True if successful, False otherwise
        """

        def _set_in_cache() -> bool:
            self.cache.set(key, value, timeout)
            return True

        def _fallback() -> bool:
            logger.warning(
                "Cache unavailable (circuit open), skipping set",
                extra={"key": key, "cache_alias": self.cache_alias},
            )
            return False

        try:
            return self.circuit_breaker.call(_set_in_cache, _fallback)
        except Exception:  # noqa: BLE001
            logger.exception(
                "Unexpected error in cache set",
                extra={"key": key, "cache_alias": self.cache_alias},
            )
            return False

    def delete(self, key: str) -> bool:
        """
        Delete a key from cache with circuit breaker protection.

        Args:
            key: Cache key to delete

        Returns:
            True if successful, False otherwise
        """

        def _delete_from_cache() -> bool:
            self.cache.delete(key)
            return True

        def _fallback() -> bool:
            logger.warning(
                "Cache unavailable (circuit open), skipping delete",
                extra={"key": key, "cache_alias": self.cache_alias},
            )
            return False

        try:
            return self.circuit_breaker.call(_delete_from_cache, _fallback)
        except Exception:  # noqa: BLE001
            logger.exception(
                "Unexpected error in cache delete",
                extra={"key": key, "cache_alias": self.cache_alias},
            )
            return False

    def get_or_compute(
        self,
        key: str,
        compute_func: Callable[[], T],
        timeout: int | None = None,
    ) -> T:
        """
        Get value from cache or compute it if not found.

        If cache is unavailable, the compute function is called directly.

        Args:
            key: Cache key
            compute_func: Function to compute value if cache miss
            timeout: Cache timeout in seconds

        Returns:
            Cached or computed value
        """
        # Try to get from cache
        cached_value = self.get(key)
        if cached_value is not None:
            return cached_value

        # Cache miss or unavailable - compute value
        try:
            value = compute_func()
            # Try to cache the computed value
            self.set(key, value, timeout)
            return value
        except Exception:
            logger.exception(
                "Error computing value for cache",
                extra={"key": key, "cache_alias": self.cache_alias},
            )
            raise

    def add_tags(self, key: str, tags: list[str]) -> bool:
        """
        Associate tags with a cache key using Redis Sets.

        Creates Redis sets with pattern cache:tag:{tag_name} containing
        all keys associated with that tag. This enables O(1) tag addition
        and O(N) tag-based invalidation.

        Args:
            key: Cache key to tag
            tags: List of tag names to associate with the key

        Returns:
            True if successful, False otherwise
        """

        def _add_tags() -> bool:
            # Use raw Redis client for set operations
            # django-redis exposes the client via cache.client.get_client()
            try:
                redis_client = self.cache.client.get_client()
                for tag in tags:
                    tag_key = f"cache:tag:{tag}"
                    redis_client.sadd(tag_key, key)
                return True
            except Exception as e:
                logger.error(
                    "Failed to add tags",
                    extra={
                        "key": key,
                        "tags": tags,
                        "cache_alias": self.cache_alias,
                        "error": str(e),
                    },
                )
                return False

        def _fallback() -> bool:
            logger.warning(
                "Cache unavailable (circuit open), skipping tag addition",
                extra={"key": key, "tags": tags, "cache_alias": self.cache_alias},
            )
            return False

        try:
            return self.circuit_breaker.call(_add_tags, _fallback)
        except Exception:  # noqa: BLE001
            logger.exception(
                "Unexpected error in add_tags",
                extra={"key": key, "tags": tags, "cache_alias": self.cache_alias},
            )
            return False

    def invalidate_tags(self, tags: list[str]) -> int:
        """
        Invalidate all cache keys associated with the given tags.

        Retrieves all keys from the Redis Sets for each tag, deletes those keys,
        and cleans up the tag sets themselves. This is an O(N) operation where
        N is the total number of keys across all tags.

        Args:
            tags: List of tag names to invalidate

        Returns:
            Number of keys invalidated (0 if cache unavailable)
        """

        def _invalidate_tags() -> int:
            # Use raw Redis client for set operations
            try:
                redis_client = self.cache.client.get_client()
                keys_to_delete = set()

                # Collect all keys from all tags
                for tag in tags:
                    tag_key = f"cache:tag:{tag}"
                    # Get all members of the set
                    tag_members = redis_client.smembers(tag_key)
                    # Decode bytes to strings if needed
                    keys_to_delete.update(
                        member.decode() if isinstance(member, bytes) else member
                        for member in tag_members
                    )

                # Delete all collected keys
                if keys_to_delete:
                    # Delete cache keys
                    for key in keys_to_delete:
                        self.cache.delete(key)

                    # Clean up tag sets
                    for tag in tags:
                        tag_key = f"cache:tag:{tag}"
                        redis_client.delete(tag_key)

                logger.info(
                    "Invalidated tags",
                    extra={
                        "tags": tags,
                        "keys_invalidated": len(keys_to_delete),
                        "cache_alias": self.cache_alias,
                    },
                )
                return len(keys_to_delete)
            except Exception as e:
                logger.error(
                    "Failed to invalidate tags",
                    extra={
                        "tags": tags,
                        "cache_alias": self.cache_alias,
                        "error": str(e),
                    },
                )
                return 0

        def _fallback() -> int:
            logger.warning(
                "Cache unavailable (circuit open), skipping tag invalidation",
                extra={"tags": tags, "cache_alias": self.cache_alias},
            )
            return 0

        try:
            return self.circuit_breaker.call(_invalidate_tags, _fallback)
        except Exception:  # noqa: BLE001
            logger.exception(
                "Unexpected error in invalidate_tags",
                extra={"tags": tags, "cache_alias": self.cache_alias},
            )
            return 0
