"""
B31 Content Generation - Celery Tasks

Async tasks for content generation with timeout support, error handling,
status updates via WebSocket, and B22/B17 integrations.

Also includes retention cleanup task integrating with B10 Feature Flags.
"""

import logging
import tempfile
import time
from datetime import timedelta
from typing import Any, Dict, Optional

from celery import shared_task
from celery.exceptions import SoftTimeLimitExceeded
from django.utils import timezone

from .models import ContentItem, ContentStatus

logger = logging.getLogger(__name__)


@shared_task(bind=True, soft_time_limit=1800, time_limit=1900)
def generate_content_task(self, content_item_id: int):
    """
    Async task for content generation.

    Executes AI workflow, stores output file via B22, sends notifications via B17,
    and broadcasts status updates via WebSocket.

    Args:
        content_item_id: ID of ContentItem to generate

    Raises:
        SoftTimeLimitExceeded: If task exceeds template timeout
    """
    try:
        # Fetch ContentItem
        item = ContentItem.objects.select_related("template", "created_by", "project").get(
            id=content_item_id
        )

        # Apply template-specific timeout if configured
        if item.template.timeout_minutes:
            timeout_seconds = item.template.timeout_minutes * 60
            # Update task soft time limit dynamically
            self.time_limit = timeout_seconds + 100  # Buffer for cleanup
            self.soft_time_limit = timeout_seconds

        # Update status to generating
        item.status = ContentStatus.GENERATING
        item.metadata["generation_started_at"] = timezone.now().isoformat()
        item.save()

        # Broadcast status update via WebSocket
        broadcast_content_status(item.id, item.status, progress_percent=0)
        logger.info(f"Started generation for ContentItem {item.id}")

        # Call AI workflow (stub for now - will integrate B34 in future)
        ai_output = call_ai_workflow(
            workflow_id=item.template.ai_workflow_id,
            input_data=item.input_data,
            timeout=item.template.timeout_minutes or 30,
        )

        # Store output file via B22
        from src.files.models import FileAsset

        output_file = FileAsset.objects.create(
            file=ai_output["file_path"],
            uploaded_by=item.created_by,
            project=item.project,
            mime_type=ai_output.get("mime_type", "video/mp4"),
            file_size=ai_output.get("file_size", 0),
        )

        # Update ContentItem
        item.output_file = output_file
        item.status = ContentStatus.COMPLETED
        item.metadata["generation_completed_at"] = timezone.now().isoformat()

        # Calculate duration
        started_at = timezone.datetime.fromisoformat(
            item.metadata["generation_started_at"]
        ).replace(tzinfo=timezone.get_current_timezone())
        duration = (timezone.now() - started_at).total_seconds()
        item.metadata["generation_duration_seconds"] = duration

        item.save()

        # Broadcast completion
        broadcast_content_status(item.id, item.status, progress_percent=100)
        logger.info(f"Completed generation for ContentItem {item.id} in {duration:.2f}s")

        # Send notification (B17)
        try:
            send_notification_b17(
                user=item.created_by,
                notification_type="content_generation_completed",
                message=f"Content generation completed: {item.template.name}",
                related_object_type="ContentItem",
                related_object_id=item.id,
            )
        except Exception as e:
            logger.warning(f"Failed to send completion notification: {e}")

    except SoftTimeLimitExceeded:
        # Handle timeout
        logger.error(f"ContentItem {content_item_id} exceeded timeout")
        item = ContentItem.objects.get(id=content_item_id)
        item.status = ContentStatus.FAILED
        item.error_message = "Generation timed out"
        item.metadata["generation_failed_at"] = timezone.now().isoformat()
        item.save()

        broadcast_content_status(item.id, item.status, error="Generation timed out")
        send_notification_b17(
            user=item.created_by,
            notification_type="content_generation_failed",
            message=f"Content generation timed out: {item.template.name}",
            related_object_type="ContentItem",
            related_object_id=item.id,
        )

    except Exception as e:
        # Handle general failure
        logger.exception(f"ContentItem {content_item_id} failed with error: {e}")
        try:
            item = ContentItem.objects.get(id=content_item_id)
            item.status = ContentStatus.FAILED
            item.error_message = str(e)
            item.metadata["generation_failed_at"] = timezone.now().isoformat()
            item.save()

            broadcast_content_status(item.id, item.status, error=str(e))
            send_notification_b17(
                user=item.created_by,
                notification_type="content_generation_failed",
                message=f"Content generation failed: {item.template.name}",
                related_object_type="ContentItem",
                related_object_id=item.id,
            )
        except Exception as inner_e:
            logger.error(f"Failed to handle error for ContentItem {content_item_id}: {inner_e}")

        raise  # Re-raise for Celery retry logic


def call_ai_workflow(workflow_id: str, input_data: dict, timeout: int) -> Dict[str, Any]:
    """
    Call AI workflow for content generation.

    TODO: Replace stub with actual B34 Generative Pipelines integration.

    Args:
        workflow_id: External AI system workflow identifier
        input_data: User-provided generation inputs
        timeout: Generation timeout in minutes

    Returns:
        dict: AI output with file_path, mime_type, file_size
    """
    logger.info(f"Calling AI workflow {workflow_id} with timeout {timeout}min (STUB)")

    # Simulate AI processing
    time.sleep(2)

    # Create mock output file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4", mode="wb") as f:
        f.write(b"mock video content - replace with B34 integration")
        return {
            "file_path": f.name,
            "mime_type": "video/mp4",
            "file_size": len(b"mock video content - replace with B34 integration"),
        }


def broadcast_content_status(
    content_item_id: int,
    status: str,
    progress_percent: int = None,
    error: str = None,
):
    """
    Broadcast content status update via WebSocket (B23 integration).

    Args:
        content_item_id: ContentItem ID
        status: Current status
        progress_percent: Optional progress percentage
        error: Optional error message
    """
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer

        channel_layer = get_channel_layer()
        if channel_layer:
            group_name = f"content_item_{content_item_id}"

            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    "type": "content_status_update",
                    "content_item_id": content_item_id,
                    "status": status,
                    "progress_percent": progress_percent,
                    "error": error,
                },
            )
            logger.debug(f"Broadcasted status update for ContentItem {content_item_id}")
        else:
            logger.warning("Channel layer not configured - WebSocket broadcast skipped")
    except Exception as e:
        logger.warning(f"Failed to broadcast WebSocket update: {e}")


def send_notification_b17(
    user,
    notification_type: str,
    message: str,
    related_object_type: str = None,
    related_object_id: int = None,
):
    """
    Send notification via B17 Notifications module.

    TODO: Replace stub with actual B17 integration when module is available.

    Args:
        user: User to notify
        notification_type: Notification type identifier
        message: Notification message
        related_object_type: Optional related object type
        related_object_id: Optional related object ID
    """
    logger.info(f"Sending {notification_type} notification to user {user.id}: {message} (STUB)")

    # TODO: Integrate with B17 Notifications when available
    # Example:
    # from src.notifications.utils import send_notification
    # send_notification(
    #     user=user,
    #     notification_type=notification_type,
    #     message=message,
    #     related_object_type=related_object_type,
    #     related_object_id=related_object_id
    # )


# ========== Retention & Cleanup (T037, T038) ==========


def get_retention_days(status: str, organisation) -> Optional[int]:
    """
    Get retention days for content based on status and org settings.

    Uses B10 Feature Flags for org-configurable retention policies.
    Defaults:
    - failed: 30 days
    - rejected: 90 days
    - approved/completed: None (indefinite retention)

    Args:
        status: ContentItem status
        organisation: Organisation to check settings for

    Returns:
        Number of days to retain, or None for indefinite retention
    """
    defaults = {
        ContentStatus.FAILED: 30,
        ContentStatus.REJECTED: 90,
    }

    # Get default based on status
    default_days = defaults.get(status)
    if default_days is None:
        return None  # Indefinite retention for approved/completed

    # Try to get org-specific setting from B10 Feature Flags
    try:
        from src.settings.models import ScopeType, Setting

        # Check for org-scoped setting
        setting_key = f"content_retention_{status}_days"
        setting = Setting.objects.filter(
            key=setting_key,
            scope_type=ScopeType.ORGANISATION,
            organisation=organisation,
        ).first()

        if setting and setting.value:
            return int(setting.value.get("value", default_days))

    except ImportError:
        logger.debug("B10 Settings module not available, using defaults")
    except Exception as e:
        logger.warning(f"Error fetching retention setting: {e}")

    return default_days


@shared_task
def cleanup_expired_content():
    """
    Celery task to soft-delete expired ContentItems based on retention policy.

    Runs per-organisation to respect org-specific retention settings.
    Should be scheduled daily (e.g., 2 AM) via Celery Beat.

    Example Celery Beat config (settings.py):
        CELERY_BEAT_SCHEDULE = {
            'cleanup-expired-content': {
                'task': 'src.content_generation.tasks.cleanup_expired_content',
                'schedule': crontab(hour=2, minute=0),
            },
        }
    """
    from src.organisations.models import Organisation

    now = timezone.now()
    total_deleted = 0

    logger.info("Starting content retention cleanup task")

    for org in Organisation.objects.all():
        org_deleted = 0

        # Process failed content
        failed_days = get_retention_days(ContentStatus.FAILED, org)
        if failed_days:
            failed_cutoff = now - timedelta(days=failed_days)
            failed_count = ContentItem.objects.filter(
                project__organisation=org,
                status=ContentStatus.FAILED,
                deleted_at__isnull=True,
                created_at__lt=failed_cutoff,
            ).update(deleted_at=now)
            org_deleted += failed_count
            if failed_count:
                logger.info(f"Soft-deleted {failed_count} failed items for org {org.id}")

        # Process rejected content
        rejected_days = get_retention_days(ContentStatus.REJECTED, org)
        if rejected_days:
            rejected_cutoff = now - timedelta(days=rejected_days)
            rejected_count = ContentItem.objects.filter(
                project__organisation=org,
                status=ContentStatus.REJECTED,
                deleted_at__isnull=True,
                updated_at__lt=rejected_cutoff,
            ).update(deleted_at=now)
            org_deleted += rejected_count
            if rejected_count:
                logger.info(f"Soft-deleted {rejected_count} rejected items for org {org.id}")

        total_deleted += org_deleted

    logger.info(f"Content cleanup complete: {total_deleted} items soft-deleted")
    return {"deleted_count": total_deleted}
