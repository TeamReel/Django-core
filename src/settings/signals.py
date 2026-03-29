"""
Audit signal handlers for settings app.

Integrates with B09 audit system to record all CRUD operations on
FeatureFlag and Setting models, including old/new values and actor context.
"""

import logging
import threading
from typing import Any, Dict, Optional

from audit.api import audit_log
from audit.registry import register_event_type
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)

from .models import FeatureFlag, Setting

# Thread-local storage for capturing old values in pre_save
_thread_locals = threading.local()


def _get_actor_from_instance(instance: Any) -> Optional[Any]:
    """Extract actor (user) from instance if available."""
    # Try common patterns for capturing user
    if hasattr(instance, "_current_user"):
        return instance._current_user
    if hasattr(instance, "updated_by"):
        return instance.updated_by
    if hasattr(instance, "created_by") and not instance.pk:
        return instance.created_by
    return None


def _get_scope_context(instance: Any) -> Dict[str, Any]:
    """Extract organization/project context from instance."""
    context = {}
    try:
        if hasattr(instance, "organisation") and instance.organisation:
            context["organization"] = instance.organisation
    except Exception:
        logger.debug("Failed to extract organisation from instance", exc_info=True)

    try:
        if hasattr(instance, "project") and instance.project:
            context["project"] = instance.project
    except Exception:
        logger.debug("Failed to extract project from instance", exc_info=True)

    return context


def _serialize_instance_data(instance: Any) -> Dict[str, Any]:
    """Serialize instance data for audit metadata."""
    if isinstance(instance, FeatureFlag):
        return {
            "key": instance.key,
            "enabled": instance.enabled,
            "scope_type": instance.scope_type,
            "organisation_id": str(instance.organisation_id) if instance.organisation_id else None,
            "project_id": str(instance.project_id) if instance.project_id else None,
            "description": instance.description,
        }
    elif isinstance(instance, Setting):
        return {
            "key": instance.key,
            "value": instance.value,
            "value_type": instance.value_type,
            "scope_type": instance.scope_type,
            "organisation_id": str(instance.organisation_id) if instance.organisation_id else None,
            "project_id": str(instance.project_id) if instance.project_id else None,
            "description": instance.description,
        }
    return {}


# T050: Pre-save handler to capture old values
@receiver(pre_save, sender=FeatureFlag)
@receiver(pre_save, sender=Setting)
def capture_old_value(sender: Any, instance: Any, **kwargs: Any) -> None:
    """
    Capture old instance state before save for audit comparison.

    Stores old values in thread-local storage for access in post_save.
    """
    if instance.pk:  # Only for updates, not creates
        try:
            old_instance = sender.objects.get(pk=instance.pk)
            # Store in thread-local storage keyed by instance
            if not hasattr(_thread_locals, "old_values"):
                _thread_locals.old_values = {}
            _thread_locals.old_values[id(instance)] = _serialize_instance_data(old_instance)
        except sender.DoesNotExist:
            pass  # Instance deleted between query and save


# T048: Post-save handler for creates and updates
@receiver(post_save, sender=FeatureFlag)
@receiver(post_save, sender=Setting)
def audit_save_event(sender: Any, instance: Any, created: bool, **kwargs: Any) -> None:
    """
    Record audit event for FeatureFlag/Setting creation or update.

    Emits 'settings.flag_created', 'settings.flag_updated',
    'settings.setting_created', or 'settings.setting_updated' events.
    """
    model_type = "flag" if isinstance(instance, FeatureFlag) else "setting"
    event_type = f"settings.{model_type}_{'created' if created else 'updated'}"

    # Prepare metadata
    metadata: Dict[str, Any] = {"new_value": _serialize_instance_data(instance)}

    # Add old value for updates
    if not created and hasattr(_thread_locals, "old_values"):
        old_value = _thread_locals.old_values.pop(id(instance), None)
        if old_value:
            metadata["old_value"] = old_value

    # Extract actor and scope context
    user = _get_actor_from_instance(instance)
    scope_context = _get_scope_context(instance)

    # Record audit event (graceful failure, won't break save operation)
    audit_log.record(
        event_type=event_type,
        user=user,
        metadata=metadata,
        **scope_context,
    )


# T049: Post-delete handler
@receiver(post_delete, sender=FeatureFlag)
@receiver(post_delete, sender=Setting)
def audit_delete_event(sender: Any, instance: Any, **kwargs: Any) -> None:
    """
    Record audit event for FeatureFlag/Setting deletion.

    Emits 'settings.flag_deleted' or 'settings.setting_deleted' events.
    """
    model_type = "flag" if isinstance(instance, FeatureFlag) else "setting"
    event_type = f"settings.{model_type}_deleted"

    # Prepare metadata with deleted instance data
    metadata: Dict[str, Any] = {"deleted_value": _serialize_instance_data(instance)}

    # Extract actor and scope context
    user = _get_actor_from_instance(instance)
    scope_context = _get_scope_context(instance)

    # Record audit event (graceful failure)
    audit_log.record(
        event_type=event_type,
        user=user,
        metadata=metadata,
        **scope_context,
    )


# T051: Register event types with audit system
def register_audit_events() -> None:
    """
    Register settings app audit event types.

    Must be called during app initialization (apps.py ready() method).
    """
    # Feature flag events
    register_event_type(
        name="settings.flag_created",
        category="settings",
        description="Feature flag created",
        required_metadata_keys=["new_value"],
    )

    register_event_type(
        name="settings.flag_updated",
        category="settings",
        description="Feature flag updated",
        required_metadata_keys=["new_value"],
    )

    register_event_type(
        name="settings.flag_deleted",
        category="settings",
        description="Feature flag deleted",
        required_metadata_keys=["deleted_value"],
    )

    # Setting events
    register_event_type(
        name="settings.setting_created",
        category="settings",
        description="Setting created",
        required_metadata_keys=["new_value"],
    )

    register_event_type(
        name="settings.setting_updated",
        category="settings",
        description="Setting updated",
        required_metadata_keys=["new_value"],
    )

    register_event_type(
        name="settings.setting_deleted",
        category="settings",
        description="Setting deleted",
        required_metadata_keys=["deleted_value"],
    )
