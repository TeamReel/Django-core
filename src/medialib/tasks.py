from celery import shared_task
from files.utils import get_storage_backend
from .models import MediaItem, MediaItemState
from .services.metadata import extract_image_metadata, extract_video_metadata

import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def process_media_item(self, media_item_id: str):
    """
    Process uploaded media item: extract metadata.

    Flow:
    1. Lock item, set state = PROCESSING
    2. Download file content
    3. Extract metadata based on MIME type
    4. update item dimensions, duration, etc.
    5. Set state = PROCESSED (or ERROR)
    """
    try:
        # Use select_for_update to lock the row if possible, though Celery tasks
        # might be long running, so atomic block scope matters.
        # Ideally we just get it, check state, then update.

        # We need the item and its file relation
        try:
            item = MediaItem.objects.select_related("file").get(id=media_item_id)
        except MediaItem.DoesNotExist:
            logger.error(f"MediaItem {media_item_id} not found.")
            return {"status": "error", "message": "Item not found"}

        # Idempotency check: if already processed, skip
        if item.state == MediaItemState.PROCESSED:
            logger.info(f"MediaItem {media_item_id} already processed.")
            return {"status": "skipped", "message": "Already processed"}

        # Update state to PROCESSING
        item.state = MediaItemState.PROCESSING
        item.save(update_fields=["state"])

        metadata = {}

        try:
            # Get file content
            backend = get_storage_backend()
            # If backend supports direct path access (local), we might optimize extract_video_metadata
            # to use path instead of bytes, but for abstraction consistency we use backend.open().
            # Note: For S3, backend.open() typically downloads to a temp spoofed file or memory.

            # Since extract functions expect bytes, we read it all.
            # CAUTION: Large files will consume RAM.
            # Future improvement: Stream to temp file for video if backend allows.

            with backend.open(item.file.storage_path, "rb") as f:
                file_bytes = f.read()

            # Extract based on mime type
            if item.mime_type.startswith("image/"):
                metadata = extract_image_metadata(file_bytes)
            elif item.mime_type.startswith("video/"):
                metadata = extract_video_metadata(file_bytes)
            else:
                logger.warning(f"Unsupported mime type for extraction: {item.mime_type}")
                # We still mark as processed, just no metadata
                metadata = {}

            # Check for extraction error
            if "error" in metadata:
                logger.error(f"Extraction error for {media_item_id}: {metadata['error']}")
                item.state = MediaItemState.ERROR
                item.extraction_metadata = metadata
                item.save(update_fields=["state", "extraction_metadata"])
                return {"status": "error", "message": metadata["error"]}

            # Update item attributes
            if metadata.get("width"):
                item.width = metadata.get("width")
            if metadata.get("height"):
                item.height = metadata.get("height")
            if metadata.get("duration_seconds"):
                item.duration_seconds = metadata.get("duration_seconds")

            item.extraction_metadata = metadata
            item.state = MediaItemState.PROCESSED
            item.save()

            return {"status": "success", "media_item_id": str(item.id)}

        except Exception as e:
            logger.exception(f"Failed to process media item {media_item_id}")
            item.state = MediaItemState.ERROR
            item.extraction_metadata = {"error": str(e)}
            item.save(update_fields=["state", "extraction_metadata"])
            raise e

    except Exception as exc:
        # If we failed to even get the item or save error state
        logger.exception(f"Critical failure in process_media_item for {media_item_id}")
        # Retrying handled by Celery configuration
        raise exc
