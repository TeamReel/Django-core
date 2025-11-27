"""
Tests for audit management commands.

Test the audit_seed command functionality.
"""

from io import StringIO

import pytest
from audit.models import AuditEvent
from audit.registry import is_event_type_registered
from django.core.management import call_command


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
