"""File storage integration for B34 Generative Pipelines.

WP06 T046: File Storage Service

Stores generation output files via B35 File Storage with presigned URLs.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from django.core.files.base import ContentFile

if TYPE_CHECKING:
    pass

logger = logging.getLogger("generative.services.file_storage")


class GenerationFileService:
    """File storage for generation outputs."""

    @staticmethod
    def store_output_file(
        content: bytes,
        filename: str,
        mime_type: str,
        user_id: int,
        organisation_id: int,
    ) -> str:
        """Store output file in B22 FileAsset.

        Args:
            content: File content (bytes)
            filename: Original filename
            mime_type: MIME type (e.g., 'image/png', 'video/mp4')
            user_id: User ID who requested generation
            organisation_id: Organisation ID for storage quota

        Returns:
            FileAsset UUID as string

        Raises:
            Exception: If file storage fails
        """
        # Lazy import to avoid circular dependencies
        from files.models import FileAsset
        from files.utils import get_storage_backend

        try:
            # Step 1: Save to storage backend first
            file_obj = ContentFile(content, name=filename)
            storage = get_storage_backend()
            storage_path = storage.save(filename, file_obj)

            # Step 2: Create FileAsset model record
            record = FileAsset.objects.create(
                organization_id=organisation_id,
                uploaded_by_id=user_id,
                original_name=filename,
                storage_path=storage_path,
                file_size=len(content),
                mime_type=mime_type,
                metadata={"category": "generation_output"},
            )

            logger.info(
                "Stored output file in B22",
                extra={
                    "file_id": str(record.id),
                    "filename": filename,
                    "size_bytes": len(content),
                    "mime_type": mime_type,
                    "user_id": user_id,
                    "storage_path": storage_path,
                },
            )

            return str(record.id)

        except Exception as e:
            logger.error(
                f"Failed to store output file: {e}",
                extra={
                    "filename": filename,
                    "mime_type": mime_type,
                    "user_id": user_id,
                },
                exc_info=True,
            )
            raise

    @staticmethod
    def get_presigned_url(file_id: str, expiration: int = 3600) -> str:
        """Get presigned URL for file download.

        Args:
            file_id: FileAsset UUID as string
            expiration: URL expiration in seconds (default 1 hour)

        Returns:
            Presigned URL for file download

        Raises:
            FileAsset.DoesNotExist: If file not found
            Exception: If URL generation fails
        """
        # Lazy import to avoid circular dependencies
        from files.models import FileAsset
        from files.utils import get_storage_backend

        try:
            asset = FileAsset.objects.get(id=file_id, is_deleted=False)
            storage = get_storage_backend()

            # Generate URL using storage backend
            # get_url() returns signed URL if supported, otherwise public URL
            url = storage.get_url(asset.storage_path, signed=True)

            logger.debug(
                "Generated presigned URL",
                extra={
                    "file_id": file_id,
                    "filename": asset.original_name,
                    "expiration": expiration,
                    "storage_path": asset.storage_path,
                },
            )
            return url

        except FileAsset.DoesNotExist:
            logger.error(f"File not found or deleted: file_id={file_id}")
            raise
        except Exception as e:
            logger.error(
                f"Failed to generate presigned URL: {e}",
                extra={"file_id": file_id},
                exc_info=True,
            )
            raise

    @staticmethod
    def delete_file(file_id: str) -> None:
        """Delete file from storage (soft delete).

        Args:
            file_id: FileAsset UUID as string

        Raises:
            FileAsset.DoesNotExist: If file not found
            Exception: If deletion fails
        """
        # Lazy import to avoid circular dependencies
        from files.models import FileAsset
        from files.utils import get_storage_backend

        try:
            asset = FileAsset.objects.get(id=file_id, is_deleted=False)
            filename = asset.original_name
            storage_path = asset.storage_path

            # Delete file from storage backend
            storage = get_storage_backend()
            storage.delete(storage_path)

            # Soft-delete FileAsset record
            asset.soft_delete()

            logger.info(
                "Deleted file from storage",
                extra={
                    "file_id": file_id,
                    "filename": filename,
                    "storage_path": storage_path,
                },
            )

        except FileAsset.DoesNotExist:
            logger.warning(f"File not found or already deleted: file_id={file_id}")
            raise
        except Exception as e:
            logger.error(
                f"Failed to delete file: {e}",
                extra={"file_id": file_id},
                exc_info=True,
            )
            raise
