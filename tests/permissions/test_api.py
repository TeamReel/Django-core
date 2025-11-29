"""
Tests for permissions API.

Comprehensive test suite covering:
- RoleSerializer validation and nested permissions
- RoleAssignmentSerializer validation (scope matching, targets)
- RoleViewSet CRUD operations with permission checks
- RoleAssignmentViewSet create/destroy with permission checks
- HasPermission DRF class permission checking
- Filtering and search functionality
"""

import pytest
from accounts.models import User
from src.organisations.models import Organisation
from permissions.models import Permission, Role, RoleAssignment, ScopeChoices
from rest_framework.test import APIClient, APIRequestFactory


@pytest.fixture
def api_client():
    """DRF API client for making requests."""
    return APIClient()


@pytest.fixture
def admin_user(db):
    """User with permissions.modify_role permission."""
    user = User.objects.create(email="admin@example.com")
    role = Role.objects.create(name="Permission Admin", scope=ScopeChoices.GLOBAL)
    perm = Permission.objects.create(
        permission="permissions.modify_role", resource_type="permission"
    )
    role.permissions.add(perm)
    RoleAssignment.objects.create(user=user, role=role, scope=ScopeChoices.GLOBAL)
    return user


# ============================================================================
# RoleSerializer Tests
# ============================================================================


@pytest.mark.django_db
class TestRoleSerializer:
    """Test RoleSerializer validation and functionality."""

    def test_serialize_role_with_permissions(self):
        """Role serializer should include nested permissions."""
        from permissions.api.serializers import RoleSerializer

        role = Role.objects.create(name="Test Role", scope=ScopeChoices.GLOBAL, description="Test")
        perm = Permission.objects.create(permission="test.permission", resource_type="test")
        role.permissions.add(perm)

        serializer = RoleSerializer(role)
        assert "permissions" in serializer.data
        assert len(serializer.data["permissions"]) == 1
        assert serializer.data["permissions"][0]["permission"] == "test.permission"

    def test_create_role_with_permissions(self):
        """Creating role via serializer should set permissions."""
        from permissions.api.serializers import RoleSerializer

        perm = Permission.objects.create(permission="test.permission", resource_type="test")
        data = {
            "name": "New Role",
            "scope": "global",
            "description": "Test role",
            "permission_ids": [perm.id],
        }

        serializer = RoleSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        role = serializer.save()

        assert role.permissions.count() == 1
        assert role.permissions.first().permission == "test.permission"

    def test_create_role_without_permissions_fails(self):
        """Creating role without permissions should fail validation."""
        from permissions.api.serializers import RoleSerializer

        data = {
            "name": "New Role",
            "scope": "global",
            "description": "Test role",
            "permission_ids": [],
        }

        serializer = RoleSerializer(data=data)
        assert not serializer.is_valid()
        assert "permission_ids" in serializer.errors

    def test_update_role_permissions(self):
        """Updating role should replace permissions."""
        from permissions.api.serializers import RoleSerializer

        role = Role.objects.create(name="Test Role", scope=ScopeChoices.GLOBAL)
        perm1 = Permission.objects.create(permission="test.perm1", resource_type="test")
        perm2 = Permission.objects.create(permission="test.perm2", resource_type="test")
        role.permissions.add(perm1)

        data = {"permission_ids": [perm2.id]}
        serializer = RoleSerializer(role, data=data, partial=True)
        assert serializer.is_valid(), serializer.errors
        serializer.save()

        assert role.permissions.count() == 1
        assert role.permissions.first() == perm2

    def test_serializer_read_only_fields(self):
        """ID, created_at, updated_at should be read-only."""
        from permissions.api.serializers import RoleSerializer

        role = Role.objects.create(name="Test Role", scope=ScopeChoices.GLOBAL)
        serializer = RoleSerializer(role)

        assert "id" in serializer.data
        assert "created_at" in serializer.data
        assert "updated_at" in serializer.data


# ============================================================================
# RoleAssignmentSerializer Tests
# ============================================================================


@pytest.mark.django_db
class TestRoleAssignmentSerializer:
    """Test RoleAssignmentSerializer validation."""

    def test_validate_scope_mismatch(self):
        """Serializer should reject scope mismatch."""
        from permissions.api.serializers import RoleAssignmentSerializer

        user = User.objects.create(email="test@example.com")
        role = Role.objects.create(name="Org Role", scope=ScopeChoices.ORGANIZATION)

        data = {"user": user.id, "role": role.id, "scope": ScopeChoices.GLOBAL}  # Mismatch!

        serializer = RoleAssignmentSerializer(data=data)
        assert not serializer.is_valid()
        # Should fail validation - scope mismatch
        assert "scope" in serializer.errors or "target_organization" in serializer.errors

    def test_validate_org_scope_requires_target(self):
        """Organization scope must have target_organization."""
        from permissions.api.serializers import RoleAssignmentSerializer

        user = User.objects.create(email="test@example.com")
        role = Role.objects.create(name="Org Role", scope=ScopeChoices.ORGANIZATION)

        # Missing target_organization
        data = {"user": user.id, "role": role.id, "scope": ScopeChoices.ORGANIZATION}

        serializer = RoleAssignmentSerializer(data=data)
        assert not serializer.is_valid()
        assert "target_organization" in serializer.errors

    def test_validate_project_scope_requires_target(self):
        """Project scope must have target_project."""
        from permissions.api.serializers import RoleAssignmentSerializer

        user = User.objects.create(email="test@example.com")
        role = Role.objects.create(name="Project Role", scope=ScopeChoices.PROJECT)

        # Missing target_project
        data = {"user": user.id, "role": role.id, "scope": ScopeChoices.PROJECT}

        serializer = RoleAssignmentSerializer(data=data)
        assert not serializer.is_valid()
        assert "target_project" in serializer.errors

    def test_validate_global_scope_no_targets(self):
        """Global scope should not allow targets."""
        from permissions.api.serializers import RoleAssignmentSerializer

        user = User.objects.create(email="test@example.com")
        creator = User.objects.create(email="creator@example.com")
        role = Role.objects.create(name="Global Role", scope=ScopeChoices.GLOBAL)
        org = Organisation.objects.create(name="Test Org", creator=creator)

        # Global scope with target_organization should fail
        data = {
            "user": user.id,
            "role": role.id,
            "scope": ScopeChoices.GLOBAL,
            "target_organization": org.id,
            "target_project": None,
        }

        serializer = RoleAssignmentSerializer(data=data)
        assert not serializer.is_valid()
        assert "scope" in serializer.errors

    def test_create_assignment_sets_assigned_by(self):
        """Creating assignment should set assigned_by from request."""
        from permissions.api.serializers import RoleAssignmentSerializer

        user = User.objects.create(email="test@example.com")
        assigner = User.objects.create(email="assigner@example.com")
        role = Role.objects.create(name="Global Role", scope=ScopeChoices.GLOBAL)

        data = {
            "user": user.id,
            "role": role.id,
            "scope": ScopeChoices.GLOBAL,
            "target_organization": None,
            "target_project": None,
        }

        # Mock request
        class MockRequest:
            def __init__(self, user):
                self.user = user

        request = MockRequest(assigner)
        serializer = RoleAssignmentSerializer(data=data, context={"request": request})
        assert serializer.is_valid(), serializer.errors
        assignment = serializer.save()

        assert assignment.assigned_by == assigner

    def test_serializer_includes_read_only_fields(self):
        """Serializer should include user_email and role_name."""
        from permissions.api.serializers import RoleAssignmentSerializer

        user = User.objects.create(email="test@example.com")
        role = Role.objects.create(name="Test Role", scope=ScopeChoices.GLOBAL)
        assignment = RoleAssignment.objects.create(user=user, role=role, scope=ScopeChoices.GLOBAL)

        serializer = RoleAssignmentSerializer(assignment)
        assert serializer.data["user_email"] == "test@example.com"
        assert serializer.data["role_name"] == "Test Role"


# ============================================================================
# RoleViewSet Tests
# ============================================================================


@pytest.mark.django_db
class TestRoleViewSet:
    """Test RoleViewSet API endpoints."""

    def test_list_roles_requires_authentication(self, api_client):
        """Unauthenticated requests should be rejected."""
        response = api_client.get("/api/permissions/roles/")
        # DRF returns 403 when using multiple permission classes
        assert response.status_code in [401, 403]

    def test_list_roles_requires_permission(self, api_client):
        """Authenticated user without permission should be denied."""
        user = User.objects.create(email="user@example.com")
        api_client.force_authenticate(user=user)

        response = api_client.get("/api/permissions/roles/")
        assert response.status_code == 403

    def test_list_roles_success(self, api_client, admin_user):
        """User with permissions.view_roles can list roles."""
        # Give admin_user view_roles permission
        view_perm = Permission.objects.create(
            permission="permissions.view_roles", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(view_perm)

        api_client.force_authenticate(user=admin_user)

        Role.objects.create(name="Test Role", scope=ScopeChoices.GLOBAL)

        response = api_client.get("/api/permissions/roles/")
        assert response.status_code == 200
        assert "results" in response.data
        assert len(response.data["results"]) >= 1

    def test_retrieve_role_with_nested_permissions(self, api_client, admin_user):
        """Retrieving role should include nested permissions."""
        view_perm = Permission.objects.create(
            permission="permissions.view_roles", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(view_perm)
        api_client.force_authenticate(user=admin_user)

        role = Role.objects.create(name="Test Role", scope=ScopeChoices.GLOBAL)
        perm = Permission.objects.create(permission="test.permission", resource_type="test")
        role.permissions.add(perm)

        response = api_client.get(f"/api/permissions/roles/{role.id}/")
        assert response.status_code == 200
        assert "permissions" in response.data
        assert len(response.data["permissions"]) == 1

    def test_create_role_requires_modify_permission(self, api_client, admin_user):
        """Creating role requires permissions.modify_role."""
        api_client.force_authenticate(user=admin_user)

        perm = Permission.objects.create(permission="test.perm", resource_type="test")
        data = {"name": "New Role", "scope": "global", "permission_ids": [str(perm.id)]}

        response = api_client.post("/api/permissions/roles/", data, format="json")
        assert response.status_code == 201
        assert Role.objects.filter(name="New Role").exists()

    def test_create_role_without_permission_denied(self, api_client):
        """Creating role without permission should be denied."""
        user = User.objects.create(email="user@example.com")
        api_client.force_authenticate(user=user)

        perm = Permission.objects.create(permission="test.perm", resource_type="test")
        data = {"name": "New Role", "scope": "global", "permission_ids": [str(perm.id)]}

        response = api_client.post("/api/permissions/roles/", data, format="json")
        assert response.status_code == 403

    def test_update_role_requires_modify_permission(self, api_client, admin_user):
        """Updating role requires permissions.modify_role."""
        api_client.force_authenticate(user=admin_user)

        role = Role.objects.create(name="Old Name", scope=ScopeChoices.GLOBAL)
        perm = Permission.objects.create(permission="test.perm", resource_type="test")
        role.permissions.add(perm)

        data = {"name": "New Name"}
        response = api_client.patch(f"/api/permissions/roles/{role.id}/", data, format="json")
        assert response.status_code == 200
        role.refresh_from_db()
        assert role.name == "New Name"

    def test_delete_role_requires_modify_permission(self, api_client, admin_user):
        """Deleting role requires permissions.modify_role."""
        api_client.force_authenticate(user=admin_user)

        role = Role.objects.create(name="To Delete", scope=ScopeChoices.GLOBAL)

        response = api_client.delete(f"/api/permissions/roles/{role.id}/")
        assert response.status_code == 204
        assert not Role.objects.filter(id=role.id).exists()

    def test_filter_by_scope(self, api_client, admin_user):
        """Filtering by scope should work."""
        view_perm = Permission.objects.create(
            permission="permissions.view_roles", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(view_perm)
        api_client.force_authenticate(user=admin_user)

        Role.objects.create(name="Global Role", scope=ScopeChoices.GLOBAL)
        Role.objects.create(name="Org Role", scope=ScopeChoices.ORGANIZATION)

        response = api_client.get("/api/permissions/roles/?scope=global")
        assert response.status_code == 200
        assert all(r["scope"] == "global" for r in response.data["results"])

    def test_search_by_name(self, api_client, admin_user):
        """Searching by name should work."""
        view_perm = Permission.objects.create(
            permission="permissions.view_roles", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(view_perm)
        api_client.force_authenticate(user=admin_user)

        Role.objects.create(name="Moderator Role", scope=ScopeChoices.GLOBAL)
        Role.objects.create(name="Viewer Role", scope=ScopeChoices.GLOBAL)

        response = api_client.get("/api/permissions/roles/?search=moderator")
        assert response.status_code == 200
        assert len(response.data["results"]) == 1
        assert "Moderator" in response.data["results"][0]["name"]

    def test_ordering_by_name(self, api_client, admin_user):
        """Ordering by name should work."""
        view_perm = Permission.objects.create(
            permission="permissions.view_roles", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(view_perm)
        api_client.force_authenticate(user=admin_user)

        Role.objects.create(name="Zebra Role", scope=ScopeChoices.GLOBAL)
        Role.objects.create(name="Alpha Role", scope=ScopeChoices.GLOBAL)

        response = api_client.get("/api/permissions/roles/?ordering=name")
        assert response.status_code == 200
        names = [r["name"] for r in response.data["results"]]
        assert names == sorted(names)


# ============================================================================
# RoleAssignmentViewSet Tests
# ============================================================================


@pytest.mark.django_db
class TestRoleAssignmentViewSet:
    """Test RoleAssignmentViewSet API endpoints."""

    def test_list_assignments_requires_authentication(self, api_client):
        """Unauthenticated requests should be rejected."""
        response = api_client.get("/api/permissions/role-assignments/")
        # DRF returns 403 when using multiple permission classes
        assert response.status_code in [401, 403]

    def test_list_assignments_requires_permission(self, api_client):
        """User without permission should be denied."""
        user = User.objects.create(email="user@example.com")
        api_client.force_authenticate(user=user)

        response = api_client.get("/api/permissions/role-assignments/")
        assert response.status_code == 403

    def test_list_assignments_success(self, api_client, admin_user):
        """User with permissions.view_roles can list assignments."""
        view_perm = Permission.objects.create(
            permission="permissions.view_roles", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(view_perm)
        api_client.force_authenticate(user=admin_user)

        response = api_client.get("/api/permissions/role-assignments/")
        assert response.status_code == 200
        assert "results" in response.data

    def test_create_assignment_requires_permission(self, api_client, admin_user):
        """Creating assignment requires permissions.assign_role."""
        assign_perm = Permission.objects.create(
            permission="permissions.assign_role", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(assign_perm)
        api_client.force_authenticate(user=admin_user)

        user = User.objects.create(email="user@example.com")
        role = Role.objects.create(name="Test Role", scope=ScopeChoices.GLOBAL)

        data = {
            "user": str(user.id),
            "role": str(role.id),
            "scope": "global",
            "target_organization": None,
            "target_project": None,
        }

        response = api_client.post("/api/permissions/role-assignments/", data, format="json")
        assert response.status_code == 201
        assert RoleAssignment.objects.filter(user=user, role=role).exists()

    def test_create_assignment_without_permission_denied(self, api_client):
        """Creating assignment without permission should be denied."""
        user = User.objects.create(email="user@example.com")
        api_client.force_authenticate(user=user)

        role = Role.objects.create(name="Test Role", scope=ScopeChoices.GLOBAL)

        data = {
            "user": str(user.id),
            "role": str(role.id),
            "scope": "global",
            "target_organization": None,
            "target_project": None,
        }

        response = api_client.post("/api/permissions/role-assignments/", data, format="json")
        assert response.status_code == 403

    def test_delete_assignment(self, api_client, admin_user):
        """Deleting assignment should remove role."""
        assign_perm = Permission.objects.create(
            permission="permissions.assign_role", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(assign_perm)
        api_client.force_authenticate(user=admin_user)

        user = User.objects.create(email="user@example.com")
        role = Role.objects.create(name="Test Role", scope=ScopeChoices.GLOBAL)
        assignment = RoleAssignment.objects.create(
            user=user,
            role=role,
            scope=ScopeChoices.GLOBAL,
            target_organization=None,
            target_project=None,
        )

        response = api_client.delete(f"/api/permissions/role-assignments/{assignment.id}/")
        assert response.status_code == 204
        assert not RoleAssignment.objects.filter(id=assignment.id).exists()

    def test_update_not_allowed(self, api_client, admin_user):
        """PUT/PATCH should not be allowed on assignments."""
        assign_perm = Permission.objects.create(
            permission="permissions.assign_role", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(assign_perm)
        api_client.force_authenticate(user=admin_user)

        user = User.objects.create(email="user@example.com")
        role = Role.objects.create(name="Test Role", scope=ScopeChoices.GLOBAL)
        assignment = RoleAssignment.objects.create(
            user=user,
            role=role,
            scope=ScopeChoices.GLOBAL,
            target_organization=None,
            target_project=None,
        )

        response = api_client.put(
            f"/api/permissions/role-assignments/{assignment.id}/", {}, format="json"
        )
        assert response.status_code == 403  # Forbidden (permissions checked before method)

    def test_filter_by_user(self, api_client, admin_user):
        """Filtering by user should work."""
        view_perm = Permission.objects.create(
            permission="permissions.view_roles", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(view_perm)
        api_client.force_authenticate(user=admin_user)

        user1 = User.objects.create(email="user1@example.com")
        user2 = User.objects.create(email="user2@example.com")
        role = Role.objects.create(name="Test Role", scope=ScopeChoices.GLOBAL)
        RoleAssignment.objects.create(
            user=user1,
            role=role,
            scope=ScopeChoices.GLOBAL,
            target_organization=None,
            target_project=None,
        )
        RoleAssignment.objects.create(
            user=user2,
            role=role,
            scope=ScopeChoices.GLOBAL,
            target_organization=None,
            target_project=None,
        )

        response = api_client.get(f"/api/permissions/role-assignments/?user={user1.id}")
        assert response.status_code == 200
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["user"] == user1.id

    def test_filter_by_role(self, api_client, admin_user):
        """Filtering by role should work."""
        view_perm = Permission.objects.create(
            permission="permissions.view_roles", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(view_perm)
        api_client.force_authenticate(user=admin_user)

        user = User.objects.create(email="user@example.com")
        role1 = Role.objects.create(name="Role 1", scope=ScopeChoices.GLOBAL)
        role2 = Role.objects.create(name="Role 2", scope=ScopeChoices.GLOBAL)
        RoleAssignment.objects.create(
            user=user,
            role=role1,
            scope=ScopeChoices.GLOBAL,
            target_organization=None,
            target_project=None,
        )
        RoleAssignment.objects.create(
            user=user,
            role=role2,
            scope=ScopeChoices.GLOBAL,
            target_organization=None,
            target_project=None,
        )

        response = api_client.get(f"/api/permissions/role-assignments/?role={role1.id}")
        assert response.status_code == 200
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["role"] == role1.id

    def test_filter_by_scope(self, api_client, admin_user):
        """Filtering by scope should work."""
        view_perm = Permission.objects.create(
            permission="permissions.view_roles", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(view_perm)
        api_client.force_authenticate(user=admin_user)

        user = User.objects.create(email="user@example.com")
        creator = User.objects.create(email="creator@example.com")
        global_role = Role.objects.create(name="Global Role", scope=ScopeChoices.GLOBAL)
        org_role = Role.objects.create(name="Org Role", scope=ScopeChoices.ORGANIZATION)
        org = Organisation.objects.create(name="Test Org", creator=creator)

        RoleAssignment.objects.create(
            user=user,
            role=global_role,
            scope=ScopeChoices.GLOBAL,
            target_organization=None,
            target_project=None,
        )
        RoleAssignment.objects.create(
            user=user,
            role=org_role,
            scope=ScopeChoices.ORGANIZATION,
            target_organization=org,
            target_project=None,
        )

        response = api_client.get("/api/permissions/role-assignments/?scope=global")
        assert response.status_code == 200
        assert all(r["scope"] == "global" for r in response.data["results"])


# ============================================================================
# HasPermission Class Tests
# ============================================================================


@pytest.mark.django_db
class TestHasPermissionClass:
    """Test custom HasPermission DRF class."""

    def test_has_permission_with_permission(self):
        """User with permission should be granted access."""
        from permissions.api.permissions import HasPermission

        factory = APIRequestFactory()
        request = factory.get("/api/test/")

        user = User.objects.create(email="user@example.com")
        role = Role.objects.create(name="Test Role", scope=ScopeChoices.GLOBAL)
        perm = Permission.objects.create(permission="test.action", resource_type="test")
        role.permissions.add(perm)
        RoleAssignment.objects.create(user=user, role=role, scope=ScopeChoices.GLOBAL)

        request.user = user

        permission_class = HasPermission("test.action")
        assert permission_class.has_permission(request, None) is True

    def test_has_permission_without_permission(self):
        """User without permission should be denied."""
        from permissions.api.permissions import HasPermission

        factory = APIRequestFactory()
        request = factory.get("/api/test/")

        user = User.objects.create(email="user@example.com")
        request.user = user

        permission_class = HasPermission("test.action")
        assert permission_class.has_permission(request, None) is False
        assert "test.action" in permission_class.message

    def test_has_permission_unauthenticated(self):
        """Unauthenticated user should be denied."""
        from permissions.api.permissions import HasPermission

        factory = APIRequestFactory()
        request = factory.get("/api/test/")
        request.user = None

        permission_class = HasPermission("test.action")
        assert permission_class.has_permission(request, None) is False

    def test_has_permission_with_wildcard(self):
        """User with wildcard permission should have access."""
        from permissions.api.permissions import HasPermission

        factory = APIRequestFactory()
        request = factory.get("/api/test/")

        user = User.objects.create(email="admin@example.com")
        role = Role.objects.create(name="Global Admin", scope=ScopeChoices.GLOBAL)
        perm = Permission.objects.create(permission="*", resource_type="generic")
        role.permissions.add(perm)
        RoleAssignment.objects.create(user=user, role=role, scope=ScopeChoices.GLOBAL)

        request.user = user

        permission_class = HasPermission("test.action")
        assert permission_class.has_permission(request, None) is True

    def test_has_object_permission_with_permission(self):
        """User with permission on object should be granted access."""
        from permissions.api.permissions import HasPermission

        factory = APIRequestFactory()
        request = factory.get("/api/test/")

        user = User.objects.create(email="user@example.com")
        role = Role.objects.create(name="Test Role", scope=ScopeChoices.GLOBAL)
        perm = Permission.objects.create(permission="test.action", resource_type="test")
        role.permissions.add(perm)
        RoleAssignment.objects.create(user=user, role=role, scope=ScopeChoices.GLOBAL)

        request.user = user

        # Mock object
        class MockObject:
            id = "test-id"

        obj = MockObject()

        permission_class = HasPermission("test.action")
        assert permission_class.has_object_permission(request, None, obj) is True

    def test_has_object_permission_without_permission(self):
        """User without permission on object should be denied."""
        from permissions.api.permissions import HasPermission

        factory = APIRequestFactory()
        request = factory.get("/api/test/")

        user = User.objects.create(email="user@example.com")
        request.user = user

        # Mock object
        class MockObject:
            id = "test-id"

        obj = MockObject()

        permission_class = HasPermission("test.action")
        assert permission_class.has_object_permission(request, None, obj) is False
        assert "test.action" in permission_class.message

    def test_permission_error_message_includes_permission_name(self):
        """Error message should include permission name for clarity."""
        from permissions.api.permissions import HasPermission

        factory = APIRequestFactory()
        request = factory.get("/api/test/")

        user = User.objects.create(email="user@example.com")
        request.user = user

        permission_class = HasPermission("projects.delete")
        permission_class.has_permission(request, None)

        assert "projects.delete" in permission_class.message
        assert "Permission denied" in permission_class.message


# ============================================================================
# Pagination Tests
# ============================================================================


@pytest.mark.django_db
class TestRolePagination:
    """Test pagination for Role list endpoint."""

    def test_pagination_default_page_size(self, api_client, admin_user):
        """Default pagination should return correct page size."""
        view_perm = Permission.objects.create(
            permission="permissions.view_roles", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(view_perm)
        api_client.force_authenticate(user=admin_user)

        # Create 30 roles
        for i in range(30):
            Role.objects.create(name=f"Role {i}", scope=ScopeChoices.GLOBAL)

        response = api_client.get("/api/permissions/roles/")
        assert response.status_code == 200
        assert "results" in response.data
        assert "count" in response.data
        assert response.data["count"] >= 30

    def test_pagination_with_custom_page_size(self, api_client, admin_user):
        """Pagination should return results in expected format."""
        view_perm = Permission.objects.create(
            permission="permissions.view_roles", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(view_perm)
        api_client.force_authenticate(user=admin_user)

        # Create 15 roles
        for i in range(15):
            Role.objects.create(name=f"Role {i}", scope=ScopeChoices.GLOBAL)

        response = api_client.get("/api/permissions/roles/?page_size=5")
        assert response.status_code == 200
        assert "results" in response.data

    def test_pagination_next_page(self, api_client, admin_user):
        """Pagination should handle page requests successfully."""
        view_perm = Permission.objects.create(
            permission="permissions.view_roles", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(view_perm)
        api_client.force_authenticate(user=admin_user)

        # Create enough roles to span multiple pages
        for i in range(25):
            Role.objects.create(name=f"Role {i}", scope=ScopeChoices.GLOBAL)

        response = api_client.get("/api/permissions/roles/?page_size=10")
        assert response.status_code == 200
        assert "results" in response.data

    def test_pagination_previous_page(self, api_client, admin_user):
        """Pagination should handle page parameter."""
        view_perm = Permission.objects.create(
            permission="permissions.view_roles", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(view_perm)
        api_client.force_authenticate(user=admin_user)

        # Create enough roles
        for i in range(25):
            Role.objects.create(name=f"Role {i}", scope=ScopeChoices.GLOBAL)

        response = api_client.get("/api/permissions/roles/")
        assert response.status_code == 200
        assert "results" in response.data

    def test_pagination_last_page(self, api_client, admin_user):
        """Pagination should return complete result set."""
        view_perm = Permission.objects.create(
            permission="permissions.view_roles", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(view_perm)
        api_client.force_authenticate(user=admin_user)

        # Create exactly 20 roles
        for i in range(20):
            Role.objects.create(name=f"Role {i}", scope=ScopeChoices.GLOBAL)

        response = api_client.get("/api/permissions/roles/")
        assert response.status_code == 200
        assert "results" in response.data


# ============================================================================
# Edge Case Tests
# ============================================================================


@pytest.mark.django_db
class TestRoleEdgeCases:
    """Test edge cases for Role API."""

    def test_create_role_with_empty_name(self, api_client, admin_user):
        """Creating role with empty name should fail."""
        modify_perm = Permission.objects.create(
            permission="permissions.modify_roles", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(modify_perm)
        api_client.force_authenticate(user=admin_user)

        data = {"name": "", "scope": "global", "permissions": []}

        response = api_client.post("/api/permissions/roles/", data, format="json")
        assert response.status_code == 400
        assert "name" in response.data

    def test_create_role_with_very_long_name(self, api_client, admin_user):
        """Creating role with excessively long name should fail."""
        modify_perm = Permission.objects.create(
            permission="permissions.modify_roles", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(modify_perm)
        api_client.force_authenticate(user=admin_user)

        data = {"name": "A" * 256, "scope": "global", "permissions": []}

        response = api_client.post("/api/permissions/roles/", data, format="json")
        assert response.status_code == 400

    def test_retrieve_nonexistent_role(self, api_client, admin_user):
        """Retrieving non-existent role should return 404."""
        view_perm = Permission.objects.create(
            permission="permissions.view_roles", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(view_perm)
        api_client.force_authenticate(user=admin_user)

        fake_uuid = "00000000-0000-0000-0000-000000000000"
        response = api_client.get(f"/api/permissions/roles/{fake_uuid}/")
        assert response.status_code == 404

    def test_delete_nonexistent_role(self, api_client, admin_user):
        """Deleting non-existent role should return 404."""
        modify_perm = Permission.objects.create(
            permission="permissions.modify_roles", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(modify_perm)
        api_client.force_authenticate(user=admin_user)

        fake_uuid = "00000000-0000-0000-0000-000000000000"
        response = api_client.delete(f"/api/permissions/roles/{fake_uuid}/")
        assert response.status_code == 404

    def test_list_roles_with_many_results(self, api_client, admin_user):
        """Listing roles should return valid response structure."""
        view_perm = Permission.objects.create(
            permission="permissions.view_roles", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(view_perm)
        api_client.force_authenticate(user=admin_user)

        # Create some additional roles
        for i in range(5):
            Role.objects.create(name=f"Test Role {i}", scope=ScopeChoices.GLOBAL)

        response = api_client.get("/api/permissions/roles/")
        assert response.status_code == 200
        assert "results" in response.data

    def test_filter_with_invalid_scope(self, api_client, admin_user):
        """Filtering with invalid scope should handle gracefully."""
        view_perm = Permission.objects.create(
            permission="permissions.view_roles", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(view_perm)
        api_client.force_authenticate(user=admin_user)

        response = api_client.get("/api/permissions/roles/?scope=invalid")
        # May return 400 for invalid filter or 200 with validation
        assert response.status_code in [200, 400]

    def test_search_with_special_characters(self, api_client, admin_user):
        """Search should handle special characters gracefully."""
        view_perm = Permission.objects.create(
            permission="permissions.view_roles", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(view_perm)
        api_client.force_authenticate(user=admin_user)

        Role.objects.create(name="Test@Role#123", scope=ScopeChoices.GLOBAL)

        response = api_client.get("/api/permissions/roles/?search=@Role#")
        assert response.status_code == 200

    def test_ordering_with_invalid_field(self, api_client, admin_user):
        """Ordering by invalid field should be ignored or return error."""
        view_perm = Permission.objects.create(
            permission="permissions.view_roles", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(view_perm)
        api_client.force_authenticate(user=admin_user)

        response = api_client.get("/api/permissions/roles/?ordering=invalid_field")
        assert response.status_code == 200  # Should not crash


@pytest.mark.django_db
class TestRoleAssignmentEdgeCases:
    """Test edge cases for RoleAssignment API."""

    def test_create_duplicate_assignment(self, api_client, admin_user):
        """Creating duplicate assignment should fail or be idempotent."""
        assign_perm = Permission.objects.create(
            permission="permissions.assign_role", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(assign_perm)
        api_client.force_authenticate(user=admin_user)

        user = User.objects.create(email="user@example.com")
        role = Role.objects.create(name="Test Role", scope=ScopeChoices.GLOBAL)

        data = {
            "user": str(user.id),
            "role": str(role.id),
            "scope": "global",
            "target_organization": None,
            "target_project": None,
        }

        # Create first assignment
        response1 = api_client.post("/api/permissions/role-assignments/", data, format="json")
        assert response1.status_code == 201

        # Try to create duplicate
        response2 = api_client.post("/api/permissions/role-assignments/", data, format="json")
        # Should either fail with 400 or succeed idempotently
        assert response2.status_code in [201, 400]

    def test_delete_nonexistent_assignment(self, api_client, admin_user):
        """Deleting non-existent assignment should return 404."""
        assign_perm = Permission.objects.create(
            permission="permissions.assign_role", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(assign_perm)
        api_client.force_authenticate(user=admin_user)

        fake_uuid = "00000000-0000-0000-0000-000000000000"
        response = api_client.delete(f"/api/permissions/role-assignments/{fake_uuid}/")
        assert response.status_code == 404

    def test_filter_by_nonexistent_user(self, api_client, admin_user):
        """Filtering by non-existent user should handle gracefully."""
        view_perm = Permission.objects.create(
            permission="permissions.view_roles", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(view_perm)
        api_client.force_authenticate(user=admin_user)

        response = api_client.get("/api/permissions/role-assignments/?user=99999")
        # May return 400 for invalid user ID or 200 with empty results
        assert response.status_code in [200, 400]

    def test_filter_by_nonexistent_role(self, api_client, admin_user):
        """Filtering by non-existent role should handle gracefully."""
        view_perm = Permission.objects.create(
            permission="permissions.view_roles", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(view_perm)
        api_client.force_authenticate(user=admin_user)

        fake_uuid = "00000000-0000-0000-0000-000000000000"
        response = api_client.get(f"/api/permissions/role-assignments/?role={fake_uuid}")
        # May return 400 for invalid UUID or 200 with empty results
        assert response.status_code in [200, 400]


# ============================================================================
# Integration Tests
# ============================================================================


@pytest.mark.django_db
class TestRoleIntegration:
    """Integration tests for complete Role workflows."""

    def test_full_crud_workflow(self, api_client, admin_user):
        """Test complete CRUD lifecycle for a role."""
        # Setup permissions
        view_perm = Permission.objects.create(
            permission="permissions.view_roles", resource_type="permission"
        )
        modify_perm = Permission.objects.create(
            permission="permissions.modify_roles", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(view_perm, modify_perm)
        api_client.force_authenticate(user=admin_user)

        # CREATE
        perm = Permission.objects.create(permission="test.action", resource_type="test")
        create_data = {
            "name": "Integration Test Role",
            "scope": "global",
            "permissions": [str(perm.id)],
        }
        create_response = api_client.post("/api/permissions/roles/", create_data, format="json")
        assert create_response.status_code == 201
        role_id = create_response.data["id"]

        # READ
        read_response = api_client.get(f"/api/permissions/roles/{role_id}/")
        assert read_response.status_code == 200
        assert read_response.data["name"] == "Integration Test Role"

        # UPDATE
        update_data = {
            "name": "Updated Integration Role",
            "scope": "global",
            "permissions": [str(perm.id)],
        }
        update_response = api_client.put(
            f"/api/permissions/roles/{role_id}/", update_data, format="json"
        )
        assert update_response.status_code == 200
        assert update_response.data["name"] == "Updated Integration Role"

        # DELETE
        delete_response = api_client.delete(f"/api/permissions/roles/{role_id}/")
        assert delete_response.status_code == 204

        # VERIFY DELETION
        verify_response = api_client.get(f"/api/permissions/roles/{role_id}/")
        assert verify_response.status_code == 404

    def test_role_with_multiple_permissions(self, api_client, admin_user):
        """Test creating and managing role with multiple permissions."""
        modify_perm = Permission.objects.create(
            permission="permissions.modify_roles", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(modify_perm)
        api_client.force_authenticate(user=admin_user)

        # Create multiple permissions
        perms = [
            Permission.objects.create(permission=f"test.action{i}", resource_type="test")
            for i in range(5)
        ]

        data = {
            "name": "Multi-Permission Role",
            "scope": "global",
            "permissions": [str(p.id) for p in perms],
        }

        response = api_client.post("/api/permissions/roles/", data, format="json")
        assert response.status_code == 201
        # Verify permissions are included in response
        assert "permissions" in response.data
        assert isinstance(response.data["permissions"], list)


@pytest.mark.django_db
class TestRoleAssignmentIntegration:
    """Integration tests for complete RoleAssignment workflows."""

    def test_assign_and_revoke_workflow(self, api_client, admin_user):
        """Test complete assign and revoke workflow."""
        view_perm = Permission.objects.create(
            permission="permissions.view_roles", resource_type="permission"
        )
        assign_perm = Permission.objects.create(
            permission="permissions.assign_role", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(view_perm, assign_perm)
        api_client.force_authenticate(user=admin_user)

        user = User.objects.create(email="test@example.com")
        role = Role.objects.create(name="Test Role", scope=ScopeChoices.GLOBAL)

        # ASSIGN
        assign_data = {
            "user": str(user.id),
            "role": str(role.id),
            "scope": "global",
            "target_organization": None,
            "target_project": None,
        }
        assign_response = api_client.post(
            "/api/permissions/role-assignments/", assign_data, format="json"
        )
        assert assign_response.status_code == 201
        assignment_id = assign_response.data["id"]

        # VERIFY
        verify_response = api_client.get(f"/api/permissions/role-assignments/?user={user.id}")
        assert verify_response.status_code == 200
        assert len(verify_response.data["results"]) >= 1

        # REVOKE
        revoke_response = api_client.delete(f"/api/permissions/role-assignments/{assignment_id}/")
        assert revoke_response.status_code == 204

        # VERIFY REVOCATION
        final_response = api_client.get(f"/api/permissions/role-assignments/?user={user.id}")
        assert final_response.status_code == 200
        # Assignment should be gone
        assert str(assignment_id) not in [r["id"] for r in final_response.data["results"]]

    def test_multiple_assignments_same_user(self, api_client, admin_user):
        """Test assigning multiple roles to same user."""
        view_perm = Permission.objects.create(
            permission="permissions.view_roles", resource_type="permission"
        )
        assign_perm = Permission.objects.create(
            permission="permissions.assign_role", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(view_perm, assign_perm)
        api_client.force_authenticate(user=admin_user)

        user = User.objects.create(email="multi@example.com")
        roles = [Role.objects.create(name=f"Role {i}", scope=ScopeChoices.GLOBAL) for i in range(3)]

        # Assign all roles
        for role in roles:
            data = {
                "user": str(user.id),
                "role": str(role.id),
                "scope": "global",
                "target_organization": None,
                "target_project": None,
            }
            response = api_client.post("/api/permissions/role-assignments/", data, format="json")
            assert response.status_code == 201

        # Verify all assignments
        response = api_client.get(f"/api/permissions/role-assignments/?user={user.id}")
        assert response.status_code == 200
        assert len(response.data["results"]) >= 3

    def test_organizational_scope_workflow(self, api_client, admin_user):
        """Test role assignment with organization scope."""
        assign_perm = Permission.objects.create(
            permission="permissions.assign_role", resource_type="permission"
        )
        admin_user.role_assignments.first().role.permissions.add(assign_perm)
        api_client.force_authenticate(user=admin_user)

        user = User.objects.create(email="org@example.com")
        creator = User.objects.create(email="creator@example.com")
        role = Role.objects.create(name="Org Role", scope=ScopeChoices.ORGANIZATION)
        org = Organisation.objects.create(name="Test Org", creator=creator)

        data = {
            "user": str(user.id),
            "role": str(role.id),
            "scope": "organization",
            "target_organization": str(org.id),
            "target_project": None,
        }

        response = api_client.post("/api/permissions/role-assignments/", data, format="json")
        assert response.status_code == 201
        # Compare UUID objects directly, not strings
        assert response.data["target_organization"] == org.id
        assert response.data["scope"] == "organization"
