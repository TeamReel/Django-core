"""File storage integration for B34 Generative Pipelines.

WP06 T046: File Storage Service

Stores generation output files via B35 File Storage with presigned URLs.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from django.core.files.base import ContentFile

if TYPE_CHECKING:
    from src.files.models import FileStorage

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
    ) -> int:
        """Store output file in B35 FileStorage.

        Args:
            content: File content (bytes)
            filename: Original filename
            mime_type: MIME type (e.g., 'image/png', 'video/mp4')
            user_id: User ID who requested generation
            organisation_id: Organisation ID for storage quota

        Returns:
            FileStorage record ID

        Raises:
            Exception: If file storage fails
        """
        # Lazy import to avoid circular dependencies
        from src.files.models import FileStorage

        try:
            file_obj = ContentFile(content, name=filename)

            # Create FileStorage record
            record: FileStorage = FileStorage.objects.create(
                file=file_obj,
                filename=filename,
                mime_type=mime_type,
                file_size=len(content),
                uploaded_by_id=user_id,
                organisation_id=organisation_id,
                category="generation_output",
            )

            logger.info(
                "Stored output file in B35",
                extra={
                    "file_id": record.id,
                    "filename": filename,
                    "size_bytes": len(content),
                    "mime_type": mime_type,
                    "user_id": user_id,
                },
            )

            return record.id

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
    def get_presigned_url(file_id: int, expiration: int = 3600) -> str:
        """Get presigned URL for file download.

        Args:
            file_id: FileStorage record ID
            expiration: URL expiration in seconds (default 1 hour)

        Returns:
            Presigned URL for file download

        Raises:
            FileStorage.DoesNotExist: If file not found
            Exception: If URL generation fails
        """
        # Lazy import to avoid circular dependencies
        from src.files.models import FileStorage

        try:
            record: FileStorage = FileStorage.objects.get(id=file_id)

            # Generate presigned URL (assumes S3/compatible storage)
            # If using local storage, return the file URL directly
            if hasattr(record.file, "url"):
                url = record.file.url
                logger.debug(
                    "Generated file URL",
                    extra={"file_id": file_id, "filename": record.filename},
                )
                return url
            else:
                # S3-compatible storage with presigned URLs
                url = record.file.storage.url(record.file.name, parameters={"Expires": expiration})
                logger.debug(
                    "Generated presigned URL",
                    extra={
                        "file_id": file_id,
                        "filename": record.filename,
                        "expiration": expiration,
                    },
                )
                return url

        except FileStorage.DoesNotExist:
            logger.error(f"File not found: file_id={file_id}")
            raise
        except Exception as e:
            logger.error(
                f"Failed to generate presigned URL: {e}",
                extra={"file_id": file_id},
                exc_info=True,
            )
            raise

    @staticmethod
    def delete_file(file_id: int) -> None:
        """Delete file from storage.

        Args:
            file_id: FileStorage record ID

        Raises:
            FileStorage.DoesNotExist: If file not found
            Exception: If deletion fails
        """
        # Lazy import to avoid circular dependencies
        from src.files.models import FileStorage

        try:
            record: FileStorage = FileStorage.objects.get(id=file_id)
            filename = record.filename

            # Delete file from storage backend
            record.file.delete(save=False)

            # Delete FileStorage record
            record.delete()

            logger.info(
                "Deleted file from storage",
                extra={"file_id": file_id, "filename": filename},
            )

        except FileStorage.DoesNotExist:
            logger.warning(f"File not found for deletion: file_id={file_id}")
            raise
        except Exception as e:
            logger.error(
                f"Failed to delete file: {e}",
                extra={"file_id": file_id},
                exc_info=True,
            )
            raise
