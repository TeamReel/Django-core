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
            raise PermissionDenied(
                {"detail": "You do not have access to this organization."}
            ) from err

        file_obj = serializer.validated_data["file"]
        is_public = serializer.validated_data.get("is_public", False)

        # Save to backend
        backend = get_storage_backend()
        # Generate a unique path: org_id/uuid/filename
        file_uuid = uuid.uuid4()
        storage_path = f"{org_id}/{file_uuid}/{file_obj.name}"

        saved_path = backend.save(storage_path, file_obj)

        # Create FileAsset
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

        # Trigger thumbnail generation for image files
        if file_obj.content_type and file_obj.content_type.startswith("image/"):
            generate_thumbnail.delay(str(file_asset.id))

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
