"""Pytest fixtures for the Background Tasks example tests.

This module provides reusable test fixtures for Celery task testing including:
- Celery app configuration for testing
- Django mail outbox access
- Database fixtures
- Eager task execution mode
"""

import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.fixture(scope="session")
def celery_config() -> dict:
    """Configure Celery for testing.

    This fixture configures Celery to use:
    - In-memory broker (no Redis required)
    - In-memory result backend
    - Eager mode for synchronous execution in tests

    Returns:
        dict: Celery configuration for testing.
    """
    return {
        "broker_url": "memory://",
        "result_backend": "cache+memory://",
        "task_always_eager": True,
        "task_eager_propagates": True,
    }


@pytest.fixture(scope="session")
def celery_enable_logging() -> bool:
    """Enable Celery logging during tests.

    Returns:
        bool: True to enable logging.
    """
    return True


@pytest.fixture(scope="session")
def celery_includes() -> list[str]:
    """Specify which task modules to include.

    Returns:
        list: List of task module paths.
    """
    return [
        "email_tasks.tasks",
        "email_tasks.scheduler",
    ]


@pytest.fixture
def mailoutbox(settings):
    """Access Django's test mail outbox.

    This fixture provides access to emails sent during tests
    when using Django's locmem email backend.

    Args:
        settings: Django settings fixture.

    Returns:
        list: The mail outbox containing sent emails.

    Example:
        >>> def test_email_sent(mailoutbox):
        ...     send_email_task.delay()
        ...     assert len(mailoutbox) == 1
        ...     assert mailoutbox[0].subject == "Expected Subject"
    """
    from django.core import mail

    # Ensure we're using the test email backend
    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

    # Clear the outbox before each test
    mail.outbox.clear()

    return mail.outbox


@pytest.fixture
def user(db) -> User:
    """Create a test user.

    Args:
        db: Pytest-django database access fixture.

    Returns:
        User: A test user instance.
    """
    return User.objects.create_user(
        email="test@example.com",
        password="testpass123",
    )


@pytest.fixture
def other_user(db) -> User:
    """Create a second test user.

    Args:
        db: Pytest-django database access fixture.

    Returns:
        User: Another test user instance.
    """
    return User.objects.create_user(
        email="other@example.com",
        password="testpass123",
    )


@pytest.fixture
def email_log_factory(db):
    """Factory fixture for creating EmailLog instances.

    Returns:
        callable: A factory function for creating email logs.

    Example:
        >>> def test_with_log(email_log_factory):
        ...     log = email_log_factory(email="test@example.com", status="pending")
        ...     assert log.status == "pending"
    """
    from email_tasks.models import EmailLog

    def _create_email_log(
        email: str = "test@example.com",
        status: str = EmailLog.Status.PENDING,
        **kwargs,
    ) -> EmailLog:
        return EmailLog.objects.create(email=email, status=status, **kwargs)

    return _create_email_log


@pytest.fixture
def old_email_logs(db, email_log_factory):
    """Create old email logs for cleanup testing.

    Creates 5 email logs from 35 days ago.

    Args:
        db: Database access fixture.
        email_log_factory: Factory for creating logs.

    Returns:
        list: List of old EmailLog instances.
    """
    from datetime import timedelta

    from django.utils import timezone

    from email_tasks.models import EmailLog

    old_date = timezone.now() - timedelta(days=35)
    logs = []

    for i in range(5):
        log = email_log_factory(
            email=f"old{i}@example.com",
            status=EmailLog.Status.SENT,
        )
        # Manually update created_at to bypass auto_now_add
        EmailLog.objects.filter(id=log.id).update(created_at=old_date)
        log.refresh_from_db()
        logs.append(log)

    return logs


@pytest.fixture
def recent_email_logs(db, email_log_factory):
    """Create recent email logs for testing.

    Creates 5 email logs from today.

    Args:
        db: Database access fixture.
        email_log_factory: Factory for creating logs.

    Returns:
        list: List of recent EmailLog instances.
    """
    from email_tasks.models import EmailLog

    logs = []
    for i in range(5):
        logs.append(
            email_log_factory(
                email=f"recent{i}@example.com",
                status=EmailLog.Status.SENT,
            )
        )
    return logs
