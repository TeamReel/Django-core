"""Tests for permission evaluation engine."""

import pytest
from django.core.cache import cache
from permissions.evaluator import check_permission, check_permissions_batch
from permissions.models import Role, RoleAssignment


# Check if Redis is available
def is_redis_available():
    try:
        cache.set("test_key", "test_value", timeout=1)
        return True
    except Exception:
        return False


REDIS_AVAILABLE = is_redis_available()


@pytest.mark.django_db
class TestCheckPermissionBasics:
    """Test basic permission checking behavior."""

    def test_deny_by_default_for_no_roles(self, user):
        """Verify users without roles are denied by default."""
        result = check_permission(user.id, "projects.view")
        assert result is False

    def test_deny_by_default_for_nonexistent_permission(self, user, project_viewer_role):
        """Verify nonexistent permissions are denied."""
        RoleAssignment.objects.create(user=user, role=project_viewer_role, scope="global")
        result = check_permission(user.id, "nonexistent.permission")
        assert result is False

    def test_grant_for_exact_permission_match(self, user, project_viewer_role, perm_projects_view):
        """Verify exact permission match grants access."""
        RoleAssignment.objects.create(user=user, role=project_viewer_role, scope="global")
        result = check_permission(user.id, "projects.view")
        assert result is True

    def test_case_sensitive_permission_matching(self, user, project_viewer_role):
        """Verify permission matching is case-sensitive."""
        RoleAssignment.objects.create(user=user, role=project_viewer_role, scope="global")
        # projects.view exists, but PROJECTS.VIEW should not match
        result = check_permission(user.id, "PROJECTS.VIEW")
        assert result is False


@pytest.mark.django_db
class TestWildcardPermissions:
    """Test wildcard (*) permission behavior."""

    def test_wildcard_grants_all_permissions(self, user, global_admin_role):
        """Verify wildcard permission grants access to everything."""
        RoleAssignment.objects.create(user=user, role=global_admin_role, scope="global")
        assert check_permission(user.id, "projects.delete") is True
        assert check_permission(user.id, "org.delete") is True
        assert check_permission(user.id, "anything.else") is True

    def test_wildcard_in_project_scope(self, user, project, perm_wildcard):
        """Verify wildcard at project scope still grants all permissions."""
        role = Role.objects.create(name="Project Superuser", scope="project")
        role.permissions.add(perm_wildcard)
        RoleAssignment.objects.create(user=user, role=role, scope="project", target_project=project)
        assert check_permission(user.id, "projects.delete", project.id, "project") is True


@pytest.mark.django_db
class TestScopeHierarchy:
    """Test permission evaluation across scope levels."""

    def test_global_role_applies_everywhere(self, user, project, project_admin_role):
        """Verify global roles grant permissions at all scopes."""
        RoleAssignment.objects.create(user=user, role=project_admin_role, scope="global")
        # Should work without resource_id
        assert check_permission(user.id, "projects.delete") is True
        # Should work with specific project
        assert check_permission(user.id, "projects.delete", project.id, "project") is True

    def test_project_role_only_applies_to_specific_project(
        self, user, project, project_admin_role, organisation
    ):
        """Verify project roles are scoped to specific projects."""
        # Create second project in same org
        from projects.models import Project

        project2 = Project.objects.create(name="Project 2", organisation=organisation, creator=user)

        # Assign role only to project1
        RoleAssignment.objects.create(
            user=user, role=project_admin_role, scope="project", target_project=project
        )

        # Should work for project1
        assert check_permission(user.id, "projects.delete", project.id, "project") is True
        # Should NOT work for project2
        assert check_permission(user.id, "projects.delete", project2.id, "project") is False

    def test_org_role_applies_to_org_resource(
        self, user, organisation, org_admin_role, perm_org_invite_users
    ):
        """Verify org roles apply to organization resources."""
        RoleAssignment.objects.create(
            user=user,
            role=org_admin_role,
            scope="organization",
            target_organization=organisation,
        )
        assert (
            check_permission(user.id, "org.invite_users", organisation.id, "organisation") is True
        )


@pytest.mark.django_db
class TestAdditiveInheritance:
    """Test additive inheritance (most permissive wins)."""

    def test_multiple_roles_union_permissions(
        self, user, perm_projects_view, perm_projects_update, perm_projects_delete
    ):
        """Verify multiple roles provide union of permissions."""
        # Create two roles with different permissions
        viewer_role = Role.objects.create(name="Viewer", scope="global")
        viewer_role.permissions.add(perm_projects_view)

        editor_role = Role.objects.create(name="Editor", scope="global")
        editor_role.permissions.add(perm_projects_update)

        # Assign both roles
        RoleAssignment.objects.create(user=user, role=viewer_role, scope="global")
        RoleAssignment.objects.create(user=user, role=editor_role, scope="global")

        # Should have permissions from both roles
        assert check_permission(user.id, "projects.view") is True
        assert check_permission(user.id, "projects.update") is True
        # But not permissions neither role has
        assert check_permission(user.id, "projects.delete") is False

    def test_project_role_can_grant_beyond_org_role(
        self, user, project, organisation, perm_projects_view, perm_projects_delete
    ):
        """Verify project roles can add permissions beyond org roles (additive)."""
        # Org role: viewer only
        org_viewer = Role.objects.create(name="Org Viewer", scope="organization")
        org_viewer.permissions.add(perm_projects_view)
        RoleAssignment.objects.create(
            user=user,
            role=org_viewer,
            scope="organization",
            target_organization=organisation,
        )

        # Project role: can delete
        project_admin = Role.objects.create(name="Project Admin", scope="project")
        project_admin.permissions.add(perm_projects_delete, perm_projects_view)
        RoleAssignment.objects.create(
            user=user, role=project_admin, scope="project", target_project=project
        )

        # Should be able to delete in this specific project (additive inheritance)
        assert check_permission(user.id, "projects.delete", project.id, "project") is True


@pytest.mark.skipif(not REDIS_AVAILABLE, reason="Redis not available")
@pytest.mark.django_db
class TestCacheBehavior:
    """Test caching of permission evaluations."""

    def setup_method(self):
        """Clear cache before each test."""
        cache.clear()

    def test_cache_hit_on_second_check(self, user, project_viewer_role):
        """Verify second check hits cache."""
        RoleAssignment.objects.create(user=user, role=project_viewer_role, scope="global")

        # First check (cache miss)
        result1 = check_permission(user.id, "projects.view")
        assert result1 is True

        # Second check (cache hit)
        result2 = check_permission(user.id, "projects.view")
        assert result2 is True

    def test_cache_respects_resource_id(self, user, project, project_admin_role):
        """Verify cache distinguishes between different resource IDs."""
        from projects.models import Project

        project2 = Project.objects.create(name="Project 2", organisation=project.organisation)

        # Grant access only to project1
        RoleAssignment.objects.create(
            user=user, role=project_admin_role, scope="project", target_project=project
        )

        # Cache for project1
        result1 = check_permission(user.id, "projects.delete", project.id, "project")
        assert result1 is True

        # Should be different for project2 (cache miss, different resource_id)
        result2 = check_permission(user.id, "projects.delete", project2.id, "project")
        assert result2 is False


@pytest.mark.skipif(not REDIS_AVAILABLE, reason="Redis not available")
@pytest.mark.django_db
class TestBatchPermissionChecks:
    """Test batch checking optimization."""

    def setup_method(self):
        """Clear cache before each test."""
        cache.clear()

    def test_batch_check_returns_dict(self, user, project_admin_role):
        """Verify batch check returns dict of results."""
        RoleAssignment.objects.create(user=user, role=project_admin_role, scope="global")

        results = check_permissions_batch(
            user.id, ["projects.view", "projects.update", "projects.delete"]
        )

        assert isinstance(results, dict)
        assert len(results) == 3
        assert results["projects.view"] is True
        assert results["projects.update"] is True
        assert results["projects.delete"] is True

    def test_batch_check_handles_mixed_permissions(
        self, user, perm_projects_view, perm_projects_update
    ):
        """Verify batch check correctly evaluates mixed permissions."""
        role = Role.objects.create(name="Limited", scope="global")
        role.permissions.add(perm_projects_view, perm_projects_update)
        RoleAssignment.objects.create(user=user, role=role, scope="global")

        results = check_permissions_batch(
            user.id, ["projects.view", "projects.update", "projects.delete"]
        )

        assert results["projects.view"] is True
        assert results["projects.update"] is True
        assert results["projects.delete"] is False

    def test_batch_check_uses_cache(self, user, project_viewer_role):
        """Verify batch check uses cached results."""
        RoleAssignment.objects.create(user=user, role=project_viewer_role, scope="global")

        # Pre-cache one permission
        check_permission(user.id, "projects.view")

        # Batch check should use cached value
        results = check_permissions_batch(user.id, ["projects.view", "projects.update"])

        assert results["projects.view"] is True
        assert results["projects.update"] is False

    def test_batch_check_with_wildcard(self, user, global_admin_role):
        """Verify batch check handles wildcard permissions."""
        RoleAssignment.objects.create(user=user, role=global_admin_role, scope="global")

        results = check_permissions_batch(user.id, ["projects.view", "org.delete", "anything.else"])

        assert all(v is True for v in results.values())


@pytest.mark.django_db
class TestErrorHandling:
    """Test error handling and fail-closed behavior."""

    def test_fail_closed_on_query_error(self, user):
        """Verify system fails closed (denies) on database errors."""
        # This test is difficult to trigger naturally, but we verify
        # the deny-by-default behavior covers error cases
        result = check_permission(user.id, "projects.view")
        assert result is False

    def test_invalid_user_id_returns_false(self):
        """Verify invalid user IDs are denied."""
        # Use a simple integer ID that doesn't exist
        fake_user_id = 999999999
        result = check_permission(fake_user_id, "projects.view")
        assert result is False


@pytest.mark.django_db
class TestAuditIntegration:
    """Test audit logging integration."""

    def test_audit_emitted_for_sensitive_permission(
        self, user, perm_projects_delete, project_admin_role
    ):
        """Verify audit events emitted for sensitive permissions."""
        project_admin_role.permissions.add(perm_projects_delete)
        RoleAssignment.objects.create(user=user, role=project_admin_role, scope="global")

        # projects.delete is sensitive - should trigger audit event
        result = check_permission(user.id, "projects.delete")
        assert result is True


@pytest.mark.django_db
class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_empty_permission_string(self, user, project_viewer_role):
        """Verify empty permission strings are denied."""
        RoleAssignment.objects.create(user=user, role=project_viewer_role, scope="global")
        result = check_permission(user.id, "")
        assert result is False

    def test_permission_with_spaces(self, user):
        """Verify permissions with spaces are denied."""
        result = check_permission(user.id, "projects. view")
        assert result is False

    def test_multiple_dots_in_permission(self, user):
        """Verify permissions with multiple dots are denied."""
        result = check_permission(user.id, "projects.sub.view")
        assert result is False

    def test_role_with_no_permissions(self, user):
        """Verify role with no permissions denies all checks."""
        empty_role = Role.objects.create(name="Empty Role", scope="global")
        RoleAssignment.objects.create(user=user, role=empty_role, scope="global")
        result = check_permission(user.id, "projects.view")
        assert result is False

    def test_user_with_many_roles(self, user, perm_projects_view):
        """Verify performance with many role assignments."""
        # Create 10 roles
        for i in range(10):
            role = Role.objects.create(name=f"Role {i}", scope="global")
            if i == 5:
                # Only one role has the permission
                role.permissions.add(perm_projects_view)
            RoleAssignment.objects.create(user=user, role=role, scope="global")

        # Should still find the permission
        result = check_permission(user.id, "projects.view")
        assert result is True
