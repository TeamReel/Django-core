"""
Audit integration tests for Settings & Feature Flags system.

Tests audit event generation, event metadata, and integration
with WP09 audit logging system.
"""

import json
from datetime import datetime
from django.contrib.auth import get_user_model
from django.test import TestCase
from unittest.mock import patch, MagicMock

from src.settings.models import FeatureFlag, Setting, ScopeType
from src.audit.models import AuditEvent
from src.settings.audit import (
    log_flag_created,
    log_flag_updated,
    log_flag_deleted,
    log_setting_created,
    log_setting_updated,
    log_setting_deleted,
    log_flag_resolved,
    log_setting_resolved,
)
from src.organisations.models import Organisation
from src.projects.models import Project

User = get_user_model()


class TestFeatureFlagAuditLogging(TestCase):
    """Test audit logging for feature flag operations."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.organisation = Organisation.objects.create(
            name="Test Org", slug="test-org", creator=self.user
        )
        self.project = Project.objects.create(
            name="Test Project",
            slug="test-project",
            organisation=self.organisation,
            creator=self.user,
        )

    def test_flag_creation_audit_log(self):
        """Test audit logging when feature flag is created."""
        flag = FeatureFlag.objects.create(
            key="audit_flag",
            name="Audit Flag",
            description="Flag for audit testing",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
            default_value=True,
            created_by=self.user,
        )

        log_flag_created(flag, self.user)

        # Check audit event was created
        audit_event = AuditEvent.objects.filter(
            event_type="FEATURE_FLAG_CREATED", user=self.user
        ).first()

        assert audit_event is not None
        assert audit_event.resource_type == "FeatureFlag"
        assert audit_event.resource_id == str(flag.id)

        # Check metadata
        metadata = audit_event.metadata
        assert metadata["flag_key"] == "audit_flag"
        assert metadata["scope_type"] == ScopeType.ORGANISATION.value
        assert metadata["organisation_id"] == self.organisation.id
        assert metadata["default_value"] is True

    def test_flag_update_audit_log(self):
        """Test audit logging when feature flag is updated."""
        flag = FeatureFlag.objects.create(
            key="update_flag",
            name="Original Name",
            scope_type=ScopeType.GLOBAL,
            default_value=False,
            created_by=self.user,
        )

        old_values = {"name": "Original Name", "default_value": False, "description": None}
        new_values = {
            "name": "Updated Name",
            "default_value": True,
            "description": "Updated description",
        }

        # Update flag
        flag.name = "Updated Name"
        flag.default_value = True
        flag.description = "Updated description"
        flag.save()

        log_flag_updated(flag, self.user, old_values, new_values)

        # Check audit event
        audit_event = AuditEvent.objects.filter(
            event_type="FEATURE_FLAG_UPDATED", user=self.user, resource_id=str(flag.id)
        ).first()

        assert audit_event is not None

        metadata = audit_event.metadata
        assert metadata["flag_key"] == "update_flag"
        assert metadata["changes"]["name"]["old"] == "Original Name"
        assert metadata["changes"]["name"]["new"] == "Updated Name"
        assert metadata["changes"]["default_value"]["old"] is False
        assert metadata["changes"]["default_value"]["new"] is True

    def test_flag_deletion_audit_log(self):
        """Test audit logging when feature flag is deleted."""
        flag = FeatureFlag.objects.create(
            key="delete_flag",
            name="Delete Flag",
            scope_type=ScopeType.PROJECT,
            organisation=self.organisation,
            project=self.project,
            default_value=True,
            created_by=self.user,
        )
        flag_id = flag.id
        flag_data = {
            "key": flag.key,
            "name": flag.name,
            "scope_type": flag.scope_type,
            "organisation_id": flag.organisation_id,
            "project_id": flag.project_id,
            "default_value": flag.default_value,
        }

        flag.delete()
        log_flag_deleted(flag_id, flag_data, self.user)

        # Check audit event
        audit_event = AuditEvent.objects.filter(
            event_type="FEATURE_FLAG_DELETED", user=self.user, resource_id=str(flag_id)
        ).first()

        assert audit_event is not None
        assert audit_event.resource_type == "FeatureFlag"

        metadata = audit_event.metadata
        assert metadata["flag_key"] == "delete_flag"
        assert metadata["scope_type"] == ScopeType.PROJECT.value
        assert metadata["organisation_id"] == self.organisation.id
        assert metadata["project_id"] == self.project.id

    def test_flag_resolution_audit_log(self):
        """Test audit logging when feature flag is resolved."""
        flag = FeatureFlag.objects.create(
            key="resolve_flag",
            name="Resolve Flag",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
            default_value=True,
            created_by=self.user,
        )

        resolve_context = {
            "organisation_id": self.organisation.id,
            "user_agent": "TestClient/1.0",
            "ip_address": "127.0.0.1",
        }

        log_flag_resolved(flag, resolved_value=True, user=self.user, context=resolve_context)

        # Check audit event
        audit_event = AuditEvent.objects.filter(
            event_type="FEATURE_FLAG_RESOLVED", user=self.user, resource_id=str(flag.id)
        ).first()

        assert audit_event is not None

        metadata = audit_event.metadata
        assert metadata["flag_key"] == "resolve_flag"
        assert metadata["resolved_value"] is True
        assert metadata["organisation_id"] == self.organisation.id
        assert metadata["user_agent"] == "TestClient/1.0"
        assert metadata["ip_address"] == "127.0.0.1"


class TestSettingAuditLogging(TestCase):
    """Test audit logging for setting operations."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.organisation = Organisation.objects.create(
            name="Test Org", slug="test-org", creator=self.user
        )

    def test_setting_creation_audit_log(self):
        """Test audit logging when setting is created."""
        setting = Setting.objects.create(
            key="audit_setting",
            name="Audit Setting",
            description="Setting for audit testing",
            value_type="string",
            default_value="test_value",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
            created_by=self.user,
        )

        log_setting_created(setting, self.user)

        # Check audit event
        audit_event = AuditEvent.objects.filter(
            event_type="SETTING_CREATED", user=self.user, resource_id=str(setting.id)
        ).first()

        assert audit_event is not None
        assert audit_event.resource_type == "Setting"

        metadata = audit_event.metadata
        assert metadata["setting_key"] == "audit_setting"
        assert metadata["value_type"] == "string"
        assert metadata["default_value"] == "test_value"
        assert metadata["scope_type"] == ScopeType.ORGANISATION.value

    def test_setting_json_value_audit_log(self):
        """Test audit logging with JSON setting values."""
        json_value = {"config": {"timeout": 30, "retries": 3, "endpoints": ["api1", "api2"]}}

        setting = Setting.objects.create(
            key="json_setting",
            name="JSON Setting",
            value_type="json",
            default_value=json_value,
            scope_type=ScopeType.GLOBAL,
            created_by=self.user,
        )

        log_setting_created(setting, self.user)

        # Check audit event handles JSON serialization
        audit_event = AuditEvent.objects.filter(
            event_type="SETTING_CREATED", resource_id=str(setting.id)
        ).first()

        assert audit_event is not None
        metadata = audit_event.metadata
        assert metadata["default_value"] == json_value
        assert metadata["value_type"] == "json"

    def test_setting_update_with_validation_rules(self):
        """Test audit logging for setting with validation rules."""
        validation_rules = {"min_value": 0, "max_value": 100, "required": True}

        setting = Setting.objects.create(
            key="validated_setting",
            name="Validated Setting",
            value_type="number",
            default_value=50,
            validation_rules=validation_rules,
            scope_type=ScopeType.GLOBAL,
            created_by=self.user,
        )

        old_values = {"default_value": 50, "validation_rules": validation_rules}
        new_values = {
            "default_value": 75,
            "validation_rules": {
                "min_value": 0,
                "max_value": 100,
                "required": True,
                "step": 5,  # Added new rule
            },
        }

        # Update setting
        setting.default_value = 75
        setting.validation_rules = new_values["validation_rules"]
        setting.save()

        log_setting_updated(setting, self.user, old_values, new_values)

        # Check audit event
        audit_event = AuditEvent.objects.filter(
            event_type="SETTING_UPDATED", resource_id=str(setting.id)
        ).first()

        assert audit_event is not None

        metadata = audit_event.metadata
        assert metadata["changes"]["default_value"]["old"] == 50
        assert metadata["changes"]["default_value"]["new"] == 75
        assert "step" in metadata["changes"]["validation_rules"]["new"]

    def test_setting_resolution_audit_log(self):
        """Test audit logging when setting is resolved."""
        setting = Setting.objects.create(
            key="resolve_setting",
            name="Resolve Setting",
            value_type="string",
            default_value="default_value",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
            created_by=self.user,
        )

        resolve_context = {
            "organisation_id": self.organisation.id,
            "request_id": "req_123456",
            "source": "api",
        }

        log_setting_resolved(
            setting, resolved_value="resolved_value", user=self.user, context=resolve_context
        )

        # Check audit event
        audit_event = AuditEvent.objects.filter(
            event_type="SETTING_RESOLVED", resource_id=str(setting.id)
        ).first()

        assert audit_event is not None

        metadata = audit_event.metadata
        assert metadata["setting_key"] == "resolve_setting"
        assert metadata["resolved_value"] == "resolved_value"
        assert metadata["request_id"] == "req_123456"
        assert metadata["source"] == "api"


class TestAuditEventStructure(TestCase):
    """Test audit event structure and metadata."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )

    def test_audit_event_required_fields(self):
        """Test audit event has all required fields."""
        flag = FeatureFlag.objects.create(
            key="structure_flag",
            name="Structure Flag",
            scope_type=ScopeType.GLOBAL,
            default_value=True,
            created_by=self.user,
        )

        log_flag_created(flag, self.user)

        audit_event = AuditEvent.objects.filter(event_type="FEATURE_FLAG_CREATED").first()

        # Check required fields
        assert audit_event.event_type is not None
        assert audit_event.user is not None
        assert audit_event.timestamp is not None
        assert audit_event.resource_type is not None
        assert audit_event.resource_id is not None
        assert audit_event.metadata is not None

    def test_audit_event_timestamp_precision(self):
        """Test audit event timestamp precision."""
        before_time = datetime.now()

        flag = FeatureFlag.objects.create(
            key="timestamp_flag",
            name="Timestamp Flag",
            scope_type=ScopeType.GLOBAL,
            default_value=True,
            created_by=self.user,
        )

        log_flag_created(flag, self.user)

        after_time = datetime.now()

        audit_event = AuditEvent.objects.filter(event_type="FEATURE_FLAG_CREATED").first()

        # Timestamp should be within reasonable range
        assert before_time <= audit_event.timestamp <= after_time

    def test_audit_metadata_serialization(self):
        """Test complex metadata serialization."""
        complex_metadata = {
            "changes": {
                "nested_field": {
                    "old": {"a": 1, "b": [1, 2, 3]},
                    "new": {"a": 2, "b": [1, 2, 3, 4]},
                }
            },
            "context": {
                "user_agent": "Mozilla/5.0",
                "ip_address": "192.168.1.1",
                "session_id": "sess_abcdef123456",
            },
        }

        # Simulate creating audit event with complex metadata
        audit_event = AuditEvent.objects.create(
            event_type="TEST_EVENT",
            user=self.user,
            resource_type="TestResource",
            resource_id="123",
            metadata=complex_metadata,
        )

        # Retrieve and verify metadata
        retrieved_event = AuditEvent.objects.get(id=audit_event.id)
        assert retrieved_event.metadata == complex_metadata

    def test_audit_event_filtering_by_metadata(self):
        """Test filtering audit events by metadata fields."""
        # Create multiple events with different metadata
        for i in range(3):
            FeatureFlag.objects.create(
                key=f"filter_flag_{i}",
                name=f"Filter Flag {i}",
                scope_type=ScopeType.GLOBAL,
                default_value=bool(i % 2),
                created_by=self.user,
            )

        # Create audit events
        flags = FeatureFlag.objects.filter(key__startswith="filter_flag_")
        for flag in flags:
            log_flag_created(flag, self.user)

        # Filter by metadata
        events = AuditEvent.objects.filter(
            event_type="FEATURE_FLAG_CREATED", metadata__default_value=True
        )

        # Should find events for flags with default_value=True
        assert events.count() >= 1

        # Check that we can query nested metadata
        events_with_global_scope = AuditEvent.objects.filter(
            event_type="FEATURE_FLAG_CREATED", metadata__scope_type=ScopeType.GLOBAL.value
        )

        assert events_with_global_scope.count() == 3


class TestAuditEventPerformance(TestCase):
    """Test audit event performance and optimization."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )

    def test_bulk_audit_event_creation(self):
        """Test performance of creating multiple audit events."""
        # Create multiple flags
        flags = []
        for i in range(10):
            flag = FeatureFlag.objects.create(
                key=f"bulk_flag_{i}",
                name=f"Bulk Flag {i}",
                scope_type=ScopeType.GLOBAL,
                default_value=bool(i % 2),
                created_by=self.user,
            )
            flags.append(flag)

        # Log all creations
        for flag in flags:
            log_flag_created(flag, self.user)

        # Verify all events were created
        events = AuditEvent.objects.filter(event_type="FEATURE_FLAG_CREATED", user=self.user)

        assert events.count() == 10

    def test_large_metadata_handling(self):
        """Test handling of large metadata objects."""
        # Create large metadata object
        large_metadata = {
            "large_list": [f"item_{i}" for i in range(1000)],
            "large_dict": {f"key_{i}": f"value_{i}" for i in range(100)},
            "nested_structure": {
                "level1": {
                    "level2": {"level3": [{"id": i, "data": f"data_{i}"} for i in range(50)]}
                }
            },
        }

        audit_event = AuditEvent.objects.create(
            event_type="LARGE_METADATA_TEST",
            user=self.user,
            resource_type="TestResource",
            resource_id="large_test",
            metadata=large_metadata,
        )

        # Verify retrieval still works
        retrieved_event = AuditEvent.objects.get(id=audit_event.id)
        assert len(retrieved_event.metadata["large_list"]) == 1000
        assert len(retrieved_event.metadata["large_dict"]) == 100

    @patch("src.audit.services.async_log_event")
    def test_async_audit_logging(self, mock_async_log):
        """Test asynchronous audit event logging."""
        mock_async_log.return_value = True

        flag = FeatureFlag.objects.create(
            key="async_flag",
            name="Async Flag",
            scope_type=ScopeType.GLOBAL,
            default_value=True,
            created_by=self.user,
        )

        # Simulate async logging
        log_flag_created(flag, self.user, async_log=True)

        # Verify async logging was called
        mock_async_log.assert_called_once()


class TestAuditEventIntegration(TestCase):
    """Test audit event integration with other systems."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.organisation = Organisation.objects.create(
            name="Test Org", slug="test-org", creator=self.user
        )

    @patch("src.audit.signals.audit_event_created")
    def test_audit_event_signal_emission(self, mock_signal):
        """Test that audit events emit signals."""
        flag = FeatureFlag.objects.create(
            key="signal_flag",
            name="Signal Flag",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
            default_value=True,
            created_by=self.user,
        )

        log_flag_created(flag, self.user)

        # Verify signal was emitted
        mock_signal.send.assert_called()

    def test_audit_event_compliance_fields(self):
        """Test audit events include compliance-required fields."""
        flag = FeatureFlag.objects.create(
            key="compliance_flag",
            name="Compliance Flag",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
            default_value=True,
            created_by=self.user,
        )

        log_flag_created(flag, self.user)

        audit_event = AuditEvent.objects.filter(event_type="FEATURE_FLAG_CREATED").first()

        # Check compliance fields
        assert audit_event.user is not None  # Who
        assert audit_event.timestamp is not None  # When
        assert audit_event.resource_type is not None  # What
        assert audit_event.resource_id is not None  # Which

        # Context should include where (organisation)
        metadata = audit_event.metadata
        assert "organisation_id" in metadata  # Where

    def test_audit_trail_completeness(self):
        """Test complete audit trail for flag lifecycle."""
        # Create flag
        flag = FeatureFlag.objects.create(
            key="lifecycle_flag",
            name="Lifecycle Flag",
            scope_type=ScopeType.GLOBAL,
            default_value=False,
            created_by=self.user,
        )
        log_flag_created(flag, self.user)

        # Update flag
        old_values = {"name": "Lifecycle Flag", "default_value": False}
        flag.name = "Updated Lifecycle Flag"
        flag.default_value = True
        flag.save()
        new_values = {"name": "Updated Lifecycle Flag", "default_value": True}
        log_flag_updated(flag, self.user, old_values, new_values)

        # Resolve flag
        log_flag_resolved(flag, resolved_value=True, user=self.user)

        # Delete flag
        flag_id = flag.id
        flag_data = {"key": flag.key, "name": flag.name}
        flag.delete()
        log_flag_deleted(flag_id, flag_data, self.user)

        # Check complete audit trail
        events = AuditEvent.objects.filter(
            resource_type="FeatureFlag", resource_id=str(flag_id)
        ).order_by("timestamp")

        assert events.count() == 4
        assert events[0].event_type == "FEATURE_FLAG_CREATED"
        assert events[1].event_type == "FEATURE_FLAG_UPDATED"
        assert events[2].event_type == "FEATURE_FLAG_RESOLVED"
        assert events[3].event_type == "FEATURE_FLAG_DELETED"
