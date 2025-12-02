"""Base test classes and utilities for notifications tests."""

from contextlib import contextmanager
from typing import Any, Iterator
from unittest.mock import MagicMock, patch


class NotificationTestCase:
    """Base test class for notifications tests with common utilities.

    Note: This class does NOT inherit from unittest.TestCase to maintain
    compatibility with pytest fixtures. Use plain pytest assertions.
    """

    @staticmethod
    def assert_notification_status(notification: Any, expected_status: str) -> None:
        """Assert notification has expected status.

        Args:
            notification: Notification instance to check
            expected_status: Expected status string (e.g., 'sent', 'failed', 'pending')

        Raises:
            AssertionError: If status doesn't match expected value
        """
        notification.refresh_from_db()
        assert (
            notification.status == expected_status
        ), f"Expected status '{expected_status}', got '{notification.status}'"

    @staticmethod
    def create_test_notification(**kwargs: Any) -> Any:
        """Create notification with sensible defaults for testing.

        Args:
            **kwargs: Override default field values

        Returns:
            Notification instance

        Example:
            notif = NotificationTestCase.create_test_notification(recipient='user@example.com')
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

    @staticmethod
    @contextmanager
    def mock_smtp_server() -> Iterator[MagicMock]:
        """Mock SMTP server for email tests.

        Yields:
            Mock object for SMTP backend

        Example:
            with NotificationTestCase.mock_smtp_server() as mock_smtp:
                send_email_notification(notification)
                mock_smtp.send_messages.assert_called_once()
        """
        with patch("django.core.mail.backends.smtp.EmailBackend.send_messages") as mock_send:
            mock_send.return_value = 1  # Success: 1 email sent
            yield mock_send

    @staticmethod
    @contextmanager
    def mock_celery_task(task_path: str) -> Iterator[MagicMock]:
        """Mock Celery task for testing async behavior.

        Args:
            task_path: Dotted path to Celery task (e.g., 'notifications.tasks.send_email')

        Yields:
            Mock object for the task

        Example:
            with NotificationTestCase.mock_celery_task(
                'notifications.tasks.send_email'
            ) as mock_task:
                trigger_notification()
                mock_task.delay.assert_called_once()
        """
        with patch(task_path) as mock_task:
            mock_task.delay.return_value = MagicMock(id="test-task-id")
            yield mock_task

    @staticmethod
    def assert_delivery_attempts_count(notification: Any, expected_count: int) -> None:
        """Assert notification has expected number of delivery attempts.

        Args:
            notification: Notification instance to check
            expected_count: Expected number of DeliveryAttempt records

        Raises:
            AssertionError: If attempt count doesn't match expected value
        """
        actual_count = notification.delivery_attempts.count()
        assert (
            actual_count == expected_count
        ), f"Expected {expected_count} delivery attempts, got {actual_count}"

    @staticmethod
    def get_latest_delivery_attempt(notification: Any) -> Any:
        """Get the most recent delivery attempt for a notification.

        Args:
            notification: Notification instance

        Returns:
            Latest DeliveryAttempt instance or None
        """
        return notification.delivery_attempts.order_by("-attempted_at").first()
