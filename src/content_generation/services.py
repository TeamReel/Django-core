"""Content generation approval services — approve, reject, request revision."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from .models import ContentApproval, ContentItem, ContentStatus

if TYPE_CHECKING:
    from accounts.models import User

logger = logging.getLogger(__name__)


class InvalidStatusError(Exception):
    """Raised when a content item is not in a valid status for the operation."""


def _publish_approval_event(
    item: ContentItem,
    decision: str,
    reviewer: User,
    comment: str = "",
) -> None:
    """Publish B64 WebSocket event for approval decisions."""
    try:
        from rtc_websockets.events import (
            ApprovalDecidedPayload,
            EventType,
            build_event,
        )
        from rtc_websockets.services import RealtimeEventPublisher

        publisher = RealtimeEventPublisher()
        payload_kwargs = {
            "content_item_id": item.id,
            "project_id": item.project_id,
            "decision": decision,
            "reviewer_name": reviewer.get_full_name() or reviewer.username,
        }
        if comment:
            payload_kwargs["comment"] = comment

        event = build_event(
            EventType.APPROVAL_DECIDED,
            ApprovalDecidedPayload(**payload_kwargs),
            actor_id=reviewer.id,
        )
        publisher.publish_to_project(item.project_id, event)
    except Exception:
        pass


def _send_notification(
    item: ContentItem,
    notification_type: str,
    message: str,
) -> None:
    """Send B17 notification, logging failures."""
    from .tasks import send_notification_b17

    try:
        send_notification_b17(
            user=item.created_by,
            notification_type=notification_type,
            message=message,
            related_object_type="ContentItem",
            related_object_id=item.id,
        )
    except Exception as e:
        logger.warning("Failed to send %s notification: %s", notification_type, e)


def approve_content(
    item: ContentItem,
    reviewer: User,
    feedback_text: str = "",
) -> ContentApproval:
    """Approve a completed content item.

    Creates a ContentApproval record, updates item status, sends
    notification and publishes WebSocket event.

    Raises:
        InvalidStatusError: If item is not in COMPLETED status.
    """
    if item.status != ContentStatus.COMPLETED:
        raise InvalidStatusError(
            f'Cannot approve content with status "{item.status}". '
            "Only completed content can be approved."
        )

    approval = ContentApproval.objects.create(
        content_item=item,
        reviewer=reviewer,
        status="approved",
        feedback_text=feedback_text,
    )

    item.status = ContentStatus.APPROVED
    item.save()

    _send_notification(
        item,
        "content_approved",
        f"Your content '{item.template.name}' has been approved "
        f"by {reviewer.username}",
    )
    _publish_approval_event(item, "approved", reviewer)

    return approval


def reject_content(
    item: ContentItem,
    reviewer: User,
    feedback_text: str,
) -> ContentApproval:
    """Reject a completed content item with feedback.

    Raises:
        InvalidStatusError: If item is not in COMPLETED status.
    """
    if item.status != ContentStatus.COMPLETED:
        raise InvalidStatusError(
            f'Cannot reject content with status "{item.status}". '
            "Only completed content can be rejected."
        )

    approval = ContentApproval.objects.create(
        content_item=item,
        reviewer=reviewer,
        status="rejected",
        feedback_text=feedback_text,
    )

    item.status = ContentStatus.REJECTED
    item.save()

    _send_notification(
        item,
        "content_rejected",
        f"Your content '{item.template.name}' was rejected "
        f"by {reviewer.username}: {feedback_text}",
    )
    _publish_approval_event(item, "rejected", reviewer, comment=feedback_text)

    return approval


def request_revision(
    item: ContentItem,
    reviewer: User,
    feedback_text: str,
) -> ContentApproval:
    """Request revision for a completed content item with feedback.

    Raises:
        InvalidStatusError: If item is not in COMPLETED status.
    """
    if item.status != ContentStatus.COMPLETED:
        raise InvalidStatusError(
            f'Cannot request revision for content with status "{item.status}". '
            "Only completed content can have revision requested."
        )

    approval = ContentApproval.objects.create(
        content_item=item,
        reviewer=reviewer,
        status="revision_requested",
        feedback_text=feedback_text,
    )

    item.status = ContentStatus.REVISION_REQUESTED
    item.save()

    _send_notification(
        item,
        "content_revision_requested",
        f"Revision requested for '{item.template.name}' "
        f"by {reviewer.username}: {feedback_text}",
    )
    _publish_approval_event(item, "revision_requested", reviewer, comment=feedback_text)

    return approval
