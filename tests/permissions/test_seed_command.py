"""
Tests for seed_default_roles and warm_permission_cache management commands.

Tests cover:
- Idempotency (running multiple times)
- Force flag behavior
- Permission creation (17 base + 1 wildcard)
- Role creation (7 roles with correct scopes)
- Permission mappings (each role has expected permissions)
- Sensitive flags (11 permissions marked)
- Global Admin wildcard
- Cache warming command
"""

from io import StringIO

import pytest
from accounts.models import User
from django.core.management import call_command
from permissions.models import Permission, Role, RoleAssignment, ScopeChoices


@pytest.mark.django_db
class TestSeedDefaultRolesCommand:
    """Tests for the seed_default_roles management command."""

    def test_seed_creates_17_base_permissions(self):
        """Verify that seeding creates exactly 17 base permissions (excluding wildcard)."""
        # Count permissions before
        initial_count = Permission.objects.count()

        # Run seed command
        call_command("seed_default_roles")

        # Should have created 17 base permissions + 1 wildcard = 18 total
        final_count = Permission.objects.count()
        assert final_count == initial_count + 18

        # Verify wildcard exists
        assert Permission.objects.filter(permission="*").exists()

        # Count base permissions (non-wildcard)
        base_perms = Permission.objects.exclude(permission="*")
        assert base_perms.count() == 17

    def test_seed_creates_org_permissions(self):
        """Verify all 6 organization permissions are created."""
        call_command("seed_default_roles")

        expected_org_perms = [
            "org.invite_users",
            "org.remove_users",
            "org.manage_settings",
            "org.view_members",
            "org.assign_roles",
            "org.delete",
        ]

        for perm_str in expected_org_perms:
            perm = Permission.objects.get(permission=perm_str)
            assert perm.resource_type == "org"

    def test_seed_creates_project_permissions(self):
        """Verify all 6 project permissions are created."""
        call_command("seed_default_roles")

        expected_project_perms = [
            "projects.create",
            "projects.view",
            "projects.update",
            "projects.delete",
            "projects.archive",
            "projects.assign_roles",
        ]

        for perm_str in expected_project_perms:
            perm = Permission.objects.get(permission=perm_str)
            assert perm.resource_type == "project"

    def test_seed_creates_permission_management_permissions(self):
        """Verify all 5 permission management permissions are created."""
        call_command("seed_default_roles")

        expected_perm_perms = [
            "permissions.create_role",
            "permissions.modify_role",
            "permissions.delete_role",
            "permissions.assign_role",
            "permissions.view_roles",
        ]

        for perm_str in expected_perm_perms:
            perm = Permission.objects.get(permission=perm_str)
            assert perm.resource_type == "generic"

    def test_seed_marks_11_sensitive_permissions(self):
        """Verify exactly 11 permissions are marked as sensitive."""
        call_command("seed_default_roles")

        sensitive_perms = Permission.objects.filter(is_sensitive=True)
        assert sensitive_perms.count() == 11

        # Verify critical sensitive permissions
        critical_sensitive = [
            "org.invite_users",
            "org.remove_users",
            "org.assign_roles",
            "org.delete",
            "projects.delete",
            "projects.assign_roles",
            "permissions.create_role",
            "permissions.modify_role",
            "permissions.delete_role",
            "permissions.assign_role",
            "*",  # wildcard is also sensitive
        ]

        for perm_str in critical_sensitive:
            perm = Permission.objects.get(permission=perm_str)
            assert perm.is_sensitive, f"{perm_str} should be marked sensitive"

    def test_seed_creates_7_roles(self):
        """Verify that seeding creates exactly 7 default roles."""
        call_command("seed_default_roles")

        assert Role.objects.count() == 7

        expected_roles = [
            "Global Admin",
            "Organization Admin",
            "Organization Member",
            "Organization Viewer",
            "Project Admin",
            "Project Member",
            "Project Viewer",
        ]

        for role_name in expected_roles:
            assert Role.objects.filter(name=role_name).exists()

    def test_global_admin_has_wildcard_permission(self):
        """Verify Global Admin role has wildcard '*' permission."""
        call_command("seed_default_roles")

        global_admin = Role.objects.get(name="Global Admin")
        assert global_admin.scope == ScopeChoices.GLOBAL
        assert global_admin.permissions.filter(permission="*").exists()
        assert global_admin.permissions.count() == 1  # Only wildcard

    def test_organization_admin_has_all_org_and_project_perms(self):
        """Verify Organization Admin has all org.* and projects.* permissions."""
        call_command("seed_default_roles")

        org_admin = Role.objects.get(name="Organization Admin")
        assert org_admin.scope == ScopeChoices.ORGANIZATION

        # Should have all org and project permissions
        org_perms = Permission.objects.filter(resource_type="org")
        project_perms = Permission.objects.filter(resource_type="project")
        expected_count = org_perms.count() + project_perms.count()

        assert org_admin.permissions.count() == expected_count

        # Verify has specific permissions
        assert org_admin.permissions.filter(permission="org.delete").exists()
        assert org_admin.permissions.filter(permission="projects.delete").exists()

    def test_organization_member_permissions(self):
        """Verify Organization Member has correct subset of permissions."""
        call_command("seed_default_roles")

        org_member = Role.objects.get(name="Organization Member")
        assert org_member.scope == ScopeChoices.ORGANIZATION

        expected_perms = [
            "org.view_members",
            "projects.create",
            "projects.view",
            "projects.update",
        ]

        assert org_member.permissions.count() == len(expected_perms)

        for perm_str in expected_perms:
            assert org_member.permissions.filter(permission=perm_str).exists()

        # Should NOT have delete permissions
        assert not org_member.permissions.filter(permission="projects.delete").exists()

    def test_organization_viewer_permissions(self):
        """Verify Organization Viewer has read-only permissions."""
        call_command("seed_default_roles")

        org_viewer = Role.objects.get(name="Organization Viewer")
        assert org_viewer.scope == ScopeChoices.ORGANIZATION

        expected_perms = ["org.view_members", "projects.view"]
        assert org_viewer.permissions.count() == len(expected_perms)

        for perm_str in expected_perms:
            assert org_viewer.permissions.filter(permission=perm_str).exists()

    def test_project_admin_has_all_project_perms(self):
        """Verify Project Admin has all projects.* permissions."""
        call_command("seed_default_roles")

        project_admin = Role.objects.get(name="Project Admin")
        assert project_admin.scope == ScopeChoices.PROJECT

        project_perms = Permission.objects.filter(resource_type="project")
        assert project_admin.permissions.count() == project_perms.count()

    def test_project_member_permissions(self):
        """Verify Project Member has view and update permissions."""
        call_command("seed_default_roles")

        project_member = Role.objects.get(name="Project Member")
        assert project_member.scope == ScopeChoices.PROJECT

        expected_perms = ["projects.view", "projects.update"]
        assert project_member.permissions.count() == len(expected_perms)

        for perm_str in expected_perms:
            assert project_member.permissions.filter(permission=perm_str).exists()

    def test_project_viewer_permissions(self):
        """Verify Project Viewer has only view permission."""
        call_command("seed_default_roles")

        project_viewer = Role.objects.get(name="Project Viewer")
        assert project_viewer.scope == ScopeChoices.PROJECT

        assert project_viewer.permissions.count() == 1
        assert project_viewer.permissions.filter(permission="projects.view").exists()

    def test_seed_is_idempotent(self):
        """Verify running seed command multiple times doesn't create duplicates."""
        # Run once
        call_command("seed_default_roles")
        first_perm_count = Permission.objects.count()
        first_role_count = Role.objects.count()

        # Run again
        call_command("seed_default_roles")
        second_perm_count = Permission.objects.count()
        second_role_count = Role.objects.count()

        # Counts should be identical
        assert first_perm_count == second_perm_count
        assert first_role_count == second_role_count

        # Should be 18 permissions and 7 roles
        assert second_perm_count == 18
        assert second_role_count == 7

    def test_seed_force_flag_updates_roles(self):
        """Verify --force flag updates existing roles."""
        # Initial seed
        call_command("seed_default_roles")

        # Modify a role
        org_member = Role.objects.get(name="Organization Member")
        original_perm_count = org_member.permissions.count()
        org_member.permissions.clear()  # Remove all permissions
        assert org_member.permissions.count() == 0

        # Run with --force
        call_command("seed_default_roles", force=True)

        # Permissions should be restored
        org_member.refresh_from_db()
        assert org_member.permissions.count() == original_perm_count

    def test_seed_command_output_is_informative(self):
        """Verify command provides clear output messages."""
        out = StringIO()
        call_command("seed_default_roles", stdout=out)
        output = out.getvalue()

        # Check for key output indicators
        assert "Seeding default permissions and roles" in output
        assert "Creating base permissions" in output
        assert "Creating default roles" in output
        assert "Created" in output or "already exists" in output
        assert "successfully" in output.lower()


@pytest.mark.django_db
class TestWarmPermissionCacheCommand:
    """Tests for the warm_permission_cache management command."""

    def test_warm_cache_with_no_global_assignments(self):
        """Verify command handles empty database gracefully."""
        # Ensure database is seeded first
        call_command("seed_default_roles")

        out = StringIO()
        call_command("warm_permission_cache", stdout=out)
        output = out.getvalue()

        assert "No global role assignments found" in output

    def test_warm_cache_with_global_admin(self):
        """Verify command successfully warms cache for global admin user."""
        # Seed roles and permissions
        call_command("seed_default_roles")

        # Create a user and assign Global Admin role
        user = User.objects.create_user(
            email="admin@example.com",
            password="testpass123",
            first_name="Admin",
            last_name="User",
        )

        global_admin_role = Role.objects.get(name="Global Admin")
        RoleAssignment.objects.create(
            user=user,
            role=global_admin_role,
            scope=ScopeChoices.GLOBAL,
            target_organization=None,
            target_project=None,
        )

        # Run cache warming
        out = StringIO()
        call_command("warm_permission_cache", stdout=out)
        output = out.getvalue()

        # Verify success message
        assert "Warmed cache for user" in output
        assert "admin@example.com" in output
        assert "Cache warming complete" in output
        assert "evaluations cached" in output

    def test_warm_cache_output_has_no_unicode_errors(self):
        """Verify command output uses ASCII characters (Windows compatibility)."""
        call_command("seed_default_roles")

        # Create a user with global role
        user = User.objects.create_user(email="test@example.com", password="testpass123")
        global_admin_role = Role.objects.get(name="Global Admin")
        RoleAssignment.objects.create(
            user=user,
            role=global_admin_role,
            scope=ScopeChoices.GLOBAL,
            target_organization=None,
            target_project=None,
        )

        out = StringIO()
        call_command("warm_permission_cache", stdout=out)
        output = out.getvalue()

        # Verify no Unicode checkmarks (should use "OK" instead)
        assert "✓" not in output
        assert "OK" in output or "Warmed cache" in output
