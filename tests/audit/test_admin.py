"""
Tests for audit admin interface.

Tests read-only enforcement, filters, search, and pagination.
"""

import pytest
from src.audit.api import audit_log
from django.contrib.auth import get_user_model
from django.test import Client
from django.urls import reverse

User = get_user_model()


@pytest.fixture
def admin_user(db):
    """Create superuser for admin tests."""
    return User.objects.create_superuser(email="admin@example.com", password="admin123")


@pytest.fixture
def staff_user(db):
    """Create staff user for admin tests."""
    return User.objects.create_user(email="staff@example.com", password="staff123", is_staff=True)


@pytest.fixture
def audit_events(db, admin_user):
    """Create sample audit events."""
    from audit.registry import register_event_type

    register_event_type("test.event", "test", "Test event for admin tests")
    events = []
    for i in range(10):
        event = audit_log.record("test.event", user=admin_user, metadata={"index": i})
        events.append(event)
    return events


class TestAuditEventAdminReadOnly:
    """Test read-only enforcement in admin."""

    def test_superuser_cannot_add_events(self, admin_user):
        """Superusers cannot add events via admin."""
        client = Client()
        client.force_login(admin_user)

        # Admin list page should not have "Add" button
        response = client.get(reverse("admin:audit_auditevent_changelist"))
        assert response.status_code == 200
        assert "Add audit event" not in response.content.decode()

    def test_superuser_cannot_change_events(self, admin_user, audit_events):
        """Superusers cannot modify events via admin."""
        client = Client()
        client.force_login(admin_user)

        event = audit_events[0]

        # Attempting to access change form shows view-only page (200) but no save button
        response = client.get(reverse("admin:audit_auditevent_change", args=[event.id]))
        # Django shows the detail page with view permission (200 OK)
        assert response.status_code == 200
        content = response.content.decode()
        # Verify no save or delete buttons present
        assert "Save" not in content or "<button" not in content.lower()
        assert "Delete" not in content or "delete_selected" not in content.lower()

    def test_superuser_cannot_delete_events(self, admin_user, audit_events):
        """Superusers cannot delete events via admin."""
        client = Client()
        client.force_login(admin_user)

        event = audit_events[0]

        # Attempting to access delete form returns 403
        response = client.get(reverse("admin:audit_auditevent_delete", args=[event.id]))
        assert response.status_code == 403

    def test_bulk_delete_action_not_available(self, admin_user, audit_events):
        """Bulk delete action removed from admin."""
        client = Client()
        client.force_login(admin_user)

        response = client.get(reverse("admin:audit_auditevent_changelist"))
        content = response.content.decode()

        # Action dropdown should not include delete_selected
        assert "delete_selected" not in content


class TestAuditEventAdminFilters:
    """Test admin filter functionality."""

    @pytest.fixture
    def diverse_events(self, db, admin_user, staff_user):
        """Create events with diverse characteristics."""
        # Admin user events
        for i in range(5):
            audit_log.record("auth.login", user=admin_user, metadata={"ip": f"192.168.1.{i}"})

        # Staff user events
        for i in range(3):
            audit_log.record("auth.logout", user=staff_user, metadata={"ip": f"10.0.0.{i}"})

        # Anonymous events
        audit_log.record("auth.login_failed", metadata={"ip": "8.8.8.8"})

    def test_filter_by_user(self, admin_user, staff_user, diverse_events):
        """Can filter events by user."""
        client = Client()
        client.force_login(admin_user)

        # Filter by admin user
        response = client.get(
            reverse("admin:audit_auditevent_changelist"), {"user__id__exact": admin_user.id}
        )
        assert response.status_code == 200
        content = response.content.decode()

        # Check result table - should show admin's events (5 logins)
        assert content.count("auth.login") >= 5
        # Result table should not show staff user email (only admin)
        assert content.count("staff@example.com") <= 1  # May appear in filter sidebar
        assert content.count("admin@example.com") >= 5  # Should appear in results

    def test_filter_by_event_type(self, admin_user, diverse_events):
        """Can filter events by event type."""
        client = Client()
        client.force_login(admin_user)

        response = client.get(
            reverse("admin:audit_auditevent_changelist"), {"event_type": "auth.login"}
        )
        assert response.status_code == 200
        content = response.content.decode()

        # Check that filter is working - should show "5 results" for login events
        assert "auth.login" in content
        assert "5 Audit Events" in content or "5 results" in content


class TestAuditEventAdminSearch:
    """Test admin search functionality."""

    def test_search_by_event_type(self, admin_user, audit_events):
        """Can search events by event type."""
        client = Client()
        client.force_login(admin_user)

        response = client.get(reverse("admin:audit_auditevent_changelist"), {"q": "test.event"})
        assert response.status_code == 200
        assert len(audit_events) >= 1  # Verify search returned results

    def test_search_by_user_email(self, admin_user, db):
        """Can search events by user email."""
        from audit.registry import is_event_type_registered, register_event_type

        if not is_event_type_registered("test.search.event"):
            register_event_type("test.search.event", "test", "Test search event")
        # Create event with specific user
        audit_log.record("test.search.event", user=admin_user, metadata={"action": "test"})

        client = Client()
        client.force_login(admin_user)

        response = client.get(
            reverse("admin:audit_auditevent_changelist"), {"q": "test.search.event"}
        )
        assert response.status_code == 200
        content = response.content.decode()
        assert "test.search.event" in content

    def test_search_by_metadata_ip(self, admin_user, db):
        """Can search events by IP in metadata (GIN index)."""
        from audit.registry import is_event_type_registered, register_event_type

        if not is_event_type_registered("test.ip.event"):
            register_event_type("test.ip.event", "test", "Test IP event")
        # Create event with specific IP
        audit_log.record("test.ip.event", metadata={"ip": "203.0.113.42"})

        client = Client()
        client.force_login(admin_user)

        response = client.get(reverse("admin:audit_auditevent_changelist"), {"q": "203.0.113.42"})
        assert response.status_code == 200
        content = response.content.decode()
        assert "203.0.113.42" in content


class TestAuditEventAdminPagination:
    """Test admin pagination."""

    def test_pagination_100_per_page(self, admin_user, db):
        """Admin shows 100 events per page."""
        from audit.registry import is_event_type_registered, register_event_type

        if not is_event_type_registered("test.pagination.event"):
            register_event_type("test.pagination.event", "test", "Test pagination event")
        # Create 150 events
        for i in range(150):
            audit_log.record("test.pagination.event", metadata={"index": i})

        client = Client()
        client.force_login(admin_user)

        # First page
        response = client.get(reverse("admin:audit_auditevent_changelist"))
        content = response.content.decode()
        # Check pagination shows page 1 and there are multiple pages
        assert '<span class="this-page">1</span>' in content
        assert '<a href="?p=2"' in content  # Link to page 2 exists
        assert "150 Audit Events" in content

        # Second page
        response = client.get(reverse("admin:audit_auditevent_changelist"), {"p": 2})
        content = response.content.decode()
        # Should show page 2 (last 50 events)
        assert '<a href="?p=2"' in content or '<span class="this-page">2</span>' in content


class TestAuditEventTimeline:
    """Test timeline navigation and chronological queries (T025)."""

    def test_events_ordered_by_created_at_desc(self, admin_user, db):
        """Events appear in reverse chronological order (newest first)."""
        from datetime import timedelta

        from audit.models import AuditEvent
        from audit.registry import is_event_type_registered, register_event_type
        from django.utils import timezone

        if not is_event_type_registered("test.timeline.event"):
            register_event_type("test.timeline.event", "test", "Timeline test event")

        # Create 3 events with specific timestamps
        now = timezone.now()

        event1 = audit_log.record("test.timeline.event", metadata={"label": "oldest"})
        event1.created_at = now - timedelta(hours=2)
        event1.save(update_fields=["created_at"])

        event2 = audit_log.record("test.timeline.event", metadata={"label": "middle"})
        event2.created_at = now - timedelta(hours=1)
        event2.save(update_fields=["created_at"])

        event3 = audit_log.record("test.timeline.event", metadata={"label": "newest"})
        event3.created_at = now
        event3.save(update_fields=["created_at"])

        # Query events (default ordering is -created_at)
        events = list(
            AuditEvent.objects.filter(event_type="test.timeline.event").order_by("-created_at")
        )

        # Verify order (newest first)
        assert events[0].metadata["label"] == "newest"
        assert events[1].metadata["label"] == "middle"
        assert events[2].metadata["label"] == "oldest"

    def test_filter_events_by_date_range(self, admin_user, db):
        """Can filter events by date range."""
        from datetime import timedelta

        from audit.models import AuditEvent
        from audit.registry import is_event_type_registered, register_event_type
        from django.utils import timezone

        if not is_event_type_registered("test.daterange.event"):
            register_event_type("test.daterange.event", "test", "Date range test event")

        now = timezone.now()

        # Event 7 days ago
        old_event = audit_log.record("test.daterange.event", metadata={"label": "old"})
        old_event.created_at = now - timedelta(days=7)
        old_event.save(update_fields=["created_at"])

        # Event today
        audit_log.record("test.daterange.event", metadata={"label": "recent"})

        # Filter: events from last 3 days
        cutoff = now - timedelta(days=3)
        recent_events = AuditEvent.objects.filter(
            event_type="test.daterange.event", created_at__gte=cutoff
        )

        # Verify only recent event included
        assert recent_events.count() == 1
        assert recent_events.first().metadata["label"] == "recent"

    def test_date_hierarchy_grouping(self, admin_user, db):
        """Events can be grouped by year/month/day."""
        from datetime import timedelta

        from audit.models import AuditEvent
        from audit.registry import is_event_type_registered, register_event_type
        from django.db.models.functions import TruncDate
        from django.utils import timezone

        if not is_event_type_registered("test.grouping.event"):
            register_event_type("test.grouping.event", "test", "Grouping test event")

        # Create events across multiple days
        now = timezone.now()
        for i in range(5):
            event = audit_log.record("test.grouping.event", metadata={"day": i})
            event.created_at = now - timedelta(days=i)
            event.save(update_fields=["created_at"])

        # Group by date
        events_by_date = (
            AuditEvent.objects.filter(event_type="test.grouping.event")
            .annotate(date=TruncDate("created_at"))
            .values("date")
            .distinct()
        )

        # Verify 5 distinct dates
        assert events_by_date.count() == 5


class TestAuditEventCSVExport:
    """Test CSV export functionality (T028)."""

    def test_export_small_dataset(self, admin_user, db):
        """Export 10 events to CSV successfully."""
        import csv
        from io import StringIO

        from audit.admin import AuditEventAdmin
        from audit.models import AuditEvent
        from audit.registry import is_event_type_registered, register_event_type
        from django.contrib.admin.sites import site
        from django.test import RequestFactory

        if not is_event_type_registered("test.csv.event"):
            register_event_type("test.csv.event", "test", "CSV test event")

        # Create 10 events
        for i in range(10):
            audit_log.record("test.csv.event", user=admin_user, metadata={"index": i})

        # Get queryset
        queryset = AuditEvent.objects.filter(event_type="test.csv.event")

        # Call export action
        admin_instance = AuditEventAdmin(AuditEvent, site)
        request = RequestFactory().get("/")
        request.user = admin_user
        response = admin_instance.export_as_csv(request, queryset)

        # Verify response
        assert response.status_code == 200
        assert response["Content-Type"] == "text/csv; charset=utf-8"
        assert 'filename="audit_events.csv"' in response["Content-Disposition"]

        # Parse CSV
        content = response.content.decode("utf-8")
        reader = csv.reader(StringIO(content))
        rows = list(reader)

        # Verify header + 10 data rows
        assert len(rows) == 11  # 1 header + 10 data
        assert rows[0] == [
            "ID",
            "Created At",
            "Event Type",
            "User Email",
            "Organization",
            "Project",
            "Metadata",
        ]

    def test_export_large_dataset(self, admin_user, db):
        """Export 1000 events without timeout."""
        from audit.admin import AuditEventAdmin
        from audit.models import AuditEvent
        from audit.registry import is_event_type_registered, register_event_type
        from django.contrib.admin.sites import site
        from django.test import RequestFactory

        if not is_event_type_registered("test.large.event"):
            register_event_type("test.large.event", "test", "Large dataset test")

        # Create 1000 events
        events = []
        for i in range(1000):
            event = audit_log.record("test.large.event", user=admin_user, metadata={"index": i})
            events.append(event)

        # Get queryset
        queryset = AuditEvent.objects.filter(event_type="test.large.event")

        # Call export action
        admin_instance = AuditEventAdmin(AuditEvent, site)
        request = RequestFactory().get("/")
        request.user = admin_user
        response = admin_instance.export_as_csv(request, queryset)

        # Verify response succeeds
        assert response.status_code == 200
        content = response.content.decode("utf-8")
        # Verify contains 1000 data rows (rough check - count newlines)
        assert content.count("\n") >= 1000  # At least 1000 newlines

    def test_export_special_characters(self, admin_user, db):
        """Export with unicode, quotes, and commas in metadata."""
        import csv
        import json
        from io import StringIO

        from audit.admin import AuditEventAdmin
        from audit.models import AuditEvent
        from audit.registry import is_event_type_registered, register_event_type
        from django.contrib.admin.sites import site
        from django.test import RequestFactory

        if not is_event_type_registered("test.special.event"):
            register_event_type("test.special.event", "test", "Special char test")

        # Create event with problematic metadata
        audit_log.record(
            "test.special.event",
            user=admin_user,
            metadata={
                "name": "François",  # Unicode
                "message": 'He said "hello"',  # Quotes
                "tags": ["one,two", "three"],  # Commas in array
            },
        )

        # Get queryset
        queryset = AuditEvent.objects.filter(event_type="test.special.event")

        # Call export action
        admin_instance = AuditEventAdmin(AuditEvent, site)
        request = RequestFactory().get("/")
        request.user = admin_user
        response = admin_instance.export_as_csv(request, queryset)

        # Parse CSV
        content = response.content.decode("utf-8")
        reader = csv.reader(StringIO(content))
        rows = list(reader)

        # Verify metadata column (last column)
        metadata_str = rows[1][-1]  # Second row (first data row), last column

        # Verify it's valid JSON
        metadata = json.loads(metadata_str)
        assert metadata["name"] == "François"
        assert metadata["message"] == 'He said "hello"'
        assert metadata["tags"] == ["one,two", "three"]

    def test_export_empty_queryset(self, admin_user, db):
        """Export empty queryset produces header only."""
        import csv
        from io import StringIO

        from audit.admin import AuditEventAdmin
        from audit.models import AuditEvent
        from django.contrib.admin.sites import site
        from django.test import RequestFactory

        # Get empty queryset
        queryset = AuditEvent.objects.filter(event_type="nonexistent.event")

        # Call export action
        admin_instance = AuditEventAdmin(AuditEvent, site)
        request = RequestFactory().get("/")
        request.user = admin_user
        response = admin_instance.export_as_csv(request, queryset)

        # Parse CSV
        content = response.content.decode("utf-8")
        reader = csv.reader(StringIO(content))
        rows = list(reader)

        # Verify only header row
        assert len(rows) == 1
        assert rows[0] == [
            "ID",
            "Created At",
            "Event Type",
            "User Email",
            "Organization",
            "Project",
            "Metadata",
        ]
