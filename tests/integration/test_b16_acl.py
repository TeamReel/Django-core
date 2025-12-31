"""Integration tests for B16 Notifications ACL Enforcement (WP03).

Tests verify:
- NotificationViewSet enforces notifications.view permission
- List endpoint returns only user's own notifications
- Retrieve endpoint requires permission check
- B09 audit events logged for permission checks
- Permission denials return 403 with proper audit trail
"""

import pytest
from accounts.models import User
from audit.models import AuditEvent
from notifications.models import Notification, NotificationType
from organisations.models import Membership, Organisation
from permissions.models import Permission, Role, RoleAssignment
from rest_framework.test import APIClient


@pytest.mark.django_db
class TestB16NotificationACL:
    """Integration tests for notification ACL enforcement."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Set up test fixtures."""
        from django.core.cache import cache
        from notifications.models import RetryPolicy

        cache.clear()

        self.client = APIClient()

        # Create retry policy
        retry_policy = RetryPolicy.objects.create(
            name="test-policy",
            max_attempts=3,
            retry_window_seconds=3600,
            backoff_strategy="exponential",
            backoff_multiplier=5.0,
            initial_delay_seconds=60,
        )

        # Create notification type with required fields
        self.notification_type = NotificationType.objects.create(
            code="test_notification",
            name="Test Notification",
            description="Test notification type",
            default_channel="email",
            retry_policy=retry_policy,
        )

    def create_user_with_permission(self, username="testuser"):
        """Create user with notifications.view permission."""
        # Create user first
        user = User.objects.create_user(
            email=f"{username}@example.com",
            password="testpass123",
        )

        # Create organization with creator
        org = Organisation.objects.create(name=f"Test Org {username}", creator=user)

        # Add user to organization
        Membership.objects.create(
            user=user,
            organisation=org,
            role="member",
        )

        # Create permission
        perm, _ = Permission.objects.get_or_create(
            permission="notifications.view",
            defaults={
                "resource_type": "generic",
                "description": "View notifications",
            },
        )

        # Create role with permission
        role, _ = Role.objects.get_or_create(
            name="Notification Viewer",
            defaults={
                "description": "Can view notifications",
                "scope": "GENERIC",
            },
        )
        role.permissions.add(perm)

        # Assign role to user at org level
        RoleAssignment.objects.create(
            user=user,
            role=role,
            scope="ORGANIZATION",
            target_organization_id=str(org.id),
        )

        return user

    def create_user_without_permission(self, username="nopermuser"):
        """Create user without notifications.view permission."""
        # Create user first
        user = User.objects.create_user(
            email=f"{username}@example.com",
            password="testpass123",
        )

        # Create organization with creator
        org = Organisation.objects.create(name=f"Test Org {username}", creator=user)

        # Add user to organization (but no notification permission)
        Membership.objects.create(
            user=user,
            organisation=org,
            role="member",
        )

        return user

    def test_list_notifications_allowed_with_permission(self):
        """User with notifications.view permission can list notifications."""
        # Setup
        user = self.create_user_with_permission("alice")

        # Create in-app notification for user
        notification = Notification.objects.create(
            type=self.notification_type,
            channel="in_app",
            recipient=user.email,
            recipient_user=user,
            payload={"title": "Test notification"},
            status="sent",
        )

        # Execute
        self.client.force_authenticate(user=user)
        response = self.client.get("/api/v1/notifications/")

        # Assert
        assert response.status_code == 200
        assert len(response.data["results"]) == 1
        assert str(response.data["results"][0]["id"]) == str(notification.id)

        # Verify audit event created
        audit_events = AuditEvent.objects.filter(
            user=user,
            event_type="permission.checked",
        )
        assert audit_events.exists()
        latest_event = audit_events.latest("created_at")
        assert latest_event.metadata["decision"] == "grant"
        assert latest_event.metadata["permission"] == "notifications.view"

    def test_list_notifications_denied_without_permission(self):
        """User without notifications.view permission cannot list notifications."""
        # Setup
        user = self.create_user_without_permission("bob")

        # Create notification (though user can't see it)
        Notification.objects.create(
            type=self.notification_type,
            channel="in_app",
            recipient=user.email,
            recipient_user=user,
            payload={"title": "Test notification"},
            status="sent",
        )

        # Execute
        self.client.force_authenticate(user=user)
        response = self.client.get("/api/v1/notifications/")

        # Assert
        assert response.status_code == 403
        assert "notifications.view" in str(response.data)

        # Verify audit event created for denial
        audit_events = AuditEvent.objects.filter(
            user=user,
            event_type="permission.checked",
        )
        assert audit_events.exists()
        latest_event = audit_events.latest("created_at")
        assert latest_event.metadata["decision"] == "deny"
        assert latest_event.metadata["permission"] == "notifications.view"

    def test_retrieve_notification_allowed_with_permission(self):
        """User with notifications.view permission can retrieve notification details."""
        # Setup
        user = self.create_user_with_permission("charlie")

        # Create notification
        notification = Notification.objects.create(
            type=self.notification_type,
            channel="in_app",
            recipient=user.email,
            recipient_user=user,
            payload={"title": "Test notification", "body": "Details here"},
            status="sent",
        )

        # Execute
        self.client.force_authenticate(user=user)
        response = self.client.get(f"/api/v1/notifications/{notification.id}/")

        # Assert
        assert response.status_code == 200
        assert str(response.data["id"]) == str(notification.id)
        assert response.data["payload"]["title"] == "Test notification"

        # Verify audit event
        audit_events = AuditEvent.objects.filter(
            user=user,
            event_type="permission.checked",
        )
        assert audit_events.exists()
        latest_event = audit_events.latest("created_at")
        assert latest_event.metadata["decision"] == "grant"

    def test_retrieve_notification_denied_without_permission(self):
        """User without notifications.view permission cannot retrieve notification details."""
        # Setup
        user = self.create_user_without_permission("dave")

        # Create notification
        notification = Notification.objects.create(
            type=self.notification_type,
            channel="in_app",
            recipient=user.email,
            recipient_user=user,
            payload={"title": "Test notification"},
            status="sent",
        )

        # Execute
        self.client.force_authenticate(user=user)
        response = self.client.get(f"/api/v1/notifications/{notification.id}/")

        # Assert
        assert response.status_code == 403
        assert "notifications.view" in str(response.data)

        # Verify audit event for denial
        audit_events = AuditEvent.objects.filter(
            user=user,
            event_type="permission.checked",
        )
        assert audit_events.exists()
        latest_event = audit_events.latest("created_at")
        assert latest_event.metadata["decision"] == "deny"

    def test_unauthenticated_user_cannot_list_notifications(self):
        """Unauthenticated user gets 401 when listing notifications."""
        # Execute (no authentication)
        response = self.client.get("/api/v1/notifications/")

        # Assert
        assert response.status_code == 401

    def test_user_only_sees_own_notifications(self):
        """User only sees notifications where they are recipient_user."""
        # Setup
        user_a = self.create_user_with_permission("alice")
        user_b = self.create_user_with_permission("bob")

        # Create notifications for both users
        notif_a = Notification.objects.create(
            type=self.notification_type,
            channel="in_app",
            recipient=user_a.email,
            recipient_user=user_a,
            payload={"title": "Alice notification"},
            status="sent",
        )

        notif_b = Notification.objects.create(
            type=self.notification_type,
            channel="in_app",
            recipient=user_b.email,
            recipient_user=user_b,
            payload={"title": "Bob notification"},
            status="sent",
        )

        # Execute - Alice lists notifications
        self.client.force_authenticate(user=user_a)
        response = self.client.get("/api/v1/notifications/")

        # Assert - Alice only sees her notification
        assert response.status_code == 200
        notification_ids = [n["id"] for n in response.data["results"]]
        assert str(notif_a.id) in notification_ids
        assert str(notif_b.id) not in notification_ids

        # Execute - Bob lists notifications
        self.client.force_authenticate(user=user_b)
        response = self.client.get("/api/v1/notifications/")

        # Assert - Bob only sees his notification
        assert response.status_code == 200
        notification_ids = [n["id"] for n in response.data["results"]]
        assert str(notif_b.id) in notification_ids
        assert str(notif_a.id) not in notification_ids
