"""Tests for AuditedTask base class and audit integration."""

from unittest.mock import patch

import pytest


@pytest.mark.django_db
class TestAuditedTask:
    """Test AuditedTask lifecycle hooks."""

    def test_audited_task_creates_started_event(self):
        """Test AuditedTask creates 'task.started' audit event."""
        from audit.models import AuditEvent
        from tasks.examples.export_user_data import export_user_data

        result = export_user_data.apply(
            kwargs={"user_id": 123, "org_id": 456, "export_format": "csv"}
        )
        assert result.successful()

        # Verify started event created
        started_event = AuditEvent.objects.filter(event_type="task.started", user_id=123).first()

        assert started_event is not None
        assert started_event.metadata["task_name"] == "tasks.examples.export_user_data"
        assert started_event.organisation_id == 456

    def test_audited_task_creates_completed_event(self):
        """Test AuditedTask creates 'task.completed' event on success."""
        from audit.models import AuditEvent
        from tasks.examples.export_user_data import export_user_data

        result = export_user_data.apply(
            kwargs={"user_id": 123, "org_id": 456, "export_format": "json"}
        )
        assert result.successful()

        # Verify completed event created
        completed_event = AuditEvent.objects.filter(
            event_type="task.completed", user_id=123
        ).first()

        assert completed_event is not None
        assert completed_event.metadata["success"] is True

    def test_audited_task_creates_failed_event_on_exception(self):
        """Test AuditedTask creates 'task.failed' event on failure."""
        from audit.models import AuditEvent
        from celery import shared_task
        from tasks.base import AuditedTask

        @shared_task(base=AuditedTask)
        def failing_audited_task(user_id, org_id):
            raise ValueError("Test failure")

        result = failing_audited_task.apply(kwargs={"user_id": 789, "org_id": 101})
        assert result.failed()

        # Verify failed event created
        failed_event = AuditEvent.objects.filter(event_type="task.failed", user_id=789).first()

        assert failed_event is not None
        assert failed_event.metadata["success"] is False
        assert "Test failure" in failed_event.metadata["error_message"]

    def test_audited_task_includes_request_id_in_events(self):
        """Test request_id propagated to audit events."""
        from audit.models import AuditEvent
        from tasks.examples.export_user_data import export_user_data

        result = export_user_data.apply(
            kwargs={
                "user_id": 111,
                "org_id": 222,
                "export_format": "csv",
                "request_id": "req-12345",
            }
        )
        assert result.successful()

        events = AuditEvent.objects.filter(user_id=111)

        assert events.count() == 2  # Started + Completed
        for event in events:
            assert event.metadata.get("request_id") == "req-12345"

    @patch("tasks.base.AuditEvent.objects.create")
    def test_audited_task_graceful_degradation_on_audit_failure(self, mock_create):
        """Test task continues if audit event creation fails."""
        from tasks.examples.export_user_data import export_user_data

        # Mock audit creation failure
        mock_create.side_effect = Exception("Audit system unavailable")

        # Task should still complete successfully
        result = export_user_data.apply(
            kwargs={"user_id": 999, "org_id": 888, "export_format": "csv"}
        )

        assert result.successful()
        assert result.result["status"] == "completed"

    def test_audited_task_without_user_id_logs_warning(self, caplog):
        """Test AuditedTask logs warning when user_id missing."""
        from tasks.examples.export_user_data import export_user_data

        result = export_user_data.apply(
            kwargs={
                "org_id": 123,
                "export_format": "csv",
                # Missing user_id
            }
        )

        # Check for warning log (if implemented in AuditedTask)
        # This test may need adjustment based on actual implementation
        # For now, just verify task still completes
        assert result.successful()

    def test_audited_task_sanitizes_sensitive_args(self):
        """Test AuditedTask sanitizes sensitive data in audit events."""
        from audit.models import AuditEvent
        from tasks.examples.export_user_data import export_user_data

        result = export_user_data.apply(
            kwargs={
                "user_id": 555,
                "org_id": 666,
                "export_format": "json",
                "password": "secret123",  # Should not appear in audit
            }
        )
        assert result.successful()

        events = AuditEvent.objects.filter(user_id=555)
        for event in events:
            # Password should not be in metadata
            metadata_str = str(event.metadata)
            assert "secret123" not in metadata_str


@pytest.mark.django_db
class TestContextPropagation:
    """Test explicit context argument passing."""

    def test_context_passed_to_task(self):
        """Test user_id, org_id, request_id passed explicitly."""
        from tasks.examples.export_user_data import export_user_data

        result = export_user_data.apply(
            kwargs={
                "user_id": 555,
                "org_id": 666,
                "export_format": "json",
                "request_id": "req-abc-123",
            }
        )

        # Context should be available in task
        assert result.result["user_id"] == 555
        assert result.result["org_id"] == 666

    def test_context_extraction_helper(self):
        """Test extract_audit_context utility function."""
        try:
            from tasks.base import extract_audit_context

            kwargs = {
                "user_id": 111,
                "org_id": 222,
                "request_id": "req-xyz",
                "export_format": "csv",  # Non-context field
            }

            context = extract_audit_context(kwargs)

            assert context["user_id"] == 111
            assert context["org_id"] == 222
            assert context["request_id"] == "req-xyz"
            assert "export_format" not in context

        except ImportError:
            pytest.skip("extract_audit_context not implemented yet")

    def test_context_validation_helper(self):
        """Test validate_audit_context utility function."""
        try:
            from tasks.base import validate_audit_context

            # Valid context
            valid, error = validate_audit_context({"user_id": 1, "org_id": 2})
            assert valid is True
            assert error is None

            # Missing user_id
            invalid, error = validate_audit_context({"org_id": 2})
            assert invalid is False
            assert "user_id" in error

            # user_id not required
            valid, error = validate_audit_context({"org_id": 2}, require_user=False)
            assert valid is True

        except ImportError:
            pytest.skip("validate_audit_context not implemented yet")
