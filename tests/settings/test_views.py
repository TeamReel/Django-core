"""
Views tests for Settings & Feature Flags REST API.

Tests Django REST Framework ViewSets functionality without external dependencies.
"""

from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIRequestFactory, APITestCase
from settings.models import FeatureFlag, ScopeType, Setting, SettingType
from settings.views import FeatureFlagViewSet, SettingsPagination, SettingViewSet

User = get_user_model()


class TestSettingsPagination(TestCase):
    """Test custom pagination class."""

    def test_pagination_settings(self):
        """Test pagination configuration."""
        pagination = SettingsPagination()
        self.assertEqual(pagination.page_size, 20)
        self.assertEqual(pagination.page_size_query_param, "page_size")
        self.assertEqual(pagination.max_page_size, 100)


class TestFeatureFlagViewSet(TestCase):
    """Test FeatureFlag ViewSet functionality."""

    def setUp(self):
        """Set up test data."""
        self.factory = APIRequestFactory()
        self.user = User.objects.create_user(email="test@example.com", password="testpass123")
        self.viewset = FeatureFlagViewSet()

        self.feature_flag = FeatureFlag.objects.create(
            key="test_flag",
            description="Test feature flag",
            scope_type=ScopeType.GLOBAL,
            enabled=True,
            created_by=self.user,
        )

    def test_queryset_configuration(self):
        """Test that queryset is properly configured."""
        self.assertEqual(list(self.viewset.get_queryset()), list(FeatureFlag.objects.all()))

    def test_filterset_fields(self):
        """Test filter fields configuration."""
        expected_fields = ["scope_type", "organisation", "project", "enabled"]
        self.assertEqual(self.viewset.filterset_fields, expected_fields)

    def test_search_fields(self):
        """Test search fields configuration."""
        expected_fields = ["key", "description"]
        self.assertEqual(self.viewset.search_fields, expected_fields)

    def test_perform_create(self):
        """Test perform_create sets created_by."""
        request = self.factory.post("/")
        request.user = self.user

        serializer = Mock()
        self.viewset.request = request
        self.viewset.perform_create(serializer)

        serializer.save.assert_called_once_with(created_by=self.user)

    def test_perform_create_unauthenticated(self):
        """Test perform_create with unauthenticated user."""
        request = self.factory.post("/")
        request.user = Mock()
        request.user.is_authenticated = False

        serializer = Mock()
        self.viewset.request = request
        self.viewset.perform_create(serializer)

        serializer.save.assert_called_once_with(created_by=None)

    def test_perform_update(self):
        """Test perform_update sets updated_by."""
        request = self.factory.patch("/")
        request.user = self.user

        serializer = Mock()
        self.viewset.request = request
        self.viewset.perform_update(serializer)

        serializer.save.assert_called_once_with(updated_by=self.user)

    def test_perform_update_unauthenticated(self):
        """Test perform_update with unauthenticated user."""
        request = self.factory.patch("/")
        request.user = Mock()
        request.user.is_authenticated = False

        serializer = Mock()
        self.viewset.request = request
        self.viewset.perform_update(serializer)

        serializer.save.assert_called_once_with(updated_by=None)

    @patch("settings.views.get_flag")
    def test_resolve_action_valid_key(self, mock_get_flag):
        """Test resolve action with valid flag key."""
        mock_get_flag.return_value = True

        request = self.factory.get("/resolve/test_flag/")
        request.user = self.user
        request.query_params = {}

        self.viewset.request = request
        response = self.viewset.resolve(request, key="test_flag")

        self.assertEqual(response.status_code, 200)
        mock_get_flag.assert_called_once_with(
            "test_flag", project_id=None, organisation_id=None, default=None
        )

    @patch("settings.views.get_flag")
    def test_resolve_action_not_found(self, mock_get_flag):
        """Test resolve action with non-existent flag."""
        mock_get_flag.return_value = None

        request = self.factory.get("/resolve/nonexistent/")
        request.user = self.user
        request.query_params = {}

        self.viewset.request = request
        response = self.viewset.resolve(request, key="nonexistent")

        self.assertEqual(response.status_code, 404)
        self.assertIn("Feature flag 'nonexistent' not found", response.data["error"])

    def test_resolve_action_invalid_project_id(self):
        """Test resolve action with invalid project_id parameter."""
        request = self.factory.get("/resolve/test_flag/?project_id=invalid")
        request.user = self.user
        request.query_params = {"project_id": "invalid"}

        self.viewset.request = request
        response = self.viewset.resolve(request, key="test_flag")

        self.assertEqual(response.status_code, 400)
        self.assertIn("project_id must be an integer", response.data["error"])

    def test_resolve_action_invalid_organisation_id(self):
        """Test resolve action with invalid organisation_id parameter."""
        request = self.factory.get("/resolve/test_flag/?organisation_id=invalid")
        request.user = self.user
        request.query_params = {"organisation_id": "invalid"}

        self.viewset.request = request
        response = self.viewset.resolve(request, key="test_flag")

        self.assertEqual(response.status_code, 400)
        self.assertIn("organisation_id must be an integer", response.data["error"])

    @patch("settings.views.get_flag")
    def test_resolve_action_with_valid_ids(self, mock_get_flag):
        """Test resolve action with valid project and organisation IDs."""
        mock_get_flag.return_value = True

        request = self.factory.get("/resolve/test_flag/?project_id=1&organisation_id=2")
        request.user = self.user
        request.query_params = {"project_id": "1", "organisation_id": "2"}

        self.viewset.request = request
        response = self.viewset.resolve(request, key="test_flag")

        self.assertEqual(response.status_code, 200)
        mock_get_flag.assert_called_once_with(
            "test_flag", project_id=1, organisation_id=2, default=None
        )

    @patch("settings.views.FeatureFlag.objects")
    @patch("settings.views.get_flag")
    def test_resolve_action_scope_detection_project(self, mock_get_flag, mock_objects):
        """Test resolve action correctly detects project scope."""
        mock_get_flag.return_value = True

        # Mock project-scoped flag exists
        mock_flag = Mock()
        mock_objects.filter.return_value.first.return_value = mock_flag

        request = self.factory.get("/resolve/test_flag/?project_id=1")
        request.user = self.user
        request.query_params = {"project_id": "1"}

        self.viewset.request = request
        response = self.viewset.resolve(request, key="test_flag")

        self.assertEqual(response.status_code, 200)
        # Should check project scope first
        mock_objects.filter.assert_called_with(key="test_flag", scope_type="PROJECT", project_id=1)


class TestSettingViewSet(TestCase):
    """Test Setting ViewSet functionality."""

    def setUp(self):
        """Set up test data."""
        self.factory = APIRequestFactory()
        self.user = User.objects.create_user(email="test@example.com", password="testpass123")
        self.viewset = SettingViewSet()

        self.setting = Setting.objects.create(
            key="test_setting",
            description="Test setting",
            scope_type=ScopeType.GLOBAL,
            value_type=SettingType.STRING,
            value="test_value",
            default_value="default_value",
            created_by=self.user,
        )

    def test_queryset_configuration(self):
        """Test that queryset is properly configured."""
        self.assertEqual(list(self.viewset.get_queryset()), list(Setting.objects.all()))

    def test_filterset_fields(self):
        """Test filter fields configuration."""
        expected_fields = ["scope_type", "organisation", "project", "value_type"]
        self.assertEqual(self.viewset.filterset_fields, expected_fields)

    def test_search_fields(self):
        """Test search fields configuration."""
        expected_fields = ["key", "description"]
        self.assertEqual(self.viewset.search_fields, expected_fields)

    def test_perform_create(self):
        """Test perform_create sets created_by."""
        request = self.factory.post("/")
        request.user = self.user

        serializer = Mock()
        self.viewset.request = request
        self.viewset.perform_create(serializer)

        serializer.save.assert_called_once_with(created_by=self.user)

    def test_perform_update(self):
        """Test perform_update sets updated_by."""
        request = self.factory.patch("/")
        request.user = self.user

        serializer = Mock()
        self.viewset.request = request
        self.viewset.perform_update(serializer)

        serializer.save.assert_called_once_with(updated_by=self.user)

    @patch("settings.views.get_setting")
    def test_resolve_action_valid_key(self, mock_get_setting):
        """Test resolve action with valid setting key."""
        mock_get_setting.return_value = "test_value"

        request = self.factory.get("/resolve/test_setting/")
        request.user = self.user
        request.query_params = {}

        self.viewset.request = request
        response = self.viewset.resolve(request, key="test_setting")

        self.assertEqual(response.status_code, 200)
        mock_get_setting.assert_called_once_with(
            "test_setting", project_id=None, organisation_id=None, default=None
        )

    @patch("settings.views.get_setting")
    def test_resolve_action_not_found(self, mock_get_setting):
        """Test resolve action with non-existent setting."""
        mock_get_setting.return_value = None

        request = self.factory.get("/resolve/nonexistent/")
        request.user = self.user
        request.query_params = {}

        self.viewset.request = request
        response = self.viewset.resolve(request, key="nonexistent")

        self.assertEqual(response.status_code, 404)
        self.assertIn("Setting 'nonexistent' not found", response.data["error"])

    def test_resolve_action_invalid_project_id(self):
        """Test resolve action with invalid project_id parameter."""
        request = self.factory.get("/resolve/test_setting/?project_id=invalid")
        request.user = self.user
        request.query_params = {"project_id": "invalid"}

        self.viewset.request = request
        response = self.viewset.resolve(request, key="test_setting")

        self.assertEqual(response.status_code, 400)
        self.assertIn("project_id must be an integer", response.data["error"])

    def test_resolve_action_invalid_organisation_id(self):
        """Test resolve action with invalid organisation_id parameter."""
        request = self.factory.get("/resolve/test_setting/?organisation_id=invalid")
        request.user = self.user
        request.query_params = {"organisation_id": "invalid"}

        self.viewset.request = request
        response = self.viewset.resolve(request, key="test_setting")

        self.assertEqual(response.status_code, 400)
        self.assertIn("organisation_id must be an integer", response.data["error"])

    @patch("settings.views.get_setting")
    def test_resolve_action_with_valid_ids(self, mock_get_setting):
        """Test resolve action with valid project and organisation IDs."""
        mock_get_setting.return_value = "resolved_value"

        request = self.factory.get("/resolve/test_setting/?project_id=1&organisation_id=2")
        request.user = self.user
        request.query_params = {"project_id": "1", "organisation_id": "2"}

        self.viewset.request = request
        response = self.viewset.resolve(request, key="test_setting")

        self.assertEqual(response.status_code, 200)
        mock_get_setting.assert_called_once_with(
            "test_setting", project_id=1, organisation_id=2, default=None
        )

    @patch("settings.views.Setting.objects")
    @patch("settings.views.get_setting")
    def test_resolve_action_scope_detection_organisation(self, mock_get_setting, mock_objects):
        """Test resolve action correctly detects organisation scope."""
        mock_get_setting.return_value = "org_value"

        # Mock no project scope, but organisation scope exists
        mock_objects.filter.side_effect = [
            Mock(first=Mock(return_value=None)),  # No project match
            Mock(first=Mock(return_value=Mock())),  # Organisation match
        ]

        request = self.factory.get("/resolve/test_setting/?organisation_id=2")
        request.user = self.user
        request.query_params = {"organisation_id": "2"}

        self.viewset.request = request
        response = self.viewset.resolve(request, key="test_setting")

        self.assertEqual(response.status_code, 200)
        # Should check organisation scope after project scope fails
        self.assertEqual(mock_objects.filter.call_count, 2)

    @patch("settings.views.Setting.objects")
    @patch("settings.views.get_setting")
    def test_resolve_action_scope_detection_global(self, mock_get_setting, mock_objects):
        """Test resolve action falls back to global scope."""
        mock_get_setting.return_value = "global_value"

        # Mock no project or org scope, but global scope exists
        mock_objects.filter.side_effect = [
            Mock(first=Mock(return_value=None)),  # No project match
            Mock(first=Mock(return_value=None)),  # No org match
            Mock(first=Mock(return_value=Mock())),  # Global match
        ]

        request = self.factory.get("/resolve/test_setting/")
        request.user = self.user
        request.query_params = {}

        self.viewset.request = request
        response = self.viewset.resolve(request, key="test_setting")

        self.assertEqual(response.status_code, 200)
        # Should check all scopes
        self.assertEqual(mock_objects.filter.call_count, 1)  # Only global check without IDs


class TestViewSetIntegration(APITestCase):
    """Integration tests for ViewSet functionality without external dependencies."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(email="test@example.com", password="testpass123")
        self.client.force_authenticate(user=self.user)

    @patch("settings.views.ScopeAwarePermission.has_permission", return_value=True)
    @patch("settings.views.ScopeAwarePermission.has_object_permission", return_value=True)
    def test_feature_flag_viewset_class_attributes(self, mock_obj_perm, mock_perm):
        """Test FeatureFlagViewSet class attributes are properly configured."""
        viewset = FeatureFlagViewSet()

        # Test class attributes
        self.assertEqual(viewset.pagination_class, SettingsPagination)
        self.assertIn("key", viewset.search_fields)
        self.assertIn("scope_type", viewset.filterset_fields)

    @patch("settings.views.ScopeAwarePermission.has_permission", return_value=True)
    @patch("settings.views.ScopeAwarePermission.has_object_permission", return_value=True)
    def test_setting_viewset_class_attributes(self, mock_obj_perm, mock_perm):
        """Test SettingViewSet class attributes are properly configured."""
        viewset = SettingViewSet()

        # Test class attributes
        self.assertEqual(viewset.pagination_class, SettingsPagination)
        self.assertIn("key", viewset.search_fields)
        self.assertIn("value_type", viewset.filterset_fields)
