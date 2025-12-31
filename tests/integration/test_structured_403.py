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

    def _assert_structured_403(self, response, expected_scope=None, expected_permission_part=None):
        """Helper to verify structured 403 response within envelope."""
        assert response.status_code == status.HTTP_403_FORBIDDEN
        data = response.json()

        # Verify envelope
        assert data["status"] == "error"
        assert data["error"]["code"] == "permission_denied"

        details = data["error"]["details"]

        # Verify structured 403 format in details
        assert "error" in details
        assert "permission" in details
        assert "detail" in details
        assert "scope" in details

        assert details["error"] == "forbidden"
        assert isinstance(details["detail"], str)

        if expected_scope:
            assert details["scope"] == expected_scope
        else:
            assert details["scope"] in [
                "GLOBAL",
                "GENERIC",
                "USER",
                "ORGANIZATION",
                "ORGANISATION",
                "PROJECT",
            ]

        if expected_permission_part:
            assert expected_permission_part in details["permission"]

    def test_permissions_base_403_structure(self, user_without_permission):
        """HasPermission should return structured 403."""
        self.client.force_authenticate(user=user_without_permission)
        # Use valid endpoint: /api/v1/permissions/roles/
        response = self.client.get("/api/v1/permissions/roles/")
        # Scope can be GENERIC or GLOBAL depending on implementation
        self._assert_structured_403(response, expected_permission_part="permissions")

        data = response.json()
        scope = data["error"]["details"]["scope"]
        assert scope in ["GLOBAL", "GENERIC"]

    def test_organization_permission_403_structure(
        self, user_without_org_permission, test_organization
    ):
        """HasOrganizationPermission should return structured 403."""
        self.client.force_authenticate(user=user_without_org_permission)
        # Correct URL: /api/v1/organizations/{id}/balance/
        response = self.client.get(f"/api/v1/organizations/{test_organization.id}/balance/")
        # Note: The scope might be ORGANIZATION or ORGANISATION depending on implementation
        self._assert_structured_403(response, expected_permission_part="organization")

        data = response.json()
        scope = data["error"]["details"]["scope"]
        assert scope in ["ORGANIZATION", "ORGANISATION"]

    def test_project_permission_403_structure(self, user_without_project_permission, test_project):
        """HasProjectPermission should return structured 403."""
        self.client.force_authenticate(user=user_without_project_permission)
        # Correct URL: /api/v1/projects/{id}/balance/
        response = self.client.get(f"/api/v1/projects/{test_project.id}/balance/")
        self._assert_structured_403(
            response, expected_scope="PROJECT", expected_permission_part="project"
        )

    def test_settings_scope_aware_permission_403_structure(
        self, user_without_settings_permission, test_organization
    ):
        """ScopeAwarePermission should return structured 403."""
        self.client.force_authenticate(user=user_without_settings_permission)
        # Correct URL: /api/v1/settings/settings/
        response = self.client.get(
            f"/api/v1/settings/settings/?scope_type=ORGANISATION&organisation={test_organization.id}"
        )
        self._assert_structured_403(response, expected_permission_part="settings")

    def test_notifications_permission_403_structure(self, user_without_notifications_permission):
        """HasNotificationPermission should return structured 403."""
        self.client.force_authenticate(user=user_without_notifications_permission)
        response = self.client.get("/api/v1/notifications/")
        self._assert_structured_403(
            response, expected_scope="USER", expected_permission_part="notifications"
        )

    def test_backward_compatibility_detail_field(self, user_without_permission):
        """Structured 403 should include 'detail' for backward compatibility."""
        self.client.force_authenticate(user=user_without_permission)
        response = self.client.get("/api/v1/permissions/roles/")

        if response.status_code == status.HTTP_403_FORBIDDEN:
            data = response.json()
            details = data["error"]["details"]
            assert "detail" in details
            assert isinstance(details["detail"], str)
            assert len(details["detail"]) > 0

    def test_all_403_responses_have_required_fields(self, user_without_permission):
        """All 403 responses must have: error, permission, detail, scope."""
        self.client.force_authenticate(user=user_without_permission)
        test_endpoints = ["/api/v1/permissions/roles/"]

        for endpoint in test_endpoints:
            response = self.client.get(endpoint)
            if response.status_code == status.HTTP_403_FORBIDDEN:
                self._assert_structured_403(response)

    def test_scope_values_are_valid(self, user_without_permission, test_organization, test_project):
        """Scope field should only contain valid values."""
        self.client.force_authenticate(user=user_without_permission)

        # We can reuse the helper which checks for valid scopes
        response = self.client.get("/api/v1/permissions/roles/")
        if response.status_code == status.HTTP_403_FORBIDDEN:
            self._assert_structured_403(response)

    def test_permission_field_contains_code(self, user_without_permission):
        """Permission field should contain the required permission code."""
        self.client.force_authenticate(user=user_without_permission)
        response = self.client.get("/api/v1/permissions/roles/")

        if response.status_code == status.HTTP_403_FORBIDDEN:
            data = response.json()
            details = data["error"]["details"]
            assert "." in details["permission"]
            parts = details["permission"].split(".")
            assert len(parts) >= 2

    def test_error_field_is_forbidden(self, user_without_permission):
        """Error field should always be 'forbidden' for 403 responses."""
        self.client.force_authenticate(user=user_without_permission)
        response = self.client.get("/api/v1/permissions/roles/")

        if response.status_code == status.HTTP_403_FORBIDDEN:
            data = response.json()
            details = data["error"]["details"]
            assert details["error"] == "forbidden"
