from typing import IO

from .base import StorageBackend


class S3StorageBackend(StorageBackend):
    """
    S3 storage backend stub.
    """

    def save(self, path: str, file_obj: IO) -> str:
        raise NotImplementedError("S3 storage not configured")

    def url(self, path: str) -> str:
        raise NotImplementedError("S3 storage not configured")

    def open(self, path: str, mode: str = "rb") -> IO:
        raise NotImplementedError("S3 storage not configured")

    def delete(self, path: str) -> bool:
        raise NotImplementedError("S3 storage not configured")

    def exists(self, path: str) -> bool:
        raise NotImplementedError("S3 storage not configured")

    def get_url(self, path: str, signed: bool = True) -> str:
        raise NotImplementedError("S3 storage not configured")
