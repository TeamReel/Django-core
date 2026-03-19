"""
Management command to clean up old activity feed events.

Usage:
    python manage.py cleanup_activity_feed --days 90
    python manage.py cleanup_activity_feed --days 90 --dry-run
"""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from activity_feed.models import ActivityLog


class Command(BaseCommand):
    help = "Archive (soft-delete) activity feed events older than N days."

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=90,
            help="Delete events older than this many days (default: 90).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show how many events would be deleted without actually deleting.",
        )

    def handle(self, *args, **options):
        days = options["days"]
        dry_run = options["dry_run"]
        cutoff = timezone.now() - timedelta(days=days)

        queryset = ActivityLog.objects.filter(created_at__lt=cutoff)
        count = queryset.count()

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"[DRY RUN] Would delete {count} activity log events older than {days} days "
                    f"(before {cutoff.isoformat()})."
                )
            )
            return

        if count == 0:
            self.stdout.write(self.style.SUCCESS("No events to clean up."))
            return

        # Delete in batches to avoid locking the table
        batch_size = 5000
        total_deleted = 0

        while True:
            batch_ids = list(
                ActivityLog.objects.filter(created_at__lt=cutoff).values_list("id", flat=True)[
                    :batch_size
                ]
            )
            if not batch_ids:
                break

            deleted, _ = ActivityLog.objects.filter(id__in=batch_ids).delete()
            total_deleted += deleted
            self.stdout.write(f"  Deleted batch: {deleted} (total: {total_deleted}/{count})")

        self.stdout.write(
            self.style.SUCCESS(
                f"Cleaned up {total_deleted} activity log events older than {days} days."
            )
        )
