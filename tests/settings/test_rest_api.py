"""
REST API tests for Settings & Feature Flags system.

Tests all REST API endpoints for CRUD operations, validation,
permissions, and error handling.
"""

from django.contrib.auth import get_user_model
from django.urls import reverse
from src.organisations.models import Organisation
from src.projects.models import Project
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from src.settings.models import FeatureFlag, ScopeType, Setting, SettingType

User = get_user_model()


class TestFeatureFlagAPIEndpoints(APITestCase):
    """Test Feature Flag REST API endpoints."""

    def setUp(self):
        """Set up test data."""
        self.superuser = User.objects.create_superuser(
            email="admin@example.com", password="adminpass123"
        )
        self.user = User.objects.create_user(email="test@example.com", password="testpass123")
        self.organisation = Organisation.objects.create(
            name="Test Org", slug="test-org", creator=self.user
        )
        self.project = Project.objects.create(
            name="Test Project",
            slug="test-project",
            organisation=self.organisation,
            creator=self.user,
        )
        self.client = APIClient()
        # Use superuser to bypass permission checks
        self.client.force_authenticate(user=self.superuser)

    def test_create_global_flag(self):
        """Test creating global feature flag via REST API."""
        url = reverse("featureflag-list")
        data = {
            "key": "test_global_flag",
            "description": "A test flag",
            "enabled": True,
            "scope_type": ScopeType.GLOBAL.value,
        }

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["key"], "test_global_flag")
        self.assertEqual(response.data["scope_type"], ScopeType.GLOBAL.value)
        self.assertTrue(response.data["enabled"])

        # Verify database creation
        flag = FeatureFlag.objects.get(key="test_global_flag")
        self.assertEqual(flag.description, "A test flag")

    def test_create_organisation_flag(self):
        """Test creating organisation-scoped feature flag."""
        url = reverse("featureflag-list")
        data = {
            "key": "org_flag",
            "description": "Organisation-scoped flag",
            "enabled": False,
            "scope_type": ScopeType.ORGANISATION.value,
            "organisation": self.organisation.id,
        }

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["organisation"], self.organisation.id)
        self.assertEqual(response.data["scope_type"], ScopeType.ORGANISATION.value)

    def test_create_project_flag(self):
        """Test creating project-scoped feature flag."""
        url = reverse("featureflag-list")
        data = {
            "key": "project_flag",
            "description": "Project-scoped flag",
            "enabled": True,
            "scope_type": ScopeType.PROJECT.value,
            "organisation": self.organisation.id,
            "project": self.project.id,
        }

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["project"], self.project.id)
        self.assertEqual(response.data["scope_type"], ScopeType.PROJECT.value)

    def test_list_flags(self):
        """Test listing feature flags."""
        # Create test flags
        FeatureFlag.objects.create(
            key="flag1",
            scope_type=ScopeType.GLOBAL,
            enabled=True,
            created_by=self.superuser,
        )
        FeatureFlag.objects.create(
            key="flag2",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
            enabled=False,
            created_by=self.superuser,
        )

        url = reverse("featureflag-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)

    def test_get_flag_detail(self):
        """Test retrieving individual flag details."""
        flag = FeatureFlag.objects.create(
            key="detail_flag",
            description="Detailed flag info",
            scope_type=ScopeType.GLOBAL,
            enabled=True,
            created_by=self.superuser,
        )

        url = reverse("featureflag-detail", kwargs={"pk": flag.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["key"], "detail_flag")
        self.assertEqual(response.data["description"], "Detailed flag info")

    def test_update_flag(self):
        """Test updating feature flag."""
        flag = FeatureFlag.objects.create(
            key="update_flag",
            description="Original description",
            scope_type=ScopeType.GLOBAL,
            enabled=False,
            created_by=self.superuser,
        )

        url = reverse("featureflag-detail", kwargs={"pk": flag.id})
        data = {"description": "Updated description", "enabled": True}

        response = self.client.patch(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["description"], "Updated description")
        self.assertTrue(response.data["enabled"])

    def test_delete_flag(self):
        """Test deleting feature flag."""
        flag = FeatureFlag.objects.create(
            key="delete_flag",
            scope_type=ScopeType.GLOBAL,
            enabled=True,
            created_by=self.superuser,
        )

        url = reverse("featureflag-detail", kwargs={"pk": flag.id})
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(FeatureFlag.objects.filter(id=flag.id).exists())

    def test_filter_by_scope_type(self):
        """Test filtering flags by scope type."""
        FeatureFlag.objects.create(
            key="global_flag",
            scope_type=ScopeType.GLOBAL,
            created_by=self.superuser,
        )
        FeatureFlag.objects.create(
            key="org_flag",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
            created_by=self.superuser,
        )

        url = reverse("featureflag-list")
        response = self.client.get(url, {"scope_type": ScopeType.GLOBAL.value})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["key"], "global_flag")

    def test_search_by_key(self):
        """Test searching flags by key."""
        FeatureFlag.objects.create(
            key="feature_dark_mode",
            scope_type=ScopeType.GLOBAL,
            created_by=self.superuser,
        )
        FeatureFlag.objects.create(
            key="feature_light_theme",
            scope_type=ScopeType.GLOBAL,
            created_by=self.superuser,
        )

        url = reverse("featureflag-list")
        response = self.client.get(url, {"search": "dark"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["key"], "feature_dark_mode")

    def test_unauthenticated_access_denied(self):
        """Test unauthenticated user cannot access API."""
        self.client.logout()
        url = reverse("featureflag-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class TestSettingAPIEndpoints(APITestCase):
    """Test Setting REST API endpoints."""

    def setUp(self):
        """Set up test data."""
        self.superuser = User.objects.create_superuser(
            email="admin@example.com", password="adminpass123"
        )
        self.user = User.objects.create_user(email="test@example.com", password="testpass123")
        self.organisation = Organisation.objects.create(
            name="Test Org", slug="test-org", creator=self.user
        )
        self.project = Project.objects.create(
            name="Test Project",
            slug="test-project",
            organisation=self.organisation,
            creator=self.user,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.superuser)

    def test_create_string_setting(self):
        """Test creating string setting."""
        url = reverse("setting-list")
        data = {
            "key": "api_url",
            "description": "Base API URL",
            "value": "https://api.example.com",
            "value_type": SettingType.STRING.value,
            "default_value": "https://default.api.com",
            "scope_type": ScopeType.GLOBAL.value,
        }

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["key"], "api_url")
        self.assertEqual(response.data["value_type"], SettingType.STRING.value)
        self.assertEqual(response.data["value"], "https://api.example.com")

    def test_create_json_setting(self):
        """Test creating JSON setting."""
        url = reverse("setting-list")
        json_value = {"timeout": 30, "retries": 3}
        data = {
            "key": "config_json",
            "description": "JSON configuration",
            "value": json_value,
            "value_type": SettingType.JSON.value,
            "default_value": {"default": True},
            "scope_type": ScopeType.ORGANISATION.value,
            "organisation": self.organisation.id,
        }

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["value_type"], SettingType.JSON.value)
        self.assertEqual(response.data["value"], json_value)

    def test_list_settings(self):
        """Test listing settings."""
        Setting.objects.create(
            key="setting1",
            value="value1",
            value_type=SettingType.STRING,
            default_value="default1",
            scope_type=ScopeType.GLOBAL,
            created_by=self.superuser,
        )
        Setting.objects.create(
            key="setting2",
            value="value2",
            value_type=SettingType.STRING,
            default_value="default2",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
            created_by=self.superuser,
        )

        url = reverse("setting-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)

    def test_get_setting_detail(self):
        """Test retrieving individual setting details."""
        setting = Setting.objects.create(
            key="detail_setting",
            value="test_value",
            value_type=SettingType.STRING,
            default_value="default",
            description="Detailed setting",
            scope_type=ScopeType.GLOBAL,
            created_by=self.superuser,
        )

        url = reverse("setting-detail", kwargs={"pk": setting.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["key"], "detail_setting")
        self.assertEqual(response.data["description"], "Detailed setting")

    def test_update_setting(self):
        """Test updating setting value."""
        setting = Setting.objects.create(
            key="update_setting",
            value="original",
            value_type=SettingType.STRING,
            default_value="default",
            scope_type=ScopeType.GLOBAL,
            created_by=self.superuser,
        )

        url = reverse("setting-detail", kwargs={"pk": setting.id})
        data = {"value": "updated", "description": "Updated description"}

        response = self.client.patch(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["value"], "updated")

    def test_delete_setting(self):
        """Test deleting setting."""
        setting = Setting.objects.create(
            key="delete_setting",
            value="value",
            value_type=SettingType.STRING,
            default_value="default",
            scope_type=ScopeType.GLOBAL,
            created_by=self.superuser,
        )

        url = reverse("setting-detail", kwargs={"pk": setting.id})
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Setting.objects.filter(id=setting.id).exists())

    def test_create_integer_setting(self):
        """Test creating integer setting."""
        url = reverse("setting-list")
        data = {
            "key": "max_retries",
            "value": 5,
            "value_type": SettingType.INTEGER.value,
            "default_value": 3,
            "scope_type": ScopeType.GLOBAL.value,
        }

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["value"], 5)
        self.assertEqual(response.data["default_value"], 3)

    def test_create_boolean_setting(self):
        """Test creating boolean setting."""
        url = reverse("setting-list")
        data = {
            "key": "debug_enabled",
            "value": True,
            "value_type": SettingType.BOOLEAN.value,
            "default_value": False,
            "scope_type": ScopeType.GLOBAL.value,
        }

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["value"])
        self.assertFalse(response.data["default_value"])


class TestFeatureFlagResolveEndpoint(APITestCase):
    """Test feature flag resolve endpoint."""

    def setUp(self):
        """Set up test data."""
        self.superuser = User.objects.create_superuser(
            email="admin@example.com", password="adminpass123"
        )
        self.organisation = Organisation.objects.create(
            name="Test Org", slug="test-org", creator=self.superuser
        )
        self.project = Project.objects.create(
            name="Test Project",
            slug="test-project",
            organisation=self.organisation,
            creator=self.superuser,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.superuser)

    def test_resolve_global_flag(self):
        """Test resolving global flag."""
        FeatureFlag.objects.create(
            key="resolve_test",
            scope_type=ScopeType.GLOBAL,
            enabled=True,
            created_by=self.superuser,
        )

        url = reverse("featureflag-resolve", kwargs={"key": "resolve_test"})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["key"], "resolve_test")
        self.assertTrue(response.data["value"])

    def test_resolve_nonexistent_flag(self):
        """Test resolving nonexistent flag returns 404."""
        url = reverse("featureflag-resolve", kwargs={"key": "nonexistent"})
        response = self.client.get(url)

        # Nonexistent flag returns 404
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class TestAPIValidation(APITestCase):
    """Test API validation errors."""

    def setUp(self):
        """Set up test data."""
        self.superuser = User.objects.create_superuser(
            email="admin@example.com", password="adminpass123"
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.superuser)

    def test_invalid_key_format(self):
        """Test invalid key format rejected."""
        url = reverse("featureflag-list")
        data = {
            "key": "invalid-key!",  # Contains invalid characters
            "scope_type": ScopeType.GLOBAL.value,
            "enabled": True,
        }

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("key", response.data)

    def test_key_too_short(self):
        """Test key too short rejected."""
        url = reverse("featureflag-list")
        data = {
            "key": "a",  # Too short
            "scope_type": ScopeType.GLOBAL.value,
            "enabled": True,
        }

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("key", response.data)

    def test_missing_organisation_for_org_scope(self):
        """Test organisation required for organisation scope."""
        url = reverse("featureflag-list")
        data = {
            "key": "org_flag",
            "scope_type": ScopeType.ORGANISATION.value,
            "enabled": True,
            # Missing organisation
        }

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_setting_missing_default_value(self):
        """Test setting requires default_value."""
        url = reverse("setting-list")
        data = {
            "key": "test_setting",
            "value": "test",
            "value_type": SettingType.STRING.value,
            "scope_type": ScopeType.GLOBAL.value,
            # Missing default_value
        }

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("default_value", response.data)
