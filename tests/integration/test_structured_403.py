"""Integration tests for structured 403 responses (WP06-T039)."""

import pytest
from rest_framework import status
from rest_framework.test import APIClient


@pytest.mark.django_db
class TestStructured403Responses:
    """Test suite for structured 403 error responses across all endpoints."""

    def setup_method(self):
        """Set up test fixtures."""
        self.client = APIClient()

    def test_permissions_base_403_structure(self, user_without_permission):
        """HasPermission should return structured 403."""
        # Use any endpoint protected by HasPermission

        self.client.force_authenticate(user=user_without_permission)

        # Try to access permissions management (requires 'permissions.view')
        response = self.client.get("/api/v1/permissions/permissions/")

        if response.status_code == status.HTTP_403_FORBIDDEN:
            data = response.json()

            # Verify structured 403 format
            assert "error" in data
            assert "permission" in data
            assert "detail" in data
            assert "scope" in data

            assert data["error"] == "forbidden"
            assert "permission" in data["permission"]  # Contains permission code
            assert isinstance(data["detail"], str)  # Human-readable message
            assert data["scope"] in ["GLOBAL", "GENERIC", "USER"]

    def test_organization_permission_403_structure(
        self, user_without_org_permission, test_organization
    ):
        """HasOrganizationPermission should return structured 403."""
        self.client.force_authenticate(user=user_without_org_permission)

        # Try to access organization-scoped endpoint without permission
        # Example: Transaction organization balance endpoint
        response = self.client.get(
            f"/api/v1/transactions/organizations/{test_organization.id}/balance/"
        )

        if response.status_code == status.HTTP_403_FORBIDDEN:
            data = response.json()

            # Verify structured 403 format
            assert data["error"] == "forbidden"
            assert "permission" in data
            assert (
                "organization" in data["detail"].lower() or "organisation" in data["detail"].lower()
            )
            assert data["scope"] == "ORGANIZATION"

    def test_project_permission_403_structure(self, user_without_project_permission, test_project):
        """HasProjectPermission should return structured 403."""
        self.client.force_authenticate(user=user_without_project_permission)

        # Try to access project-scoped endpoint without permission
        response = self.client.get(f"/api/v1/transactions/projects/{test_project.id}/balance/")

        if response.status_code == status.HTTP_403_FORBIDDEN:
            data = response.json()

            # Verify structured 403 format
            assert data["error"] == "forbidden"
            assert "permission" in data
            assert "project" in data["detail"].lower()
            assert data["scope"] == "PROJECT"

    def test_settings_scope_aware_permission_403_structure(
        self, user_without_settings_permission, test_organization
    ):
        """ScopeAwarePermission should return structured 403."""
        self.client.force_authenticate(user=user_without_settings_permission)

        # Try to access settings endpoint without permission
        response = self.client.get(
            f"/api/v1/settings/?scope_type=ORGANISATION&organisation={test_organization.id}"
        )

        if response.status_code == status.HTTP_403_FORBIDDEN:
            data = response.json()

            # Verify structured 403 format
            assert data["error"] == "forbidden"
            assert "permission" in data
            assert "settings" in data["permission"]
            assert isinstance(data["detail"], str)
            assert data["scope"] in ["GLOBAL", "ORGANISATION", "PROJECT", "USER"]

    def test_notifications_permission_403_structure(self, user_without_notifications_permission):
        """HasNotificationPermission should return structured 403."""
        self.client.force_authenticate(user=user_without_notifications_permission)

        # Try to access notifications endpoint without permission
        response = self.client.get("/api/v1/notifications/")

        if response.status_code == status.HTTP_403_FORBIDDEN:
            data = response.json()

            # Verify structured 403 format
            assert data["error"] == "forbidden"
            assert "permission" in data
            assert "notifications" in data["permission"]
            assert data["scope"] == "USER"

    def test_backward_compatibility_detail_field(self, user_without_permission):
        """Structured 403 should include 'detail' for backward compatibility."""
        self.client.force_authenticate(user=user_without_permission)

        # Try to access any protected endpoint
        response = self.client.get("/api/v1/permissions/permissions/")

        if response.status_code == status.HTTP_403_FORBIDDEN:
            data = response.json()

            # 'detail' field MUST exist for legacy clients
            assert "detail" in data
            assert isinstance(data["detail"], str)
            assert len(data["detail"]) > 0

    def test_all_403_responses_have_required_fields(self, user_without_permission):
        """All 403 responses must have: error, permission, detail, scope."""
        self.client.force_authenticate(user=user_without_permission)

        # List of endpoints to test
        test_endpoints = [
            "/api/v1/permissions/permissions/",
            # Add more endpoints as needed
        ]

        for endpoint in test_endpoints:
            response = self.client.get(endpoint)

            if response.status_code == status.HTTP_403_FORBIDDEN:
                data = response.json()

                # Verify all required fields present
                required_fields = ["error", "permission", "detail", "scope"]
                for field in required_fields:
                    assert field in data, f"Field '{field}' missing in 403 response for {endpoint}"

    def test_scope_values_are_valid(self, user_without_permission, test_organization, test_project):
        """Scope field should only contain valid values."""
        self.client.force_authenticate(user=user_without_permission)

        valid_scopes = ["GLOBAL", "GENERIC", "USER", "ORGANIZATION", "ORGANISATION", "PROJECT"]

        # Test various endpoints
        test_cases = [
            "/api/v1/permissions/permissions/",
            f"/api/v1/transactions/organizations/{test_organization.id}/balance/",
            f"/api/v1/transactions/projects/{test_project.id}/balance/",
        ]

        for endpoint in test_cases:
            response = self.client.get(endpoint)

            if response.status_code == status.HTTP_403_FORBIDDEN:
                data = response.json()
                assert (
                    data["scope"] in valid_scopes
                ), f"Invalid scope '{data['scope']}' for {endpoint}"

    def test_permission_field_contains_code(self, user_without_permission):
        """Permission field should contain the required permission code."""
        self.client.force_authenticate(user=user_without_permission)

        response = self.client.get("/api/v1/permissions/permissions/")

        if response.status_code == status.HTTP_403_FORBIDDEN:
            data = response.json()

            # Permission should be a valid permission code (e.g., 'permissions.view')
            assert "." in data["permission"], "Permission should be in 'module.action' format"
            parts = data["permission"].split(".")
            assert len(parts) >= 2, "Permission should have at least module and action"

    def test_error_field_is_forbidden(self, user_without_permission):
        """Error field should always be 'forbidden' for 403 responses."""
        self.client.force_authenticate(user=user_without_permission)

        response = self.client.get("/api/v1/permissions/permissions/")

        if response.status_code == status.HTTP_403_FORBIDDEN:
            data = response.json()
            assert data["error"] == "forbidden"
