"""Pytest fixtures for notifications tests."""

from typing import Any, Callable

import pytest


@pytest.fixture
def retry_policy_factory(db: Any) -> Callable[..., Any]:
    """Factory for creating RetryPolicy test instances.

    Args:
        db: pytest-django database fixture

    Returns:
        Factory function that creates RetryPolicy with customizable fields

    Example:
        def test_retry_policy(retry_policy_factory):
            policy = retry_policy_factory(name='urgent', max_attempts=10)
            assert policy.max_attempts == 10
    """

    def make_policy(**kwargs: Any) -> Any:
        from notifications.models import RetryPolicy

        defaults = {
            "name": "test-policy",
            "max_attempts": 3,
            "retry_window_seconds": 3600,
            "backoff_strategy": "exponential",
            "backoff_multiplier": 5.0,
            "initial_delay_seconds": 60,
        }
        defaults.update(kwargs)
        return RetryPolicy.objects.create(**defaults)

    return make_policy


@pytest.fixture
def notification_type_factory(db: Any) -> Callable[..., Any]:
    """Factory for creating NotificationType test instances.

    Args:
        db: pytest-django database fixture

    Returns:
        Factory function that creates NotificationType with customizable fields

    Example:
        def test_notification_type(notification_type_factory):
            ntype = notification_type_factory(name='alert', channel='email')
            assert ntype.channel == 'email'
    """

    def make_notification_type(**kwargs: Any) -> Any:
        from notifications.models import NotificationType

        defaults = {
            "name": "test-type",
            "description": "Test notification type",
            "channel": "email",
            "template_subject": "Test Subject",
            "template_body": "Test Body: {{ message }}",
            "default_from_address": "noreply@example.com",
        }
        defaults.update(kwargs)
        return NotificationType.objects.create(**defaults)

    return make_notification_type


@pytest.fixture
def notification_factory(
    db: Any, notification_type_factory: Callable[..., Any]
) -> Callable[..., Any]:
    """Factory for creating Notification test instances.

    Args:
        db: pytest-django database fixture
        notification_type_factory: Factory for NotificationType instances

    Returns:
        Factory function that creates Notification with customizable fields

    Example:
        def test_notification(notification_factory):
            notif = notification_factory(recipient='user@example.com')
            assert notif.status == 'pending'
    """

    def make_notification(**kwargs: Any) -> Any:
        from notifications.models import Notification

        # Create a notification type if not provided
        if "notification_type" not in kwargs:
            kwargs["notification_type"] = notification_type_factory()

        defaults = {
            "recipient": "test@example.com",
            "status": "pending",
            "payload": {"message": "Test notification"},
            "metadata": {"test": True},
        }
        defaults.update(kwargs)
        return Notification.objects.create(**defaults)

    return make_notification


@pytest.fixture
def delivery_attempt_factory(
    db: Any, notification_factory: Callable[..., Any]
) -> Callable[..., Any]:
    """Factory for creating DeliveryAttempt test instances.

    Args:
        db: pytest-django database fixture
        notification_factory: Factory for Notification instances

    Returns:
        Factory function that creates DeliveryAttempt with customizable fields

    Example:
        def test_delivery_attempt(delivery_attempt_factory):
            attempt = delivery_attempt_factory(attempt_number=1, status='success')
            assert attempt.status == 'success'
    """

    def make_delivery_attempt(**kwargs: Any) -> Any:
        from notifications.models import DeliveryAttempt

        # Create a notification if not provided
        if "notification" not in kwargs:
            kwargs["notification"] = notification_factory()

        defaults = {
            "attempt_number": 1,
            "status": "pending",
            "response_code": None,
            "response_body": None,
            "error_message": None,
        }
        defaults.update(kwargs)
        return DeliveryAttempt.objects.create(**defaults)

    return make_delivery_attempt
