"""
B31 Content Generation - Audit Signal Handlers

Connects to Django signals to log audit events via B09 Audit module.
"""

import logging

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import ContentApproval, ContentItem, ContentTemplate

logger = logging.getLogger(__name__)


def _get_audit_log():
    """Get audit_log instance, returns None if B09 not available."""
    try:
        from src.audit.api import audit_log

        return audit_log
    except ImportError:
        return None


# ========== ContentItem Signals ==========


@receiver(post_save, sender=ContentItem)
def content_item_saved(sender, instance, created, **kwargs):
    """Log audit event when ContentItem is created or status changes."""
    audit_log = _get_audit_log()
    if not audit_log:
        return

    try:
        if created:
            audit_log.record(
                event_type="content.item.created",
                user=instance.created_by,
                project=instance.project,
                metadata={
                    "content_item_id": instance.id,
                    "template_id": instance.template_id,
                    "template_name": instance.template.name if instance.template else None,
                    "status": instance.status,
                },
            )
        else:
            # Status change - check if status field was updated
            # Note: We track all saves as status_changed for simplicity
            # A more sophisticated approach would use django-dirtyfields
            audit_log.record(
                event_type="content.item.status_changed",
                user=instance.created_by,
                project=instance.project,
                metadata={
                    "content_item_id": instance.id,
                    "template_id": instance.template_id,
                    "status": instance.status,
                    "has_error": bool(instance.error_message),
                },
            )
    except Exception as e:
        logger.warning(f"Failed to record ContentItem audit event: {e}")


@receiver(post_delete, sender=ContentItem)
def content_item_deleted(sender, instance, **kwargs):
    """Log audit event when ContentItem is hard-deleted."""
    audit_log = _get_audit_log()
    if not audit_log:
        return

    try:
        audit_log.record(
            event_type="content.item.deleted",
            user=instance.created_by,
            project=instance.project,
            metadata={
                "content_item_id": instance.id,
                "template_id": instance.template_id,
                "status": instance.status,
            },
        )
    except Exception as e:
        logger.warning(f"Failed to record ContentItem deletion audit event: {e}")


# ========== ContentApproval Signals ==========


@receiver(post_save, sender=ContentApproval)
def content_approval_saved(sender, instance, created, **kwargs):
    """Log audit event when ContentApproval is created."""
    if not created:
        return  # Only log creation, not updates

    audit_log = _get_audit_log()
    if not audit_log:
        return

    try:
        content_item = instance.content_item
        audit_log.record(
            event_type="content.approval.created",
            user=instance.reviewer,
            project=content_item.project if content_item else None,
            metadata={
                "approval_id": instance.id,
                "content_item_id": instance.content_item_id,
                "status": instance.status,
                "has_feedback": bool(instance.feedback_text),
                "reviewer_id": instance.reviewer_id,
            },
        )
    except Exception as e:
        logger.warning(f"Failed to record ContentApproval audit event: {e}")


# ========== ContentTemplate Signals ==========


@receiver(post_save, sender=ContentTemplate)
def content_template_saved(sender, instance, created, **kwargs):
    """Log audit event when ContentTemplate is created or updated."""
    audit_log = _get_audit_log()
    if not audit_log:
        return

    try:
        event_type = "content.template.created" if created else "content.template.updated"
        audit_log.record(
            event_type=event_type,
            user=instance.created_by,
            project=instance.project,
            metadata={
                "template_id": instance.id,
                "template_name": instance.name,
                "template_type": instance.template_type,
                "is_active": instance.is_active,
            },
        )
    except Exception as e:
        logger.warning(f"Failed to record ContentTemplate audit event: {e}")


@receiver(post_delete, sender=ContentTemplate)
def content_template_deleted(sender, instance, **kwargs):
    """Log audit event when ContentTemplate is deleted."""
    audit_log = _get_audit_log()
    if not audit_log:
        return

    try:
        audit_log.record(
            event_type="content.template.deleted",
            user=instance.created_by,
            project=instance.project,
            metadata={
                "template_id": instance.id,
                "template_name": instance.name,
                "template_type": instance.template_type,
            },
        )
    except Exception as e:
        logger.warning(f"Failed to record ContentTemplate deletion audit event: {e}")
