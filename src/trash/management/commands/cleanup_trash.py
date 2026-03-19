"""Management command for manual trash cleanup."""

from django.core.management.base import BaseCommand
from django.utils import timezone

from trash.models import TrashItem


class Command(BaseCommand):
    help = "Clean up expired trash items. Use --dry-run to preview without deleting."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be deleted without actually deleting.",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=500,
            help="Max items to process (default: 500).",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        batch_size = options["batch_size"]

        expired = (
            TrashItem.objects.filter(expires_at__lt=timezone.now())
            .select_related("content_type", "organisation")
            .order_by("expires_at")[:batch_size]
        )

        count = len(expired)
        if count == 0:
            self.stdout.write(self.style.SUCCESS("No expired trash items found."))
            return

        self.stdout.write(f"Found {count} expired trash item(s):")
        deleted = 0

        for item in expired:
            label = f"{item.content_type.app_label}.{item.content_type.model}"
            self.stdout.write(f"  - {item.object_repr} ({label}, expired {item.expires_at})")

            if not dry_run:
                obj = item.content_object
                if obj is not None:
                    if hasattr(obj, "permanent_delete"):
                        obj.permanent_delete()
                    else:
                        obj.delete()
                item.delete()
                deleted += 1

        if dry_run:
            self.stdout.write(self.style.WARNING(f"DRY RUN: {count} items would be deleted."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Deleted {deleted} expired trash items."))
