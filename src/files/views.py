import uuid

from organisations.models import Organisation
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from files.models import FileAsset
from files.serializers import FileAssetSerializer, FileUploadSerializer
from files.tasks import generate_thumbnail
from files.utils import get_storage_backend


class FileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing file assets.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FileAssetSerializer

    def get_serializer_class(self):
        if self.action == "create":
            return FileUploadSerializer
        return FileAssetSerializer

    def get_queryset(self):
        """
        Filter files by organization from header.
        """
        user = self.request.user
        org_id = self.request.headers.get("X-Organization-ID")

        if not org_id:
            # If no org context, return empty or all?
            # For security/clarity, let's require the context for listing.
            # Or return nothing.
            return FileAsset.objects.none()

        try:
            # Validate user is member of this org
            # We can filter by organization__memberships__user=user
            return FileAsset.objects.filter(
                organization__id=org_id,
                organization__memberships__user=user,
                organization__memberships__is_active=True,
                is_deleted=False,
            )
        except ValidationError:
            return FileAsset.objects.none()

    def perform_create(self, serializer):
        """
        Handle file upload and creation of FileAsset.
        """
        import logging

        logger = logging.getLogger(__name__)

        user = self.request.user
        org_id = self.request.headers.get("X-Organization-ID")

        if not org_id:
            raise ValidationError({"detail": "X-Organization-ID header is required for uploads."})

        # Validate org access
        try:
            organization = Organisation.objects.get(
                id=org_id, memberships__user=user, memberships__is_active=True
            )
        except (Organisation.DoesNotExist, ValidationError) as err:
            logger.error(f"Org not found or user not member: org_id={org_id}, user={user}")
            raise PermissionDenied(
                {"detail": "You do not have access to this organization."}
            ) from err

        file_obj = serializer.validated_data["file"]
        is_public = serializer.validated_data.get("is_public", False)

        # Get optional path prefix from query params (e.g., "kits/home" or "avatars")
        path_prefix = self.request.query_params.get("path_prefix", "").strip("/")

        try:
            # Save to backend
            backend = get_storage_backend()
            # Generate a unique path
            file_uuid = uuid.uuid4()

            # Build storage path: org_id/[path_prefix/]uuid/filename
            if path_prefix:
                storage_path = f"{org_id}/{path_prefix}/{file_uuid}/{file_obj.name}"
            else:
                storage_path = f"{org_id}/{file_uuid}/{file_obj.name}"

            logger.info(f"Uploading file to {storage_path}")
            saved_path = backend.save(storage_path, file_obj)
            logger.info(f"File saved as {saved_path}")

            # Create FileAsset
            try:
                file_asset = FileAsset.objects.create(
                    id=file_uuid,
                    organization=organization,
                    uploaded_by=user,
                    original_name=file_obj.name,
                    storage_path=saved_path,
                    file_size=file_obj.size,
                    mime_type=file_obj.content_type or "application/octet-stream",
                    is_public=is_public,
                )
            except Exception as db_err:
                logger.error(
                    f"Failed to create FileAsset: {type(db_err).__name__}: {db_err}. "
                    f"Storage path: {saved_path}, file_uuid: {file_uuid}"
                )
                raise
            logger.info(f"FileAsset created with id {file_asset.id}")

            # Trigger thumbnail generation for image files (non-blocking)
            if file_obj.content_type and file_obj.content_type.startswith("image/"):
                try:
                    generate_thumbnail.delay(str(file_asset.id))
                except Exception as celery_err:
                    logger.warning(
                        f"Could not queue thumbnail generation for {file_asset.id}: "
                        f"{type(celery_err).__name__}: {celery_err}. "
                        "Celery broker may not be available."
                    )

            # Store in serializer instance for response
            self.file_asset = file_asset
        except Exception as e:
            logger.exception(f"Error during file upload: {e}")
            raise

    def create(self, request, *args, **kwargs):
        """
        Override create to return the file asset.
        """
        import logging

        logger = logging.getLogger(__name__)

        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            # Return the created file asset using FileAssetSerializer
            file_asset = getattr(self, "file_asset", None)
            if not file_asset:
                logger.error("File asset was not created during upload (self.file_asset not set)")
                raise ValueError("File asset was not created during upload")
            output_serializer = FileAssetSerializer(file_asset)
            return Response(output_serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.exception(f"Error in create(): {type(e).__name__}: {e}")
            raise

    def perform_destroy(self, instance):
        """
        Soft delete the file asset.
        """
        instance.soft_delete()

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        """
        Get a download URL for the file.
        """
        instance = self.get_object()
        backend = get_storage_backend()

        try:
            url = backend.url(instance.storage_path)
            return Response({"url": url, "expires_in": 3600})  # 1 hour default for signed URLs
        except NotImplementedError:
            return Response(
                {"detail": "Download URL generation not supported by current backend."},
                status=status.HTTP_501_NOT_IMPLEMENTED,
            )
