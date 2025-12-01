"""Custom managers and querysets for notification models."""

from typing import TYPE_CHECKING

from django.db import models
from django.db.models import QuerySet

if TYPE_CHECKING:
    from accounts.models import User


class NotificationQuerySet(QuerySet):
    """Custom QuerySet for Notification model with query optimization."""

    def with_related(self) -> "NotificationQuerySet":
        """Optimize queries by selecting related objects.

        Prevents N+1 queries by eagerly loading:
        - notification type
        - retry policy (via type)
        - recipient user
        - delivery attempts
        """
        return self.select_related("type", "type__retry_policy", "recipient_user").prefetch_related(
            "delivery_attempts"
        )

    def pending(self) -> "NotificationQuerySet":
        """Filter to pending notifications."""
        return self.filter(status="pending")

    def sent(self) -> "NotificationQuerySet":
        """Filter to sent notifications."""
        return self.filter(status="sent")

    def failed(self) -> "NotificationQuerySet":
        """Filter to failed notifications."""
        return self.filter(status="failed")

    def for_user(self, user: "User") -> "NotificationQuerySet":
        """Filter notifications for a specific user.

        Args:
            user: User instance to filter by

        Returns:
            Filtered QuerySet
        """
        return self.filter(recipient_user=user)

    def unread(self) -> "NotificationQuerySet":
        """Filter to unread in-app notifications."""
        return self.filter(channel="in_app", read_at__isnull=True)

    def by_type(self, notification_type_code: str) -> "NotificationQuerySet":
        """Filter by notification type code.

        Args:
            notification_type_code: Code of notification type

        Returns:
            Filtered QuerySet
        """
        return self.filter(type__code=notification_type_code)

    def by_channel(self, channel: str) -> "NotificationQuerySet":
        """Filter by delivery channel.

        Args:
            channel: email, in_app, or webhook

        Returns:
            Filtered QuerySet
        """
        return self.filter(channel=channel)


class NotificationManager(models.Manager):
    """Custom manager for Notification model."""

    def get_queryset(self) -> NotificationQuerySet:
        """Use custom QuerySet."""
        return NotificationQuerySet(self.model, using=self._db)

    def with_related(self) -> NotificationQuerySet:
        """Delegate to QuerySet."""
        return self.get_queryset().with_related()

    def pending(self) -> NotificationQuerySet:
        """Delegate to QuerySet."""
        return self.get_queryset().pending()

    def sent(self) -> NotificationQuerySet:
        """Delegate to QuerySet."""
        return self.get_queryset().sent()

    def failed(self) -> NotificationQuerySet:
        """Delegate to QuerySet."""
        return self.get_queryset().failed()

    def for_user(self, user: "User") -> NotificationQuerySet:
        """Delegate to QuerySet."""
        return self.get_queryset().for_user(user)

    def unread(self) -> NotificationQuerySet:
        """Delegate to QuerySet."""
        return self.get_queryset().unread()

    def by_type(self, notification_type_code: str) -> NotificationQuerySet:
        """Delegate to QuerySet."""
        return self.get_queryset().by_type(notification_type_code)

    def by_channel(self, channel: str) -> NotificationQuerySet:
        """Delegate to QuerySet."""
        return self.get_queryset().by_channel(channel)
