"""Base test classes and utilities for notifications tests."""

from contextlib import contextmanager
from typing import Any, Iterator
from unittest.mock import MagicMock, patch

from django.test import TestCase


class NotificationTestCase(TestCase):
    """Base test class for notifications tests with common utilities."""

    def assert_notification_status(self, notification: Any, expected_status: str) -> None:
        """Assert notification has expected status.

        Args:
            notification: Notification instance to check
            expected_status: Expected status string (e.g., 'sent', 'failed', 'pending')

        Raises:
            AssertionError: If status doesn't match expected value
        """
        notification.refresh_from_db()
        self.assertEqual(
            notification.status,
            expected_status,
            f"Expected status '{expected_status}', got '{notification.status}'",
        )

    def create_test_notification(self, **kwargs: Any) -> Any:
        """Create notification with sensible defaults for testing.

        Args:
            **kwargs: Override default field values

        Returns:
            Notification instance

        Example:
            notif = self.create_test_notification(recipient='user@example.com')
        """
        from notifications.models import Notification, NotificationType

        # Create notification type if not provided
        if "notification_type" not in kwargs:
            notification_type, _ = NotificationType.objects.get_or_create(
                name="test-default",
                defaults={
                    "description": "Default test notification type",
                    "channel": "email",
                    "template_subject": "Test Subject",
                    "template_body": "Test Body",
                    "default_from_address": "test@example.com",
                },
            )
            kwargs["notification_type"] = notification_type

        defaults = {
            "recipient": "test@example.com",
            "status": "pending",
            "payload": {"message": "Test notification"},
            "metadata": {},
        }
        defaults.update(kwargs)
        return Notification.objects.create(**defaults)

    @contextmanager
    def mock_smtp_server(self) -> Iterator[MagicMock]:
        """Mock SMTP server for email tests.

        Yields:
            Mock object for SMTP backend

        Example:
            with self.mock_smtp_server() as mock_smtp:
                send_email_notification(notification)
                mock_smtp.send_messages.assert_called_once()
        """
        with patch("django.core.mail.backends.smtp.EmailBackend.send_messages") as mock_send:
            mock_send.return_value = 1  # Success: 1 email sent
            yield mock_send

    @contextmanager
    def mock_celery_task(self, task_path: str) -> Iterator[MagicMock]:
        """Mock Celery task for testing async behavior.

        Args:
            task_path: Dotted path to Celery task (e.g., 'notifications.tasks.send_email')

        Yields:
            Mock object for the task

        Example:
            with self.mock_celery_task('notifications.tasks.send_email') as mock_task:
                trigger_notification()
                mock_task.delay.assert_called_once()
        """
        with patch(task_path) as mock_task:
            mock_task.delay.return_value = MagicMock(id="test-task-id")
            yield mock_task

    def assert_delivery_attempts_count(self, notification: Any, expected_count: int) -> None:
        """Assert notification has expected number of delivery attempts.

        Args:
            notification: Notification instance to check
            expected_count: Expected number of DeliveryAttempt records

        Raises:
            AssertionError: If attempt count doesn't match expected value
        """
        actual_count = notification.delivery_attempts.count()
        self.assertEqual(
            actual_count,
            expected_count,
            f"Expected {expected_count} delivery attempts, got {actual_count}",
        )

    def get_latest_delivery_attempt(self, notification: Any) -> Any:
        """Get the most recent delivery attempt for a notification.

        Args:
            notification: Notification instance

        Returns:
            Latest DeliveryAttempt instance or None
        """
        return notification.delivery_attempts.order_by("-attempted_at").first()
