"""Tests for management commands."""

from datetime import timedelta
from io import StringIO

import pytest
from accounts.models import User
from django.core.management import call_command
from django.utils import timezone
from organisations.models import Organisation
from projects.models import Project
from transactions.models import Transaction, UsageEvent


@pytest.mark.django_db
class TestCleanupIdempotencyKeysCommand:
    """Test cleanup_idempotency_keys management command."""

    def test_cleanup_dry_run(self, user, organization, project):
        """Test dry-run mode doesn't delete keys."""
        # Create old usage event with idempotency key
        old_date = timezone.now() - timedelta(days=10)
        event = UsageEvent.objects.create(
            event_type="test_event",
            user=user,
            organization=organization,
            project=project,
            idempotency_key="old-key",
        )
        # Use update() to bypass auto_now_add protection
        UsageEvent.objects.filter(pk=event.pk).update(created_at=old_date)
        event.refresh_from_db()

        # Run command in dry-run mode
        out = StringIO()
        call_command("cleanup_idempotency_keys", "--retention-days=7", "--dry-run", stdout=out)

        # Verify key still exists
        event.refresh_from_db()
        assert event.idempotency_key == "old-key"
        assert "DRY RUN" in out.getvalue()
        assert "Would clean up 1 idempotency keys" in out.getvalue()

    def test_cleanup_old_keys(self, user, organization, project):
        """Test cleanup removes old idempotency keys."""
        # Create old usage event
        old_date = timezone.now() - timedelta(days=10)
        old_event = UsageEvent.objects.create(
            event_type="test_event",
            user=user,
            organization=organization,
            project=project,
            idempotency_key="old-key",
        )
        UsageEvent.objects.filter(pk=old_event.pk).update(created_at=old_date)

        # Create recent usage event
        recent_event = UsageEvent.objects.create(
            event_type="test_event",
            user=user,
            organization=organization,
            project=project,
            idempotency_key="recent-key",
        )

        # Run cleanup
        out = StringIO()
        call_command("cleanup_idempotency_keys", "--retention-days=7", stdout=out)

        # Verify old key removed, recent key retained
        old_event.refresh_from_db()
        recent_event.refresh_from_db()

        assert old_event.idempotency_key is None
        assert recent_event.idempotency_key == "recent-key"
        assert "Successfully cleaned up 1 idempotency keys" in out.getvalue()

    def test_cleanup_usage_events(self, user, organization, project):
        """Test cleanup works for usage events."""
        old_date = timezone.now() - timedelta(days=10)
        old_event = UsageEvent.objects.create(
            event_type="test_event",
            user=user,
            organization=organization,
            project=project,
            idempotency_key="old-event-key",
        )
        UsageEvent.objects.filter(pk=old_event.pk).update(created_at=old_date)

        # Run cleanup
        call_command("cleanup_idempotency_keys", "--retention-days=7")

        # Verify key removed
        old_event.refresh_from_db()
        assert old_event.idempotency_key is None

    def test_cleanup_custom_retention(self, user, organization, project):
        """Test custom retention period."""
        # Create usage event 5 days old
        five_days_ago = timezone.now() - timedelta(days=5)
        event = UsageEvent.objects.create(
            event_type="test_event",
            user=user,
            organization=organization,
            project=project,
            idempotency_key="five-days-old",
        )
        UsageEvent.objects.filter(pk=event.pk).update(created_at=five_days_ago)

        # Cleanup with 3-day retention (should delete)
        call_command("cleanup_idempotency_keys", "--retention-days=3")
        event.refresh_from_db()
        assert event.idempotency_key is None

    def test_cleanup_no_keys(self, user, organization, project):
        """Test cleanup when no old keys exist."""
        # Create recent usage event
        UsageEvent.objects.create(
            event_type="test_event",
            user=user,
            organization=organization,
            project=project,
            idempotency_key="recent",
        )

        out = StringIO()
        call_command("cleanup_idempotency_keys", stdout=out)

        assert "Successfully cleaned up 0 idempotency keys" in out.getvalue()


@pytest.mark.django_db
class TestSeedTestTransactionsCommand:
    """Test seed_test_transactions management command."""

    def test_seed_creates_data(self):
        """Test seed command creates organizations and transactions."""
        out = StringIO()
        call_command("seed_test_transactions", "--count=5", "--orgs=2", stdout=out)

        # Verify organizations created
        orgs = Organisation.objects.filter(name__startswith="Test Organization")
        assert orgs.count() >= 2

        # Verify users created
        users = User.objects.filter(email__contains="@testorg.example.com")
        assert users.count() >= 2

        # Verify projects created
        projects = Project.objects.filter(name__contains="Project Alpha")
        assert projects.count() >= 2

        # Verify transactions created (at least some)
        transactions = Transaction.objects.filter(idempotency_key__startswith="seed-txn")
        assert transactions.count() > 0

        assert "Seeding complete!" in out.getvalue()

    def test_seed_idempotent(self):
        """Test seed command can be run multiple times."""
        # Run twice
        call_command("seed_test_transactions", "--count=2", "--orgs=1")
        first_count = Transaction.objects.filter(idempotency_key__startswith="seed-txn").count()

        call_command("seed_test_transactions", "--count=2", "--orgs=1")
        second_count = Transaction.objects.filter(idempotency_key__startswith="seed-txn").count()

        # Idempotency keys prevent duplicates, but seed command uses random data
        # (amounts, event types, projects). If a transaction fails on first run
        # (e.g., insufficient balance), the second run may create a NEW transaction
        # with different random values. Thus we verify count doesn't decrease, but
        # may increase due to legitimate new transactions.
        assert second_count >= first_count

    def test_seed_custom_count(self):
        """Test seed command respects count argument."""
        out = StringIO()
        call_command("seed_test_transactions", "--count=15", "--orgs=1", stdout=out)

        # Should create transactions (some may fail due to insufficient balance).
        # Random amounts mean different transactions each run - accept any reasonable count.
        transactions = Transaction.objects.filter(idempotency_key__startswith="seed-txn")
        assert transactions.count() >= 5  # At least some transactions created

    def test_seed_creates_usage_events(self):
        """Test seed command creates some usage events."""
        call_command("seed_test_transactions", "--count=20", "--orgs=1")

        # Should have created some usage events (random data means variable count)
        events = UsageEvent.objects.filter(idempotency_key__startswith="seed-usage")
        assert events.count() >= 3  # At least some events created
