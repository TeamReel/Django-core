"""
Management command to clean up soft-deleted organisations.

Hard-deletes organisations that have been soft-deleted for longer than
the retention period (default: 30 days).

Usage:
    python manage.py cleanup_deleted_organisations
    python manage.py cleanup_deleted_organisations --days=7
    python manage.py cleanup_deleted_organisations --dry-run
"""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from src.organisations.models import Organisation


class Command(BaseCommand):
    """
    Hard-delete soft-deleted organisations past retention period.

    Features:
    - Configurable retention period (default: 30 days)
    - Dry-run mode to preview deletions without committing
    - Detailed logging of operations
    """

    help = "Hard-delete soft-deleted organisations past retention period"

    def add_arguments(self, parser):
        """Add command-line arguments."""
        parser.add_argument(
            "--days",
            type=int,
            default=30,
            help="Retention period in days (default: 30)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be deleted without deleting",
        )

    def handle(self, *args, **options):
        """Execute the cleanup command."""
        days = options["days"]
        dry_run = options["dry_run"]

        # Calculate threshold date
        threshold = timezone.now() - timedelta(days=days)

        # Query soft-deleted organisations older than threshold
        orgs = Organisation.objects.filter(is_active=False, deleted_at__lt=threshold)

        count = orgs.count()

        if count == 0:
            self.stdout.write(
                self.style.SUCCESS(f"No organisations to delete (retention: {days} days)")
            )
            return

        if dry_run:
            self.stdout.write(self.style.WARNING(f"DRY RUN: Would delete {count} organisations"))
            for org in orgs:
                deleted_days = (timezone.now() - org.deleted_at).days
                self.stdout.write(
                    f"  - {org.name} (deleted {deleted_days} days ago, "
                    f"on {org.deleted_at.date()})"
                )
        else:
            self.stdout.write(f"Deleting {count} organisations...")
            for org in orgs:
                deleted_days = (timezone.now() - org.deleted_at).days
                self.stdout.write(f"  Deleting: {org.name} (deleted {deleted_days} days ago)")
                org.hard_delete()

            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully deleted {count} organisations " f"past {days}-day retention"
                )
            )
