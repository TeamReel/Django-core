"""
REST API tests for Settings & Feature Flags system.

Tests all REST API endpoints for CRUD operations, validation,
permissions, and error handling.
"""

from django.contrib.auth import get_user_model
from django.urls import reverse
from organisations.models import Organisation
from projects.models import Project
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from src.settings.models import FeatureFlag, ScopeType, Setting

User = get_user_model()


class TestFeatureFlagAPIEndpoints(APITestCase):
    """Test Feature Flag REST API endpoints."""

    def setUp(self):
        """Set up test data."""
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
        self.client.force_authenticate(user=self.user)

    def test_create_global_flag(self):
        """Test creating global feature flag via REST API."""
        url = reverse("featureflag-list")
        data = {
            "key": "test_global_flag",
            "name": "Test Global Flag",
            "description": "A test flag",
            "default_value": True,
            "scope_type": ScopeType.GLOBAL.value,
            "is_active": True,
        }

        response = self.client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["key"] == "test_global_flag"
        assert response.data["scope_type"] == ScopeType.GLOBAL.value
        assert response.data["default_value"] is True

        # Verify database creation
        flag = FeatureFlag.objects.get(key="test_global_flag")
        assert flag.name == "Test Global Flag"

    def test_create_organisation_flag(self):
        """Test creating organisation-scoped feature flag."""
        url = reverse("featureflag-list")
        data = {
            "key": "org_flag",
            "name": "Organisation Flag",
            "description": "Organisation-scoped flag",
            "default_value": False,
            "scope_type": ScopeType.ORGANISATION.value,
            "organisation": self.organisation.id,
            "is_active": True,
        }

        response = self.client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["organisation"] == self.organisation.id
        assert response.data["scope_type"] == ScopeType.ORGANISATION.value

    def test_create_project_flag(self):
        """Test creating project-scoped feature flag."""
        url = reverse("featureflag-list")
        data = {
            "key": "project_flag",
            "name": "Project Flag",
            "description": "Project-scoped flag",
            "default_value": True,
            "scope_type": ScopeType.PROJECT.value,
            "organisation": self.organisation.id,
            "project": self.project.id,
            "is_active": True,
        }

        response = self.client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["project"] == self.project.id
        assert response.data["scope_type"] == ScopeType.PROJECT.value

    def test_list_flags(self):
        """Test listing feature flags."""
        # Create test flags
        FeatureFlag.objects.create(
            key="flag1",
            name="Flag 1",
            scope_type=ScopeType.GLOBAL,
            default_value=True,
            created_by=self.user,
        )
        FeatureFlag.objects.create(
            key="flag2",
            name="Flag 2",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
            default_value=False,
            created_by=self.user,
        )

        url = reverse("featureflag-list")
        response = self.client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 2

    def test_get_flag_detail(self):
        """Test retrieving individual flag details."""
        flag = FeatureFlag.objects.create(
            key="detail_flag",
            name="Detail Flag",
            description="Detailed flag info",
            scope_type=ScopeType.GLOBAL,
            default_value=True,
            created_by=self.user,
        )

        url = reverse("featureflag-detail", kwargs={"pk": flag.id})
        response = self.client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["key"] == "detail_flag"
        assert response.data["description"] == "Detailed flag info"

    def test_update_flag(self):
        """Test updating feature flag."""
        flag = FeatureFlag.objects.create(
            key="update_flag",
            name="Original Name",
            scope_type=ScopeType.GLOBAL,
            default_value=False,
            created_by=self.user,
        )

        url = reverse("featureflag-detail", kwargs={"pk": flag.id})
        data = {"name": "Updated Name", "description": "Updated description", "default_value": True}

        response = self.client.patch(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Updated Name"
        assert response.data["default_value"] is True

    def test_delete_flag(self):
        """Test deleting feature flag."""
        flag = FeatureFlag.objects.create(
            key="delete_flag",
            name="Delete Me",
            scope_type=ScopeType.GLOBAL,
            default_value=True,
            created_by=self.user,
        )

        url = reverse("featureflag-detail", kwargs={"pk": flag.id})
        response = self.client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not FeatureFlag.objects.filter(id=flag.id).exists()


class TestSettingAPIEndpoints(APITestCase):
    """Test Setting REST API endpoints."""

    def setUp(self):
        """Set up test data."""
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
        self.client.force_authenticate(user=self.user)

    def test_create_string_setting(self):
        """Test creating string setting."""
        url = reverse("setting-list")
        data = {
            "key": "api_url",
            "name": "API URL",
            "description": "Base API URL",
            "value_type": "string",
            "default_value": "https://api.example.com",
            "scope_type": ScopeType.GLOBAL.value,
            "is_active": True,
        }

        response = self.client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["key"] == "api_url"
        assert response.data["value_type"] == "string"
        assert response.data["default_value"] == "https://api.example.com"

    def test_create_json_setting(self):
        """Test creating JSON setting."""
        url = reverse("setting-list")
        json_value = {"timeout": 30, "retries": 3}
        data = {
            "key": "config_json",
            "name": "Configuration JSON",
            "description": "JSON configuration",
            "value_type": "json",
            "default_value": json_value,
            "scope_type": ScopeType.ORGANISATION.value,
            "organisation": self.organisation.id,
            "is_active": True,
        }

        response = self.client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["value_type"] == "json"
        assert response.data["default_value"] == json_value

    def test_list_settings(self):
        """Test listing settings."""
        Setting.objects.create(
            key="setting1",
            name="Setting 1",
            value_type="string",
            default_value="value1",
            scope_type=ScopeType.GLOBAL,
            created_by=self.user,
        )
        Setting.objects.create(
            key="setting2",
            name="Setting 2",
            value_type="number",
            default_value=42,
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
            created_by=self.user,
        )

        url = reverse("setting-list")
        response = self.client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 2


class TestResolveAPIEndpoints(APITestCase):
    """Test resolve endpoints for getting effective values."""

    def setUp(self):
        """Set up test data."""
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
        self.client.force_authenticate(user=self.user)

    def test_resolve_global_flag(self):
        """Test resolving global feature flag."""
        flag = FeatureFlag.objects.create(
            key="global_resolve_flag",
            name="Global Resolve Flag",
            scope_type=ScopeType.GLOBAL,
            default_value=True,
            created_by=self.user,
        )

        url = reverse("resolve-flag")
        data = {"key": "global_resolve_flag"}

        response = self.client.post(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["key"] == "global_resolve_flag"
        assert response.data["value"] is True
        assert response.data["scope"] == ScopeType.GLOBAL.value

    def test_resolve_organisation_flag(self):
        """Test resolving organisation-scoped flag."""
        flag = FeatureFlag.objects.create(
            key="org_resolve_flag",
            name="Org Resolve Flag",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
            default_value=False,
            created_by=self.user,
        )

        url = reverse("resolve-flag")
        data = {"key": "org_resolve_flag", "organisation_id": self.organisation.id}

        response = self.client.post(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["value"] is False
        assert response.data["scope"] == ScopeType.ORGANISATION.value

    def test_resolve_setting(self):
        """Test resolving setting value."""
        setting = Setting.objects.create(
            key="resolve_setting",
            name="Resolve Setting",
            value_type="string",
            default_value="resolved_value",
            scope_type=ScopeType.GLOBAL,
            created_by=self.user,
        )

        url = reverse("resolve-setting")
        data = {"key": "resolve_setting"}

        response = self.client.post(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["key"] == "resolve_setting"
        assert response.data["value"] == "resolved_value"
        assert response.data["value_type"] == "string"

    def test_resolve_nonexistent_flag(self):
        """Test resolving non-existent flag returns 404."""
        url = reverse("resolve-flag")
        data = {"key": "nonexistent_flag"}

        response = self.client.post(url, data, format="json")

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestAPIValidation(APITestCase):
    """Test API validation and error handling."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(email="test@example.com", password="testpass123")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_create_flag_validation_error(self):
        """Test validation error on flag creation."""
        url = reverse("featureflag-list")
        data = {
            "key": "invalid-key!",  # Invalid key with special chars
            "name": "",  # Empty name
            "scope_type": ScopeType.PROJECT.value,
            # Missing required project for project scope
        }

        response = self.client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "key" in response.data or "name" in response.data

    def test_missing_required_fields(self):
        """Test validation of required fields."""
        url = reverse("featureflag-list")
        data = {
            # Missing required 'key' field
            "name": "Test Flag"
        }

        response = self.client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_scope_type(self):
        """Test validation of invalid scope type."""
        url = reverse("featureflag-list")
        data = {
            "key": "valid_key",
            "name": "Test Flag",
            "scope_type": "INVALID_SCOPE",  # Invalid enum value
            "default_value": True,
        }

        response = self.client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestAPIPermissions(APITestCase):
    """Test API permission enforcement."""

    def setUp(self):
        """Set up test users and organisations."""
        self.owner = User.objects.create_user(email="owner@example.com", password="ownerpass123")
        self.member = User.objects.create_user(email="member@example.com", password="memberpass123")
        self.outsider = User.objects.create_user(
            email="outsider@example.com", password="outsiderpass123"
        )

        self.organisation = Organisation.objects.create(
            name="Test Org", slug="test-org", creator=self.owner
        )

        self.client = APIClient()

    def test_unauthenticated_access_denied(self):
        """Test unauthenticated users cannot access API."""
        url = reverse("featureflag-list")
        response = self.client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_owner_full_access(self):
        """Test organisation owner has full access."""
        self.client.force_authenticate(user=self.owner)

        url = reverse("featureflag-list")
        data = {
            "key": "owner_flag",
            "name": "Owner Flag",
            "scope_type": ScopeType.ORGANISATION.value,
            "organisation": self.organisation.id,
            "default_value": True,
        }

        response = self.client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED

    def test_outsider_access_denied(self):
        """Test users outside organisation cannot create flags."""
        self.client.force_authenticate(user=self.outsider)

        url = reverse("featureflag-list")
        data = {
            "key": "outsider_flag",
            "name": "Outsider Flag",
            "scope_type": ScopeType.ORGANISATION.value,
            "organisation": self.organisation.id,
            "default_value": True,
        }

        response = self.client.post(url, data, format="json")

        # Should be denied due to lack of permissions
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_400_BAD_REQUEST]
