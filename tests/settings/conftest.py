"""
Pytest fixtures and configuration for settings app tests.

Provides shared fixtures for database factories, mock Redis client,
permission system setup, and test client configurations.
"""

from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth import get_user_model
from src.organisations.models import Organisation
from permissions.models import Permission, Role, RoleAssignment, ScopeChoices
from src.projects.models import Project
from rest_framework.test import APIClient

from src.settings.models import FeatureFlag, ScopeType, Setting, SettingType

User = get_user_model()


@pytest.fixture
def mock_redis():
    """Mock Redis client for cache testing."""
    with patch("src.settings.cache.redis_client") as mock_client:
        mock_redis = MagicMock()
        mock_client.return_value = mock_redis

        # Mock Redis methods
        mock_redis.get.return_value = None
        mock_redis.set.return_value = True
        mock_redis.delete.return_value = True
        mock_redis.publish.return_value = True
        mock_redis.ping.return_value = True

        yield mock_redis


@pytest.fixture
def test_user(db):
    """Create a test user."""
    return User.objects.create_user(email="testuser@example.com", password="testpass123")


@pytest.fixture
def superuser(db):
    """Create a superuser for testing admin permissions."""
    return User.objects.create_superuser(email="admin@example.com", password="adminpass123")


@pytest.fixture
def test_organisation(db, test_user):
    """Create a test organisation."""
    return Organisation.objects.create(name="Test Organisation", slug="test-org", creator=test_user)


@pytest.fixture
def test_project(db, test_organisation, test_user):
    """Create a test project."""
    return Project.objects.create(
        organisation=test_organisation, creator=test_user, name="Test Project", slug="test-project"
    )


@pytest.fixture
def global_feature_flag(db, test_user):
    """Create a global feature flag."""
    return FeatureFlag.objects.create(
        key="test_global_flag",
        enabled=True,
        description="Global test flag",
        scope_type=ScopeType.GLOBAL,
        created_by=test_user,
    )


@pytest.fixture
def org_feature_flag(db, test_organisation, test_user):
    """Create an organisation-scoped feature flag."""
    return FeatureFlag.objects.create(
        key="test_org_flag",
        enabled=False,
        description="Organisation test flag",
        scope_type=ScopeType.ORGANISATION,
        organisation=test_organisation,
        created_by=test_user,
    )


@pytest.fixture
def project_feature_flag(db, test_project, test_user):
    """Create a project-scoped feature flag."""
    return FeatureFlag.objects.create(
        key="test_project_flag",
        enabled=True,
        description="Project test flag",
        scope_type=ScopeType.PROJECT,
        organisation=test_project.organisation,
        project=test_project,
        created_by=test_user,
    )


@pytest.fixture
def global_setting(db, test_user):
    """Create a global setting."""
    return Setting.objects.create(
        key="test_global_setting",
        value="global_value",
        value_type=SettingType.STRING,
        description="Global test setting",
        scope_type=ScopeType.GLOBAL,
        created_by=test_user,
    )


@pytest.fixture
def org_setting(db, test_organisation, test_user):
    """Create an organisation-scoped setting."""
    return Setting.objects.create(
        key="test_org_setting",
        value="org_value",
        value_type=SettingType.STRING,
        description="Organisation test setting",
        scope_type=ScopeType.ORGANISATION,
        organisation=test_organisation,
        created_by=test_user,
    )


@pytest.fixture
def project_setting(db, test_project, test_user):
    """Create a project-scoped setting."""
    return Setting.objects.create(
        key="test_project_setting",
        value="project_value",
        value_type=SettingType.STRING,
        description="Project test setting",
        scope_type=ScopeType.PROJECT,
        organisation=test_project.organisation,
        project=test_project,
        created_by=test_user,
    )


@pytest.fixture
def api_client():
    """Create an API client for testing REST endpoints."""
    return APIClient()


@pytest.fixture
def authenticated_api_client(api_client, test_user):
    """Create an authenticated API client."""
    api_client.force_authenticate(user=test_user)
    return api_client


@pytest.fixture
def superuser_api_client(api_client, superuser):
    """Create a superuser API client."""
    api_client.force_authenticate(user=superuser)
    return api_client


@pytest.fixture
def org_admin_permission(db):
    """Create org management permission."""
    return Permission.objects.get_or_create(
        permission="org.manage_settings",
        defaults={
            "resource_type": "org",
            "description": "Manage organisation settings",
            "is_sensitive": False,
        },
    )[0]


@pytest.fixture
def project_permission(db):
    """Create project update permission."""
    return Permission.objects.get_or_create(
        permission="projects.update",
        defaults={
            "resource_type": "project",
            "description": "Update project settings",
            "is_sensitive": False,
        },
    )[0]


@pytest.fixture
def org_admin_role(db, org_admin_permission):
    """Create organisation admin role."""
    role = Role.objects.create(
        name="Organisation Admin",
        scope=ScopeChoices.ORGANIZATION,
        description="Can manage organisation settings",
    )
    role.permissions.add(org_admin_permission)
    return role


@pytest.fixture
def project_admin_role(db, project_permission):
    """Create project admin role."""
    role = Role.objects.create(
        name="Project Admin", scope=ScopeChoices.PROJECT, description="Can manage project settings"
    )
    role.permissions.add(project_permission)
    return role


@pytest.fixture
def org_admin_user(db, test_user, test_organisation, org_admin_role):
    """Create user with org admin permissions."""
    RoleAssignment.objects.create(
        user=test_user,
        role=org_admin_role,
        organisation=test_organisation,
        scope=ScopeChoices.ORGANIZATION,
    )
    return test_user


@pytest.fixture
def project_admin_user(db, test_user, test_project, project_admin_role):
    """Create user with project admin permissions."""
    RoleAssignment.objects.create(
        user=test_user,
        role=project_admin_role,
        organisation=test_project.organisation,
        project=test_project,
        scope=ScopeChoices.PROJECT,
    )
    return test_user


@pytest.fixture
def hierarchy_data(db, test_user, test_organisation, test_project):
    """Create complete hierarchy of feature flags and settings for testing precedence."""
    # Feature flags at all scopes
    global_flag = FeatureFlag.objects.create(
        key="hierarchy_flag",
        enabled=False,  # Global default
        scope_type=ScopeType.GLOBAL,
        created_by=test_user,
    )

    org_flag = FeatureFlag.objects.create(
        key="hierarchy_flag",
        enabled=True,  # Org override
        scope_type=ScopeType.ORGANISATION,
        organisation=test_organisation,
        created_by=test_user,
    )

    project_flag = FeatureFlag.objects.create(
        key="hierarchy_flag",
        enabled=False,  # Project override
        scope_type=ScopeType.PROJECT,
        organisation=test_organisation,
        project=test_project,
        created_by=test_user,
    )

    # Settings at all scopes
    global_setting = Setting.objects.create(
        key="hierarchy_setting",
        value="global",
        value_type=SettingType.STRING,
        scope_type=ScopeType.GLOBAL,
        created_by=test_user,
    )

    org_setting = Setting.objects.create(
        key="hierarchy_setting",
        value="organisation",
        value_type=SettingType.STRING,
        scope_type=ScopeType.ORGANISATION,
        organisation=test_organisation,
        created_by=test_user,
    )

    project_setting = Setting.objects.create(
        key="hierarchy_setting",
        value="project",
        value_type=SettingType.STRING,
        scope_type=ScopeType.PROJECT,
        organisation=test_organisation,
        project=test_project,
        created_by=test_user,
    )

    return {
        "flags": {"global": global_flag, "org": org_flag, "project": project_flag},
        "settings": {"global": global_setting, "org": org_setting, "project": project_setting},
    }


@pytest.fixture(autouse=True)
def clear_cache():
    """Clear Django cache before each test. Gracefully handles Redis unavailability."""
    from django.core.cache import cache

    try:
        cache.clear()
    except Exception:
        # Redis not available - tests should still run with DB fallback
        pass
    yield
    try:
        cache.clear()
    except Exception:
        pass
