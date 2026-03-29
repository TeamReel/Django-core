"""Example task integrating with B12 notifications (when available)."""

import logging

from celery import shared_task

from tasks.base import AuditedTask

logger = logging.getLogger(__name__)


@shared_task(base=AuditedTask)
def send_bulk_notifications(
    user_ids: list[int], org_id: int, template_id: int, user_id: int
) -> dict:
    """
    Send bulk notifications via B12 notification system.

    This task demonstrates:
    - Integration with existing B12 feature (when available)
    - Bulk processing pattern (chunking)
    - AuditedTask for sensitive operation
    - Context propagation for audit trail

    Usage:
        from tasks.examples.send_notification import send_bulk_notifications
        result = send_bulk_notifications.delay(
            user_ids=[1, 2, 3, 4, 5],
            org_id=123,
            template_id=456,
            user_id=request.user.id  # For audit
        )

    Args:
        user_ids: List of user IDs to notify
        org_id: Organisation context
        template_id: Notification template ID from B12
        user_id: User triggering the bulk send (for audit)

    Returns:
        Dictionary with send statistics

    Note:
        This is a mock example. B12 notifications system not yet implemented.
        When B12 is available, replace mock implementation with actual
        NotificationService calls.
    """
    # Mock implementation - replace with actual B12 integration
    # from notifications.services import NotificationService
    # service = NotificationService()

    sent_count = 0
    failed_count = 0

    # Process in chunks to avoid memory issues
    chunk_size = 100
    for i in range(0, len(user_ids), chunk_size):
        chunk = user_ids[i : i + chunk_size]

        for recipient_id in chunk:
            try:
                # Mock notification send
                # In real implementation:
                # service.send(
                #     user_id=recipient_id,
                #     template_id=template_id,
                #     org_id=org_id
                # )
                logger.info("[MOCK] Sending notification to user %s", recipient_id)
                sent_count += 1
            except Exception as exc:
                logger.warning("Failed to send notification to user %s: %s", recipient_id, exc)
                failed_count += 1

    return {
        "status": "completed",
        "total": len(user_ids),
        "sent": sent_count,
        "failed": failed_count,
    }
