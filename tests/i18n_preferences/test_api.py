"""API integration tests for i18n preference endpoints."""

import pytest
from django.contrib.auth import get_user_model
from organisations.models import Organisation
from rest_framework.test import APIClient
from settings.models import ScopeType, Setting

User = get_user_model()

pytestmark = pytest.mark.django_db


class TestUserPreferenceAPI:
    """Test suite for user preference endpoints."""

    def setup_method(self):
        """Set up test fixtures."""
        self.client = APIClient()
        self.user = User.objects.create_user(email="test@example.com", password="testpass123")
        self.client.force_authenticate(self.user)

    def test_get_user_preferences_empty(self, api_data):
        """Test GET /me/ returns nulls for user with no preferences."""
        response = self.client.get("/api/v1/preferences/me/")

        assert response.status_code == 200
        data = api_data(response)
        assert data == {
            "language": None,
            "locale": None,
            "timezone": None,
        }

    def test_get_user_preferences_populated(self, api_data):
        """Test GET /me/ returns stored preferences."""
        # Create preference setting
        Setting.objects.create(
            key="i18n.preferences",
            scope_type=ScopeType.USER,
            user=self.user,
            value={"language": "nl", "locale": "nl-NL", "timezone": "Europe/Amsterdam"},
            value_type="JSON",
            default_value={},
        )

        response = self.client.get("/api/v1/preferences/me/")

        assert response.status_code == 200
        data = api_data(response)
        assert data["language"] == "nl"
        assert data["locale"] == "nl-NL"
        assert data["timezone"] == "Europe/Amsterdam"

    def test_update_user_preferences_full(self, api_data):
        """Test PATCH /me/ updates all preference fields."""
        response = self.client.patch(
            "/api/v1/preferences/me/",
            {"language": "en", "locale": "en-GB", "timezone": "Europe/London"},
            format="json",
        )

        assert response.status_code == 200
        data = api_data(response)
        assert data["language"] == "en"
        assert data["locale"] == "en-GB"
        assert data["timezone"] == "Europe/London"

        # Verify stored in database
        setting = Setting.objects.get(
            key="i18n.preferences", scope_type=ScopeType.USER, user=self.user
        )
        assert setting.value["language"] == "en"
        assert setting.value["locale"] == "en-GB"
        assert setting.value["timezone"] == "Europe/London"

    def test_update_user_preferences_partial(self, api_data):
        """Test PATCH /me/ supports partial updates."""
        # Create initial preferences
        Setting.objects.create(
            key="i18n.preferences",
            scope_type=ScopeType.USER,
            user=self.user,
            value={"language": "en", "locale": "en-US", "timezone": "UTC"},
            value_type="JSON",
            default_value={},
        )

        # Update only language (keep as 'en' since that's what's already set)
        response = self.client.patch(
            "/api/v1/preferences/me/", {"timezone": "Europe/Paris"}, format="json"
        )

        assert response.status_code == 200
        data = api_data(response)
        assert data["language"] == "en"  # Unchanged
        # Other fields should remain unchanged or updated
        assert data["locale"] == "en-US"
        assert data["timezone"] == "Europe/Paris"  # Updated

    def test_update_invalid_language(self, api_data):
        """Test PATCH /me/ returns 400 for invalid language code."""
        response = self.client.patch(
            "/api/v1/preferences/me/", {"language": "invalid"}, format="json"
        )

        assert response.status_code == 400
        data = api_data(response)
        assert "language" in data

    def test_update_invalid_timezone(self, api_data):
        """Test PATCH /me/ returns 400 for invalid timezone."""
        response = self.client.patch(
            "/api/v1/preferences/me/", {"timezone": "Invalid/Zone"}, format="json"
        )

        assert response.status_code == 400
        data = api_data(response)
        assert "timezone" in data


class TestEffectivePreferenceAPI:
    """Test suite for effective preference resolution endpoint."""

    def setup_method(self):
        """Set up test fixtures."""
        self.client = APIClient()
        self.user = User.objects.create_user(email="test@example.com", password="testpass123")
        self.org = Organisation.objects.create(name="Test Org", creator=self.user)
        self.user.organisation = self.org
        self.user.save()
        self.client.force_authenticate(self.user)

    def test_get_effective_preferences(self, api_data):
        """Test GET /effective/ returns resolved preferences with source attribution."""
        # Create user preference
        Setting.objects.create(
            key="i18n.preferences",
            scope_type=ScopeType.USER,
            user=self.user,
            value={"language": "en"},
            value_type="JSON",
            default_value={},
        )

        # Create org default
        Setting.objects.create(
            key="i18n.preferences",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.org,
            value={"timezone": "Europe/Amsterdam"},
            value_type="JSON",
            default_value={},
        )

        response = self.client.get("/api/v1/preferences/effective/")

        assert response.status_code == 200
        data = api_data(response)
        assert data["language"] == "en"
        assert data["language_source"] == "user"
        assert data["timezone"] == "Europe/Amsterdam"
        assert data["timezone_source"] == "organisation"
        # locale should fall back to global
        assert data["locale_source"] == "global"

    def test_effective_preferences_user_over_org(self, api_data):
        """Test user preferences take precedence over organisation defaults."""
        # Create both user and org preferences for same field
        # User sets timezone, org sets different timezone
        Setting.objects.create(
            key="i18n.preferences",
            scope_type=ScopeType.USER,
            user=self.user,
            value={"timezone": "Europe/London"},
            value_type="JSON",
            default_value={},
        )
        Setting.objects.create(
            key="i18n.preferences",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.org,
            value={"timezone": "Europe/Amsterdam"},
            value_type="JSON",
            default_value={},
        )

        response = self.client.get("/api/v1/preferences/effective/")

        assert response.status_code == 200
        data = api_data(response)
        # User preference should win
        assert data["timezone"] == "Europe/London"
        assert data["timezone_source"] == "user"


class TestOrganisationPreferenceAPI:
    """Test suite for organisation preference endpoints."""

    def setup_method(self):
        """Set up test fixtures."""
        from organisations.models import Membership

        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            email="admin@example.com", password="adminpass123"
        )
        self.member_user = User.objects.create_user(
            email="member@example.com", password="memberpass123"
        )
        self.org = Organisation.objects.create(name="Test Org", creator=self.admin_user)

        # Add admin_user as member of organisation
        Membership.objects.create(
            organisation=self.org,
            user=self.admin_user,
            role="admin",
        )

    def test_get_org_preferences_as_admin(self, api_data):
        """Test GET /organisations/{id}/ works for organisation admin."""
        self.client.force_authenticate(self.admin_user)

        # Create org preferences
        Setting.objects.create(
            key="i18n.preferences",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.org,
            value={"language": "en", "timezone": "Europe/Amsterdam"},
            value_type="JSON",
            default_value={},
        )

        response = self.client.get(f"/api/v1/preferences/organisations/{self.org.id}/")

        assert response.status_code == 200
        data = api_data(response)
        assert data["language"] == "en"
        assert data["timezone"] == "Europe/Amsterdam"

    def test_update_org_preferences_as_admin(self, api_data):
        """Test PATCH /organisations/{id}/ works for organisation admin."""
        self.client.force_authenticate(self.admin_user)

        response = self.client.patch(
            f"/api/v1/preferences/organisations/{self.org.id}/",
            {"language": "en", "timezone": "Europe/Berlin"},
            format="json",
        )

        assert response.status_code == 200
        data = api_data(response)
        assert data["language"] == "en"
        assert data["timezone"] == "Europe/Berlin"

        # Verify in database
        setting = Setting.objects.get(
            key="i18n.preferences",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.org,
        )
        assert setting.value["language"] == "en"

    def test_update_org_preferences_as_member(self):
        """Test PATCH /organisations/{id}/ returns 403 for non-admin member."""
        self.client.force_authenticate(self.member_user)

        response = self.client.patch(
            f"/api/v1/preferences/organisations/{self.org.id}/",
            {"language": "en"},
            format="json",
        )

        assert response.status_code == 403


class TestAuthentication:
    """Test authentication requirements for API endpoints."""

    def setup_method(self):
        """Set up test fixtures."""
        self.client = APIClient()

    def test_unauthenticated_request(self):
        """Test all endpoints return 401 for unauthenticated requests.

        The API returns 401 (Unauthorized) for unauthenticated requests,
        which is the correct HTTP status code for missing authentication.
        """
        endpoints = [
            "/api/v1/preferences/me/",
            "/api/v1/preferences/effective/",
        ]

        for endpoint in endpoints:
            response = self.client.get(endpoint)
            assert response.status_code == 401, f"Expected 401 for {endpoint}"
