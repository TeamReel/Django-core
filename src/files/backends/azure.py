"""
Azure Blob Storage Backend for TeamReel.

This module provides Azure Blob Storage integration for file uploads,
downloads, and presigned URL generation.
"""

from datetime import datetime, timedelta, timezone
from io import BytesIO
from typing import IO

from django.conf import settings

from .base import StorageBackend


class AzureBlobStorageBackend(StorageBackend):
    """
    Azure Blob Storage backend implementation.

    Required settings:
        AZURE_STORAGE_ACCOUNT_NAME: Storage account name
        AZURE_STORAGE_ACCOUNT_KEY: Storage account key
        AZURE_STORAGE_CONTAINER_NAME: Container name (default: 'teamreel-assets')

    Optional settings:
        AZURE_STORAGE_CUSTOM_DOMAIN: Custom domain for CDN (optional)
    """

    def __init__(self):
        try:
            from azure.storage.blob import BlobSasPermissions, BlobServiceClient, generate_blob_sas
        except ImportError:
            raise ImportError(
                "azure-storage-blob is required for Azure Blob Storage. "
                "Install it with: pip install azure-storage-blob"
            )

        self.account_name = getattr(settings, "AZURE_STORAGE_ACCOUNT_NAME", None)
        self.account_key = getattr(settings, "AZURE_STORAGE_ACCOUNT_KEY", None)
        self.container_name = getattr(settings, "AZURE_STORAGE_CONTAINER_NAME", "teamreel-assets")
        self.custom_domain = getattr(settings, "AZURE_STORAGE_CUSTOM_DOMAIN", None)

        if not self.account_name or not self.account_key:
            raise ValueError(
                "AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY "
                "must be set in Django settings"
            )

        # Build connection string
        connection_string = (
            f"DefaultEndpointsProtocol=https;"
            f"AccountName={self.account_name};"
            f"AccountKey={self.account_key};"
            f"EndpointSuffix=core.windows.net"
        )

        self._client = BlobServiceClient.from_connection_string(connection_string)
        self._container_client = self._client.get_container_client(self.container_name)

        # Store for SAS generation
        self._generate_blob_sas = generate_blob_sas
        self._BlobSasPermissions = BlobSasPermissions

    def _ensure_container_exists(self):
        """Create container if it doesn't exist."""
        try:
            self._container_client.create_container()
        except Exception:
            # Container already exists or other error
            pass

    def save(self, path: str, file_obj: IO) -> str:
        """
        Save file to Azure Blob Storage.

        Args:
            path: The blob path (e.g., 'logos/clubs/180.png')
            file_obj: File-like object to upload

        Returns:
            The blob path/key
        """
        self._ensure_container_exists()

        blob_client = self._container_client.get_blob_client(path)

        # Read content and determine content type
        content = file_obj.read()
        content_type = self._guess_content_type(path)

        blob_client.upload_blob(
            content,
            overwrite=True,
            content_settings={"content_type": content_type} if content_type else None,
        )

        return path

    def save_from_bytes(self, path: str, data: bytes, content_type: str = None) -> str:
        """
        Save bytes directly to Azure Blob Storage.

        Args:
            path: The blob path
            data: Raw bytes to upload
            content_type: Optional content type

        Returns:
            The blob path/key
        """
        self._ensure_container_exists()

        blob_client = self._container_client.get_blob_client(path)

        if not content_type:
            content_type = self._guess_content_type(path)

        from azure.storage.blob import ContentSettings

        blob_client.upload_blob(
            data,
            overwrite=True,
            content_settings=ContentSettings(content_type=content_type) if content_type else None,
        )

        return path

    def url(self, path: str) -> str:
        """
        Return the public URL for a blob.

        Args:
            path: The blob path

        Returns:
            Public URL string
        """
        if self.custom_domain:
            return f"https://{self.custom_domain}/{self.container_name}/{path}"
        return f"https://{self.account_name}.blob.core.windows.net/" f"{self.container_name}/{path}"

    def open(self, path: str, mode: str = "rb") -> IO:
        """
        Open and return file content as BytesIO.

        Args:
            path: The blob path
            mode: File mode (ignored, always binary)

        Returns:
            BytesIO object with file content
        """
        blob_client = self._container_client.get_blob_client(path)
        download_stream = blob_client.download_blob()
        content = download_stream.readall()
        return BytesIO(content)

    def delete(self, path: str) -> bool:
        """
        Delete a blob.

        Args:
            path: The blob path

        Returns:
            True if deleted, False otherwise
        """
        try:
            blob_client = self._container_client.get_blob_client(path)
            blob_client.delete_blob()
            return True
        except Exception:
            return False

    def exists(self, path: str) -> bool:
        """
        Check if a blob exists.

        Args:
            path: The blob path

        Returns:
            True if exists, False otherwise
        """
        try:
            blob_client = self._container_client.get_blob_client(path)
            blob_client.get_blob_properties()
            return True
        except Exception:
            return False

    def get_url(self, path: str, signed: bool = True, expiry_hours: int = 1) -> str:
        """
        Get public or signed (SAS) URL for a blob.

        Args:
            path: The blob path
            signed: If True, generate a SAS URL with limited validity
            expiry_hours: Hours until SAS URL expires (default: 1)

        Returns:
            URL string (public or SAS)
        """
        if not signed:
            return self.url(path)

        # Generate SAS token
        sas_token = self._generate_blob_sas(
            account_name=self.account_name,
            container_name=self.container_name,
            blob_name=path,
            account_key=self.account_key,
            permission=self._BlobSasPermissions(read=True),
            expiry=datetime.now(timezone.utc) + timedelta(hours=expiry_hours),
        )

        base_url = self.url(path)
        return f"{base_url}?{sas_token}"

    def list_blobs(self, prefix: str = None) -> list[str]:
        """
        List all blobs in container, optionally filtered by prefix.

        Args:
            prefix: Optional prefix to filter blobs

        Returns:
            List of blob names
        """
        blobs = self._container_client.list_blobs(name_starts_with=prefix)
        return [blob.name for blob in blobs]

    def _guess_content_type(self, path: str) -> str | None:
        """Guess content type from file extension."""
        import mimetypes

        content_type, _ = mimetypes.guess_type(path)
        return content_type or "application/octet-stream"
