"""
Redis caching layer for permission evaluations.

Cache Key Pattern:
    perms:{user_id}:{permission}:{resource_type}:{resource_id}

Example Keys:
    perms:123e4567:projects.delete:project:proj-abc
    perms:123e4567:org.invite_users:organisation:org-xyz
"""

import logging
from typing import Optional
from uuid import UUID

from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)


def _make_cache_key(
    user_id: UUID,
    permission: str,
    resource_type: str,
    resource_id: Optional[UUID] = None,
) -> str:
    """
    Generate cache key for permission evaluation.

    Args:
        user_id: UUID of user checking permission
        permission: Permission string (e.g., 'projects.delete')
        resource_type: Resource type (e.g., 'project')
        resource_id: Optional UUID of specific resource instance

    Returns:
        Cache key string (e.g.,
            'perms:123e4567:projects.delete:project:proj-abc')
    """
    prefix = getattr(settings, "PERMISSIONS_CACHE_PREFIX", "perms")
    resource_id_str = str(resource_id) if resource_id else "none"
    return f"{prefix}:{user_id}:{permission}:{resource_type}:{resource_id_str}"


def get_cached_evaluation(
    user_id: UUID,
    permission: str,
    resource_type: str,
    resource_id: Optional[UUID] = None,
) -> Optional[bool]:
    """
    Get cached permission evaluation result.

    Args:
        user_id: UUID of user
        permission: Permission string
        resource_type: Resource type
        resource_id: Optional resource ID

    Returns:
        True/False if cached, None if cache miss or Redis unavailable
    """
    try:
        key = _make_cache_key(user_id, permission, resource_type, resource_id)
        result = cache.get(key)

        if result is not None:
            logger.debug(f"Cache hit for {key}")

        return result
    except Exception as e:
        logger.warning(f"Cache get failed: {e}")
        return None  # Cache miss on error


def set_cached_evaluation(
    user_id: UUID,
    permission: str,
    resource_type: str,
    resource_id: Optional[UUID],
    decision: bool,
) -> None:
    """
    Cache permission evaluation result.

    Args:
        user_id: UUID of user
        permission: Permission string
        resource_type: Resource type
        resource_id: Optional resource ID
        decision: Grant (True) or deny (False)
    """
    try:
        key = _make_cache_key(user_id, permission, resource_type, resource_id)
        ttl = getattr(settings, "PERMISSIONS_CACHE_TTL", 300)
        cache.set(key, decision, timeout=ttl)
        logger.debug(f"Cached evaluation for {key} = {decision} (TTL={ttl}s)")
    except Exception as e:
        logger.warning(f"Cache set failed: {e}")
        # Non-fatal - continue without caching


def invalidate_user_cache(user_id: UUID) -> None:
    """
    Invalidate all cached evaluations for a user.

    Uses Redis SCAN pattern matching to find and delete all keys
    matching: perms:{user_id}:*

    Args:
        user_id: UUID of user whose cache to invalidate
    """
    try:
        prefix = getattr(settings, "PERMISSIONS_CACHE_PREFIX", "perms")
        pattern = f"{prefix}:{user_id}:*"

        # Django cache doesn't have scan, so use delete_pattern if available
        # (requires django-redis backend)
        if hasattr(cache, "delete_pattern"):
            count = cache.delete_pattern(pattern)
            logger.info(f"Invalidated {count} cache entries for user {user_id}")
        else:
            logger.warning("delete_pattern not available, cache invalidation skipped")
    except Exception as e:
        logger.error(f"Cache invalidation failed for user {user_id}: {e}")


def invalidate_role_cache(role_id: UUID) -> None:
    """
    Invalidate cache for all users with a specific role.

    This is expensive - must query all assignments for this role,
    then invalidate each user's cache. Called when role permissions modified.

    Args:
        role_id: UUID of role whose assignments should be invalidated
    """
    try:
        from permissions.models import RoleAssignment

        user_ids = RoleAssignment.objects.filter(role_id=role_id).values_list("user_id", flat=True)
        user_ids = list(set(user_ids))  # Deduplicate

        for user_id in user_ids:
            invalidate_user_cache(user_id)

        logger.info(f"Invalidated cache for {len(user_ids)} users with " f"role {role_id}")
    except Exception as e:
        logger.error(f"Cache invalidation failed for role {role_id}: {e}")
