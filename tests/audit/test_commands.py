"""
Tests for audit management commands.

Test the audit_seed command functionality and other management commands.
"""

import csv
from datetime import timedelta
from io import StringIO

import pytest
from audit.api import audit_log
from audit.models import AuditEvent
from audit.registry import is_event_type_registered
from django.core.management import call_command
from django.utils import timezone


@pytest.mark.django_db
class TestAuditSeedCommand:
    """Tests for audit_seed management command."""

    def test_seed_default_count(self, admin_user, db):
        """Command generates 100 events by default."""
        # Create minimal data
        from organisations.models import Organisation
        from projects.models import Project

        org = Organisation.objects.create(name="Test Org", creator=admin_user)
        Project.objects.create(name="Test Project", organisation=org, creator=admin_user)

        # Run command
        out = StringIO()
        call_command("audit_seed", stdout=out)

        # Verify events created
        assert AuditEvent.objects.count() >= 100
        assert "Successfully generated 100 audit events" in out.getvalue()

    def test_seed_custom_count(self, admin_user, db):
        """Command accepts custom count via --count argument."""
        # Create minimal data
        from organisations.models import Organisation
        from projects.models import Project

        org = Organisation.objects.create(name="Test Org", creator=admin_user)
        Project.objects.create(name="Test Project", organisation=org, creator=admin_user)

        # Run command with custom count
        out = StringIO()
        call_command("audit_seed", count=25, stdout=out)

        # Verify events created
        assert AuditEvent.objects.count() >= 25
        assert "Successfully generated 25 audit events" in out.getvalue()

    def test_seed_registers_event_types(self, admin_user, db):
        """Command registers all event types it uses."""
        # Create minimal data
        from organisations.models import Organisation

        Organisation.objects.create(name="Test Org", creator=admin_user)

        # Run command
        call_command("audit_seed", count=10, stdout=StringIO())

        # Verify event types registered
        assert is_event_type_registered("auth.login")
        assert is_event_type_registered("auth.logout")
        assert is_event_type_registered("auth.login_failed")
        assert is_event_type_registered("permission.checked")
        assert is_event_type_registered("role.assigned")
        assert is_event_type_registered("config.updated")
        assert is_event_type_registered("resource.created")

    def test_seed_diverse_events(self, admin_user, db):
        """Command generates diverse event types."""
        # Create minimal data
        from organisations.models import Organisation

        Organisation.objects.create(name="Test Org", creator=admin_user)

        # Run command
        call_command("audit_seed", count=50, stdout=StringIO())

        # Verify we have multiple event types
        event_types = set(AuditEvent.objects.values_list("event_type", flat=True))
        assert len(event_types) >= 5  # At least 5 different event types

    def test_seed_progress_indicator(self, admin_user, db):
        """Command shows progress every 20 events."""
        # Create minimal data
        from organisations.models import Organisation

        Organisation.objects.create(name="Test Org", creator=admin_user)

        # Run command
        out = StringIO()
        call_command("audit_seed", count=50, stdout=out)

        output = out.getvalue()
        # Should see progress at 20, 40, and completion
        assert "20/50" in output or "Generated 20" in output
        assert "40/50" in output or "Generated 40" in output


@pytest.mark.django_db
class TestAuditListEventTypesCommand:
    """Test audit_list_event_types command."""

    def test_list_event_types_shows_core_types(self):
        """Command lists all core event types including 13 core types."""
        out = StringIO()
        call_command("audit_list_event_types", stdout=out)
        output = out.getvalue()

        # Verify core event types present
        assert "auth.login" in output
        assert "permission.checked" in output
        assert "role.assigned" in output
        # Should show at least 13 core types (may be more from other tests)
        assert "Registered Event Types" in output


@pytest.mark.django_db
class TestAuditExportCommand:
    """Test audit_export command."""

    @pytest.fixture
    def sample_events(self):
        """Create sample events for export."""
        from audit.registry import is_event_type_registered, register_event_type

        # Register test event type if not already registered
        if not is_event_type_registered("test.event"):
            register_event_type("test.event", "test", "Test event")

        events = []
        for i in range(10):
            event = audit_log.record("test.event", metadata={"index": i})
            events.append(event)
        return events

    def test_export_creates_csv_file(self, sample_events, tmp_path):
        """Command creates CSV file with events."""
        output_path = tmp_path / "events.csv"

        call_command("audit_export", output=str(output_path), days=1)

        # Verify file created
        assert output_path.exists()

        # Verify content
        with open(output_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
            assert len(rows) == 10
            assert rows[0]["Event Type"] == "test.event"

    def test_export_filters_by_event_type(self, tmp_path):
        """Command filters by event type."""
        # Create mixed events (using already-registered core types)
        audit_log.record("auth.login")
        audit_log.record("auth.logout")
        audit_log.record("permission.checked")

        output_path = tmp_path / "events.csv"

        call_command(
            "audit_export",
            output=str(output_path),
            days=1,
            event_types="auth.login,auth.logout",
        )

        # Verify only auth events exported
        with open(output_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
            assert len(rows) == 2
            for row in rows:
                assert row["Event Type"] in ["auth.login", "auth.logout"]

    def test_export_filters_by_date_range(self, tmp_path):
        """Command filters by date range."""
        from audit.registry import is_event_type_registered, register_event_type

        # Register test event type if not already registered
        if not is_event_type_registered("test.event"):
            register_event_type("test.event", "test", "Test event")

        # Create old event
        old_event = audit_log.record("test.event", metadata={"label": "old"})
        old_event.created_at = timezone.now() - timedelta(days=10)
        old_event.save(update_fields=["created_at"])

        # Create recent event
        audit_log.record("test.event", metadata={"label": "recent"})

        output_path = tmp_path / "events.csv"

        # Export last 5 days (excludes 10-day-old event)
        call_command("audit_export", output=str(output_path), days=5)

        with open(output_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
            assert len(rows) == 1
            assert '"label": "recent"' in rows[0]["Metadata"]


@pytest.mark.django_db
class TestAuditCleanupCommand:
    """Test audit_cleanup command."""

    @pytest.fixture
    def old_events(self):
        """Create old events for cleanup."""
        from audit.registry import is_event_type_registered, register_event_type

        # Register test event type if not already registered
        if not is_event_type_registered("test.event"):
            register_event_type("test.event", "test", "Test event")

        events = []
        for i in range(5):
            event = audit_log.record("test.event", metadata={"index": i})
            event.created_at = timezone.now() - timedelta(days=100)
            event.save(update_fields=["created_at"])
            events.append(event)
        return events

    def test_cleanup_dry_run_shows_count(self, old_events):
        """Dry run shows count without deleting."""
        out = StringIO()
        call_command("audit_cleanup", days=90, dry_run=True, stdout=out)
        output = out.getvalue()

        # Verify shows 5 events
        assert "5 events" in output
        assert "DRY RUN" in output

        # Verify events not deleted
        assert AuditEvent.objects.count() == 5

    def test_cleanup_deletes_old_events(self, old_events, monkeypatch):
        """Command deletes old events with confirmation."""
        # Mock input to auto-confirm
        monkeypatch.setattr("builtins.input", lambda _: "DELETE")

        out = StringIO()
        call_command("audit_cleanup", days=90, stdout=out)
        output = out.getvalue()

        # Verify deletion
        assert "Successfully deleted 5 events" in output
        assert AuditEvent.objects.count() == 0

    def test_cleanup_preserves_recent_events(self, monkeypatch):
        """Command only deletes old events, not recent."""
        from audit.registry import is_event_type_registered, register_event_type

        # Register test event type if not already registered
        if not is_event_type_registered("test.event"):
            register_event_type("test.event", "test", "Test event")

        # Create old event
        old_event = audit_log.record("test.event", metadata={"label": "old"})
        old_event.created_at = timezone.now() - timedelta(days=100)
        old_event.save(update_fields=["created_at"])

        # Create recent event
        audit_log.record("test.event", metadata={"label": "recent"})

        # Mock confirmation
        monkeypatch.setattr("builtins.input", lambda _: "DELETE")

        call_command("audit_cleanup", days=90)

        # Verify only old event deleted
        assert AuditEvent.objects.count() == 1
        assert AuditEvent.objects.first().metadata["label"] == "recent"

    def test_cleanup_cancelled_without_confirmation(self, old_events, monkeypatch):
        """Command cancels without proper confirmation."""
        # Mock incorrect confirmation
        monkeypatch.setattr("builtins.input", lambda _: "no")

        out = StringIO()
        call_command("audit_cleanup", days=90, stdout=out)
        output = out.getvalue()

        # Verify cancelled
        assert "cancelled" in output.lower()

        # Verify events not deleted
        assert AuditEvent.objects.count() == 5
