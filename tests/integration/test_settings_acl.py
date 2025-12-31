"""Integration tests for Settings module ACL enforcement.

Tests verify that the Settings and FeatureFlags modules properly enforce
access control using the B08 evaluate_permission() system.

Scope Coverage:
- GLOBAL: Superuser-only access
- ORGANIZATION: Admin can edit, Member can view/edit, Viewer can view
- PROJECT: Project-specific settings access
- USER: User-specific settings (ownership check)
"""

import pytest
from django.contrib.auth import get_user_model
from organisations.models import Organisation
from permissions.models import Role, RoleAssignment
from projects.models import Project
from rest_framework.test import APIClient
from settings.models import FeatureFlag, ScopeType, Setting

User = get_user_model()


@pytest.fixture
def setup_org_and_users(db):
    """Create organisation and users with different roles."""
    # Create users
    admin = User.objects.create_user(email="admin@test.com")
    member = User.objects.create_user(email="member@test.com")
    viewer = User.objects.create_user(email="viewer@test.com")
    external = User.objects.create_user(email="external@test.com")

    org = Organisation.objects.create(name="Test Org", creator=admin)

    # Get roles
    admin_role = Role.objects.get(name="Organization Admin")
    member_role = Role.objects.get(name="Organization Member")
    viewer_role = Role.objects.get(name="Organization Viewer")

    # Assign roles
    RoleAssignment.objects.create(
        user=admin,
        role=admin_role,
        scope="ORGANIZATION",
        target_organization_id=org.id,
    )
    RoleAssignment.objects.create(
        user=member,
        role=member_role,
        scope="ORGANIZATION",
        target_organization_id=org.id,
    )
    RoleAssignment.objects.create(
        user=viewer,
        role=viewer_role,
        scope="ORGANIZATION",
        target_organization_id=org.id,
    )

    return {
        "org": org,
        "admin": admin,
        "member": member,
        "viewer": viewer,
        "external": external,
    }


@pytest.fixture
def setup_project(setup_org_and_users):
    """Create a project within the organisation."""
    org = setup_org_and_users["org"]
    admin = setup_org_and_users["admin"]
    project = Project.objects.create(
        name="Test Project",
        organisation=org,
        creator=admin,
    )
    return {**setup_org_and_users, "project": project}


# ========================================
# Organisation-scoped Settings Tests
# ========================================


@pytest.mark.django_db
def test_org_admin_can_view_org_settings(setup_org_and_users):
    """T029.1: Organization Admin can view organisation settings."""
    org = setup_org_and_users["org"]
    admin = setup_org_and_users["admin"]

    # Create org-level setting
    setting = Setting.objects.create(
        key="test.setting",
        value="test_value",
        default_value="default",
        scope_type=ScopeType.ORGANISATION,
        organisation=org,
    )

    client = APIClient()
    client.force_authenticate(user=admin)
    response = client.get(f"/api/v1/settings/settings/{setting.id}/")

    assert response.status_code == 200
    assert response.data["key"] == "test.setting"


@pytest.mark.django_db
def test_org_admin_can_edit_org_settings(setup_org_and_users):
    """T029.2: Organization Admin can edit organisation settings."""
    org = setup_org_and_users["org"]
    admin = setup_org_and_users["admin"]

    # Create org-level setting
    setting = Setting.objects.create(
        key="test.setting",
        value="old_value",
        default_value="default",
        scope_type=ScopeType.ORGANISATION,
        organisation=org,
    )

    client = APIClient()
    client.force_authenticate(user=admin)
    response = client.patch(
        f"/api/v1/settings/settings/{setting.id}/",
        {"value": "new_value"},
        format="json",
    )

    assert response.status_code == 200
    setting.refresh_from_db()
    assert setting.value == "new_value"


@pytest.mark.django_db
def test_org_member_can_view_org_settings(setup_org_and_users):
    """T029.3: Organization Member can view organisation settings."""
    org = setup_org_and_users["org"]
    member = setup_org_and_users["member"]

    # Create org-level setting
    setting = Setting.objects.create(
        key="test.setting",
        value="test_value",
        default_value="default",
        scope_type=ScopeType.ORGANISATION,
        organisation=org,
    )

    client = APIClient()
    client.force_authenticate(user=member)
    response = client.get(f"/api/v1/settings/settings/{setting.id}/")

    assert response.status_code == 200
    assert response.data["key"] == "test.setting"


@pytest.mark.django_db
def test_org_member_can_edit_org_settings(setup_org_and_users):
    """T029.4: Organization Member can edit organisation settings."""
    org = setup_org_and_users["org"]
    member = setup_org_and_users["member"]

    # Create org-level setting
    setting = Setting.objects.create(
        key="test.setting",
        value="old_value",
        default_value="default",
        scope_type=ScopeType.ORGANISATION,
        organisation=org,
    )

    client = APIClient()
    client.force_authenticate(user=member)
    response = client.patch(
        f"/api/v1/settings/settings/{setting.id}/",
        {"value": "new_value"},
        format="json",
    )

    assert response.status_code == 200
    setting.refresh_from_db()
    assert setting.value == "new_value"


@pytest.mark.django_db
def test_org_viewer_can_view_org_settings(setup_org_and_users):
    """T029.5: Organization Viewer can view organisation settings."""
    org = setup_org_and_users["org"]
    viewer = setup_org_and_users["viewer"]

    # Create org-level setting
    setting = Setting.objects.create(
        key="test.setting",
        value="test_value",
        default_value="default",
        scope_type=ScopeType.ORGANISATION,
        organisation=org,
    )

    client = APIClient()
    client.force_authenticate(user=viewer)
    response = client.get(f"/api/v1/settings/settings/{setting.id}/")

    assert response.status_code == 200
    assert response.data["key"] == "test.setting"


@pytest.mark.django_db
def test_org_viewer_cannot_edit_org_settings(setup_org_and_users):
    """T029.6: Organization Viewer cannot edit organisation settings."""
    org = setup_org_and_users["org"]
    viewer = setup_org_and_users["viewer"]

    # Create org-level setting
    setting = Setting.objects.create(
        key="test.setting",
        value="old_value",
        default_value="default",
        scope_type=ScopeType.ORGANISATION,
        organisation=org,
    )

    client = APIClient()
    client.force_authenticate(user=viewer)
    response = client.patch(
        f"/api/v1/settings/settings/{setting.id}/",
        {"value": "new_value"},
        format="json",
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_external_user_cannot_view_org_settings(setup_org_and_users):
    """T029.7: External user cannot view organisation settings."""
    org = setup_org_and_users["org"]
    external = setup_org_and_users["external"]

    # Create org-level setting
    setting = Setting.objects.create(
        key="test.setting",
        value="test_value",
        default_value="default",
        scope_type=ScopeType.ORGANISATION,
        organisation=org,
    )

    client = APIClient()
    client.force_authenticate(user=external)
    response = client.get(f"/api/v1/settings/settings/{setting.id}/")

    assert response.status_code == 403


# ========================================
# Project-scoped Settings Tests
# ========================================


@pytest.mark.django_db
def test_org_admin_can_view_project_settings(setup_project):
    """T029.8: Organization Admin can view project settings."""
    project = setup_project["project"]
    admin = setup_project["admin"]

    # Create project-level setting
    setting = Setting.objects.create(
        key="test.setting",
        value="test_value",
        default_value="default",
        scope_type=ScopeType.PROJECT,
        project=project,
    )

    client = APIClient()
    client.force_authenticate(user=admin)
    response = client.get(f"/api/v1/settings/settings/{setting.id}/")

    assert response.status_code == 200
    assert response.data["key"] == "test.setting"


@pytest.mark.django_db
def test_org_admin_can_edit_project_settings(setup_project):
    """T029.9: Organization Admin can edit project settings."""
    project = setup_project["project"]
    admin = setup_project["admin"]

    # Create project-level setting
    setting = Setting.objects.create(
        key="test.setting",
        value="old_value",
        default_value="default",
        scope_type=ScopeType.PROJECT,
        project=project,
    )

    client = APIClient()
    client.force_authenticate(user=admin)
    response = client.patch(
        f"/api/v1/settings/settings/{setting.id}/",
        {"value": "new_value"},
        format="json",
    )

    assert response.status_code == 200
    setting.refresh_from_db()
    assert setting.value == "new_value"


# ========================================
# Feature Flag Tests
# ========================================


@pytest.mark.django_db
def test_org_admin_can_view_feature_flags(setup_org_and_users):
    """T029.10: Organization Admin can view feature flags."""
    org = setup_org_and_users["org"]
    admin = setup_org_and_users["admin"]

    # Create org-level flag
    flag = FeatureFlag.objects.create(
        key="test.flag",
        enabled=True,
        scope_type=ScopeType.ORGANISATION,
        organisation=org,
    )

    client = APIClient()
    client.force_authenticate(user=admin)
    response = client.get(f"/api/v1/settings/feature-flags/{flag.id}/")

    assert response.status_code == 200
    assert response.data["key"] == "test.flag"


@pytest.mark.django_db
def test_org_viewer_can_view_feature_flags(setup_org_and_users):
    """T029.11: Organization Viewer can view feature flags."""
    org = setup_org_and_users["org"]
    viewer = setup_org_and_users["viewer"]

    # Create org-level flag
    flag = FeatureFlag.objects.create(
        key="test.flag",
        enabled=True,
        scope_type=ScopeType.ORGANISATION,
        organisation=org,
    )

    client = APIClient()
    client.force_authenticate(user=viewer)
    response = client.get(f"/api/v1/settings/feature-flags/{flag.id}/")

    assert response.status_code == 200
    assert response.data["key"] == "test.flag"


@pytest.mark.django_db
def test_external_user_cannot_view_feature_flags(setup_org_and_users):
    """T029.12: External user cannot view feature flags."""
    org = setup_org_and_users["org"]
    external = setup_org_and_users["external"]

    # Create org-level flag
    flag = FeatureFlag.objects.create(
        key="test.flag",
        enabled=True,
        scope_type=ScopeType.ORGANISATION,
        organisation=org,
    )

    client = APIClient()
    client.force_authenticate(user=external)
    response = client.get(f"/api/v1/settings/feature-flags/{flag.id}/")

    assert response.status_code == 403


# ========================================
# USER-scoped Settings Tests
# ========================================


@pytest.mark.django_db
def test_user_can_view_own_settings(setup_org_and_users):
    """T029.13: User can view their own USER-scoped settings."""
    member = setup_org_and_users["member"]

    # Create user-level setting
    setting = Setting.objects.create(
        key="user.preference",
        value="dark_mode",
        default_value="default",
        scope_type=ScopeType.USER,
        user=member,
    )

    client = APIClient()
    client.force_authenticate(user=member)
    response = client.get(f"/api/v1/settings/settings/{setting.id}/")

    assert response.status_code == 200
    assert response.data["key"] == "user.preference"


@pytest.mark.django_db
def test_user_cannot_view_other_user_settings(setup_org_and_users):
    """T029.14: User cannot view another user's USER-scoped settings."""
    member = setup_org_and_users["member"]
    viewer = setup_org_and_users["viewer"]

    # Create user-level setting for member
    setting = Setting.objects.create(
        key="user.preference",
        value="dark_mode",
        default_value="default",
        scope_type=ScopeType.USER,
        user=member,
    )

    # Viewer tries to access member's setting
    client = APIClient()
    client.force_authenticate(user=viewer)
    response = client.get(f"/api/v1/settings/settings/{setting.id}/")

    assert response.status_code == 403


# ========================================
# Global Settings Tests (Superuser only)
# ========================================


@pytest.mark.django_db
def test_superuser_can_view_global_settings(setup_org_and_users):
    """T029.15: Superuser can view GLOBAL settings."""
    admin = setup_org_and_users["admin"]
    admin.is_superuser = True
    admin.save()

    # Create global setting
    setting = Setting.objects.create(
        key="global.config",
        value="system_wide",
        default_value="default",
        scope_type=ScopeType.GLOBAL,
    )

    client = APIClient()
    client.force_authenticate(user=admin)
    response = client.get(f"/api/v1/settings/settings/{setting.id}/")

    assert response.status_code == 200
    assert response.data["key"] == "global.config"


@pytest.mark.django_db
def test_org_admin_cannot_view_global_settings(setup_org_and_users):
    """T029.16: Organization Admin cannot view GLOBAL settings (superuser-only)."""
    admin = setup_org_and_users["admin"]

    # Create global setting
    setting = Setting.objects.create(
        key="global.config",
        value="system_wide",
        default_value="default",
        scope_type=ScopeType.GLOBAL,
    )

    client = APIClient()
    client.force_authenticate(user=admin)
    response = client.get(f"/api/v1/settings/settings/{setting.id}/")

    assert response.status_code == 403
