import uuid

from projects.models import Project
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
            return FileAsset.objects.select_related("uploaded_by").filter(
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
        except (ValueError, Exception) as err:
            # Catches django.core.exceptions.ValidationError for invalid UUID strings
            # and any other unexpected errors during org lookup
            logger.error(f"Org lookup error (possibly invalid UUID): org_id={org_id}, err={err}")
            raise PermissionDenied({"detail": "Invalid organization ID."}) from err

        file_obj = serializer.validated_data["file"]
        is_public = serializer.validated_data.get("is_public", False)

        # Get optional path prefix from query params (e.g., "kits/home" or "avatars")
        path_prefix = self.request.query_params.get("path_prefix", "").strip("/")
        storage_path = None

        # Schema Alignment: Intercept legacy frontend paths for structured storage
        # We rewrite this to Canonical Structure:
        # - Club: clubs/{slug}-{id}/{category}/
        # - Team: clubs/{club-slug}-{club-id}/teams/{team-slug}-{team-id}/{category}/
        if path_prefix and (
            path_prefix.startswith("logos/")
            or path_prefix.startswith("clubs/")
            or path_prefix.startswith("teams/")
        ):
            try:
                parts = path_prefix.split("/")
                if len(parts) >= 2:
                    prefix_type = parts[0]
                    identifier = parts[1]
                    rest = parts[2:] if len(parts) > 2 else []

                    project = None
                    # 1. Try Integer ID
                    if identifier.isdigit():
                        project = Project.objects.filter(
                            id=int(identifier), organisation_id=org_id
                        ).first()

                    # 2. Try Slug
                    if not project:
                        project = Project.objects.filter(
                            slug=identifier, organisation_id=org_id
                        ).first()

                    # 3. Rescue: Try to fix "slug-slug" pattern (e.g. ajax-ajax)
                    # This handles cases where frontend might incorrectly double the slug
                    if not project and "-" in identifier:
                        sub_parts = identifier.split("-")
                        if len(sub_parts) == 2 and sub_parts[0] == sub_parts[1]:
                            project = Project.objects.filter(
                                slug=sub_parts[0], organisation_id=org_id
                            ).first()
                            if project:
                                logger.info(
                                    f"Fixed double-slug identifier: {identifier} -> {sub_parts[0]}"
                                )

                    if project:
                        # Determine Base Path
                        if project.parent_project:
                            # Team Context
                            club = project.parent_project
                            base_path = (
                                f"clubs/{club.slug}-{club.id}/teams/{project.slug}-{project.id}"
                            )
                        else:
                            # Club Context
                            base_path = f"clubs/{project.slug}-{project.id}"

                        # Determine Category/Suffix
                        if prefix_type == "logos":
                            # Legacy behavior: 'logos/x' -> '.../logo'
                            category = "logo"
                        elif rest:
                            # Preserve existing subfolders (e.g. 'sponsor_logo', 'kits/home')
                            category = "/".join(rest)
                        else:
                            # Fallback if no category provided in path
                            category = "general"

                        new_prefix = f"{base_path}/{category}"

                        # Include UUID for uniqueness to prevent duplicate storage_path conflicts
                        file_uuid = uuid.uuid4()
                        storage_path = f"{new_prefix}/{file_uuid}/{file_obj.name}"
                        logger.info(f"Fixed storage path: {path_prefix} -> {storage_path}")

            except Exception as e:
                logger.warning(f"Project resolution failed for path {path_prefix}: {e}")

        try:
            # Save to backend
            backend = get_storage_backend()
            # Generate a unique path
            file_uuid = uuid.uuid4()

            # Build storage path if not already enforced
            if not storage_path:
                # Design Decision: Trust path_prefix if provided (allows "clubs/ajax/..." structure)
                # Otherwise fall back to org-scoped "uploads/"
                if path_prefix:
                    storage_path = f"{path_prefix}/{file_uuid}/{file_obj.name}"
                else:
                    storage_path = f"uploads/{org_id}/{file_uuid}/{file_obj.name}"

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

        Returns a presigned URL (S3) or local media URL depending on backend.
        """
        instance = self.get_object()
        backend = get_storage_backend()

        try:
            url = backend.get_url(instance.storage_path, signed=True)
            return Response({"url": url, "expires_in": 3600})
        except NotImplementedError:
            return Response(
                {"detail": "Download URL generation not supported by current backend."},
                status=status.HTTP_501_NOT_IMPLEMENTED,
            )

    @action(detail=False, methods=["post"], url_path="presigned-urls")
    def presigned_urls(self, request):
        """
        Generate presigned URLs for multiple storage paths.

        Request body:
            {"paths": ["path/to/file1.png", "path/to/file2.jpg"]}

        Returns:
            {"urls": {"path/to/file1.png": "https://...", "path/to/file2.jpg": "https://..."}}

        Useful for converting storage paths stored in metadata to displayable URLs.
        Max 100 paths per request.
        """
        paths = request.data.get("paths", [])

        if not isinstance(paths, list):
            return Response(
                {"detail": "paths must be a list of storage paths"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(paths) > 100:
            return Response(
                {"detail": "Maximum 100 paths per request"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        backend = get_storage_backend()
        urls = {}

        for path in paths:
            if not path or not isinstance(path, str):
                continue
            try:
                urls[path] = backend.get_url(path, signed=True)
            except Exception:
                # Skip paths that fail
                urls[path] = None

        return Response({"urls": urls, "expires_in": 3600})
