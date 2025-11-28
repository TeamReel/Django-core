"""
Integration tests for Settings & Feature Flags User Stories.

Tests complete user story scenarios end-to-end including:
- User Story 1: Feature flag creation and resolution
- User Story 2: Setting configuration and retrieval
- User Story 3: Scope hierarchy behavior
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from organisations.models import Organisation
from projects.models import Project

from src.settings.api import get_flag, get_setting
from src.settings.models import FeatureFlag, ScopeType, Setting, SettingType

User = get_user_model()


class UserStory1FeatureFlagLifecycle(TestCase):
    """
    User Story 1: Feature Flag Management

    As a product manager, I want to create feature flags with different scopes
    so that I can control feature rollouts at global, organisation, and project levels.
    """

    def setUp(self):
        """Set up complete user story test environment."""
        self.user = User.objects.create_user(email="pm@example.com", password="pmpass123")
        self.organisation = Organisation.objects.create(
            name="Example Corp", slug="example-corp", creator=self.user
        )
        self.project_alpha = Project.objects.create(
            name="Project Alpha",
            slug="project-alpha",
            organisation=self.organisation,
            creator=self.user,
        )
        self.project_beta = Project.objects.create(
            name="Project Beta",
            slug="project-beta",
            organisation=self.organisation,
            creator=self.user,
        )

    def test_create_and_query_global_flag(self):
        """Test creating and querying a global feature flag."""
        # Step 1: Create global flag enabled
        flag = FeatureFlag.objects.create(
            key="new_dashboard",
            description="Enable new dashboard interface",
            scope_type=ScopeType.GLOBAL,
            enabled=True,
            created_by=self.user,
        )

        # Step 2: Query flag using API
        result = get_flag("new_dashboard")
        self.assertTrue(result)

        # Step 3: Verify database state
        flag.refresh_from_db()
        self.assertTrue(flag.enabled)

    def test_create_organisation_scoped_flag(self):
        """Test creating organisation-scoped feature flag."""
        FeatureFlag.objects.create(
            key="org_feature",
            description="Organisation-specific feature",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
            enabled=True,
            created_by=self.user,
        )

        # Query with organisation scope
        result = get_flag("org_feature", organisation_id=self.organisation.id)
        self.assertTrue(result)

    def test_create_project_scoped_flag(self):
        """Test creating project-scoped feature flag."""
        FeatureFlag.objects.create(
            key="project_feature",
            description="Project-specific feature",
            scope_type=ScopeType.PROJECT,
            organisation=self.organisation,
            project=self.project_alpha,
            enabled=True,
            created_by=self.user,
        )

        # Query with project scope
        result = get_flag(
            "project_feature",
            organisation_id=self.organisation.id,
            project_id=self.project_alpha.id,
        )
        self.assertTrue(result)

    def test_complete_flag_lifecycle(self):
        """Test complete lifecycle: create, update, delete."""
        # Create
        flag = FeatureFlag.objects.create(
            key="lifecycle_test",
            description="Lifecycle test flag",
            scope_type=ScopeType.GLOBAL,
            enabled=False,
            created_by=self.user,
        )
        self.assertFalse(flag.enabled)

        # Update
        flag.enabled = True
        flag.description = "Updated description"
        flag.save()

        flag.refresh_from_db()
        self.assertTrue(flag.enabled)
        self.assertEqual(flag.description, "Updated description")

        # Delete
        flag_id = flag.id
        flag.delete()
        self.assertFalse(FeatureFlag.objects.filter(id=flag_id).exists())


class UserStory2SettingManagement(TestCase):
    """
    User Story 2: Setting Management

    As a system administrator, I want to manage typed settings
    so that I can configure application behavior.
    """

    def setUp(self):
        """Set up test environment."""
        self.user = User.objects.create_user(email="admin@example.com", password="adminpass123")
        self.organisation = Organisation.objects.create(
            name="Example Corp", slug="example-corp", creator=self.user
        )
        self.project = Project.objects.create(
            name="Test Project",
            slug="test-project",
            organisation=self.organisation,
            creator=self.user,
        )

    def test_create_string_setting(self):
        """Test creating and querying string setting."""
        Setting.objects.create(
            key="api_url",
            value="https://api.example.com",
            value_type=SettingType.STRING,
            default_value="https://default.api.com",
            scope_type=ScopeType.GLOBAL,
            created_by=self.user,
        )

        result = get_setting("api_url")
        self.assertEqual(result, "https://api.example.com")

    def test_create_integer_setting(self):
        """Test creating and querying integer setting."""
        Setting.objects.create(
            key="max_retries",
            value=5,
            value_type=SettingType.INTEGER,
            default_value=3,
            scope_type=ScopeType.GLOBAL,
            created_by=self.user,
        )

        result = get_setting("max_retries")
        self.assertEqual(result, 5)

    def test_create_boolean_setting(self):
        """Test creating and querying boolean setting."""
        Setting.objects.create(
            key="debug_mode",
            value=True,
            value_type=SettingType.BOOLEAN,
            default_value=False,
            scope_type=ScopeType.GLOBAL,
            created_by=self.user,
        )

        result = get_setting("debug_mode")
        self.assertTrue(result)

    def test_create_json_setting(self):
        """Test creating and querying JSON setting."""
        config = {"timeout": 30, "retries": 3, "options": ["a", "b"]}
        Setting.objects.create(
            key="app_config",
            value=config,
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.GLOBAL,
            created_by=self.user,
        )

        result = get_setting("app_config")
        self.assertEqual(result, config)

    def test_setting_with_organisation_scope(self):
        """Test setting with organisation scope."""
        Setting.objects.create(
            key="org_config",
            value={"org_specific": True},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
            created_by=self.user,
        )

        result = get_setting("org_config", organisation_id=self.organisation.id)
        self.assertEqual(result, {"org_specific": True})

    def test_setting_with_project_scope(self):
        """Test setting with project scope."""
        Setting.objects.create(
            key="project_config",
            value="project_value",
            value_type=SettingType.STRING,
            default_value="default",
            scope_type=ScopeType.PROJECT,
            organisation=self.organisation,
            project=self.project,
            created_by=self.user,
        )

        result = get_setting(
            "project_config",
            organisation_id=self.organisation.id,
            project_id=self.project.id,
        )
        self.assertEqual(result, "project_value")


class UserStory3ScopeHierarchy(TestCase):
    """
    User Story 3: Scope Hierarchy Behavior

    As a developer, I want flags and settings to respect scope hierarchy
    so that more specific scopes override less specific ones.
    """

    def setUp(self):
        """Set up test environment."""
        self.user = User.objects.create_user(email="dev@example.com", password="devpass123")
        self.organisation = Organisation.objects.create(
            name="Test Org", slug="test-org", creator=self.user
        )
        self.project = Project.objects.create(
            name="Test Project",
            slug="test-project",
            organisation=self.organisation,
            creator=self.user,
        )

    def test_flag_hierarchy_global_only(self):
        """Test flag resolution with only global flag."""
        FeatureFlag.objects.create(
            key="hierarchy_test",
            scope_type=ScopeType.GLOBAL,
            enabled=True,
            created_by=self.user,
        )

        # Global query
        self.assertTrue(get_flag("hierarchy_test"))

        # Org query falls back to global
        self.assertTrue(get_flag("hierarchy_test", organisation_id=self.organisation.id))

        # Project query falls back to global
        self.assertTrue(
            get_flag(
                "hierarchy_test",
                organisation_id=self.organisation.id,
                project_id=self.project.id,
            )
        )

    def test_flag_hierarchy_org_overrides_global(self):
        """Test org flag is used when querying with organisation scope."""
        # Create separate flags at different scopes
        FeatureFlag.objects.create(
            key="org_override_global",
            scope_type=ScopeType.GLOBAL,
            enabled=False,
            created_by=self.user,
        )

        FeatureFlag.objects.create(
            key="org_override_org",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
            enabled=True,
            created_by=self.user,
        )

        # Global query returns global value
        self.assertFalse(get_flag("org_override_global"))

        # Org query for org-specific flag returns org value
        self.assertTrue(get_flag("org_override_org", organisation_id=self.organisation.id))

    def test_flag_hierarchy_project_overrides_org(self):
        """Test project flag is used when querying with project scope."""
        # Create org flag
        FeatureFlag.objects.create(
            key="project_override_org",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
            enabled=True,
            created_by=self.user,
        )

        # Create project flag with different key
        FeatureFlag.objects.create(
            key="project_override_project",
            scope_type=ScopeType.PROJECT,
            organisation=self.organisation,
            project=self.project,
            enabled=False,
            created_by=self.user,
        )

        # Org query returns org value
        self.assertTrue(get_flag("project_override_org", organisation_id=self.organisation.id))

        # Project query for project-specific flag returns project value
        self.assertFalse(
            get_flag(
                "project_override_project",
                organisation_id=self.organisation.id,
                project_id=self.project.id,
            )
        )

    def test_nonexistent_flag_returns_false(self):
        """Test querying nonexistent flag returns False."""
        result = get_flag("nonexistent_flag")
        self.assertFalse(result)

    def test_nonexistent_setting_returns_none(self):
        """Test querying nonexistent setting returns None."""
        result = get_setting("nonexistent_setting")
        self.assertIsNone(result)


class UserStory4MultiOrganisationIsolation(TestCase):
    """
    User Story 4: Multi-Organisation Isolation

    As a platform operator, I want organisation-scoped flags and settings
    to be isolated between organisations.
    """

    def setUp(self):
        """Set up test environment with multiple organisations."""
        self.user = User.objects.create_user(email="test@example.com", password="testpass123")
        self.org_a = Organisation.objects.create(name="Org A", slug="org-a", creator=self.user)
        self.org_b = Organisation.objects.create(name="Org B", slug="org-b", creator=self.user)

    def test_org_flags_isolated(self):
        """Test that org flags are isolated between organisations."""
        # Create flag for Org A only
        FeatureFlag.objects.create(
            key="org_feature",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.org_a,
            enabled=True,
            created_by=self.user,
        )

        # Org A should see True
        self.assertTrue(get_flag("org_feature", organisation_id=self.org_a.id))

        # Org B should see False (flag doesn't exist for them)
        self.assertFalse(get_flag("org_feature", organisation_id=self.org_b.id))

    def test_org_settings_isolated(self):
        """Test that org settings are isolated between organisations."""
        # Create setting for Org A
        Setting.objects.create(
            key="org_setting",
            value="org_a_value",
            value_type=SettingType.STRING,
            default_value="default",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.org_a,
            created_by=self.user,
        )

        # Create different setting for Org B
        Setting.objects.create(
            key="org_setting",
            value="org_b_value",
            value_type=SettingType.STRING,
            default_value="default",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.org_b,
            created_by=self.user,
        )

        # Each org should see their own value
        self.assertEqual(get_setting("org_setting", organisation_id=self.org_a.id), "org_a_value")
        self.assertEqual(get_setting("org_setting", organisation_id=self.org_b.id), "org_b_value")
