"""Delete expired generation outputs.

WP06 T049: File Expiration Cleanup

Django management command to delete expired file outputs based on retention_days.
Run daily via cron (configured in WP07).

Usage:
    python manage.py cleanup_expired_outputs
    python manage.py cleanup_expired_outputs --dry-run
"""

from django.core.management.base import BaseCommand
from django.utils import timezone

from src.generative.models import GenerationOutput


class Command(BaseCommand):
    """Delete expired generation outputs."""

    help = "Delete expired generation outputs (files and database records)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be deleted without actually deleting",
        )

    def handle(self, *args, **options):
        """Execute cleanup command."""
        dry_run = options["dry_run"]

        now = timezone.now()
        expired = GenerationOutput.objects.filter(
            expires_at__lt=now,
            file_id__isnull=False,  # Only outputs with files (text outputs don't expire)
        ).select_related("request")

        count = expired.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS("No expired outputs found"))
            return

        if dry_run:
            self.stdout.write(self.style.WARNING(f"DRY RUN: Would delete {count} expired outputs:"))
            for output in expired[:10]:  # Show first 10
                self.stdout.write(
                    f"  - Output {output.id} (Request: {output.request_id}, "
                    f"File: {output.file_id}, Expired: {output.expires_at})"
                )
            if count > 10:
                self.stdout.write(f"  ... and {count - 10} more")
            return

        # Actually delete
        deleted_count = 0
        error_count = 0

        for output in expired:
            try:
                # Delete file from storage
                if output.file_id:
                    from src.generative.services.file_storage import GenerationFileService

                    try:
                        GenerationFileService.delete_file(output.file_id)
                    except Exception as e:
                        self.stderr.write(
                            self.style.ERROR(f"Failed to delete file {output.file_id}: {e}")
                        )
                        error_count += 1
                        continue

                # Delete output record
                output.delete()
                deleted_count += 1

                if deleted_count % 10 == 0:
                    self.stdout.write(f"Deleted {deleted_count}/{count} outputs...")

            except Exception as e:
                self.stderr.write(self.style.ERROR(f"Failed to delete output {output.id}: {e}"))
                error_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Cleanup complete: Deleted {deleted_count} outputs, {error_count} errors"
            )
        )
