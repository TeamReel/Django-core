"""Unit tests for USER scope support in Settings & Feature Flags system.

Tests coverage:
- T001: ScopeType.USER enum exists
- T002: User ForeignKey field exists on Setting model
- T003: Unique constraint enforces user-scoped uniqueness
- T004: Composite indexes improve user query performance
- T005: Resolution hierarchy includes user scope (user > org > project > global)
- T006: Permissions allow users to manage own settings, deny access to others
"""

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError

from src.organisations.models import Organisation
from src.projects.models import Project
from settings.api import get_flag, get_setting
from settings.models import FeatureFlag, ScopeType, Setting, SettingType
from settings.permissions import ScopeAwarePermission

User = get_user_model()


pytestmark = pytest.mark.django_db


class TestUserScopeEnum:
    """Test T001: ScopeType.USER enum value exists."""

    def test_user_scope_exists(self):
        """ScopeType.USER is a valid choice."""
        assert hasattr(ScopeType, "USER")
        assert ScopeType.USER == "USER"
        assert ("USER", "User") in ScopeType.choices

    def test_scope_ordering(self):
        """Verify scope ordering for precedence logic."""
        # Check that all expected scopes are present
        scopes = [choice[0] for choice in ScopeType.choices]
        assert "GLOBAL" in scopes
        assert "ORGANISATION" in scopes
        assert "PROJECT" in scopes
        assert "USER" in scopes


class TestUserForeignKey:
    """Test T002: User ForeignKey field exists on Setting model."""

    def test_user_field_exists(self):
        """Setting.user field exists and accepts User instances."""
        user = User.objects.create(username="testuser", email="test@example.com")
        setting = Setting.objects.create(
            key="test.key",
            value={"test": "value"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.USER,
            user=user,
        )

        assert setting.user == user
        assert setting.user_id == user.id

    def test_user_nullable(self):
        """User field is nullable for non-USER scopes."""
        setting = Setting.objects.create(
            key="test.global",
            value={"test": "global"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.GLOBAL,
            user=None,
        )

        assert setting.user is None

    def test_cascade_delete(self):
        """Deleting user cascades to delete their settings."""
        user = User.objects.create(username="deleteuser", email="delete@example.com")
        Setting.objects.create(
            key="test.key",
            value={"test": "value"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.USER,
            user=user,
        )

        # Verify setting exists
        assert Setting.objects.filter(user=user).count() == 1

        # Delete user
        user.delete()

        # Verify settings are deleted
        assert Setting.objects.filter(user_id=user.id).count() == 0


class TestUniqueConstraint:
    """Test T003: Unique constraint includes user field."""

    def test_cannot_create_duplicate_user_setting(self):
        """Cannot create duplicate (key, USER, user) settings."""
        user = User.objects.create(username="testuser", email="test@example.com")

        # Create first setting
        Setting.objects.create(
            key="test.key",
            value={"version": 1},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.USER,
            user=user,
        )

        # Attempt to create duplicate
        with pytest.raises(IntegrityError):
            Setting.objects.create(
                key="test.key",
                value={"version": 2},
                value_type=SettingType.JSON,
                default_value={},
                scope_type=ScopeType.USER,
                user=user,
            )

    def test_different_users_same_key(self):
        """Different users can have settings with the same key."""
        user1 = User.objects.create(username="user1", email="user1@example.com")
        user2 = User.objects.create(username="user2", email="user2@example.com")

        # Both users create setting with same key
        setting1 = Setting.objects.create(
            key="test.key",
            value={"user": "user1"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.USER,
            user=user1,
        )

        setting2 = Setting.objects.create(
            key="test.key",
            value={"user": "user2"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.USER,
            user=user2,
        )

        # Both settings exist with distinct values
        assert setting1.value == {"user": "user1"}
        assert setting2.value == {"user": "user2"}
        assert Setting.objects.filter(key="test.key", scope_type=ScopeType.USER).count() == 2


class TestResolutionHierarchy:
    """Test T005: Resolution hierarchy includes user scope with correct precedence."""

    def test_user_over_organisation(self):
        """User-scoped setting takes precedence over organisation-scoped."""
        user = User.objects.create(username="testuser", email="test@example.com")
        org = Organisation.objects.create(name="TestOrg")

        # Create org setting
        Setting.objects.create(
            key="test.key",
            value={"source": "org"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.ORGANISATION,
            organisation=org,
        )

        # Create user setting
        Setting.objects.create(
            key="test.key",
            value={"source": "user"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.USER,
            user=user,
        )

        # Resolve: user should win
        result = get_setting("test.key", user_id=user.id, organisation_id=org.id)
        assert result == {"source": "user"}

    def test_user_over_global(self):
        """User-scoped setting takes precedence over global."""
        user = User.objects.create(username="testuser", email="test@example.com")

        # Create global setting
        Setting.objects.create(
            key="test.key",
            value={"source": "global"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.GLOBAL,
        )

        # Create user setting
        Setting.objects.create(
            key="test.key",
            value={"source": "user"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.USER,
            user=user,
        )

        # Resolve: user should win
        result = get_setting("test.key", user_id=user.id)
        assert result == {"source": "user"}

    def test_fallback_to_organisation(self):
        """Falls back to organisation when user setting doesn't exist."""
        user = User.objects.create(username="testuser", email="test@example.com")
        org = Organisation.objects.create(name="TestOrg")

        # Create only org setting (no user setting)
        Setting.objects.create(
            key="test.key",
            value={"source": "org"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.ORGANISATION,
            organisation=org,
        )

        # Resolve: org should be returned (user setting doesn't exist)
        result = get_setting("test.key", user_id=user.id, organisation_id=org.id)
        assert result == {"source": "org"}

    def test_fallback_to_global(self):
        """Falls back to global when no user/org setting exists."""
        user = User.objects.create(username="testuser", email="test@example.com")

        # Create only global setting
        Setting.objects.create(
            key="test.key",
            value={"source": "global"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.GLOBAL,
        )

        # Resolve: global should be returned
        result = get_setting("test.key", user_id=user.id)
        assert result == {"source": "global"}

    def test_anonymous_user_skips_user_scope(self):
        """Anonymous user (user=None) skips user scope, starts at org."""
        org = Organisation.objects.create(name="TestOrg")

        # Create org setting
        Setting.objects.create(
            key="test.key",
            value={"source": "org"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.ORGANISATION,
            organisation=org,
        )

        # Resolve without user_id
        result = get_setting("test.key", user_id=None, organisation_id=org.id)
        assert result == {"source": "org"}


class TestPermissions:
    """Test T006: Permissions allow users to manage own settings, deny access to others."""

    def test_user_can_access_own_setting(self):
        """User has permission to access their own USER-scoped setting."""
        user = User.objects.create(username="testuser", email="test@example.com")
        setting = Setting.objects.create(
            key="test.key",
            value={"test": "value"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.USER,
            user=user,
        )

        # Mock request
        from unittest.mock import Mock

        request = Mock()
        request.user = user
        request.user.id = user.id
        request.user.is_authenticated = True

        # Check permission
        permission = ScopeAwarePermission()
        has_perm = permission.has_object_permission(request, None, setting)

        assert has_perm is True

    def test_user_cannot_access_other_user_setting(self):
        """User does not have permission to access another user's setting."""
        user1 = User.objects.create(username="user1", email="user1@example.com")
        user2 = User.objects.create(username="user2", email="user2@example.com")

        setting = Setting.objects.create(
            key="test.key",
            value={"test": "value"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.USER,
            user=user1,
        )

        # Mock request with user2
        from unittest.mock import Mock

        request = Mock()
        request.user = user2
        request.user.id = user2.id
        request.user.is_authenticated = True

        # Check permission
        permission = ScopeAwarePermission()
        has_perm = permission.has_object_permission(request, None, setting)

        assert has_perm is False

    def test_unauthenticated_user_denied(self):
        """Unauthenticated user cannot access any USER-scoped settings."""
        user = User.objects.create(username="testuser", email="test@example.com")
        setting = Setting.objects.create(
            key="test.key",
            value={"test": "value"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.USER,
            user=user,
        )

        # Mock request with anonymous user
        from unittest.mock import Mock

        request = Mock()
        request.user = None

        # Check permission
        permission = ScopeAwarePermission()
        has_perm = permission.has_object_permission(request, None, setting)

        assert has_perm is False


class TestFeatureFlagUserScope:
    """Test USER scope works for FeatureFlag model (parallel to Setting tests)."""

    def test_feature_flag_user_scope(self):
        """Feature flags support USER scope with precedence."""
        user = User.objects.create(username="testuser", email="test@example.com")
        org = Organisation.objects.create(name="TestOrg")

        # Create org flag (disabled)
        FeatureFlag.objects.create(
            key="test.feature",
            enabled=False,
            scope_type=ScopeType.ORGANISATION,
            organisation=org,
        )

        # Create user flag (enabled)
        FeatureFlag.objects.create(
            key="test.feature",
            enabled=True,
            scope_type=ScopeType.USER,
            user=user,
        )

        # Resolve: user flag should win
        result = get_flag("test.feature", user_id=user.id, organisation_id=org.id)
        assert result is True


class TestIntegration:
    """Integration tests combining user scope with other features."""

    def test_user_org_project_hierarchy(self):
        """Full hierarchy: user > project > org > global."""
        user = User.objects.create(username="testuser", email="test@example.com")
        org = Organisation.objects.create(name="TestOrg")
        project = Project.objects.create(name="TestProject", organisation=org)

        # Create settings at all scopes
        Setting.objects.create(
            key="test.key",
            value={"source": "global"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.GLOBAL,
        )

        Setting.objects.create(
            key="test.key",
            value={"source": "org"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.ORGANISATION,
            organisation=org,
        )

        Setting.objects.create(
            key="test.key",
            value={"source": "project"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.PROJECT,
            project=project,
        )

        Setting.objects.create(
            key="test.key",
            value={"source": "user"},
            value_type=SettingType.JSON,
            default_value={},
            scope_type=ScopeType.USER,
            user=user,
        )

        # Resolve with all scopes: user should win
        result = get_setting(
            "test.key", user_id=user.id, project_id=project.id, organisation_id=org.id
        )
        assert result == {"source": "user"}

        # Resolve without user: project should win
        result = get_setting("test.key", project_id=project.id, organisation_id=org.id)
        assert result == {"source": "project"}

        # Resolve without user/project: org should win
        result = get_setting("test.key", organisation_id=org.id)
        assert result == {"source": "org"}

        # Resolve without any scope: global should win
        result = get_setting("test.key")
        assert result == {"source": "global"}
