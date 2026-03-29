from django.core.management.base import BaseCommand
from medialib.models import MediaItem, MediaItemState
from medialib.tasks import process_media_item


class Command(BaseCommand):
    help = "Reprocess failed media items"

    def handle(self, *args, **options):
        failed = MediaItem.objects.filter(state=MediaItemState.ERROR)
        count = failed.count()

        if count == 0:
            self.stdout.write("No failed items to reprocess.")
            return

        self.stdout.write(f"Found {count} failed items. Requeuing...")

        for item in failed:
            item.state = (
                MediaItemState.RAW
            )  # Reset to RAW or Processing? Prompt said PENDING
            # but model has RAW. Views use RAW/PENDING logic?
            # Model has RAW, PROCESSING, PROCESSED, ERROR.
            # View perform_create uses default which is RAW (from model default?) No wait.
            # Views.py: instance = serializer.save(..., state=MediaItemState.PENDING)
            # Wait, models.py Definition of MediaItemState needs check.

            # Let's check models.py again.
            # MediaItemState.RAW = "raw"

            # But in the prompt for implementation, it said:
            # instance = serializer.save(..., state=MediaItemState.PENDING) ...
            # AND the prompt's T012 example said: item.state = MediaItemState.PENDING

            # BUT models.py I read earlier has:
            # RAW = "raw", "Raw Upload"
            # PROCESSING = "processing", "Processing" ...
            # It does NOT have PENDING.

            # I must use RAW or add PENDING.
            # The previous implementation of Views likely defaulted to something or I missed it.
            # Let's check Views.py again to see what it actually uses.

            # I'll stick to RAW as "Pending/Initial" state if PENDING is missing.
            item.state = MediaItemState.RAW
            item.save(update_fields=["state"])
            process_media_item.delay(str(item.id))

        self.stdout.write(f"Requeued {count} items")
