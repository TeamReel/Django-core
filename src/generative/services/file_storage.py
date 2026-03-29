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
    def build_storage_path(
        filename: str,
        organisation_id: int,
        context: dict | None = None,
    ) -> str:
        """Build S3 storage path according to media-architecture.md.

        S3 folder structure:
        - orgs/{org_id}/generated/...
        - clubs/{club_slug}/generated/...
        - teams/{team_slug}/generated/...
        - members/{membership_id}/generated/...
        - matches/{activity_slug}/generated/...

        Args:
            filename: Original filename
            organisation_id: Organisation ID
            context: Optional context dict with keys:
                - club_slug: For club-level storage
                - team_slug: For team-level storage
                - membership_id: For member-level storage
                - activity_slug: For match-level storage
                - asset_type: Type of generated asset (e.g., 'kit', 'player_card')

        Returns:
            S3 path string
        """
        import uuid

        from django.utils import timezone

        context = context or {}
        timestamp = timezone.now().strftime("%Y%m%d")
        unique_suffix = str(uuid.uuid4())[:8]

        # Determine base path based on context
        if context.get("activity_slug"):
            # Match-level: matches/{activity_slug}/generated/
            base = f"matches/{context['activity_slug']}/generated"
        elif context.get("membership_id"):
            # Member-level: members/{membership_id}/generated/
            base = f"members/{context['membership_id']}/generated"
        elif context.get("team_slug"):
            # Team-level: teams/{team_slug}/generated/
            base = f"teams/{context['team_slug']}/generated"
        elif context.get("club_slug"):
            # Club-level: clubs/{club_slug}/generated/
            base = f"clubs/{context['club_slug']}/generated"
        else:
            # Default: orgs/{org_id}/generated/
            base = f"orgs/{organisation_id}/generated"

        # Add asset type subfolder if provided
        asset_type = context.get("asset_type", "output")
        base = f"{base}/{asset_type}"

        # Build unique filename
        name_parts = filename.rsplit(".", 1)
        if len(name_parts) == 2:
            name, ext = name_parts
            unique_filename = f"{name}_{timestamp}_{unique_suffix}.{ext}"
        else:
            unique_filename = f"{filename}_{timestamp}_{unique_suffix}"

        return f"{base}/{unique_filename}"

    @staticmethod
    def store_output_file(
        content: bytes,
        filename: str,
        mime_type: str,
        user_id: int,
        organisation_id: int,
        context: dict | None = None,
    ) -> str:
        """Store output file in B22 FileAsset.

        Args:
            content: File content (bytes)
            filename: Original filename
            mime_type: MIME type (e.g., 'image/png', 'video/mp4')
            user_id: User ID who requested generation
            organisation_id: Organisation ID for storage quota
            context: Optional context for S3 path (club_slug, team_slug, etc.)

        Returns:
            FileAsset UUID as string

        Raises:
            Exception: If file storage fails
        """
        # Lazy import to avoid circular dependencies
        from files.models import FileAsset
        from files.utils import get_storage_backend

        try:
            # Build proper S3 path according to media architecture
            storage_path = GenerationFileService.build_storage_path(
                filename=filename,
                organisation_id=organisation_id,
                context=context,
            )

            # Step 1: Save to storage backend
            file_obj = ContentFile(content, name=filename)
            storage = get_storage_backend()
            storage_backend_name = storage.__class__.__name__
            storage_path = storage.save(storage_path, file_obj)

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

            # Generate access URL for logging
            try:
                access_url = storage.get_url(storage_path, signed=True)
            except Exception:
                access_url = f"(URL generation failed - path: {storage_path})"

            # Log with clear storage location info
            logger.info(
                f"✅ Generated image stored successfully!\n"
                f"   📦 Storage Backend: {storage_backend_name}\n"
                f"   📁 Storage Path: {storage_path}\n"
                f"   🔗 Access URL: {access_url}\n"
                f"   🆔 File ID: {record.id}\n"
                f"   📄 Filename: {filename}\n"
                f"   📊 Size: {len(content):,} bytes ({len(content) / 1024:.1f} KB)",
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
                    "storage_backend": storage_backend_name,
                    "access_url": access_url,
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
