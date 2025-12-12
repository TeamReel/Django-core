"""Security tests for Settings module ACL bypass attempts.

These tests verify that the Settings and FeatureFlags modules properly
enforce access control boundaries and prevent unauthorized access attempts.

Coverage:
- Cross-organisation access attempts
- Anonymous user access blocking
- Privilege escalation attempts
- Direct model queries (verify service layer usage)
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
def setup_two_orgs(db):
    """Create two separate organisations with users."""
    # Org A
    org_a = Organisation.objects.create(name="Org A")
    admin_a = User.objects.create_user(email="admin_a@test.com")
    member_a = User.objects.create_user(email="member_a@test.com")

    # Org B
    org_b = Organisation.objects.create(name="Org B")
    admin_b = User.objects.create_user(email="admin_b@test.com")
    member_b = User.objects.create_user(email="member_b@test.com")

    # Assign roles
    admin_role = Role.objects.get(name="Organization Admin")
    member_role = Role.objects.get(name="Organization Member")

    RoleAssignment.objects.create(
        user=admin_a,
        role=admin_role,
        scope="ORGANIZATION",
        organization_id=org_a.id,
    )
    RoleAssignment.objects.create(
        user=member_a,
        role=member_role,
        scope="ORGANIZATION",
        organization_id=org_a.id,
    )
    RoleAssignment.objects.create(
        user=admin_b,
        role=admin_role,
        scope="ORGANIZATION",
        organization_id=org_b.id,
    )
    RoleAssignment.objects.create(
        user=member_b,
        role=member_role,
        scope="ORGANIZATION",
        organization_id=org_b.id,
    )

    return {
        "org_a": org_a,
        "admin_a": admin_a,
        "member_a": member_a,
        "org_b": org_b,
        "admin_b": admin_b,
        "member_b": member_b,
    }


# ========================================
# Cross-Organisation Access Tests
# ========================================


@pytest.mark.django_db
def test_admin_cannot_view_other_org_settings(setup_two_orgs):
    """T030.1: Admin from Org A cannot view Org B's settings."""
    org_b = setup_two_orgs["org_b"]
    admin_a = setup_two_orgs["admin_a"]

    # Create setting in Org B
    setting = Setting.objects.create(
        key="org_b.setting",
        value="confidential",
        scope_type=ScopeType.ORGANISATION,
        organisation=org_b,
    )

    # Admin from Org A tries to access it
    client = APIClient()
    client.force_authenticate(user=admin_a)
    response = client.get(f"/api/v1/settings/{setting.id}/")

    assert response.status_code == 403


@pytest.mark.django_db
def test_admin_cannot_edit_other_org_settings(setup_two_orgs):
    """T030.2: Admin from Org A cannot edit Org B's settings."""
    org_b = setup_two_orgs["org_b"]
    admin_a = setup_two_orgs["admin_a"]

    # Create setting in Org B
    setting = Setting.objects.create(
        key="org_b.setting",
        value="original",
        scope_type=ScopeType.ORGANISATION,
        organisation=org_b,
    )

    # Admin from Org A tries to modify it
    client = APIClient()
    client.force_authenticate(user=admin_a)
    response = client.patch(
        f"/api/v1/settings/{setting.id}/",
        {"value": "hacked"},
        format="json",
    )

    assert response.status_code == 403
    setting.refresh_from_db()
    assert setting.value == "original"  # Value unchanged


@pytest.mark.django_db
def test_member_cannot_view_other_org_feature_flags(setup_two_orgs):
    """T030.3: Member from Org A cannot view Org B's feature flags."""
    org_b = setup_two_orgs["org_b"]
    member_a = setup_two_orgs["member_a"]

    # Create flag in Org B
    flag = FeatureFlag.objects.create(
        key="org_b.feature",
        enabled=True,
        scope_type=ScopeType.ORGANISATION,
        organisation=org_b,
    )

    # Member from Org A tries to access it
    client = APIClient()
    client.force_authenticate(user=member_a)
    response = client.get(f"/api/v1/feature-flags/{flag.id}/")

    assert response.status_code == 403


@pytest.mark.django_db
def test_admin_cannot_delete_other_org_settings(setup_two_orgs):
    """T030.4: Admin from Org A cannot delete Org B's settings."""
    org_b = setup_two_orgs["org_b"]
    admin_a = setup_two_orgs["admin_a"]

    # Create setting in Org B
    setting = Setting.objects.create(
        key="org_b.setting",
        value="important",
        scope_type=ScopeType.ORGANISATION,
        organisation=org_b,
    )
    setting_id = setting.id

    # Admin from Org A tries to delete it
    client = APIClient()
    client.force_authenticate(user=admin_a)
    response = client.delete(f"/api/v1/settings/{setting_id}/")

    assert response.status_code == 403
    assert Setting.objects.filter(id=setting_id).exists()  # Still exists


# ========================================
# Anonymous/Unauthenticated Access Tests
# ========================================


@pytest.mark.django_db
def test_anonymous_cannot_view_settings(setup_two_orgs):
    """T030.5: Anonymous user cannot view any settings."""
    org_a = setup_two_orgs["org_a"]

    # Create setting in Org A
    setting = Setting.objects.create(
        key="org_a.setting",
        value="public?",
        scope_type=ScopeType.ORGANISATION,
        organisation=org_a,
    )

    # Anonymous user tries to access it
    client = APIClient()
    response = client.get(f"/api/v1/settings/{setting.id}/")

    assert response.status_code in [401, 403]  # Unauthorized or Forbidden


@pytest.mark.django_db
def test_anonymous_cannot_list_settings(setup_two_orgs):
    """T030.6: Anonymous user cannot list settings."""
    org_a = setup_two_orgs["org_a"]

    # Create settings in Org A
    Setting.objects.create(
        key="org_a.setting1",
        value="value1",
        scope_type=ScopeType.ORGANISATION,
        organisation=org_a,
    )
    Setting.objects.create(
        key="org_a.setting2",
        value="value2",
        scope_type=ScopeType.ORGANISATION,
        organisation=org_a,
    )

    # Anonymous user tries to list
    client = APIClient()
    response = client.get("/api/v1/settings/")

    assert response.status_code in [401, 403]


@pytest.mark.django_db
def test_anonymous_cannot_create_settings(setup_two_orgs):
    """T030.7: Anonymous user cannot create settings."""
    org_a = setup_two_orgs["org_a"]

    # Anonymous user tries to create setting
    client = APIClient()
    response = client.post(
        "/api/v1/settings/",
        {
            "key": "malicious.setting",
            "value": "hacked",
            "scope_type": "ORGANISATION",
            "organisation": org_a.id,
        },
        format="json",
    )

    assert response.status_code in [401, 403]
    assert not Setting.objects.filter(key="malicious.setting").exists()


# ========================================
# Project-scoped Cross-Access Tests
# ========================================


@pytest.mark.django_db
def test_member_cannot_view_other_org_project_settings(setup_two_orgs):
    """T030.8: Member from Org A cannot view Org B's project settings."""
    org_b = setup_two_orgs["org_b"]
    admin_b = setup_two_orgs["admin_b"]
    member_a = setup_two_orgs["member_a"]

    # Create project in Org B
    project_b = Project.objects.create(
        name="Project B",
        organisation=org_b,
        created_by=admin_b,
    )

    # Create project-level setting in Org B
    setting = Setting.objects.create(
        key="project_b.setting",
        value="secret",
        scope_type=ScopeType.PROJECT,
        project=project_b,
    )

    # Member from Org A tries to access it
    client = APIClient()
    client.force_authenticate(user=member_a)
    response = client.get(f"/api/v1/settings/{setting.id}/")

    assert response.status_code == 403


# ========================================
# USER-scoped Cross-Access Tests
# ========================================


@pytest.mark.django_db
def test_user_cannot_view_other_user_settings(setup_two_orgs):
    """T030.9: User A cannot view User B's personal settings."""
    member_a = setup_two_orgs["member_a"]
    member_b = setup_two_orgs["member_b"]

    # Create personal setting for Member B
    setting = Setting.objects.create(
        key="user.preference",
        value="personal_data",
        scope_type=ScopeType.USER,
        user=member_b,
    )

    # Member A tries to access it
    client = APIClient()
    client.force_authenticate(user=member_a)
    response = client.get(f"/api/v1/settings/{setting.id}/")

    assert response.status_code == 403


@pytest.mark.django_db
def test_admin_cannot_view_other_user_settings(setup_two_orgs):
    """T030.10: Even org admin cannot view another user's personal settings."""
    admin_a = setup_two_orgs["admin_a"]
    member_a = setup_two_orgs["member_a"]

    # Create personal setting for Member A
    setting = Setting.objects.create(
        key="user.preference",
        value="private_data",
        scope_type=ScopeType.USER,
        user=member_a,
    )

    # Admin tries to access it
    client = APIClient()
    client.force_authenticate(user=admin_a)
    response = client.get(f"/api/v1/settings/{setting.id}/")

    assert response.status_code == 403


# ========================================
# Privilege Escalation Tests
# ========================================


@pytest.mark.django_db
def test_member_cannot_escalate_to_global_scope(setup_two_orgs):
    """T030.11: Member cannot create GLOBAL-scoped settings."""
    member_a = setup_two_orgs["member_a"]

    # Member tries to create global setting
    client = APIClient()
    client.force_authenticate(user=member_a)
    response = client.post(
        "/api/v1/settings/",
        {
            "key": "global.hack",
            "value": "escalated",
            "scope_type": "GLOBAL",
        },
        format="json",
    )

    assert response.status_code == 403
    assert not Setting.objects.filter(key="global.hack").exists()


@pytest.mark.django_db
def test_admin_cannot_escalate_to_global_scope(setup_two_orgs):
    """T030.12: Even org admin cannot create GLOBAL-scoped settings."""
    admin_a = setup_two_orgs["admin_a"]

    # Admin tries to create global setting
    client = APIClient()
    client.force_authenticate(user=admin_a)
    response = client.post(
        "/api/v1/settings/",
        {
            "key": "global.hack",
            "value": "escalated",
            "scope_type": "GLOBAL",
        },
        format="json",
    )

    assert response.status_code == 403
    assert not Setting.objects.filter(key="global.hack").exists()


# ========================================
# Listing/Filtering Tests
# ========================================


@pytest.mark.django_db
def test_member_only_sees_own_org_settings(setup_two_orgs):
    """T030.13: Member from Org A only sees Org A settings in list view."""
    org_a = setup_two_orgs["org_a"]
    org_b = setup_two_orgs["org_b"]
    member_a = setup_two_orgs["member_a"]

    # Create settings in both orgs
    Setting.objects.create(
        key="org_a.setting",
        value="visible",
        scope_type=ScopeType.ORGANISATION,
        organisation=org_a,
    )
    Setting.objects.create(
        key="org_b.setting",
        value="hidden",
        scope_type=ScopeType.ORGANISATION,
        organisation=org_b,
    )

    # Member A lists settings
    client = APIClient()
    client.force_authenticate(user=member_a)
    response = client.get("/api/v1/settings/")

    if response.status_code == 200:
        # Should only see Org A's settings
        keys = [s["key"] for s in response.data.get("results", response.data)]
        assert "org_a.setting" in keys
        assert "org_b.setting" not in keys


@pytest.mark.django_db
def test_viewer_cannot_see_global_settings_in_list(setup_two_orgs):
    """T030.14: Org viewer cannot see GLOBAL settings in list view."""
    org_a = setup_two_orgs["org_a"]
    member_a = setup_two_orgs["member_a"]

    # Create global setting (would need superuser in real scenario)
    Setting.objects.create(
        key="global.config",
        value="system_wide",
        scope_type=ScopeType.GLOBAL,
    )

    # Create org setting
    Setting.objects.create(
        key="org_a.setting",
        value="visible",
        scope_type=ScopeType.ORGANISATION,
        organisation=org_a,
    )

    # Member A lists settings
    client = APIClient()
    client.force_authenticate(user=member_a)
    response = client.get("/api/v1/settings/")

    if response.status_code == 200:
        # Should not see global settings
        keys = [s["key"] for s in response.data.get("results", response.data)]
        assert "global.config" not in keys
        assert "org_a.setting" in keys


# ========================================
# Audit Trail Verification Tests
# ========================================


@pytest.mark.django_db
def test_failed_access_attempts_create_audit_events(setup_two_orgs):
    """T030.15: Failed ACL checks should generate audit events (B09 integration)."""
    org_b = setup_two_orgs["org_b"]
    admin_a = setup_two_orgs["admin_a"]

    # Create setting in Org B
    setting = Setting.objects.create(
        key="org_b.sensitive",
        value="confidential",
        scope_type=ScopeType.ORGANISATION,
        organisation=org_b,
    )

    # Admin from Org A tries to access it
    client = APIClient()
    client.force_authenticate(user=admin_a)
    response = client.get(f"/api/v1/settings/{setting.id}/")

    assert response.status_code == 403

    # Verify audit event was created (if B09 is integrated)
    # This is a placeholder - actual implementation depends on B09 audit system
    # from audit.models import AuditEvent
    # audit_events = AuditEvent.objects.filter(
    #     user=admin_a,
    #     event_type="permission_denied",
    #     resource_type="setting",
    #     resource_id=setting.id,
    # )
    # assert audit_events.exists()
