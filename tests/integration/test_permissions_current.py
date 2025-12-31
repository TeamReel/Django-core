"""Integration tests for /api/permissions/current/ endpoint (WP06-T039)."""

import pytest
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APIClient


@pytest.mark.django_db
class TestPermissionsCurrentEndpoint:
    """Test suite for permissions current endpoint."""

    def setup_method(self):
        """Set up test fixtures."""
        self.client = APIClient()
        cache.clear()  # Clear cache before each test

    def test_unauthenticated_user_gets_401(self):
        """Unauthenticated requests should return 401."""
        response = self.client.get("/api/v1/permissions/current/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_authenticated_user_gets_permissions(self, api_data, regular_user):
        """Authenticated user should receive hierarchical permissions structure."""
        self.client.force_authenticate(user=regular_user)
        response = self.client.get("/api/v1/permissions/current/")

        assert response.status_code == status.HTTP_200_OK
        data = api_data(response)

        # Verify structure
        assert "global" in data
        assert "organizations" in data
        assert isinstance(data["global"], list)
        assert isinstance(data["organizations"], dict)

    def test_global_permissions_included(self, api_data, user_with_global_permissions):
        """User with global permissions should see them in response."""
        self.client.force_authenticate(user=user_with_global_permissions)
        response = self.client.get("/api/v1/permissions/current/")

        data = api_data(response)
        assert len(data["global"]) > 0
        # Example: user has 'settings.view' permission globally
        assert "*" in data["global"] or any("settings" in perm for perm in data["global"])

    def test_organization_permissions_with_projects(
        self, api_data, user_with_org_permissions, test_organization, test_project
    ):
        """Organization permissions should include nested projects."""
        # Assign project role to ensure it appears in response
        from permissions.models import ScopeChoices
        from tests.integration.conftest import assign_role_to_user

        assign_role_to_user(
            user_with_org_permissions, "member", ScopeChoices.PROJECT, test_project.id
        )

        self.client.force_authenticate(user=user_with_org_permissions)
        response = self.client.get("/api/v1/permissions/current/")

        data = api_data(response)
        org_id_str = str(test_organization.id)

        assert org_id_str in data["organizations"]
        org_data = data["organizations"][org_id_str]

        # Verify organization structure
        assert "name" in org_data
        assert "permissions" in org_data
        assert "projects" in org_data
        assert isinstance(org_data["permissions"], list)
        assert isinstance(org_data["projects"], dict)

        # Verify project nested under organization
        if test_project.organisation_id == test_organization.id:
            project_id_str = str(test_project.id)
            assert project_id_str in org_data["projects"]
            project_data = org_data["projects"][project_id_str]
            assert "name" in project_data
            assert "permissions" in project_data
            assert isinstance(project_data["permissions"], list)

    def test_caching_works(self, api_data, regular_user):
        """Second request should be served from cache."""
        from django.core.cache import cache

        self.client.force_authenticate(user=regular_user)

        # Clear cache
        cache.clear()

        # First request - cache miss
        response1 = self.client.get("/api/v1/permissions/current/")
        assert response1.status_code == status.HTTP_200_OK
        data1 = api_data(response1)

        # Verify cache was set
        cache_key = f"permissions:user:{regular_user.id}"
        cached_data = cache.get(cache_key)
        assert cached_data is not None

        # Second request - should be from cache
        response2 = self.client.get("/api/v1/permissions/current/")
        assert response2.status_code == status.HTTP_200_OK
        data2 = api_data(response2)

        # Data should match
        assert data1 == data2

    def test_cache_invalidated_on_role_assignment_change(
        self, regular_user, test_role, test_organization
    ):
        """Cache should be invalidated when user's role assignments change."""
        from permissions.models import RoleAssignment

        self.client.force_authenticate(user=regular_user)

        # First request - populate cache
        response1 = self.client.get("/api/v1/permissions/current/")
        assert response1.status_code == status.HTTP_200_OK

        # Assign new role (should trigger cache invalidation via signals)
        RoleAssignment.objects.create(
            user=regular_user,
            role=test_role,
            target_organization=test_organization,
            scope="ORGANIZATION",
        )

        # Cache should be cleared
        cache_key = f"permissions:user:{regular_user.id}"
        cached_data = cache.get(cache_key)
        assert cached_data is None  # Cache was invalidated

        # Next request should rebuild cache with new permissions
        response2 = self.client.get("/api/v1/permissions/current/")

        # Permissions should be refreshed from database
        assert response2.status_code == status.HTTP_200_OK

    def test_empty_permissions_structure(self, api_data, user_with_no_permissions):
        """User with no permissions should get empty structure."""
        self.client.force_authenticate(user=user_with_no_permissions)
        response = self.client.get("/api/v1/permissions/current/")

        data = api_data(response)
        assert data["global"] == []
        assert data["organizations"] == {}

    def test_multiple_organizations_returned(
        self, api_data, user_with_multiple_org_permissions, org1, org2
    ):
        """User with permissions in multiple orgs should see all."""
        self.client.force_authenticate(user=user_with_multiple_org_permissions)
        response = self.client.get("/api/v1/permissions/current/")

        data = api_data(response)
        org_ids = list(data["organizations"].keys())

        assert str(org1.id) in org_ids
        assert str(org2.id) in org_ids

    def test_permissions_sorted_alphabetically(self, api_data, user_with_permissions):
        """Permissions should be sorted alphabetically for consistency."""
        self.client.force_authenticate(user=user_with_permissions)
        response = self.client.get("/api/v1/permissions/current/")

        data = api_data(response)

        # Check global permissions are sorted
        global_perms = data["global"]
        assert global_perms == sorted(global_perms)

        # Check organization permissions are sorted
        for org_data in data["organizations"].values():
            org_perms = org_data["permissions"]
            assert org_perms == sorted(org_perms)

            # Check project permissions are sorted
            for project_data in org_data["projects"].values():
                project_perms = project_data["permissions"]
                assert project_perms == sorted(project_perms)
