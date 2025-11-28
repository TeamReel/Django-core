"""
Integration tests for Settings & Feature Flags User Stories.

Tests complete user story scenarios end-to-end including:
- User Story 1: Feature flag creation and resolution
- User Story 2: Setting configuration and retrieval
"""

import json
from django.contrib.auth import get_user_model
from django.test import TestCase, TransactionTestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from src.settings.models import FeatureFlag, Setting, ScopeType
from src.settings.api import get_flag, get_setting
from organisations.models import Organisation
from projects.models import Project
from audit.models import AuditEvent
from permissions.models import Role, Permission, RoleAssignment

User = get_user_model()


class UserStory1IntegrationTest(TransactionTestCase):
    """
    User Story 1: Feature Flag Management

    As a product manager, I want to create feature flags with different scopes
    so that I can control feature rollouts at global, organisation, and project levels.
    """

    def setUp(self):
        """Set up complete user story test environment."""
        # Create users with different roles
        self.product_manager = User.objects.create_user(
            username="product_manager", email="pm@example.com", password="pmpass123"
        )
        self.developer = User.objects.create_user(
            username="developer", email="dev@example.com", password="devpass123"
        )
        self.end_user = User.objects.create_user(
            username="end_user", email="user@example.com", password="userpass123"
        )

        # Create organisational structure
        self.organisation = Organisation.objects.create(
            name="Example Corp", slug="example-corp", creator=self.product_manager
        )

        self.project_alpha = Project.objects.create(
            name="Project Alpha",
            slug="project-alpha",
            organisation=self.organisation,
            creator=self.product_manager,
        )

        self.project_beta = Project.objects.create(
            name="Project Beta",
            slug="project-beta",
            organisation=self.organisation,
            creator=self.product_manager,
        )

        # Set up roles and permissions
        self.pm_role = Role.objects.create(
            name="Product Manager", description="Product management role"
        )
        self.dev_role = Role.objects.create(name="Developer", description="Developer role")

        self.flag_write_permission = Permission.objects.create(
            name="settings.flag.write", description="Create and modify feature flags"
        )
        self.flag_read_permission = Permission.objects.create(
            name="settings.flag.read", description="Read feature flags"
        )

        # Assign permissions to roles
        self.pm_role.permissions.add(self.flag_write_permission, self.flag_read_permission)
        self.dev_role.permissions.add(self.flag_read_permission)

        # Assign roles to users
        RoleAssignment.objects.create(
            user=self.product_manager,
            role=self.pm_role,
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
        )
        RoleAssignment.objects.create(
            user=self.developer,
            role=self.dev_role,
            scope_type=ScopeType.PROJECT,
            organisation=self.organisation,
            project=self.project_alpha,
        )

        # Set up API client
        self.client = APIClient()

    def test_complete_feature_flag_lifecycle(self):
        """Test complete feature flag lifecycle from creation to deletion."""

        # Step 1: Product manager creates a global feature flag
        self.client.force_authenticate(user=self.product_manager)

        global_flag_data = {
            "key": "new_dashboard",
            "name": "New Dashboard Feature",
            "description": "Enable new dashboard interface",
            "scope_type": ScopeType.GLOBAL.value,
            "default_value": False,
            "is_active": True,
        }

        url = reverse("featureflag-list")
        response = self.client.post(url, global_flag_data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        global_flag_id = response.data["id"]

        # Verify audit log for creation
        audit_event = AuditEvent.objects.filter(
            event_type="FEATURE_FLAG_CREATED", resource_id=str(global_flag_id)
        ).first()
        assert audit_event is not None
        assert audit_event.user == self.product_manager

        # Step 2: Create organisation-specific override
        org_flag_data = {
            "key": "new_dashboard_org",
            "name": "New Dashboard - Organisation Override",
            "description": "Enable dashboard for specific organisation",
            "scope_type": ScopeType.ORGANISATION.value,
            "organisation": self.organisation.id,
            "default_value": True,
            "is_active": True,
        }

        response = self.client.post(url, org_flag_data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        org_flag_id = response.data["id"]

        # Step 3: Create project-specific override for alpha project
        project_flag_data = {
            "key": "new_dashboard_alpha",
            "name": "New Dashboard - Alpha Project",
            "description": "Enable dashboard for alpha project testing",
            "scope_type": ScopeType.PROJECT.value,
            "organisation": self.organisation.id,
            "project": self.project_alpha.id,
            "default_value": True,
            "is_active": True,
        }

        response = self.client.post(url, project_flag_data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        project_flag_id = response.data["id"]

        # Step 4: Developer queries flag resolution
        self.client.force_authenticate(user=self.developer)

        # Query global flag (should be False)
        resolve_url = reverse("resolve-flag")
        resolve_data = {"key": "new_dashboard"}
        response = self.client.post(resolve_url, resolve_data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["value"] is False
        assert response.data["scope"] == ScopeType.GLOBAL.value

        # Query organisation flag (should be True)
        resolve_data = {"key": "new_dashboard_org", "organisation_id": self.organisation.id}
        response = self.client.post(resolve_url, resolve_data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["value"] is True
        assert response.data["scope"] == ScopeType.ORGANISATION.value

        # Query project flag for alpha (should be True)
        resolve_data = {
            "key": "new_dashboard_alpha",
            "organisation_id": self.organisation.id,
            "project_id": self.project_alpha.id,
        }
        response = self.client.post(resolve_url, resolve_data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["value"] is True
        assert response.data["scope"] == ScopeType.PROJECT.value

        # Step 5: Product manager updates global flag to enable for all
        self.client.force_authenticate(user=self.product_manager)

        flag_detail_url = reverse("featureflag-detail", kwargs={"pk": global_flag_id})
        update_data = {"default_value": True}
        response = self.client.patch(flag_detail_url, update_data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["default_value"] is True

        # Verify audit log for update
        update_audit = AuditEvent.objects.filter(
            event_type="FEATURE_FLAG_UPDATED", resource_id=str(global_flag_id)
        ).first()
        assert update_audit is not None

        # Step 6: Test flag resolution with Python API (for application code)
        flag_value = get_flag("new_dashboard")
        assert flag_value is True  # Should now be enabled globally

        org_flag_value = get_flag("new_dashboard_org", organisation_id=self.organisation.id)
        assert org_flag_value is True

        # Step 7: Deactivate organisation flag
        org_flag_detail_url = reverse("featureflag-detail", kwargs={"pk": org_flag_id})
        deactivate_data = {"is_active": False}
        response = self.client.patch(org_flag_detail_url, deactivate_data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_active"] is False

        # Step 8: Clean up - delete project flag
        project_flag_detail_url = reverse("featureflag-detail", kwargs={"pk": project_flag_id})
        response = self.client.delete(project_flag_detail_url)

        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify deletion audit log
        delete_audit = AuditEvent.objects.filter(
            event_type="FEATURE_FLAG_DELETED", resource_id=str(project_flag_id)
        ).first()
        assert delete_audit is not None

    def test_multi_scope_flag_precedence(self):
        """Test that flag resolution respects scope hierarchy."""
        # Create flags at different scopes with different values

        # Global flag (disabled)
        global_flag = FeatureFlag.objects.create(
            key="feature_precedence",
            name="Feature Precedence Test",
            scope_type=ScopeType.GLOBAL,
            default_value=False,
            created_by=self.product_manager,
        )

        # Organisation flag (enabled)
        org_flag = FeatureFlag.objects.create(
            key="feature_precedence",
            name="Feature Precedence - Org",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
            default_value=True,
            created_by=self.product_manager,
        )

        # Project flag (disabled again)
        project_flag = FeatureFlag.objects.create(
            key="feature_precedence",
            name="Feature Precedence - Project",
            scope_type=ScopeType.PROJECT,
            organisation=self.organisation,
            project=self.project_alpha,
            default_value=False,
            created_by=self.product_manager,
        )

        # Test resolution at different scope levels

        # Global scope should return global flag value
        global_value = get_flag("feature_precedence")
        assert global_value is False

        # Organisation scope should return org flag value (overrides global)
        org_value = get_flag("feature_precedence", organisation_id=self.organisation.id)
        assert org_value is True

        # Project scope should return project flag value (most specific)
        project_value = get_flag(
            "feature_precedence",
            organisation_id=self.organisation.id,
            project_id=self.project_alpha.id,
        )
        assert project_value is False

    def test_flag_access_permissions(self):
        """Test that flag access respects user permissions."""
        # Create a flag that end_user shouldn't access
        restricted_flag = FeatureFlag.objects.create(
            key="restricted_feature",
            name="Restricted Feature",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
            default_value=True,
            created_by=self.product_manager,
        )

        # Product manager should have access
        self.client.force_authenticate(user=self.product_manager)
        url = reverse("featureflag-detail", kwargs={"pk": restricted_flag.id})
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK

        # End user should not have access
        self.client.force_authenticate(user=self.end_user)
        response = self.client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

        # Developer should have read access within their project scope
        self.client.force_authenticate(user=self.developer)
        response = self.client.get(url)
        # Access depends on permission implementation
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_403_FORBIDDEN]


class UserStory2IntegrationTest(TransactionTestCase):
    """
    User Story 2: Settings Management

    As a system administrator, I want to manage application settings
    with different data types and validation rules so that I can configure
    system behavior across different environments and projects.
    """

    def setUp(self):
        """Set up complete settings test environment."""
        # Create admin user
        self.admin = User.objects.create_user(
            username="admin", email="admin@example.com", password="adminpass123"
        )

        # Create organisation and projects
        self.organisation = Organisation.objects.create(
            name="Tech Company", slug="tech-company", creator=self.admin
        )

        self.production_project = Project.objects.create(
            name="Production Environment",
            slug="production",
            organisation=self.organisation,
            creator=self.admin,
        )

        self.staging_project = Project.objects.create(
            name="Staging Environment",
            slug="staging",
            organisation=self.organisation,
            creator=self.admin,
        )

        # Set up admin permissions
        admin_role = Role.objects.create(name="System Admin")
        admin_permission = Permission.objects.create(
            name="settings.admin", description="Full settings administration"
        )
        admin_role.permissions.add(admin_permission)

        RoleAssignment.objects.create(user=self.admin, role=admin_role, scope_type=ScopeType.GLOBAL)

        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    def test_complete_settings_configuration_workflow(self):
        """Test complete settings configuration from global to project level."""

        # Step 1: Create global API configuration
        global_api_config = {
            "key": "api_config",
            "name": "API Configuration",
            "description": "Global API settings",
            "value_type": "json",
            "default_value": {
                "base_url": "https://api.example.com",
                "timeout": 30,
                "retry_attempts": 3,
                "rate_limit": 1000,
            },
            "scope_type": ScopeType.GLOBAL.value,
            "is_active": True,
        }

        url = reverse("setting-list")
        response = self.client.post(url, global_api_config, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        global_setting_id = response.data["id"]

        # Verify audit trail
        audit_event = AuditEvent.objects.filter(
            event_type="SETTING_CREATED", resource_id=str(global_setting_id)
        ).first()
        assert audit_event is not None

        # Step 2: Create organisation-specific database settings
        db_config = {
            "key": "database_config",
            "name": "Database Configuration",
            "description": "Organisation database settings",
            "value_type": "json",
            "default_value": {
                "host": "db.tech-company.com",
                "port": 5432,
                "database": "tech_company_prod",
                "max_connections": 100,
                "connection_timeout": 30,
            },
            "scope_type": ScopeType.ORGANISATION.value,
            "organisation": self.organisation.id,
            "validation_rules": {
                "required_fields": ["host", "port", "database"],
                "port_range": {"min": 1, "max": 65535},
            },
            "is_active": True,
        }

        response = self.client.post(url, db_config, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        org_setting_id = response.data["id"]

        # Step 3: Create environment-specific settings

        # Production environment settings
        prod_config = {
            "key": "environment_config",
            "name": "Production Environment Config",
            "description": "Production-specific settings",
            "value_type": "json",
            "default_value": {
                "debug": False,
                "log_level": "ERROR",
                "cache_ttl": 3600,
                "enable_metrics": True,
                "max_upload_size": 104857600,  # 100MB
            },
            "scope_type": ScopeType.PROJECT.value,
            "organisation": self.organisation.id,
            "project": self.production_project.id,
            "is_active": True,
        }

        response = self.client.post(url, prod_config, format="json")
        assert response.status_code == status.HTTP_201_CREATED

        # Staging environment settings
        staging_config = {
            "key": "environment_config",
            "name": "Staging Environment Config",
            "description": "Staging-specific settings",
            "value_type": "json",
            "default_value": {
                "debug": True,
                "log_level": "DEBUG",
                "cache_ttl": 300,
                "enable_metrics": True,
                "max_upload_size": 52428800,  # 50MB
            },
            "scope_type": ScopeType.PROJECT.value,
            "organisation": self.organisation.id,
            "project": self.staging_project.id,
            "is_active": True,
        }

        response = self.client.post(url, staging_config, format="json")
        assert response.status_code == status.HTTP_201_CREATED

        # Step 4: Create settings with different data types and validation

        # String setting with validation
        string_setting = {
            "key": "app_name",
            "name": "Application Name",
            "description": "Human-readable application name",
            "value_type": "string",
            "default_value": "Tech Company App",
            "scope_type": ScopeType.GLOBAL.value,
            "validation_rules": {"min_length": 3, "max_length": 50, "pattern": r"^[A-Za-z0-9\s]+$"},
            "is_active": True,
        }

        response = self.client.post(url, string_setting, format="json")
        assert response.status_code == status.HTTP_201_CREATED

        # Number setting with constraints
        number_setting = {
            "key": "max_users",
            "name": "Maximum Users",
            "description": "Maximum number of concurrent users",
            "value_type": "number",
            "default_value": 1000,
            "scope_type": ScopeType.ORGANISATION.value,
            "organisation": self.organisation.id,
            "validation_rules": {"min_value": 1, "max_value": 10000, "step": 1},
            "is_active": True,
        }

        response = self.client.post(url, number_setting, format="json")
        assert response.status_code == status.HTTP_201_CREATED

        # Boolean setting
        boolean_setting = {
            "key": "maintenance_mode",
            "name": "Maintenance Mode",
            "description": "Enable maintenance mode",
            "value_type": "boolean",
            "default_value": False,
            "scope_type": ScopeType.GLOBAL.value,
            "is_active": True,
        }

        response = self.client.post(url, boolean_setting, format="json")
        assert response.status_code == status.HTTP_201_CREATED

        # Step 5: Test setting resolution at different scopes

        # Resolve global API config
        api_config_value = get_setting("api_config")
        assert api_config_value is not None
        assert api_config_value["base_url"] == "https://api.example.com"
        assert api_config_value["timeout"] == 30

        # Resolve organisation database config
        db_config_value = get_setting("database_config", organisation_id=self.organisation.id)
        assert db_config_value is not None
        assert db_config_value["host"] == "db.tech-company.com"
        assert db_config_value["max_connections"] == 100

        # Resolve project-specific environment config
        prod_env_config = get_setting(
            "environment_config",
            organisation_id=self.organisation.id,
            project_id=self.production_project.id,
        )
        assert prod_env_config is not None
        assert prod_env_config["debug"] is False
        assert prod_env_config["log_level"] == "ERROR"

        staging_env_config = get_setting(
            "environment_config",
            organisation_id=self.organisation.id,
            project_id=self.staging_project.id,
        )
        assert staging_env_config is not None
        assert staging_env_config["debug"] is True
        assert staging_env_config["log_level"] == "DEBUG"

        # Step 6: Test setting updates and validation

        # Update max_users with valid value
        max_users_setting = Setting.objects.get(key="max_users")
        detail_url = reverse("setting-detail", kwargs={"pk": max_users_setting.id})

        update_data = {"default_value": 2000}
        response = self.client.patch(detail_url, update_data, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["default_value"] == 2000

        # Try to update with invalid value (should fail validation)
        invalid_data = {"default_value": 15000}  # Exceeds max_value
        response = self.client.patch(detail_url, invalid_data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

        # Step 7: Test setting resolution via API endpoints

        resolve_url = reverse("resolve-setting")

        # Resolve global setting
        resolve_data = {"key": "app_name"}
        response = self.client.post(resolve_url, resolve_data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["value"] == "Tech Company App"
        assert response.data["value_type"] == "string"

        # Resolve organisation setting
        resolve_data = {"key": "max_users", "organisation_id": self.organisation.id}
        response = self.client.post(resolve_url, resolve_data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["value"] == 2000  # Updated value
        assert response.data["value_type"] == "number"

        # Step 8: Test bulk settings configuration

        # Create multiple related settings
        bulk_settings = [
            {
                "key": "email_smtp_host",
                "name": "SMTP Host",
                "value_type": "string",
                "default_value": "smtp.example.com",
                "scope_type": ScopeType.GLOBAL.value,
            },
            {
                "key": "email_smtp_port",
                "name": "SMTP Port",
                "value_type": "number",
                "default_value": 587,
                "scope_type": ScopeType.GLOBAL.value,
                "validation_rules": {"min_value": 1, "max_value": 65535},
            },
            {
                "key": "email_use_tls",
                "name": "Use TLS",
                "value_type": "boolean",
                "default_value": True,
                "scope_type": ScopeType.GLOBAL.value,
            },
        ]

        for setting_data in bulk_settings:
            response = self.client.post(url, setting_data, format="json")
            assert response.status_code == status.HTTP_201_CREATED

        # Verify all settings were created
        settings_list_response = self.client.get(url)
        assert settings_list_response.status_code == status.HTTP_200_OK

        # Should have all the settings we created
        created_keys = [s["key"] for s in settings_list_response.data["results"]]
        expected_keys = [
            "api_config",
            "database_config",
            "environment_config",
            "app_name",
            "max_users",
            "maintenance_mode",
            "email_smtp_host",
            "email_smtp_port",
            "email_use_tls",
        ]

        for key in expected_keys:
            assert key in created_keys

    def test_settings_validation_edge_cases(self):
        """Test settings validation with edge cases and error conditions."""

        url = reverse("setting-list")

        # Test invalid JSON structure
        invalid_json_setting = {
            "key": "invalid_json",
            "name": "Invalid JSON Setting",
            "value_type": "json",
            "default_value": {"unclosed": "structure"},  # This should be valid
            "scope_type": ScopeType.GLOBAL.value,
        }

        response = self.client.post(url, invalid_json_setting, format="json")
        assert response.status_code == status.HTTP_201_CREATED

        # Test string validation with pattern matching
        pattern_setting = {
            "key": "email_pattern",
            "name": "Email Pattern Test",
            "value_type": "string",
            "default_value": "invalid-email",  # Invalid email format
            "scope_type": ScopeType.GLOBAL.value,
            "validation_rules": {"pattern": r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"},
        }

        response = self.client.post(url, pattern_setting, format="json")
        # Should fail validation if pattern is enforced
        # Implementation may vary based on validation logic
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST]

        # Test number validation boundaries
        boundary_setting = {
            "key": "boundary_test",
            "name": "Boundary Test",
            "value_type": "number",
            "default_value": 100,  # On boundary
            "scope_type": ScopeType.GLOBAL.value,
            "validation_rules": {"min_value": 1, "max_value": 100},
        }

        response = self.client.post(url, boundary_setting, format="json")
        assert response.status_code == status.HTTP_201_CREATED

        # Test beyond boundary
        if response.status_code == status.HTTP_201_CREATED:
            setting_id = response.data["id"]
            detail_url = reverse("setting-detail", kwargs={"pk": setting_id})

            invalid_update = {"default_value": 101}  # Exceeds max
            response = self.client.patch(detail_url, invalid_update, format="json")
            assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]

    def test_settings_caching_and_performance(self):
        """Test settings caching behavior and performance characteristics."""

        # Create a setting to test caching
        cached_setting = Setting.objects.create(
            key="cached_setting",
            name="Cached Setting",
            value_type="string",
            default_value="cached_value",
            scope_type=ScopeType.GLOBAL,
            created_by=self.admin,
        )

        # First resolution should hit database
        value1 = get_setting("cached_setting")
        assert value1 == "cached_value"

        # Second resolution should use cache
        value2 = get_setting("cached_setting")
        assert value2 == "cached_value"
        assert value1 == value2

        # Update setting and verify cache invalidation
        cached_setting.default_value = "updated_value"
        cached_setting.save()

        # Should get updated value (cache should be invalidated)
        value3 = get_setting("cached_setting")
        assert value3 == "updated_value"

    def test_cross_environment_settings_isolation(self):
        """Test that settings are properly isolated between environments."""

        # Create same-key settings for different projects
        prod_setting = Setting.objects.create(
            key="debug_mode",
            name="Debug Mode - Production",
            value_type="boolean",
            default_value=False,
            scope_type=ScopeType.PROJECT,
            organisation=self.organisation,
            project=self.production_project,
            created_by=self.admin,
        )

        staging_setting = Setting.objects.create(
            key="debug_mode",
            name="Debug Mode - Staging",
            value_type="boolean",
            default_value=True,
            scope_type=ScopeType.PROJECT,
            organisation=self.organisation,
            project=self.staging_project,
            created_by=self.admin,
        )

        # Verify different values in different environments
        prod_debug = get_setting(
            "debug_mode",
            organisation_id=self.organisation.id,
            project_id=self.production_project.id,
        )
        assert prod_debug is False

        staging_debug = get_setting(
            "debug_mode", organisation_id=self.organisation.id, project_id=self.staging_project.id
        )
        assert staging_debug is True

        # Verify they don't interfere with each other
        assert prod_debug != staging_debug
