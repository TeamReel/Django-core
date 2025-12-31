"""
B08 Permission System Integration Tests.

Tests audit logging integration with B08 permissions evaluator and RoleAssignment model.
Verifies that permission checks and role operations automatically create audit events.
"""

import pytest
from audit.models import AuditEvent
from audit.registry import is_event_type_registered, register_event_type
from django.contrib.auth import get_user_model
from organisations.models import Organisation
from permissions.evaluator import check_permission
from permissions.models import Permission, Role, RoleAssignment, ScopeChoices
from projects.models import Project

User = get_user_model()


@pytest.fixture
def permission_setup(db):
    """Setup users, roles, organizations for permission tests."""
    # Create users
    user = User.objects.create_user(email="user@example.com", password="testpass123")
    admin = User.objects.create_user(email="admin@example.com", password="testpass123")

    # Create organization (requires creator)
    org = Organisation.objects.create(name="Test Organization", slug="test-org", creator=admin)

    # Create project (requires creator)
    project = Project.objects.create(
        name="Test Project", slug="test-project", organisation=org, creator=admin
    )

    # Register permissions
    Permission.objects.get_or_create(
        permission="projects.create", defaults={"description": "Create projects"}
    )
    Permission.objects.get_or_create(
        permission="projects.delete", defaults={"description": "Delete projects"}
    )
    Permission.objects.get_or_create(
        permission="projects.view", defaults={"description": "View projects"}
    )

    # Create admin role
    admin_role, _ = Role.objects.get_or_create(
        name="Admin",
        defaults={"description": "Administrator role", "scope": ScopeChoices.ORGANIZATION},
    )

    # Register audit event types
    if not is_event_type_registered("permission.checked"):
        register_event_type(
            "permission.checked",
            "Permission Check",
            "Permission evaluation result logged",
        )
    if not is_event_type_registered("role.assigned"):
        register_event_type("role.assigned", "Role Assigned", "Role assigned to user")
    if not is_event_type_registered("role.revoked"):
        register_event_type("role.revoked", "Role Revoked", "Role revoked from user")

    return {
        "user": user,
        "admin": admin,
        "org": org,
        "project": project,
        "admin_role": admin_role,
    }


class TestPermissionCheckAudit:
    """Test audit logging for permission checks."""

    def test_allowed_permission_creates_audit_event(self, permission_setup):
        """Allowed permission check creates audit event with result='allowed'."""
        user = permission_setup["user"]
        org = permission_setup["org"]
        admin_role = permission_setup["admin_role"]

        # Assign admin role
        RoleAssignment.objects.create(
            role=admin_role,
            user=user,
            scope=ScopeChoices.ORGANIZATION,
            target_organization=org,
        )

        # Add permission to role
        perm = Permission.objects.get(permission="projects.create")
        admin_role.permissions.add(perm)

        # Check permission (should be allowed)
        result = check_permission(
            user.id, "projects.create", resource_id=org.id, resource_type="organisation"
        )

        assert result is True

        # Verify audit event
        event = AuditEvent.objects.filter(event_type="permission.checked").last()
        assert event is not None
        assert event.user == user
        assert event.organization == org
        assert event.metadata["permission"] == "projects.create"
        assert event.metadata["decision"] == "grant"

    def test_denied_permission_creates_audit_event(self, permission_setup):
        """Denied permission check creates audit event with result='denied'."""
        user = permission_setup["user"]
        org = permission_setup["org"]

        # No role assigned - permission denied
        result = check_permission(
            user.id, "projects.delete", resource_id=org.id, resource_type="organisation"
        )

        assert result is False

        # Verify audit event
        event = AuditEvent.objects.filter(event_type="permission.checked").last()
        assert event is not None
        assert event.user == user
        assert event.metadata["permission"] == "projects.delete"
        assert event.metadata["decision"] == "deny"

    def test_permission_check_with_resource_logs_resource_info(self, permission_setup):
        """Permission check with resource includes resource type and ID in metadata."""
        user = permission_setup["user"]
        project = permission_setup["project"]

        # Check permission on project
        check_permission(user.id, "projects.view", resource_id=project.id, resource_type="project")

        # Verify resource info in metadata
        event = AuditEvent.objects.filter(event_type="permission.checked").last()
        assert event.metadata["resource_type"] == "project"
        assert event.metadata["resource_id"] == str(project.id)


class TestRoleAssignmentAudit:
    """Test audit logging for role assignments."""

    def test_role_assignment_creates_audit_event(self, permission_setup):
        """Creating role assignment logs role.assigned event."""
        user = permission_setup["user"]
        org = permission_setup["org"]
        admin_role = permission_setup["admin_role"]
        admin = permission_setup["admin"]

        # Create assignment
        RoleAssignment.objects.create(
            role=admin_role,
            user=user,
            scope=ScopeChoices.ORGANIZATION,
            target_organization=org,
            assigned_by=admin,
        )

        # Verify audit event
        event = AuditEvent.objects.filter(event_type="role.assigned").last()
        assert event is not None
        assert event.user == admin  # Who assigned the role
        assert event.organization == org
        assert event.metadata["role_name"] == "Admin"
        assert event.metadata["target_user_id"] == str(user.id)
        assert event.metadata["target_user_email"] == user.email
        assert event.metadata["scope"] == ScopeChoices.ORGANIZATION

    def test_role_revocation_creates_audit_event(self, permission_setup):
        """Deleting role assignment logs role.revoked event."""
        user = permission_setup["user"]
        org = permission_setup["org"]
        admin_role = permission_setup["admin_role"]
        admin = permission_setup["admin"]

        # Create then delete assignment
        assignment = RoleAssignment.objects.create(
            role=admin_role,
            user=user,
            scope=ScopeChoices.ORGANIZATION,
            target_organization=org,
        )
        assignment.delete(revoked_by=admin, reason="User left organization")

        # Verify audit event
        event = AuditEvent.objects.filter(event_type="role.revoked").last()
        assert event is not None
        assert event.user == admin  # Who performed revocation
        assert event.metadata["role_name"] == "Admin"
        assert event.metadata["target_user_id"] == str(user.id)
        assert event.metadata["reason"] == "User left organization"

    def test_role_assignment_update_does_not_log(self, permission_setup):
        """Updating existing role assignment does not log duplicate event."""
        user = permission_setup["user"]
        org = permission_setup["org"]
        admin_role = permission_setup["admin_role"]

        # Create assignment
        assignment = RoleAssignment.objects.create(
            role=admin_role,
            user=user,
            scope=ScopeChoices.ORGANIZATION,
            target_organization=org,
        )

        # Count events
        initial_count = AuditEvent.objects.filter(event_type="role.assigned").count()

        # Update assignment (save again without changing pk)
        assignment.save()

        # Verify no new audit event
        new_count = AuditEvent.objects.filter(event_type="role.assigned").count()
        assert new_count == initial_count  # No duplicate event

    def test_role_revocation_without_reason(self, permission_setup):
        """Role revocation without reason defaults to 'Not specified'."""
        user = permission_setup["user"]
        org = permission_setup["org"]
        admin_role = permission_setup["admin_role"]
        admin = permission_setup["admin"]

        # Create then delete assignment without reason
        assignment = RoleAssignment.objects.create(
            role=admin_role,
            user=user,
            scope=ScopeChoices.ORGANIZATION,
            target_organization=org,
        )
        assignment.delete(revoked_by=admin)

        # Verify audit event has default reason
        event = AuditEvent.objects.filter(event_type="role.revoked").last()
        assert event is not None
        assert event.metadata["reason"] == "Not specified"
