from typing import IO

from django.core.files.storage import FileSystemStorage

from .base import StorageBackend


class LocalStorageBackend(StorageBackend):
    """
    Local filesystem storage backend implementation.
    Wraps Django's FileSystemStorage.
    """

    def __init__(self) -> None:
        self.storage = FileSystemStorage()

    def save(self, path: str, file_obj: IO) -> str:
        """
        Save file to local storage.
        """
        # FileSystemStorage.save() handles duplicate names by appending _1, _2 etc.
        # It returns the actual name saved.
        return self.storage.save(path, file_obj)

    def url(self, path: str) -> str:
        """
        Return the URL to access the file.
        """
        return self.storage.url(path)

    def open(self, path: str, mode: str = "rb") -> IO:
        """
        Open file at path.
        """
        return self.storage.open(path, mode)

    def delete(self, path: str) -> bool:
        """
        Delete file from local storage.
        """
        if self.exists(path):
            self.storage.delete(path)
            return True
        return False

    def exists(self, path: str) -> bool:
        """
        Check if file exists in local storage.
        """
        return self.storage.exists(path)

    def get_url(self, path: str, signed: bool = True) -> str:
        """
        Get URL for the file.
        For local storage, signed URLs are not supported, so we return the media URL.
        """
        return self.storage.url(path)
