"""
Management command to clean up old idempotency keys.

This command removes idempotency keys from UsageEvent and Transaction
models that are older than a specified retention period (default: 7 days).
"""

import logging
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from src.transactions.models import UsageEvent

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """Clean up old idempotency keys from transactions and usage events."""

    help = "Delete idempotency keys older than specified retention period"

    def add_arguments(self, parser):
        """Add command arguments."""
        parser.add_argument(
            "--retention-days",
            type=int,
            default=7,
            help="Number of days to retain idempotency keys (default: 7)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be deleted without actually deleting",
        )

    def handle(self, *args, **options):
        """Execute the cleanup command."""
        retention_days = options["retention_days"]
        dry_run = options["dry_run"]

        # Calculate cutoff date
        cutoff_date = timezone.now() - timedelta(days=retention_days)

        self.stdout.write(
            self.style.SUCCESS(
                f"Cleanup idempotency keys older than {retention_days} days "
                f"(before {cutoff_date.isoformat()})"
            )
        )

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN MODE - No changes will be made"))

        # Clean up UsageEvent idempotency keys
        usage_events_query = UsageEvent.objects.filter(
            created_at__lt=cutoff_date, idempotency_key__isnull=False
        )
        usage_events_count = usage_events_query.count()

        self.stdout.write(f"UsageEvents with old keys: {usage_events_count}")

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"DRY RUN: Would clean up {usage_events_count} idempotency keys "
                    f"({usage_events_count} UsageEvents)"
                )
            )
        else:
            if usage_events_count > 0:
                # Set idempotency_key to None for old records
                usage_events_query.update(idempotency_key=None)
                logger.info(
                    "Cleaned up %d UsageEvent idempotency keys older than %d days",
                    usage_events_count,
                    retention_days,
                )

            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully cleaned up {usage_events_count} idempotency keys "
                    f"({usage_events_count} UsageEvents)"
                )
            )

        return 0
