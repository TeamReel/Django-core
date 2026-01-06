"""
Signal handlers for Activities & Period Hierarchy models.
Integrates with B09 Audit Logging System.
"""

from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from .models import Period, Activity
import logging

logger = logging.getLogger(__name__)

# Track previous state for change detection
_period_previous_state = {}
_activity_previous_state = {}


@receiver(pre_save, sender=Period)
def period_pre_save(sender, instance, **kwargs):
    """Capture previous state before save for change tracking"""
    if instance.pk:
        try:
            old_instance = Period.objects.get(pk=instance.pk)
            _period_previous_state[instance.pk] = {
                "name": old_instance.name,
                "start_date": old_instance.start_date,
                "end_date": old_instance.end_date,
                "parent_period_id": old_instance.parent_period_id,
                "project_id": old_instance.project_id,
            }
        except Period.DoesNotExist:
            pass


@receiver(post_save, sender=Period)
def period_post_save(sender, instance, created, **kwargs):
    """Emit B09 audit event for period creation/update"""
    try:
        # Attempt B09 integration
        from audit.models import AuditEvent

        if created:
            event_type = "period.created"
            changes = {
                "name": instance.name,
                "start_date": str(instance.start_date),
                "end_date": str(instance.end_date),
                "organisation_id": str(instance.organisation_id),
                "project_id": str(instance.project_id) if instance.project_id else None,
                "parent_period_id": (
                    str(instance.parent_period_id) if instance.parent_period_id else None
                ),
            }
        else:
            event_type = "period.updated"
            old_state = _period_previous_state.get(instance.pk, {})
            changes = {}

            # Track field changes
            if old_state.get("name") != instance.name:
                changes["name"] = {"old": old_state.get("name"), "new": instance.name}
            if old_state.get("start_date") != instance.start_date:
                changes["start_date"] = {
                    "old": str(old_state.get("start_date")),
                    "new": str(instance.start_date),
                }
            if old_state.get("end_date") != instance.end_date:
                changes["end_date"] = {
                    "old": str(old_state.get("end_date")),
                    "new": str(instance.end_date),
                }
            if old_state.get("parent_period_id") != instance.parent_period_id:
                changes["parent_period_id"] = {
                    "old": (
                        str(old_state.get("parent_period_id"))
                        if old_state.get("parent_period_id")
                        else None
                    ),
                    "new": str(instance.parent_period_id) if instance.parent_period_id else None,
                }
            if old_state.get("project_id") != instance.project_id:
                changes["project_id"] = {
                    "old": (
                        str(old_state.get("project_id")) if old_state.get("project_id") else None
                    ),
                    "new": str(instance.project_id) if instance.project_id else None,
                }

            # Clean up previous state
            _period_previous_state.pop(instance.pk, None)

        # Emit audit event
        AuditEvent.objects.create(
            event_type=event_type,
            actor=instance.created_by,
            target_model="Period",
            target_id=str(instance.id),
            changes=changes,
        )

    except ImportError:
        # Fallback if B09 not available - log to standard logger
        logger.info(
            f"Period {event_type}: {instance.id} ({instance.name}) by {instance.created_by}",
            extra={
                "event_type": event_type,
                "period_id": str(instance.id),
                "period_name": instance.name,
                "user_id": str(instance.created_by.id) if instance.created_by else None,
            },
        )
    except Exception as e:
        logger.error(f"Failed to emit audit event for Period {instance.id}: {e}")


@receiver(post_delete, sender=Period)
def period_post_delete(sender, instance, **kwargs):
    """Emit B09 audit event for period deletion"""
    try:
        from audit.models import AuditEvent

        # Try to get user from instance attribute set by view
        actor = getattr(instance, "_deleted_by", None)

        AuditEvent.objects.create(
            event_type="period.deleted",
            actor=actor,
            target_model="Period",
            target_id=str(instance.id),
            changes={"name": instance.name, "organisation_id": str(instance.organisation_id)},
        )

    except ImportError:
        logger.info(
            f"Period deleted: {instance.id} ({instance.name})",
            extra={
                "event_type": "period.deleted",
                "period_id": str(instance.id),
                "period_name": instance.name,
            },
        )
    except Exception as e:
        logger.error(f"Failed to emit deletion audit event for Period {instance.id}: {e}")


# ============================================================================
# Activity Signals
# ============================================================================


@receiver(pre_save, sender=Activity)
def activity_pre_save(sender, instance, **kwargs):
    """Capture previous state before save for change tracking"""
    if instance.pk:
        try:
            old_instance = Activity.objects.get(pk=instance.pk)
            _activity_previous_state[instance.pk] = {
                "title": old_instance.title,
                "activity_type": old_instance.activity_type,
                "start_time": old_instance.start_time,
                "end_time": old_instance.end_time,
                "location": old_instance.location,
                "period_id": old_instance.period_id,
                "project_id": old_instance.project_id,
            }
        except Activity.DoesNotExist:
            pass


@receiver(post_save, sender=Activity)
def activity_post_save(sender, instance, created, **kwargs):
    """Emit B09 audit event for activity creation/update"""
    try:
        # Attempt B09 integration
        from audit.models import AuditEvent

        if created:
            event_type = "activity.created"
            changes = {
                "title": instance.title,
                "activity_type": instance.activity_type,
                "start_time": instance.start_time.isoformat(),
                "end_time": instance.end_time.isoformat() if instance.end_time else None,
                "location": instance.location,
                "project_id": str(instance.project_id),
                "period_id": str(instance.period_id),
            }
        else:
            event_type = "activity.updated"
            old_state = _activity_previous_state.get(instance.pk, {})
            changes = {}

            # Track field changes
            if old_state.get("title") != instance.title:
                changes["title"] = {"old": old_state.get("title"), "new": instance.title}
            if old_state.get("activity_type") != instance.activity_type:
                changes["activity_type"] = {
                    "old": old_state.get("activity_type"),
                    "new": instance.activity_type,
                }
            if old_state.get("start_time") != instance.start_time:
                changes["start_time"] = {
                    "old": (
                        old_state.get("start_time").isoformat()
                        if old_state.get("start_time")
                        else None
                    ),
                    "new": instance.start_time.isoformat(),
                }
            if old_state.get("end_time") != instance.end_time:
                changes["end_time"] = {
                    "old": (
                        old_state.get("end_time").isoformat() if old_state.get("end_time") else None
                    ),
                    "new": instance.end_time.isoformat() if instance.end_time else None,
                }
            if old_state.get("location") != instance.location:
                changes["location"] = {"old": old_state.get("location"), "new": instance.location}
            if old_state.get("period_id") != instance.period_id:
                changes["period_id"] = {
                    "old": str(old_state.get("period_id")) if old_state.get("period_id") else None,
                    "new": str(instance.period_id),
                }
            if old_state.get("project_id") != instance.project_id:
                changes["project_id"] = {
                    "old": (
                        str(old_state.get("project_id")) if old_state.get("project_id") else None
                    ),
                    "new": str(instance.project_id),
                }

            # Clean up previous state
            _activity_previous_state.pop(instance.pk, None)

        # Emit audit event
        AuditEvent.objects.create(
            event_type=event_type,
            actor=instance.created_by,
            target_model="Activity",
            target_id=str(instance.id),
            changes=changes,
        )

    except ImportError:
        # Fallback if B09 not available - log to standard logger
        logger.info(
            f"Activity {event_type}: {instance.id} ({instance.title}) by {instance.created_by}",
            extra={
                "event_type": event_type,
                "activity_id": str(instance.id),
                "activity_title": instance.title,
                "user_id": str(instance.created_by.id) if instance.created_by else None,
            },
        )
    except Exception as e:
        logger.error(f"Failed to emit audit event for Activity {instance.id}: {e}")


@receiver(post_delete, sender=Activity)
def activity_post_delete(sender, instance, **kwargs):
    """Emit B09 audit event for activity deletion"""
    try:
        from audit.models import AuditEvent

        # Try to get user from instance attribute set by view
        actor = getattr(instance, "_deleted_by", None)

        AuditEvent.objects.create(
            event_type="activity.deleted",
            actor=actor,
            target_model="Activity",
            target_id=str(instance.id),
            changes={"title": instance.title, "project_id": str(instance.project_id)},
        )

    except ImportError:
        logger.info(
            f"Activity deleted: {instance.id} ({instance.title})",
            extra={
                "event_type": "activity.deleted",
                "activity_id": str(instance.id),
                "activity_title": instance.title,
            },
        )
    except Exception as e:
        logger.error(f"Failed to emit deletion audit event for Activity {instance.id}: {e}")
