"""
Signal handlers for Projects & Workspaces.

Provides audit logging stubs for project lifecycle events.
These are designed to integrate with Feature 009 (Audit Logging)
when that feature is implemented.

Current implementation logs to Python logging as a placeholder.
"""

import logging

from django.db.models.signals import post_delete, post_save, pre_delete
from django.dispatch import receiver

from .models import Project, ProjectMembership
from .services.cache_service import CacheService

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Project)
def log_project_saved(sender, instance, created, **kwargs):
    """
    Log project creation or update events.

    Args:
        sender: The model class (Project)
        instance: The Project instance being saved
        created: Boolean indicating if this is a new instance
        **kwargs: Additional signal arguments

    Note:
        This is a stub implementation using Python logging.
        When Feature 009 (Audit Logging) is implemented, replace
        this with proper audit service calls.
    """
    if created:
        logger.info(
            "Project created: id=%s, name=%s, org=%s, creator=%s",
            instance.id,
            instance.name,
            instance.organisation_id,
            instance.creator_id,
        )
    else:
        logger.info(
            "Project updated: id=%s, name=%s, active=%s",
            instance.id,
            instance.name,
            instance.is_active,
        )


@receiver(pre_delete, sender=Project)
def log_project_pre_delete(sender, instance, **kwargs):
    """
    Log project pre-deletion event.

    Args:
        sender: The model class (Project)
        instance: The Project instance being deleted
        **kwargs: Additional signal arguments

    Note:
        This captures the project state before hard deletion.
        Soft deletion (archive) is handled by post_save signal.

        When Feature 009 is implemented, replace with audit service.
    """
    logger.warning(
        "Project pre-delete: id=%s, name=%s, org=%s, active=%s",
        instance.id,
        instance.name,
        instance.organisation_id,
        instance.is_active,
    )


@receiver(post_delete, sender=Project)
def log_project_deleted(sender, instance, **kwargs):
    """
    Log project deletion event.

    Args:
        sender: The model class (Project)
        instance: The Project instance that was deleted
        **kwargs: Additional signal arguments

    Note:
        This is called after hard deletion completes.

        When Feature 009 is implemented, replace with audit service.
    """
    logger.warning(
        "Project deleted: id=%s, name=%s (hard delete completed)",
        instance.id,
        instance.name,
    )


# TODO: When Feature 009 (Audit Logging) is implemented, update these handlers to:
# 1. Import the audit logging service
# 2. Replace logger.info/warning calls with audit service calls
# 3. Include additional context: user, IP, timestamp, action details
# 4. Log to structured audit trail instead of application logs


@receiver(post_save, sender=ProjectMembership)
def invalidate_on_membership_change(sender, instance, **kwargs):
    """Invalidate cache when membership changes."""
    try:
        cache_service = CacheService()
        cache_service.invalidate_user_project_permissions(
            str(instance.user_id), str(instance.project_id)
        )
    except Exception:
        # Cache invalidation is best-effort; never break core writes.
        logger.warning(
            "Failed to invalidate permissions cache on membership change",
            exc_info=True,
        )


@receiver(post_delete, sender=ProjectMembership)
def invalidate_on_membership_delete(sender, instance, **kwargs):
    """Invalidate cache when membership deleted."""
    try:
        cache_service = CacheService()
        cache_service.invalidate_user_project_permissions(
            str(instance.user_id), str(instance.project_id)
        )
    except Exception:
        # Cache invalidation is best-effort; never break core writes.
        logger.warning(
            "Failed to invalidate permissions cache on membership delete",
            exc_info=True,
        )


@receiver(post_save, sender=Project)
def invalidate_on_privacy_change(sender, instance, **kwargs):
    """Invalidate all project permissions if privacy changed."""
    if kwargs.get("update_fields") and "is_private" in kwargs["update_fields"]:
        try:
            cache_service = CacheService()
            cache_service.invalidate_project_permissions(str(instance.id))
        except Exception:
            # Cache invalidation is best-effort; never break core writes.
            logger.warning(
                "Failed to invalidate project permissions cache on privacy change",
                exc_info=True,
            )
