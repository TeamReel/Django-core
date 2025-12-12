"""
Integration tests for B17 routing ACL enforcement.

Tests verify that B17 contextual notifications routing service properly
enforces ACL checks when accessing routing decision logs and preferences
via the refactored B06 service layer.
"""

import pytest
from audit.models import AuditEvent
from contextual_notifications.models import NotificationPreference
from django.contrib.auth import get_user_model
from organisations.models import Membership, Organisation
from permissions.models import Permission, Role, RoleAssignment
from rest_framework.test import APIClient

User = get_user_model()


@pytest.mark.django_db
class TestB17RoutingLogsACL:
    """Test ACL enforcement for routing decision logs."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Set up test data for each test."""
        self.client = APIClient()

        # Create permission for viewing routing logs
        self.routing_logs_perm, _ = Permission.objects.get_or_create(
            permission="organization.view_routing_logs",
            defaults={
                "resource_type": "organization",
                "description": "View notification routing decision logs",
            },
        )

        # Create role with routing logs permission
        self.admin_role, _ = Role.objects.get_or_create(
            name="Admin", defaults={"description": "Organisation administrator"}
        )
        self.admin_role.permissions.add(self.routing_logs_perm)

        # Create test organizations
        self.org_a = Organisation.objects.create(name="Org A", creator=self._create_temp_user())
        self.org_b = Organisation.objects.create(name="Org B", creator=self._create_temp_user())

        # Create test users
        self.admin_user_a = User.objects.create_user(
            username="admin_a", email="admin_a@test.com", password="testpass"
        )
        self.regular_user = User.objects.create_user(
            username="regular", email="regular@test.com", password="testpass"
        )

        # Add admin_user_a as admin of org_a
        Membership.objects.create(user=self.admin_user_a, organisation=self.org_a, role="admin")

        # Assign admin role to user at org level
        RoleAssignment.objects.create(
            user=self.admin_user_a,
            role=self.admin_role,
            scope="organization",
            target_organization_id=str(self.org_a.id),
        )

        # Create routing decision audit events
        self.event_org_a = AuditEvent.objects.create(
            event_type="notification_routing_decision",
            user=self.admin_user_a,
            organization=self.org_a,
            metadata={"event": "project.updated", "recipients": 3},
        )

        self.event_org_b = AuditEvent.objects.create(
            event_type="notification_routing_decision",
            user=self.regular_user,
            organization=self.org_b,
            metadata={"event": "project.created", "recipients": 1},
        )

    def _create_temp_user(self):
        """Helper to create temporary user for organization creator."""
        import uuid

        return User.objects.create_user(
            username=f"temp_{uuid.uuid4().hex[:8]}",
            email=f"temp_{uuid.uuid4().hex[:8]}@test.com",
            password="testpass",
        )

    def test_admin_can_view_routing_logs_for_own_org(self):
        """Admin user with permission can view routing logs for their organization."""
        self.client.force_authenticate(user=self.admin_user_a)

        response = self.client.get("/api/contextual-notifications/routing-logs/")

        assert response.status_code == 200
        # Should only see events for org_a
        data = response.json()
        results = data.get("results", [])
        assert len(results) > 0
        assert all(r["organization"]["id"] == str(self.org_a.id) for r in results)

        # Verify B09 audit event for permission check
        audit_events = AuditEvent.objects.filter(
            event_type__in=["permission.granted", "permission.checked"],
            user=self.admin_user_a,
        ).order_by("-created_at")

        assert audit_events.exists(), "Expected B09 audit event for permission check"

    def test_admin_cannot_view_routing_logs_for_other_org(self):
        """Admin user cannot see routing logs from organizations they don't belong to."""
        self.client.force_authenticate(user=self.admin_user_a)

        response = self.client.get("/api/contextual-notifications/routing-logs/")

        assert response.status_code == 200
        data = response.json()
        results = data.get("results", [])

        # Should NOT include org_b events
        org_b_events = [r for r in results if r["organization"]["id"] == str(self.org_b.id)]
        assert len(org_b_events) == 0, "Should not see events from unauthorized organization"

    def test_regular_user_cannot_view_routing_logs(self):
        """Regular user without admin role cannot access routing logs."""
        self.client.force_authenticate(user=self.regular_user)

        response = self.client.get("/api/contextual-notifications/routing-logs/")

        assert response.status_code == 200  # Endpoint accessible
        data = response.json()
        results = data.get("results", [])

        # Should return empty results (queryset.none())
        assert len(results) == 0, "Regular users should not see any routing logs"


@pytest.mark.django_db
class TestB17NotificationPreferencesACL:
    """Test ACL enforcement for notification preferences."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Set up test data for preferences tests."""
        self.client = APIClient()

        # Create permission for viewing members
        self.view_members_perm, _ = Permission.objects.get_or_create(
            permission="org.view_members",
            defaults={
                "resource_type": "org",
                "description": "View organisation members",
            },
        )

        # Create admin role with view_members permission
        self.admin_role, _ = Role.objects.get_or_create(
            name="Admin", defaults={"description": "Organisation administrator"}
        )
        self.admin_role.permissions.add(self.view_members_perm)

        # Create test organization
        self.org = Organisation.objects.create(name="Test Org", creator=self._create_temp_user())

        # Create users
        self.admin_user = User.objects.create_user(
            username="admin", email="admin@test.com", password="testpass"
        )
        self.team_member = User.objects.create_user(
            username="member", email="member@test.com", password="testpass"
        )
        self.external_user = User.objects.create_user(
            username="external", email="external@test.com", password="testpass"
        )

        # Add memberships
        Membership.objects.create(user=self.admin_user, organisation=self.org, role="admin")
        Membership.objects.create(user=self.team_member, organisation=self.org, role="member")

        # Assign role to admin
        RoleAssignment.objects.create(
            user=self.admin_user,
            role=self.admin_role,
            scope="organization",
            target_organization_id=str(self.org.id),
        )

        # Create preferences
        self.admin_pref = NotificationPreference.objects.create(
            user=self.admin_user, event_type="project.updated", channel="email", enabled=True
        )
        self.member_pref = NotificationPreference.objects.create(
            user=self.team_member, event_type="project.updated", channel="email", enabled=False
        )
        self.external_pref = NotificationPreference.objects.create(
            user=self.external_user, event_type="project.created", channel="in_app", enabled=True
        )

    def _create_temp_user(self):
        """Helper to create temporary user."""
        import uuid

        return User.objects.create_user(
            username=f"temp_{uuid.uuid4().hex[:8]}",
            email=f"temp_{uuid.uuid4().hex[:8]}@test.com",
            password="testpass",
        )

    def test_admin_can_view_team_preferences(self):
        """Admin can view preferences for users in their organization."""
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get("/api/contextual-notifications/preferences/")

        assert response.status_code == 200
        data = response.json()
        results = data.get("results", [])

        # Should see preferences for admin and team member
        user_ids = [r["user"]["id"] for r in results]
        assert self.admin_user.id in user_ids
        assert self.team_member.id in user_ids
        assert self.external_user.id not in user_ids, "Should not see external user preferences"

    def test_member_can_only_view_own_preferences(self):
        """Regular team member can only view their own preferences."""
        self.client.force_authenticate(user=self.team_member)

        response = self.client.get("/api/contextual-notifications/preferences/")

        assert response.status_code == 200
        data = response.json()
        results = data.get("results", [])

        # Should only see own preference
        assert len(results) == 1
        assert results[0]["user"]["id"] == self.team_member.id

    def test_external_user_cannot_view_team_preferences(self):
        """User not in organization cannot see team preferences."""
        self.client.force_authenticate(user=self.external_user)

        response = self.client.get("/api/contextual-notifications/preferences/")

        assert response.status_code == 200
        data = response.json()
        results = data.get("results", [])

        # Should only see own preference
        assert len(results) == 1
        assert results[0]["user"]["id"] == self.external_user.id

        # Should NOT see admin or member preferences
        user_ids = [r["user"]["id"] for r in results]
        assert self.admin_user.id not in user_ids
        assert self.team_member.id not in user_ids
