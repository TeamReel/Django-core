from django.conf import settings
from django.utils.module_loading import import_string

from files.backends.base import StorageBackend
from files.backends.local import LocalStorageBackend


def get_storage_backend() -> StorageBackend:
    """
    Return the configured storage backend instance.
    Defaults to LocalStorageBackend if not configured.
    """
    backend_path = getattr(settings, "FILES_STORAGE_BACKEND", None)
    if backend_path:
        try:
            backend_cls = import_string(backend_path)
            return backend_cls()
        except ImportError:
            pass
    return LocalStorageBackend()
