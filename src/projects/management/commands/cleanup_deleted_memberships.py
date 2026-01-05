from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from projects.models import ProjectMembership


class Command(BaseCommand):
    help = "Hard delete soft-deleted project memberships older than X days."

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=90,
            help="Number of days to retain soft-deleted memberships (default: 90)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Simulate deletion without actually deleting records",
        )

    def handle(self, *args, **options):
        days = options["days"]
        dry_run = options["dry_run"]

        cutoff_date = timezone.now() - timedelta(days=days)

        queryset = ProjectMembership.objects.filter(deleted_at__lt=cutoff_date)

        count = queryset.count()

        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f"DRY RUN: Would delete {count} memberships deleted before {cutoff_date}"
                )
            )
        else:
            # Note: queryset.delete() performs hard delete on the rows
            deleted_count, _ = queryset.delete()
            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully deleted {deleted_count} memberships deleted before {cutoff_date}"
                )
            )
