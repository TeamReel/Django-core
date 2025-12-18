from abc import ABC, abstractmethod
from typing import IO


class StorageBackend(ABC):
    """
    Abstract base class for file storage backends.
    """

    @abstractmethod
    def save(self, path: str, file_obj: IO) -> str:
        """
        Save file and return the storage path/key.
        """
        pass

    @abstractmethod
    def url(self, path: str) -> str:
        """
        Return the URL to access the file.
        """
        pass

    @abstractmethod
    def open(self, path: str, mode: str = "rb") -> IO:
        """
        Open file at path.
        """
        pass

    @abstractmethod
    def delete(self, path: str) -> bool:
        """
        Delete file at path. Return True if successful.
        """
        pass

    @abstractmethod
    def exists(self, path: str) -> bool:
        """
        Check if file exists at path.
        """
        pass

    @abstractmethod
    def get_url(self, path: str, signed: bool = True) -> str:
        """
        Get public or signed URL for the file.
        """
        pass
