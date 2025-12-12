"""Security tests for B16 Notifications ACL Bypass Attempts (WP03-T019).

Tests verify:
- Cross-user notification access blocked
- Permission bypass attempts fail
- Anonymous access blocked
- Invalid notification IDs handled correctly
- All bypass attempts logged in B09 audit events
"""

import pytest
from accounts.models import User
from audit.models import AuditEvent
from notifications.models import Notification, NotificationType
from organisations.models import Membership, Organisation
from permissions.models import Permission, Role, RoleAssignment
from rest_framework.test import APIClient


@pytest.mark.django_db
class TestB16NotificationBypass:
    """Security tests for notification ACL bypass attempts."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Set up test fixtures."""
        self.client = APIClient()

        # Create notification type
        self.notification_type = NotificationType.objects.create(
            code="test_notification",
            name="Test Notification",
            description="Test notification type",
        )

    def create_user_with_permission(self, username="testuser"):
        """Create user with notifications.view permission."""
        org = Organisation.objects.create(name=f"Test Org {username}")
        user = User.objects.create_user(
            username=username,
            email=f"{username}@example.com",
            password="testpass123",
        )
        Membership.objects.create(user=user, organisation=org, role="member")

        perm, _ = Permission.objects.get_or_create(
            permission="notifications.view",
            defaults={"resource_type": "generic", "description": "View notifications"},
        )
        role, _ = Role.objects.get_or_create(
            name="Notification Viewer",
            defaults={"description": "Can view notifications", "scope": "GENERIC"},
        )
        role.permissions.add(perm)
        RoleAssignment.objects.create(
            user=user, role=role, scope="ORGANIZATION", resource_id=str(org.id)
        )

        return user

    def create_user_without_permission(self, username="nopermuser"):
        """Create user without notifications.view permission."""
        org = Organisation.objects.create(name=f"Test Org {username}")
        user = User.objects.create_user(
            username=username,
            email=f"{username}@example.com",
            password="testpass123",
        )
        Membership.objects.create(user=user, organisation=org, role="member")
        return user

    def test_cannot_retrieve_another_users_notification(self):
        """User cannot retrieve notification belonging to different user."""
        # Setup
        user_a = self.create_user_with_permission("alice")
        user_b = self.create_user_with_permission("bob")

        # Create notification for Bob
        notif_b = Notification.objects.create(
            type=self.notification_type,
            channel="in_app",
            recipient=user_b.username,
            recipient_user=user_b,
            payload={"title": "Bob's secret notification"},
            status="sent",
        )

        # Execute - Alice tries to retrieve Bob's notification
        self.client.force_authenticate(user=user_a)
        response = self.client.get(f"/api/notifications/{notif_b.id}/")

        # Assert - Returns 404 (DRF convention: filtered queryset returns 404, not 403)
        assert response.status_code == 404

        # Verify audit event logged for permission check
        audit_events = AuditEvent.objects.filter(
            user=user_a,
            event_type="permission.check",
        )
        assert audit_events.exists()

    def test_cannot_enumerate_notification_ids_across_users(self):
        """User cannot enumerate notification IDs from other users."""
        # Setup
        user_a = self.create_user_with_permission("alice")
        user_b = self.create_user_with_permission("bob")

        # Create 5 notifications for Bob
        notif_ids_b = []
        for i in range(5):
            notif = Notification.objects.create(
                type=self.notification_type,
                channel="in_app",
                recipient=user_b.username,
                recipient_user=user_b,
                payload={"title": f"Bob notification {i}"},
                status="sent",
            )
            notif_ids_b.append(notif.id)

        # Execute - Alice attempts to retrieve all Bob's notifications
        self.client.force_authenticate(user=user_a)

        leaked_notifications = []
        for notif_id in notif_ids_b:
            response = self.client.get(f"/api/notifications/{notif_id}/")
            if response.status_code == 200:
                leaked_notifications.append(notif_id)

        # Assert - None of Bob's notifications leaked to Alice
        assert len(leaked_notifications) == 0, f"Notifications leaked: {leaked_notifications}"

        # Verify audit events logged for all attempts
        audit_events = AuditEvent.objects.filter(
            user=user_a,
            event_type="permission.check",
        )
        assert audit_events.count() >= 5  # At least one per attempt

    def test_permission_bypass_via_direct_api_call(self):
        """User without permission cannot bypass ACL via direct API call."""
        # Setup
        user = self.create_user_without_permission("attacker")

        # Create notification for attacker (they own it, but lack permission)
        notification = Notification.objects.create(
            type=self.notification_type,
            channel="in_app",
            recipient=user.username,
            recipient_user=user,
            payload={"title": "Attacker notification"},
            status="sent",
        )

        # Execute - Try both list and retrieve
        self.client.force_authenticate(user=user)

        list_response = self.client.get("/api/notifications/")
        retrieve_response = self.client.get(f"/api/notifications/{notification.id}/")

        # Assert - Both blocked with 403
        assert list_response.status_code == 403
        assert "notifications.view" in str(list_response.data)

        assert retrieve_response.status_code == 403
        assert "notifications.view" in str(retrieve_response.data)

        # Verify audit events logged for both denials
        audit_events = AuditEvent.objects.filter(
            user=user,
            event_type="permission.check",
            outcome="failure",
        )
        assert audit_events.count() >= 2  # One for list, one for retrieve

    def test_anonymous_user_cannot_access_notifications(self):
        """Unauthenticated user cannot access notification endpoints."""
        # Setup
        user = self.create_user_with_permission("alice")
        notification = Notification.objects.create(
            type=self.notification_type,
            channel="in_app",
            recipient=user.username,
            recipient_user=user,
            payload={"title": "Test"},
            status="sent",
        )

        # Execute (no authentication)
        list_response = self.client.get("/api/notifications/")
        retrieve_response = self.client.get(f"/api/notifications/{notification.id}/")

        # Assert
        assert list_response.status_code == 401
        assert retrieve_response.status_code == 401

    def test_invalid_notification_id_returns_404(self):
        """Requesting invalid notification ID returns 404, not server error."""
        # Setup
        user = self.create_user_with_permission("alice")

        # Execute - Request nonexistent notification
        self.client.force_authenticate(user=user)
        response = self.client.get("/api/notifications/00000000-0000-0000-0000-000000000000/")

        # Assert
        assert response.status_code == 404

    def test_malformed_notification_id_returns_404(self):
        """Requesting malformed notification ID returns 404, not server error."""
        # Setup
        user = self.create_user_with_permission("alice")

        # Execute - Request with malformed ID
        self.client.force_authenticate(user=user)
        response = self.client.get("/api/notifications/invalid-uuid/")

        # Assert
        assert response.status_code == 404

    def test_cannot_access_notifications_via_different_user_session(self):
        """User cannot see another user's notifications even with valid session."""
        # Setup
        user_a = self.create_user_with_permission("alice")
        user_b = self.create_user_with_permission("bob")

        # Create notification for each user
        notif_a = Notification.objects.create(
            type=self.notification_type,
            channel="in_app",
            recipient=user_a.username,
            recipient_user=user_a,
            payload={"title": "Alice notification"},
            status="sent",
        )

        notif_b = Notification.objects.create(
            type=self.notification_type,
            channel="in_app",
            recipient=user_b.username,
            recipient_user=user_b,
            payload={"title": "Bob notification"},
            status="sent",
        )

        # Execute - Alice's session
        self.client.force_authenticate(user=user_a)
        alice_list = self.client.get("/api/notifications/")
        alice_retrieve_own = self.client.get(f"/api/notifications/{notif_a.id}/")
        alice_retrieve_bobs = self.client.get(f"/api/notifications/{notif_b.id}/")

        # Assert - Alice sees only her notification
        assert alice_list.status_code == 200
        assert len(alice_list.data["results"]) == 1
        assert alice_list.data["results"][0]["id"] == str(notif_a.id)

        assert alice_retrieve_own.status_code == 200
        assert alice_retrieve_bobs.status_code == 404  # Bob's notification not in Alice's queryset

        # Execute - Bob's session
        self.client.force_authenticate(user=user_b)
        bob_list = self.client.get("/api/notifications/")
        bob_retrieve_own = self.client.get(f"/api/notifications/{notif_b.id}/")
        bob_retrieve_alices = self.client.get(f"/api/notifications/{notif_a.id}/")

        # Assert - Bob sees only his notification
        assert bob_list.status_code == 200
        assert len(bob_list.data["results"]) == 1
        assert bob_list.data["results"][0]["id"] == str(notif_b.id)

        assert bob_retrieve_own.status_code == 200
        assert bob_retrieve_alices.status_code == 404  # Alice's notification not in Bob's queryset

    def test_staff_user_still_requires_permission(self):
        """Staff user without notifications.view permission is still blocked."""
        # Setup
        staff_user = User.objects.create_user(
            username="staffuser",
            email="staff@example.com",
            password="testpass123",
            is_staff=True,
        )

        # Execute - Staff user tries to access without permission
        self.client.force_authenticate(user=staff_user)
        response = self.client.get("/api/notifications/")

        # Assert - Still blocked (staff status doesn't bypass permissions)
        assert response.status_code == 403

        # Verify audit event logged
        audit_events = AuditEvent.objects.filter(
            user=staff_user,
            event_type="permission.check",
            outcome="failure",
        )
        assert audit_events.exists()

    def test_all_bypass_attempts_logged_in_audit(self):
        """All bypass attempts are logged in B09 audit events."""
        # Setup
        attacker = self.create_user_without_permission("attacker")
        victim = self.create_user_with_permission("victim")

        # Create victim's notification
        notification = Notification.objects.create(
            type=self.notification_type,
            channel="in_app",
            recipient=victim.username,
            recipient_user=victim,
            payload={"title": "Victim notification"},
            status="sent",
        )

        # Execute - Multiple bypass attempts
        self.client.force_authenticate(user=attacker)

        # Attempt 1: List notifications
        self.client.get("/api/notifications/")

        # Attempt 2: Retrieve victim's notification
        self.client.get(f"/api/notifications/{notification.id}/")

        # Attempt 3: List again (persistent attacker)
        self.client.get("/api/notifications/")

        # Assert - All attempts logged
        audit_events = AuditEvent.objects.filter(
            user=attacker,
            event_type="permission.check",
        )
        assert audit_events.count() >= 3

        # All should be failures
        failure_events = audit_events.filter(outcome="failure")
        assert failure_events.count() >= 3

        # All should reference notifications.view permission
        for event in failure_events:
            assert event.metadata["permission"] == "notifications.view"
