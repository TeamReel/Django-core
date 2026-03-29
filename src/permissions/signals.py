"""
Signal handlers for automatic cache invalidation.

Triggers:
- RoleAssignment created/deleted → invalidate user cache
- Role permissions modified → invalidate all users with that role
"""

import logging

from django.db.models.signals import m2m_changed, post_delete, post_save
from django.dispatch import receiver
from permissions.cache import invalidate_role_cache, invalidate_user_cache
from permissions.models import Role, RoleAssignment

logger = logging.getLogger(__name__)


@receiver(post_save, sender=RoleAssignment)
def invalidate_cache_on_assignment_created(sender, instance, created, **kwargs):
    """Invalidate user cache when role assignment created or updated."""
    if created:
        logger.info("Role assigned: invalidating cache for user %s", instance.user_id)
    else:
        logger.info(
            "Role assignment updated: invalidating cache for user %s",
            instance.user_id,
        )

    invalidate_user_cache(instance.user_id)


@receiver(post_delete, sender=RoleAssignment)
def invalidate_cache_on_assignment_deleted(sender, instance, **kwargs):
    """Invalidate user cache when role assignment deleted."""
    logger.info("Role removed: invalidating cache for user %s", instance.user_id)
    invalidate_user_cache(instance.user_id)


@receiver(m2m_changed, sender=Role.permissions.through)
def invalidate_cache_on_role_permissions_changed(sender, instance, action, **kwargs):
    """
    Invalidate cache for all users with role when role permissions modified.
    """
    if action in ("post_add", "post_remove", "post_clear"):
        logger.info(
            "Role permissions changed: invalidating cache for role %s",
            instance.id,
        )
        invalidate_role_cache(instance.id)
