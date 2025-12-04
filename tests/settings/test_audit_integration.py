"""
Tests for audit integration with settings app.

Verifies that CRUD operations on FeatureFlag and Setting models
emit appropriate audit events to B09 audit system.
"""

import pytest
from audit.models import AuditEvent
from django.contrib.auth import get_user_model
from settings.models import FeatureFlag, Setting

User = get_user_model()


@pytest.mark.django_db
class TestAuditIntegration:
    """Test audit event emission for settings CRUD operations."""

    def test_feature_flag_create_emits_audit_event(self, test_user):
        """Test that creating a FeatureFlag emits settings.flag_created event."""
        # Create flag with user context
        flag = FeatureFlag.objects.create(
            key="test_flag",
            enabled=True,
            scope_type="global",
            description="Test flag",
        )
        flag._current_user = test_user  # Simulate user context
        flag.save()

        # Verify audit event was created
        events = AuditEvent.objects.filter(event_type="settings.flag_created")
        assert events.count() >= 1

        # Verify event metadata
        event = events.first()
        assert "new_value" in event.metadata
        assert event.metadata["new_value"]["key"] == "test_flag"
        assert event.metadata["new_value"]["enabled"] is True

    def test_feature_flag_update_emits_audit_event(self, test_user):
        """Test that updating a FeatureFlag emits settings.flag_updated event."""
        # Create flag
        flag = FeatureFlag.objects.create(
            key="test_flag_update",
            enabled=False,
            scope_type="global",
        )

        # Update flag
        flag.enabled = True
        flag._current_user = test_user
        flag.save()

        # Verify audit event was created
        events = AuditEvent.objects.filter(event_type="settings.flag_updated")
        assert events.count() >= 1

        # Verify event metadata contains old and new values
        event = events.first()
        assert "new_value" in event.metadata
        assert "old_value" in event.metadata
        assert event.metadata["old_value"]["enabled"] is False
        assert event.metadata["new_value"]["enabled"] is True

    def test_feature_flag_delete_emits_audit_event(self, test_user):
        """Test that deleting a FeatureFlag emits settings.flag_deleted event."""
        # Create flag
        flag = FeatureFlag.objects.create(
            key="test_flag_delete",
            enabled=True,
            scope_type="global",
        )
        flag._current_user = test_user

        # Delete flag
        flag.delete()

        # Verify audit event was created
        events = AuditEvent.objects.filter(event_type="settings.flag_deleted")
        assert events.count() >= 1

        # Verify event metadata
        event = events.first()
        assert "deleted_value" in event.metadata
        assert event.metadata["deleted_value"]["key"] == "test_flag_delete"

    def test_setting_create_emits_audit_event(self, test_user):
        """Test that creating a Setting emits settings.setting_created event."""
        # Create setting
        setting = Setting.objects.create(
            key="test_setting",
            value="test_value",
            value_type="string",
            default_value="default_test",
            scope_type="global",
        )
        setting._current_user = test_user
        setting.save()

        # Verify audit event was created
        events = AuditEvent.objects.filter(event_type="settings.setting_created")
        assert events.count() >= 1

        # Verify event metadata
        event = events.first()
        assert "new_value" in event.metadata
        assert event.metadata["new_value"]["key"] == "test_setting"
        assert event.metadata["new_value"]["value"] == "test_value"

    def test_setting_update_emits_audit_event(self, test_user):
        """Test that updating a Setting emits settings.setting_updated event."""
        # Create setting
        setting = Setting.objects.create(
            key="test_setting_update",
            value="old_value",
            value_type="string",
            default_value="default_old",
            scope_type="global",
        )

        # Update setting
        setting.value = "new_value"
        setting._current_user = test_user
        setting.save()

        # Verify audit event was created
        events = AuditEvent.objects.filter(event_type="settings.setting_updated")
        assert events.count() >= 1

        # Verify event metadata
        event = events.first()
        assert "new_value" in event.metadata
        assert "old_value" in event.metadata
        assert event.metadata["old_value"]["value"] == "old_value"
        assert event.metadata["new_value"]["value"] == "new_value"

    def test_setting_delete_emits_audit_event(self, test_user):
        """Test that deleting a Setting emits settings.setting_deleted event."""
        # Create setting
        setting = Setting.objects.create(
            key="test_setting_delete",
            value="test_value",
            value_type="string",
            default_value="default_test",
            scope_type="global",
        )
        setting._current_user = test_user

        # Delete setting
        setting.delete()

        # Verify audit event was created
        events = AuditEvent.objects.filter(event_type="settings.setting_deleted")
        assert events.count() >= 1

        # Verify event metadata
        event = events.first()
        assert "deleted_value" in event.metadata
        assert event.metadata["deleted_value"]["key"] == "test_setting_delete"

    def test_scope_context_captured_in_audit_events(
        self, test_user, test_organisation, test_project
    ):
        """Test that organization/project scope is captured in audit events."""
        # Create org-scoped flag
        flag = FeatureFlag.objects.create(
            key="org_flag",
            enabled=True,
            scope_type="organisation",
            organisation=test_organisation,
        )
        flag._current_user = test_user
        flag.save()

        # Verify audit event has organization context
        events = AuditEvent.objects.filter(event_type="settings.flag_created").order_by(
            "-created_at"
        )
        event = events.first()
        assert event.organization == test_organisation

        # Create project-scoped setting
        setting = Setting.objects.create(
            key="project_setting",
            value="test",
            value_type="string",
            default_value="default_test",
            scope_type="project",
            organisation=test_organisation,
            project=test_project,
        )
        setting._current_user = test_user
        setting.save()

        # Verify audit event has project context
        events = AuditEvent.objects.filter(event_type="settings.setting_created").order_by(
            "-created_at"
        )
        event = events.first()
        assert event.organization == test_organisation
        assert event.project == test_project
