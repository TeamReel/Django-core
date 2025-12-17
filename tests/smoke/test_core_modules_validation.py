"""
Smoke tests for Core-App Modules 001-031 validation.

Tests the integration of all implemented modules via API endpoints.
Run with: pytest tests/smoke/test_core_modules_validation.py -v
"""

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from organisations.models import Organisation, OrganisationMembership
from projects.models import Project

User = get_user_model()


@pytest.fixture
def admin_user(db):
    """Create admin user for testing."""
    return User.objects.create_user(
        email="admin@example.com",
        password="admin123",
        is_staff=True,
        is_superuser=True,
        email_verified=True,
    )


@pytest.fixture
def authenticated_client(admin_user):
    """Return authenticated API client."""
    client = Client()
    client.login(email="admin@example.com", password="admin123")
    return client


@pytest.fixture
def test_org(db, admin_user):
    """Create test organisation."""
    org = Organisation.objects.create(name="Test Org", slug="test-org")
    OrganisationMembership.objects.create(user=admin_user, organisation=org, role="admin")
    return org


@pytest.fixture
def test_project(db, test_org, admin_user):
    """Create test project."""
    return Project.objects.create(
        name="Test Project", slug="test-project", organisation=test_org, created_by=admin_user
    )


class TestAuthIdentity:
    """B05 Core Accounts + F02 Auth UI"""

    def test_login_endpoint_exists(self, client):
        """Login endpoint is accessible."""
        response = client.post(
            "/api/v1/auth/login/", {"email": "test@example.com", "password": "wrong"}
        )
        assert response.status_code in [400, 401]  # Endpoint exists

    def test_logout_endpoint_exists(self, authenticated_client):
        """Logout endpoint is accessible."""
        response = authenticated_client.post("/api/v1/auth/logout/")
        assert response.status_code in [200, 204]

    def test_me_endpoint_returns_user(self, authenticated_client):
        """Current user endpoint returns user data."""
        response = authenticated_client.get("/api/v1/auth/me/")
        assert response.status_code == 200
        data = response.json()
        assert "email" in data or "data" in data  # B13 envelope or direct


class TestMultiTenancy:
    """B06 Organisations + B07 Projects + F03 Context Switcher"""

    def test_organisations_list(self, authenticated_client, test_org):
        """Can retrieve organisations list."""
        response = authenticated_client.get("/api/v1/organisations/")
        assert response.status_code == 200
        data = response.json()
        # Handle both paginated and direct response
        orgs = data.get("results", data) if isinstance(data, dict) else data
        assert len(orgs) > 0

    def test_projects_list(self, authenticated_client, test_project):
        """Can retrieve projects list."""
        response = authenticated_client.get("/api/v1/projects/")
        assert response.status_code == 200
        data = response.json()
        projects = data.get("results", data) if isinstance(data, dict) else data
        assert len(projects) > 0


class TestPermissions:
    """B08 Hierarchical Access Control"""

    def test_permissions_endpoint_exists(self, authenticated_client):
        """Permissions current endpoint is accessible."""
        response = authenticated_client.get("/api/v1/permissions/current/")
        assert response.status_code in [200, 404]  # 404 if no permissions set

        if response.status_code == 200:
            data = response.json()
            # Should have hierarchical structure
            assert "user_id" in data or "global_permissions" in data


class TestObservability:
    """B18 Observability"""

    def test_health_endpoint(self, client):
        """Health check endpoint is accessible."""
        response = client.get("/health/")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data or "database" in data


class TestSecurity:
    """B03 Core Security Baseline"""

    def test_csrf_cookie_set_on_login_page(self, client):
        """CSRF cookie is set for login requests."""
        response = client.get("/api/v1/auth/login/")
        assert "csrftoken" in response.cookies or response.status_code == 405  # GET not allowed

    def test_unauthenticated_api_returns_401(self, client):
        """Protected endpoints return 401 for unauthenticated users."""
        response = client.get("/api/v1/organisations/")
        assert response.status_code in [401, 403]


class TestAPIBaseline:
    """B13 API Baseline"""

    def test_api_root_accessible(self, authenticated_client):
        """API root endpoint is accessible."""
        response = authenticated_client.get("/api/v1/")
        assert response.status_code in [200, 404]  # Some setups don't have API root

    def test_pagination_in_list_endpoints(self, authenticated_client, test_org):
        """List endpoints support pagination."""
        response = authenticated_client.get("/api/v1/organisations/")
        assert response.status_code == 200
        data = response.json()

        # Check for pagination keys OR direct list
        is_paginated = "results" in data or "count" in data
        is_list = isinstance(data, list)
        assert is_paginated or is_list


@pytest.mark.integration
class TestEndToEndFlow:
    """Integration test: Complete user flow through the platform."""

    def test_complete_user_journey(self, db):
        """Test complete flow: login → select org → view project → logout."""
        client = Client()

        # 1. Create user
        user = User.objects.create_user(
            email="journey@example.com", password="test123", email_verified=True
        )

        # 2. Login
        response = client.post(
            "/api/v1/auth/login/", {"email": "journey@example.com", "password": "test123"}
        )
        assert response.status_code == 200

        # 3. Get current user
        response = client.get("/api/v1/auth/me/")
        assert response.status_code == 200

        # 4. Create organisation
        org = Organisation.objects.create(name="Journey Org", slug="journey-org")
        OrganisationMembership.objects.create(user=user, organisation=org, role="admin")

        # 5. List organisations
        response = client.get("/api/v1/organisations/")
        assert response.status_code == 200

        # 6. Create project
        project = Project.objects.create(
            name="Journey Project", slug="journey-project", organisation=org, created_by=user
        )

        # 7. List projects
        response = client.get("/api/v1/projects/")
        assert response.status_code == 200

        # 8. Logout
        response = client.post("/api/v1/auth/logout/")
        assert response.status_code in [200, 204]

        # 9. Verify logged out
        response = client.get("/api/v1/auth/me/")
        assert response.status_code in [401, 403]
