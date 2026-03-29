"""
Notification service helpers for creating event-triggered notifications.

Minimal implementation for manual validation testing.
"""

from typing import Literal, Optional

from django.contrib.auth import get_user_model

User = get_user_model()


def create_notification(
    *,
    recipient_user_id: str,
    title: str,
    message: str,
    level: Literal["info", "success", "warning", "error"] = "info",
    link_url: Optional[str] = None,
) -> None:
    """
    Create an in-app notification for a user.

    Args:
        recipient_user_id: UUID of the recipient user
        title: Short notification title (max 200 chars)
        message: Notification message body (max 500 chars)
        level: Severity/type of notification
        link_url: Optional link target (not implemented yet)

    Example:
        create_notification(
            recipient_user_id=str(user.id),
            title="Project Created",
            message=f"Project '{project.name}' was successfully created.",
            level="success"
        )
    """
    from notifications.models import Notification, NotificationType, RetryPolicy

    # Get or create a simple retry policy
    retry_policy = RetryPolicy.objects.first()
    if not retry_policy:
        retry_policy = RetryPolicy.objects.create(
            name="No Retry",
            max_attempts=1,
            retry_window_seconds=0,
        )

    # Get or create notification type for system events
    notification_type, _ = NotificationType.objects.get_or_create(
        code="system_event",
        defaults={
            "name": "System Event",
            "description": "Automated system-generated notifications",
            "default_channel": "in_app",
            "retry_policy": retry_policy,
        },
    )

    # Get recipient user
    try:
        recipient = User.objects.get(id=recipient_user_id)
    except User.DoesNotExist:
        # Silently skip if user doesn't exist
        return

    # Create notification
    Notification.objects.create(
        type=notification_type,
        channel="in_app",
        recipient=str(recipient.id),
        recipient_user=recipient,
        payload={
            "title": title[:200],
            "message": message[:500],
            "level": level,
            "link_url": link_url,
        },
        status="sent",  # In-app notifications are immediately "sent"
    )


def notify_project_created(*, project, creator) -> None:
    """
    Notify when a project is created.

    Organisation-wide event: all ACTIVE members of the organisation receive notification.
    This includes the creator (actor).

    Multi-tenant safety: Only members of project.organisation are notified.
    """
    from organisations.models import Membership

    # Get all active members in the project's organisation
    active_member_ids = Membership.objects.filter(
        organisation=project.organisation, is_active=True
    ).values_list("user_id", flat=True)

    # Create notification for each active member
    for member_id in active_member_ids:
        # Same user sees their own action as confirmation
        if str(member_id) == str(creator.id):
            create_notification(
                recipient_user_id=str(member_id),
                title="Project Created",
                message=(
                    f"Project '{project.name}' was successfully"
                    f" created in {project.organisation.name}."
                ),
                level="success",
            )
        else:
            create_notification(
                recipient_user_id=str(member_id),
                title="New Project Created",
                message=(
                    f"{creator.email} created project"
                    f" '{project.name}' in {project.organisation.name}."
                ),
                level="info",
            )


def notify_member_role_changed(*, membership, changed_by, old_role, new_role) -> None:
    """
    Notify when a member's role is changed.

    Sends notification to:
    - The affected user (if different from changer)
    - The user who made the change (confirmation)
    """
    import logging

    logger = logging.getLogger(__name__)

    try:
        # Get display names with fallback
        changer_name = changed_by.email or f"User {changed_by.id}"
        affected_name = membership.user.email or f"User {membership.user.id}"
        org_name = membership.organisation.name if membership.organisation else "the organisation"

        # Notify the affected user (if not self-change)
        if membership.user != changed_by:
            create_notification(
                recipient_user_id=str(membership.user.id),
                title="Role Changed",
                message=(
                    f"Your role in {org_name} was changed"
                    f" from {old_role} to {new_role} by {changer_name}."
                ),
                level="info",
            )

        # Notify the changer (confirmation)
        create_notification(
            recipient_user_id=str(changed_by.id),
            title="Member Role Updated",
            message=(
                f"Successfully updated {affected_name}'s role"
                f" from {old_role} to {new_role} in {org_name}."
            ),
            level="success",
        )
    except Exception as e:
        logger.error(f"Failed to create role change notification: {e}", exc_info=True)
        # Don't re-raise - notification failure shouldn't break the role change
        pass


def send_notification(
    recipient_ids: list,
    notification_type: str,
    title: str,
    message: str,
    metadata: dict = None,
    link: str = None,
) -> None:
    """
    Send notification to multiple recipients (shim for workflow integration).
    """
    for user_id in recipient_ids:
        create_notification(
            recipient_user_id=str(user_id),
            title=title,
            message=message,
            level="info",
            link_url=link,
        )
