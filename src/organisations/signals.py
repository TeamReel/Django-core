"""
Django signals for organisations app.

Provides audit logging and metrics collection for:
- Organisation lifecycle events (create, update, delete)
- Membership changes (create, role change, removal)
"""

import logging

from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver

from .models import Membership, Organisation

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Organisation)
def log_organisation_change(sender, instance, created, **kwargs):
    """
    Log organisation creation and updates for audit trail.

    Args:
        sender: The model class (Organisation)
        instance: The organisation instance
        created: True if new organisation, False if updated
    """
    if created:
        logger.info(
            "Organisation created",
            extra={
                "organisation_id": str(instance.id),
                "organisation_name": instance.name,
                "creator_id": str(instance.creator.id),
            },
        )
    else:
        logger.info(
            "Organisation updated",
            extra={
                "organisation_id": str(instance.id),
                "organisation_name": instance.name,
                "is_active": instance.is_active,
            },
        )


@receiver(pre_delete, sender=Organisation)
def log_organisation_deletion(sender, instance, **kwargs):
    """
    Log organisation hard deletion for audit trail.

    Args:
        sender: The model class (Organisation)
        instance: The organisation instance being deleted
    """
    logger.warning(
        "Organisation hard deleted",
        extra={
            "organisation_id": str(instance.id),
            "organisation_name": instance.name,
            "was_soft_deleted": not instance.is_active,
        },
    )


@receiver(post_save, sender=Membership)
def log_membership_change(sender, instance, created, **kwargs):
    """
    Log membership creation and role changes for audit trail.

    Tracks:
    - New member invitations
    - Role changes (admin ↔ member)
    - Membership reactivation

    Args:
        sender: The model class (Membership)
        instance: The membership instance
        created: True if new membership, False if updated
    """
    if created:
        logger.info(
            "Membership created",
            extra={
                "membership_id": str(instance.id),
                "user_id": str(instance.user.id),
                "organisation_id": str(instance.organisation.id),
                "role": instance.role,
                "invited_by_id": str(instance.invited_by.id) if instance.invited_by else None,
            },
        )
    else:
        # Check if role changed (would need to track previous value)
        logger.info(
            "Membership updated",
            extra={
                "membership_id": str(instance.id),
                "user_id": str(instance.user.id),
                "organisation_id": str(instance.organisation.id),
                "role": instance.role,
                "is_active": instance.is_active,
            },
        )


@receiver(pre_delete, sender=Membership)
def log_membership_deletion(sender, instance, **kwargs):
    """
    Log membership removal for audit trail.

    Args:
        sender: The model class (Membership)
        instance: The membership instance being deleted
    """
    logger.info(
        "Membership deleted",
        extra={
            "membership_id": str(instance.id),
            "user_id": str(instance.user.id),
            "organisation_id": str(instance.organisation.id),
            "role": instance.role,
        },
    )
