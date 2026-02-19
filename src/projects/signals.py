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

from .models import Project, ProjectFunctionalRoleAssignment, ProjectMembership
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
        # Auto-create child team + brand identity for new clubs
        if instance.parent_project is None:
            _auto_create_club_children(instance)
    else:
        logger.info(
            "Project updated: id=%s, name=%s, active=%s",
            instance.id,
            instance.name,
            instance.is_active,
        )


def _auto_create_club_children(club):
    """Auto-create 'Heren 1' team and BrandProfile with default tokens for a new club.

    Best-effort: failures are logged but never block club creation.
    """
    # ── 1. Auto-create "Heren 1" team ──
    try:
        team, team_created = Project.objects.get_or_create(
            organisation=club.organisation,
            parent_project=club,
            name="Heren 1",
            defaults={
                "creator": club.creator,
                "is_active": True,
            },
        )
        if team_created:
            logger.info(
                "Auto-created team 'Heren 1' (id=%s) for club %s (id=%s)",
                team.id,
                club.name,
                club.id,
            )
    except Exception:
        logger.warning(
            "Failed to auto-create 'Heren 1' team for club %s (id=%s)",
            club.name,
            club.id,
            exc_info=True,
        )

    # ── 2. Auto-create BrandProfile + default tokens ──
    try:
        from branding.models import BrandProfile, DesignToken

        profile, profile_created = BrandProfile.objects.get_or_create(
            project=club,
            defaults={
                "name": f"{club.name} Brand",
                "is_active": True,
                "created_by": club.creator,
            },
        )
        if profile_created:
            default_tokens = [
                DesignToken(
                    profile=profile,
                    key="primary_color",
                    value="#1a1a2e",
                    type="color",
                    description="Primary brand color",
                ),
                DesignToken(
                    profile=profile,
                    key="secondary_color",
                    value="#e94560",
                    type="color",
                    description="Secondary brand color",
                ),
                DesignToken(
                    profile=profile,
                    key="accent_color",
                    value="#0f3460",
                    type="color",
                    description="Accent brand color",
                ),
                DesignToken(
                    profile=profile,
                    key="font_heading",
                    value="Inter",
                    type="font",
                    description="Heading font family",
                ),
                DesignToken(
                    profile=profile,
                    key="font_body",
                    value="Inter",
                    type="font",
                    description="Body font family",
                ),
                DesignToken(
                    profile=profile,
                    key="border_radius",
                    value="8px",
                    type="spacing",
                    description="Default border radius",
                ),
            ]
            DesignToken.objects.bulk_create(default_tokens)
            logger.info(
                "Auto-created BrandProfile (id=%s) with %d default tokens for club %s",
                profile.id,
                len(default_tokens),
                club.name,
            )
    except Exception:
        logger.warning(
            "Failed to auto-create BrandProfile for club %s (id=%s)",
            club.name,
            club.id,
            exc_info=True,
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
        # If a user is no longer a member of a team, remove any functional-role
        # assignments for that team to avoid stale role rows.
        manager = getattr(ProjectFunctionalRoleAssignment, "objects", None)
        if manager is not None:
            manager.filter(
                project_id=instance.project_id,
                user_id=instance.user_id,
            ).delete()
    except Exception:
        # Best-effort cleanup; never break core deletes.
        logger.warning(
            "Failed to cleanup functional role assignments on membership delete",
            exc_info=True,
        )

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
