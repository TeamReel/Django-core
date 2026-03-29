"""
Celery tasks for file processing and maintenance.

These tasks handle asynchronous operations like thumbnail generation
and cleanup of soft-deleted files.
"""

import logging
from datetime import timedelta
from typing import Optional

from celery import shared_task
from django.utils import timezone
from files.models import FileAsset
from files.utils import get_storage_backend

logger = logging.getLogger(__name__)


# Lazy import of PIL to avoid import errors when package not available
def get_pil_image():
    """Lazy import of PIL.Image to handle missing dependency gracefully."""
    try:
        from PIL import Image

        return Image
    except ImportError as e:
        logger.error("PIL (Pillow) not available for image processing: %s", str(e))
        raise ImportError(
            "Pillow package is required for thumbnail generation. "
            "Install with: pip install Pillow>=10.0.0"
        ) from e


@shared_task(bind=True, max_retries=3)
def generate_thumbnail(self, file_id: str) -> Optional[str]:
    """
    Generate a thumbnail for an image file.

    Args:
        file_id: UUID of the FileAsset to generate thumbnail for

    Returns:
        Path to the generated thumbnail or None if failed
    """
    try:
        file_asset = FileAsset.objects.get(id=file_id, is_deleted=False)
    except FileAsset.DoesNotExist:
        logger.warning(f"FileAsset with id {file_id} not found or deleted")
        return None

    # Only process image files
    if not file_asset.mime_type.startswith("image/"):
        logger.info(f"Skipping thumbnail generation for non-image file: {file_asset.mime_type}")
        return None

    backend = get_storage_backend()

    try:
        # Get PIL Image class
        pil_image = get_pil_image()
        # Open the original image
        with backend.open(file_asset.storage_path, "rb") as original_file:
            image = pil_image.open(original_file)

            # Convert RGBA to RGB if needed (for JPEG compatibility)
            if image.mode in ("RGBA", "LA"):
                background = pil_image.new("RGB", image.size, (255, 255, 255))
                background.paste(image, mask=image.split()[-1] if image.mode == "RGBA" else None)
                image = background

            # Generate thumbnail (max 300x300)
            image.thumbnail((300, 300), pil_image.Resampling.LANCZOS)

            # Generate thumbnail path
            thumbnail_path = f"thumbnails/{file_asset.organization.id}/{file_asset.id}.jpg"

            # Save thumbnail to backend
            from io import BytesIO

            thumbnail_buffer = BytesIO()
            image.save(thumbnail_buffer, format="JPEG", quality=85)
            thumbnail_buffer.seek(0)

            saved_path = backend.save(thumbnail_path, thumbnail_buffer)

            # Update FileAsset with thumbnail path
            file_asset.thumbnail_path = saved_path
            file_asset.save(update_fields=["thumbnail_path"])

            logger.info(f"Generated thumbnail for {file_id}: {saved_path}")
            return saved_path

    except Exception as exc:
        logger.error(f"Failed to generate thumbnail for {file_id}: {str(exc)}")

        # Retry with exponential backoff
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=60 * (2**self.request.retries), exc=exc) from exc

        return None


@shared_task
def cleanup_deleted_files() -> dict:
    """
    Clean up files that have been soft-deleted for more than 30 days.

    This task runs daily via Celery Beat and permanently deletes:
    1. The physical file from storage
    2. The database record

    Returns:
        Dictionary with cleanup statistics
    """
    cutoff_date = timezone.now() - timedelta(days=30)

    # Find files deleted more than 30 days ago
    old_deleted_files = FileAsset.objects.filter(is_deleted=True, deleted_at__lt=cutoff_date)

    stats = {
        "files_found": old_deleted_files.count(),
        "files_deleted": 0,
        "storage_errors": 0,
        "database_errors": 0,
    }

    backend = get_storage_backend()

    for file_asset in old_deleted_files:
        try:
            # Delete physical file from storage
            if backend.exists(file_asset.storage_path):
                backend.delete(file_asset.storage_path)

            # Delete thumbnail if exists
            if file_asset.thumbnail_path and backend.exists(file_asset.thumbnail_path):
                backend.delete(file_asset.thumbnail_path)

            # Hard delete from database
            file_asset.delete()

            stats["files_deleted"] += 1
            logger.info(f"Cleaned up file {file_asset.id}: {file_asset.original_name}")

        except Exception as exc:
            logger.error(f"Failed to cleanup file {file_asset.id}: {str(exc)}")

            # Categorize errors
            if "storage" in str(exc).lower() or "backend" in str(exc).lower():
                stats["storage_errors"] += 1
            else:
                stats["database_errors"] += 1

    logger.info(f"Cleanup complete: {stats}")
    return stats
