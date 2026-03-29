from typing import Any, Optional

from django.core.cache import cache
from projects.metrics import cache_invalidation_total


class CacheService:
    """Hybrid caching: request-scoped + Redis."""

    CACHE_TTL = 300  # 5 minutes

    def get_permission(self, user_id: str, project_id: str) -> Optional[dict[str, Any]]:
        """Get from Redis cache."""
        key = self._cache_key(user_id, project_id)
        return cache.get(key)

    def set_permission(self, user_id: str, project_id: str, result: dict[str, Any]) -> None:
        """Save to Redis cache."""
        key = self._cache_key(user_id, project_id)
        cache.set(key, result, self.CACHE_TTL)

    def invalidate_user_project_permissions(self, user_id: str, project_id: str) -> None:
        """Invalidate specific user-project permission."""
        key = self._cache_key(user_id, project_id)
        cache.delete(key)
        # Record cache invalidation metric
        cache_invalidation_total.labels(trigger="user_project_specific").inc()

    def invalidate_project_permissions(self, project_id: str) -> None:
        """Invalidate all permissions for a project."""
        # Use pattern matching or maintain a set of keys
        # Note: delete_pattern is not supported by all backends (e.g. memcached)
        # but is supported by Redis.
        cache.delete_pattern(f"permissions:*:project:{project_id}")
        # Record cache invalidation metric
        cache_invalidation_total.labels(trigger="project_wide").inc()

    def _cache_key(self, user_id: str, project_id: str) -> str:
        return f"permissions:user:{user_id}:project:{project_id}"
