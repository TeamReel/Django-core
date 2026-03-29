import logging
import os
import tempfile

from celery import shared_task
from django.core.files.base import ContentFile
from files.models import FileAsset
from files.utils import get_storage_backend

from .models import MediaItem, MediaItemState, MediaThumbnail
from .services.metadata import extract_image_metadata, extract_video_metadata
from .services.thumbnails import generate_image_thumbnail, generate_video_thumbnail

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
    6. Trigger thumbnail generation
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
            # We assume if processed, thumbnails might already be done or triggered elsewhere.
            # But ensure we chain if needed. For now just return.
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

            # Trigger thumbnail generation
            generate_media_thumbnails.delay(media_item_id)

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
        raise self.retry(exc=exc, countdown=60)


@shared_task(bind=True, max_retries=3)
def generate_media_thumbnails(self, media_item_id: str):
    """
    Generate thumbnails for a MediaItem.
    Supports Image (Pillow) and Video (ffmpeg).
    """
    try:
        try:
            item = MediaItem.objects.select_related("file", "project").get(id=media_item_id)
        except MediaItem.DoesNotExist:
            return {"status": "error", "message": "Item not found"}

        if not (item.mime_type.startswith("image/") or item.mime_type.startswith("video/")):
            return {"status": "skipped", "message": "Unsupported mime type"}

        backend = get_storage_backend()
        sizes = ["small", "medium", "large"]
        results = {}

        # 1. Acquire source content
        # For video, we need a local file path for ffmpeg
        # For image, we need bytes (usually)

        local_source_path = None
        source_bytes = None

        try:
            if item.mime_type.startswith("video/"):
                # Download to temp file
                suffix = os.path.splitext(item.file.original_name)[1]
                with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                    with backend.open(item.file.storage_path, "rb") as remote:
                        # Stream download
                        for chunk in remote.chunks():
                            tmp.write(chunk)
                    local_source_path = tmp.name
            else:
                # Image - read to memory
                with backend.open(item.file.storage_path, "rb") as f:
                    source_bytes = f.read()

            # 2. Generate and Save Thumbnails
            for size in sizes:
                thumb_bytes = None
                mime_type = "image/jpeg"

                if item.mime_type.startswith("image/"):
                    thumb_bytes, mime_type = generate_image_thumbnail(source_bytes, size=size)
                else:
                    thumb_bytes, mime_type = generate_video_thumbnail(
                        local_source_path, timestamp_percentage=0.5
                    )

                if thumb_bytes:
                    # Create FileAsset
                    filename = f"thumb_{size}_{item.id}.jpg"
                    storage_path = f"thumbnails/{item.project.id}/{filename}"

                    # Save to storage
                    backend.save(storage_path, ContentFile(thumb_bytes))

                    # Create FileAsset record
                    file_asset = FileAsset.objects.create(
                        organization=item.file.organization,
                        uploaded_by=item.created_by,
                        original_name=filename,
                        storage_path=storage_path,
                        file_size=len(thumb_bytes),
                        mime_type=mime_type,
                        is_public=False,  # inheriting setting usually or false
                        metadata={"size_label": size, "parent_media_item": str(item.id)},
                    )

                    # Create MediaThumbnail
                    # Determine dimensions (roughly, or we update generate_X to return them)
                    # For now we use the target dimensions from config as approximate,
                    # or better: inspect the generated buffer.
                    # Since we don't want to reopen PIL image, we rely on standard sizes.
                    # Ideally generate_X returns (bytes, mime, width, height).
                    # I'll update generate_image_thumbnail briefly? No, let's just stick to spec or infer.
                    # Checking spec: T028 implementation detail didn't ask for width/height return.
                    # But MediaThumbnail model needs it.
                    # I'll just hardcode from config because `thumbnail` preserves aspect ratio within box?
                    # No, that's inaccurate.
                    # I should update services to return dimensions.

                    # Re-opening bytes to check dimensions is cheap for thumbnails
                    import io

                    from PIL import Image as PilImage

                    with PilImage.open(io.BytesIO(thumb_bytes)) as img:
                        width, height = img.size

                    MediaThumbnail.objects.update_or_create(
                        media_item=item,
                        size_label=size,
                        defaults={
                            "file": file_asset,
                            "width": width,
                            "height": height,
                        },
                    )
                    results[size] = "created"

        finally:
            if local_source_path and os.path.exists(local_source_path):
                os.remove(local_source_path)

        return {"status": "success", "thumbnails": results}

    except Exception as exc:
        logger.exception(f"Thumbnail generation failed for {media_item_id}")
        raise self.retry(exc=exc, countdown=60)
