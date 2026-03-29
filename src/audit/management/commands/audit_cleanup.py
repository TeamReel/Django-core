"""Management command to delete old audit events per retention policy."""

from datetime import timedelta

from audit.models import AuditEvent
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count
from django.utils import timezone


class Command(BaseCommand):
    """Delete old audit events per retention policy."""

    help = "Delete old audit events per retention policy"

    def add_arguments(self, parser):
        """Add command arguments."""
        parser.add_argument(
            "--days",
            type=int,
            default=90,
            help="Delete events older than N days (default: 90)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be deleted without actually deleting",
        )

    def handle(self, *args, **options):
        """Execute the command."""
        days = options["days"]
        dry_run = options["dry_run"]

        # Calculate cutoff date
        cutoff_date = timezone.now() - timedelta(days=days)

        # Find old events
        old_events = AuditEvent.objects.filter(created_at__lt=cutoff_date)
        count = old_events.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS("No events to delete"))
            return

        # Show summary
        self.stdout.write(
            f"\nFound {count} events older than {days} days " f"(before {cutoff_date.date()})"
        )

        if dry_run:
            self.stdout.write(self.style.WARNING("\nDRY RUN - No events will be deleted"))

            # Show breakdown by event type
            breakdown = (
                old_events.values("event_type").annotate(count=Count("id")).order_by("-count")
            )

            self.stdout.write("\nBreakdown by event type:")
            for row in breakdown:
                self.stdout.write(f"  {row['event_type']:<30} {row['count']:>6} events")

            self.stdout.write(f"\nRe-run without --dry-run to delete {count} events")
        else:
            # Confirm before deletion
            self.stdout.write(
                self.style.WARNING(
                    f"\nWARNING: About to delete {count} events. " "This cannot be undone."
                )
            )

            confirm = input('Type "DELETE" to confirm: ')

            if confirm != "DELETE":
                self.stdout.write(self.style.ERROR("Deletion cancelled"))
                return

            # Delete events
            with transaction.atomic():
                deleted_count, _ = old_events.delete()

            self.stdout.write(self.style.SUCCESS(f"Successfully deleted {deleted_count} events"))
