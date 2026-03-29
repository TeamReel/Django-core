import logging
import os

from django.conf import settings
from django.utils.module_loading import import_string
from files.backends.base import StorageBackend
from files.backends.local import LocalStorageBackend

logger = logging.getLogger(__name__)


def get_storage_backend() -> StorageBackend:
    """
    Return the configured storage backend instance.

    Priority:
    1. Explicit FILES_STORAGE_BACKEND Django setting
    2. Auto-detect: if AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY env vars exist → S3
    3. Fallback: LocalStorageBackend
    """
    # 1. Explicit Django setting
    backend_path = getattr(settings, "FILES_STORAGE_BACKEND", None)
    if backend_path:
        try:
            backend_cls = import_string(backend_path)
            return backend_cls()
        except (ImportError, Exception) as exc:
            logger.warning("Failed to load storage backend %s: %s", backend_path, exc)

    # 2. Auto-detect AWS credentials in environment
    if os.environ.get("AWS_ACCESS_KEY_ID") and os.environ.get("AWS_SECRET_ACCESS_KEY"):
        try:
            from files.backends.s3 import S3StorageBackend

            backend = S3StorageBackend()
            logger.info("Auto-detected AWS credentials, using S3StorageBackend")
            return backend
        except Exception as exc:
            logger.error(
                "AWS credentials found but S3 backend failed"
                " to initialize: %s."
                " Using LocalStorageBackend as fallback.",
                exc,
                exc_info=True,
            )

    # 3. Fallback
    media_root = getattr(settings, "MEDIA_ROOT", "media/")
    media_url = getattr(settings, "MEDIA_URL", "/media/")
    logger.info(
        f"📂 Using LocalStorageBackend\n"
        f"   📁 MEDIA_ROOT: {media_root}\n"
        f"   🔗 MEDIA_URL: {media_url}\n"
        f"   💡 Files will be stored locally in: {media_root}"
    )
    return LocalStorageBackend()
