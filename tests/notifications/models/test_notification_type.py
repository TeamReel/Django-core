"""Unit tests for NotificationType model."""

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from notifications.models import NotificationType, RetryPolicy

from tests.notifications.base import NotificationTestCase


class TestNotificationType(NotificationTestCase):
    """Tests for NotificationType model."""

    def test_create_notification_type(self, retry_policy_factory: RetryPolicy) -> None:
        """Test creating a valid notification type."""
        retry_policy = retry_policy_factory()

        notification_type = NotificationType.objects.create(
            code="test_notification",
            name="Test Notification",
            description="A test notification type",
            default_channel="email",
            retry_policy=retry_policy,
            is_active=True,
        )

        assert notification_type.code == "test_notification"
        assert notification_type.name == "Test Notification"
        assert notification_type.description == "A test notification type"
        assert notification_type.default_channel == "email"
        assert notification_type.retry_policy == retry_policy
        assert notification_type.is_active is True
        assert notification_type.created_at is not None

    def test_unique_code_constraint(self, retry_policy_factory: RetryPolicy) -> None:
        """Test that notification type codes must be unique."""
        retry_policy = retry_policy_factory()

        NotificationType.objects.create(code="duplicate_code", retry_policy=retry_policy)

        with pytest.raises(IntegrityError):
            NotificationType.objects.create(code="duplicate_code", retry_policy=retry_policy)

    def test_code_validation_lowercase(self, retry_policy_factory: RetryPolicy) -> None:
        """Test that code must be lowercase."""
        retry_policy = retry_policy_factory()

        notification_type = NotificationType(
            code="UPPERCASE_CODE",
            name="Test",
            retry_policy=retry_policy,
        )

        with pytest.raises(ValidationError) as exc_info:
            notification_type.full_clean()

        assert "code" in exc_info.value.message_dict

    def test_code_validation_special_chars(self, retry_policy_factory: RetryPolicy) -> None:
        """Test that code only allows alphanumeric, underscore, hyphen."""
        retry_policy = retry_policy_factory()

        notification_type = NotificationType(
            code="invalid@code!",
            name="Test",
            retry_policy=retry_policy,
        )

        with pytest.raises(ValidationError) as exc_info:
            notification_type.full_clean()

        assert "code" in exc_info.value.message_dict

    def test_code_validation_valid_patterns(self, retry_policy_factory: RetryPolicy) -> None:
        """Test valid code patterns."""
        retry_policy = retry_policy_factory()

        # All lowercase alphanumeric
        type1 = NotificationType(
            code="validcode123",
            name="Test",
            retry_policy=retry_policy,
        )
        type1.full_clean()
        type1.save()

        # With underscores
        type2 = NotificationType(
            code="valid_code_with_underscores",
            name="Test 2",
            retry_policy=retry_policy,
        )
        type2.full_clean()
        type2.save()

        # With hyphens
        type3 = NotificationType(
            code="valid-code-with-hyphens",
            name="Test 3",
            retry_policy=retry_policy,
        )
        type3.full_clean()
        type3.save()

        # Mixed
        type4 = NotificationType(
            code="valid_code-123",
            name="Test 4",
            retry_policy=retry_policy,
        )
        type4.full_clean()
        type4.save()

    def test_default_channel_choices(self, retry_policy_factory: RetryPolicy) -> None:
        """Test default_channel accepts valid choices."""
        retry_policy = retry_policy_factory()

        # Email
        type1 = NotificationType.objects.create(
            code="email_type",
            name="Email Type",
            default_channel="email",
            retry_policy=retry_policy,
        )
        assert type1.default_channel == "email"

        # In-app
        type2 = NotificationType.objects.create(
            code="inapp_type",
            name="In-App Type",
            default_channel="in_app",
            retry_policy=retry_policy,
        )
        assert type2.default_channel == "in_app"

        # Webhook
        type3 = NotificationType.objects.create(
            code="webhook_type",
            name="Webhook Type",
            default_channel="webhook",
            retry_policy=retry_policy,
        )
        assert type3.default_channel == "webhook"

    def test_retry_policy_foreign_key(self, retry_policy_factory: RetryPolicy) -> None:
        """Test retry_policy foreign key relationship."""
        retry_policy = retry_policy_factory(name="custom-policy")

        notification_type = NotificationType.objects.create(
            code="test_type",
            name="Test Type",
            retry_policy=retry_policy,
        )

        # Test forward relationship
        assert notification_type.retry_policy == retry_policy

        # Test reverse relationship
        assert notification_type in retry_policy.notification_types.all()

    def test_retry_policy_protect_on_delete(self, retry_policy_factory: RetryPolicy) -> None:
        """Test that deleting retry policy is prevented if in use."""
        retry_policy = retry_policy_factory()

        NotificationType.objects.create(
            code="test_type",
            name="Test Type",
            retry_policy=retry_policy,
        )

        from django.db.models import ProtectedError

        with pytest.raises(ProtectedError):
            retry_policy.delete()

    def test_is_active_default(self, retry_policy_factory: RetryPolicy) -> None:
        """Test is_active defaults to True."""
        retry_policy = retry_policy_factory()

        notification_type = NotificationType.objects.create(
            code="test_type",
            name="Test Type",
            retry_policy=retry_policy,
        )

        assert notification_type.is_active is True

    def test_is_active_filtering(self, retry_policy_factory: RetryPolicy) -> None:
        """Test filtering by is_active."""
        retry_policy = retry_policy_factory()

        active_type = NotificationType.objects.create(
            code="active_type",
            name="Active Type",
            retry_policy=retry_policy,
            is_active=True,
        )

        inactive_type = NotificationType.objects.create(
            code="inactive_type",
            name="Inactive Type",
            retry_policy=retry_policy,
            is_active=False,
        )

        # Filter active
        active_types = NotificationType.objects.filter(is_active=True)
        assert active_type in active_types
        assert inactive_type not in active_types

        # Filter inactive
        inactive_types = NotificationType.objects.filter(is_active=False)
        assert inactive_type in inactive_types
        assert active_type not in inactive_types

    def test_index_is_active_code(self, retry_policy_factory: RetryPolicy) -> None:
        """Test idx_type_active index usage (is_active, code).

        Note: Index verification is implicit - Django will use it
        automatically for queries on these fields.
        """
        retry_policy = retry_policy_factory()

        # Create multiple types
        for i in range(10):
            NotificationType.objects.create(
                code=f"type_{i}",
                name=f"Type {i}",
                retry_policy=retry_policy,
                is_active=i % 2 == 0,  # Alternate active/inactive
            )

        # Query using indexed fields
        result = NotificationType.objects.filter(is_active=True, code__startswith="type_")

        assert result.count() == 5

    def test_str_representation(self, retry_policy_factory: RetryPolicy) -> None:
        """Test string representation."""
        retry_policy = retry_policy_factory()

        notification_type = NotificationType(
            code="test_type",
            name="Test Notification Type",
            retry_policy=retry_policy,
        )

        assert "test_type" in str(notification_type)

    def test_ordering(self, retry_policy_factory: RetryPolicy) -> None:
        """Test queryset ordering by code."""
        retry_policy = retry_policy_factory()

        NotificationType.objects.create(code="zebra", name="Zebra", retry_policy=retry_policy)
        NotificationType.objects.create(code="alpha", name="Alpha", retry_policy=retry_policy)
        NotificationType.objects.create(code="beta", name="Beta", retry_policy=retry_policy)

        types = list(NotificationType.objects.all())
        assert types[0].code == "alpha"
        assert types[1].code == "beta"
        assert types[2].code == "zebra"

    def test_optional_description(self, retry_policy_factory: RetryPolicy) -> None:
        """Test that description is optional."""
        retry_policy = retry_policy_factory()

        notification_type = NotificationType.objects.create(
            code="no_desc",
            name="No Description",
            retry_policy=retry_policy,
        )

        assert notification_type.description is None
