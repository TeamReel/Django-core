"""
Unit tests for audit API.

Tests cover:
- Success cases: All valid recording scenarios
- Validation: Unregistered event types, oversized metadata
- Graceful failure: Database errors, signal emission, metrics
"""

import pytest
from src.audit.api import audit_log
from src.audit.models import AuditEvent
from src.audit.registry import register_event_type
from django.contrib.auth import get_user_model
from django.test import RequestFactory

User = get_user_model()


@pytest.fixture
def user(db):
    """Create test user."""
    return User.objects.create_user(email="test@example.com", password="testpass123")


@pytest.fixture
def organization(db, user):
    """Create test organization."""
    from organisations.models import Organisation

    return Organisation.objects.create(name="Test Org", creator=user)


@pytest.fixture
def project(db, organization, user):
    """Create test project."""
    from projects.models import Project

    return Project.objects.create(name="Test Project", organisation=organization, creator=user)


@pytest.fixture(autouse=True)
def register_test_event_type():
    """Register test event type for all tests."""
    from audit.registry import is_event_type_registered

    if not is_event_type_registered("test.event"):
        register_event_type("test.event", "test", "Test event")


class TestAuditLogRecordSuccess:
    """Test successful audit event recording."""

    def test_record_minimal_event(self, db):
        """Can record event with only event_type."""
        event = audit_log.record("test.event")

        assert event is not None
        assert event.event_type == "test.event"
        assert event.user is None
        assert event.organization is None
        assert event.project is None
        assert event.metadata == {}

    def test_record_with_user(self, user):
        """Can record event with user."""
        event = audit_log.record("test.event", user=user)

        assert event is not None
        assert event.user == user

    def test_record_with_organization(self, organization):
        """Can record event with organization context."""
        event = audit_log.record("test.event", organization=organization)

        assert event is not None
        assert event.organization == organization

    def test_record_with_project(self, project):
        """Can record event with project context."""
        event = audit_log.record("test.event", project=project)

        assert event is not None
        assert event.project == project

    def test_record_with_metadata(self, db):
        """Can record event with metadata."""
        metadata = {"action": "create", "resource_id": "123"}
        event = audit_log.record("test.event", metadata=metadata)

        assert event is not None
        assert event.metadata == metadata

    def test_record_with_request(self, db):
        """Auto-captures IP and user agent from request."""
        factory = RequestFactory()
        request = factory.get("/", REMOTE_ADDR="192.168.1.100")
        request.META["HTTP_USER_AGENT"] = "TestBot/1.0"

        event = audit_log.record("test.event", request=request)

        assert event is not None
        assert event.metadata["ip"] == "192.168.1.100"
        assert event.metadata["user_agent"] == "TestBot/1.0"

    def test_record_with_request_preserves_explicit_ip(self, db):
        """Explicit IP in metadata not overwritten by request."""
        factory = RequestFactory()
        request = factory.get("/", REMOTE_ADDR="192.168.1.100")

        event = audit_log.record(
            "test.event",
            metadata={"ip": "10.0.0.1"},  # Explicit override
            request=request,
        )

        assert event is not None
        assert event.metadata["ip"] == "10.0.0.1"  # Preserved

    def test_record_with_all_fields(self, user, organization, project):
        """Can record event with all fields."""
        factory = RequestFactory()
        request = factory.get("/", REMOTE_ADDR="192.168.1.100")
        metadata = {"action": "create"}

        event = audit_log.record(
            "test.event",
            user=user,
            organization=organization,
            project=project,
            metadata=metadata,
            request=request,
        )

        assert event is not None
        assert event.event_type == "test.event"
        assert event.user == user
        assert event.organization == organization
        assert event.project == project
        assert event.metadata["action"] == "create"
        assert event.metadata["ip"] == "192.168.1.100"

    def test_record_increments_prometheus_counter(self, db, mocker):
        """Recording event increments Prometheus counter."""
        mock_counter = mocker.patch("audit.api.audit_events_recorded_total")

        audit_log.record("test.event")

        mock_counter.labels.assert_called_once_with(event_type="test.event")
        mock_counter.labels.return_value.inc.assert_called_once()

    def test_event_persisted_to_database(self, db):
        """Recorded event persists to database."""
        event = audit_log.record("test.event", metadata={"test": True})

        assert event is not None
        # Retrieve from database
        db_event = AuditEvent.objects.get(id=event.id)
        assert db_event.event_type == "test.event"
        assert db_event.metadata["test"] is True


class TestAuditLogValidation:
    """Test audit event validation."""

    def test_unregistered_event_type_raises_error(self, db):
        """Recording unregistered event type raises ValueError."""
        with pytest.raises(ValueError, match="not registered"):
            audit_log.record("unregistered.event")

    def test_metadata_too_large_raises_error(self, db):
        """Metadata >10KB raises ValueError."""
        # Create metadata slightly over 10KB
        large_metadata = {"data": "x" * 11000}

        with pytest.raises(ValueError, match="exceeds 10KB limit"):
            audit_log.record("test.event", metadata=large_metadata)

    def test_metadata_size_error_message_shows_actual_size(self, db):
        """ValueError message includes actual metadata size."""
        large_metadata = {"data": "x" * 15000}

        with pytest.raises(ValueError, match=r"\d+\.\d+KB exceeds 10KB"):
            audit_log.record("test.event", metadata=large_metadata)

    def test_metadata_at_10kb_boundary_succeeds(self, db):
        """Metadata just under 10KB is allowed."""
        # Create metadata just under 10KB
        # JSON overhead: '{"data":"' + ... + '"}' = 11 bytes
        # Target: 10239 bytes total (just under 10240)
        data_size = 10239 - 11  # Subtract JSON overhead
        metadata = {"data": "x" * data_size}

        event = audit_log.record("test.event", metadata=metadata)
        assert event is not None

    def test_unicode_metadata_size_calculated_correctly(self, db):
        """Metadata size accounts for UTF-8 encoding."""
        # Unicode characters take more bytes than characters
        # '你好' = 2 chars, 6 bytes in UTF-8
        large_unicode = {"text": "你好" * 2000}  # ~12KB

        with pytest.raises(ValueError, match="exceeds 10KB limit"):
            audit_log.record("test.event", metadata=large_unicode)


class TestAuditLogGracefulFailure:
    """Test graceful failure when database unavailable."""

    def test_database_error_returns_none(self, db, mocker):
        """Database error returns None instead of raising."""
        # Mock AuditEvent.objects.create to raise exception
        mocker.patch(
            "audit.models.AuditEvent.objects.create",
            side_effect=Exception("Database connection lost"),
        )

        event = audit_log.record("test.event")

        assert event is None  # Graceful failure

    def test_database_error_emits_signal(self, db, mocker):
        """Database error emits audit_record_failed signal."""
        from audit.signals import audit_record_failed

        # Mock database error
        mocker.patch(
            "audit.models.AuditEvent.objects.create",
            side_effect=Exception("Database error"),
        )

        # Mock signal handler
        handler = mocker.Mock()
        audit_record_failed.connect(handler)

        audit_log.record("test.event")

        # Verify signal emitted
        handler.assert_called_once()
        call_kwargs = handler.call_args.kwargs
        assert call_kwargs["event_type"] == "test.event"
        assert isinstance(call_kwargs["exception"], Exception)

    def test_database_error_increments_failure_counter(self, db, mocker):
        """Database error increments audit_failures_total metric."""
        mocker.patch(
            "audit.models.AuditEvent.objects.create",
            side_effect=Exception("Database error"),
        )
        mock_counter = mocker.patch("audit.api.audit_failures_total")

        audit_log.record("test.event")

        mock_counter.labels.assert_called_once_with(event_type="test.event", error_type="Exception")
        mock_counter.labels.return_value.inc.assert_called_once()

    def test_database_error_logs_exception(self, db, mocker, caplog):
        """Database error logs exception details."""
        import logging

        caplog.set_level(logging.ERROR)

        mocker.patch(
            "audit.models.AuditEvent.objects.create",
            side_effect=Exception("Database error"),
        )

        audit_log.record("test.event")

        assert "Failed to record audit event" in caplog.text
        assert "test.event" in caplog.text
