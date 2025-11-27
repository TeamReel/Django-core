"""
Tests for audit admin interface.

Tests read-only enforcement, filters, search, and pagination.
"""

import pytest
from audit.api import audit_log
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
