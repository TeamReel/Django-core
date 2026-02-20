"""DRF ViewSet for asset generation endpoint.

POST /api/v1/generative/assets/generate/
  — Accepts template_id, params, and input images (base64 or URLs)
  — Returns generated variants (base64 images)
  — Video templates return 202 Accepted with task_id for async polling

GET /api/v1/generative/assets/generate/<task_id>/status/
  — Poll for async video generation status

This is a simplified endpoint for the demo frontend.
For production, use the full GenerationRequest async flow.
"""

from __future__ import annotations

import base64
import logging
import threading
import time
import uuid as uuid_mod
from typing import Any

from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response

logger = logging.getLogger("generative.views.asset")

# =============================================================================
# Cache-backed task store for async video generation
# =============================================================================
# Uses Django's cache framework (Redis in production, in-memory locally).
# This ensures tasks survive worker restarts and work across multiple workers.
# Tasks auto-expire after 30 minutes via cache TTL.

_TASK_CACHE_PREFIX = "video_task:"
_TASK_MAX_AGE = 1800  # 30 minutes


def _set_task(task_id: str, data: dict[str, Any]) -> None:
    """Store task data in cache with automatic expiration."""
    from django.core.cache import cache

    data.setdefault("_created", time.time())
    cache.set(f"{_TASK_CACHE_PREFIX}{task_id}", data, timeout=_TASK_MAX_AGE)


def _get_task(task_id: str) -> dict[str, Any] | None:
    """Retrieve task data from cache."""
    from django.core.cache import cache

    return cache.get(f"{_TASK_CACHE_PREFIX}{task_id}")


def _cleanup_old_tasks() -> None:
    """No-op: cache handles expiration automatically via TTL."""
    pass


def _create_generation_job(
    task_id: str,
    template_id: str,
    output_type: str,
    *,
    user_id: int | None = None,
    project_id: str | None = None,
    membership_id: str | None = None,
    output_asset_type: str | None = None,
    label: str = "",
) -> None:
    """Persist a GenerationJob record for the Workflow Queue UI.

    Silently ignores DB errors to avoid blocking the generation response.
    """
    try:
        from .models import GenerationJob
        import uuid

        GenerationJob.objects.create(
            task_id=uuid.UUID(task_id),
            template_id=template_id,
            label=label or template_id,
            output_type=output_type,
            output_asset_type=output_asset_type or "",
            project_id=project_id,
            membership_id=membership_id,
            created_by_id=user_id,
            status="queued",
            progress=0,
        )
    except Exception as e:  # noqa: BLE001
        logger.warning("Failed to create GenerationJob record for %s: %s", task_id, e)


# =============================================================================
# Serializers
# =============================================================================


class AssetGenerateInputSerializer(serializers.Serializer):
    """Input for asset generation."""

    template_id = serializers.CharField(
        help_text="Template key from teamreel_prompts.TEMPLATES",
    )
    params = serializers.DictField(
        child=serializers.CharField(),
        required=False,
        default=dict,
        help_text="Template parameters (e.g. sleeves, neck, kit_type)",
    )
    variant_count = serializers.IntegerField(
        min_value=1,
        max_value=4,
        default=1,
        help_text="Number of variants to generate (1-4)",
    )

    # Input images as base64 strings (keyed by role)
    input_images = serializers.DictField(
        child=serializers.CharField(),
        required=False,
        default=dict,
        help_text="Input images as base64 strings. Keys: logo, sponsor, reference_photo, person_photo",
    )

    # Alternative: input image URLs (S3 presigned)
    input_image_urls = serializers.DictField(
        child=serializers.URLField(),
        required=False,
        default=dict,
        help_text="Input images as URLs. Keys: logo, sponsor, reference_photo, person_photo",
    )

    # === Context for S3 folder structure (media-architecture.md) ===
    project_id = serializers.CharField(
        required=False,
        allow_null=True,
        allow_blank=True,
        help_text="Project ID or slug for scoping storage and brand lookup",
    )
    organisation_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="Organisation ID for fallback brand lookup",
    )
    membership_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="Membership ID for member-specific content",
    )
    activity_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="Activity ID (match/training) for activity-specific content",
    )

    # === Asset type for BrandAsset linking ===
    asset_type = serializers.CharField(
        required=False,
        allow_null=True,
        help_text="BrandAsset type (e.g. logo, kit_home, kit_away_combined)",
    )

    # === Storage options ===
    save_to_brand = serializers.BooleanField(
        default=True,
        help_text="Create BrandAsset record after generation",
    )
    save_to_media_library = serializers.BooleanField(
        default=True,
        help_text="Create MediaItem record for rich media features",
    )

    # === Provider selection ===
    provider = serializers.ChoiceField(
        choices=["minimax", "runway", "pika", "veo"],
        required=False,
        allow_null=True,
        allow_blank=True,
        default=None,
        help_text="Explicit video provider (minimax, runway, pika, veo). If omitted, auto-selects.",
    )


class StorageInfoSerializer(serializers.Serializer):
    """Storage info for saved files."""

    storage_backend = serializers.CharField()
    storage_path = serializers.CharField()
    original_name = serializers.CharField()
    file_size_bytes = serializers.IntegerField()
    file_size_kb = serializers.FloatField()
    mime_type = serializers.CharField()
    created_at = serializers.CharField()
    # IDs for created records
    file_asset_id = serializers.UUIDField(required=False, allow_null=True)
    brand_asset_id = serializers.UUIDField(required=False, allow_null=True)
    media_item_id = serializers.UUIDField(required=False, allow_null=True)


class AssetVariantSerializer(serializers.Serializer):
    """Output for a single generated variant (image or video)."""

    variant_index = serializers.IntegerField()
    image_base64 = serializers.CharField(allow_null=True, required=False)
    video_base64 = serializers.CharField(allow_null=True, required=False)  # For video output
    video_url = serializers.URLField(allow_null=True, required=False)  # Presigned S3 URL for video
    file_asset_id = serializers.UUIDField(allow_null=True, required=False)  # FileAsset reference
    mime_type = serializers.CharField(allow_null=True)
    filename = serializers.CharField(allow_null=True)
    error = serializers.CharField(required=False, allow_null=True)
    metadata = serializers.DictField(required=False)
    presigned_url = serializers.CharField(required=False, allow_null=True)
    storage_path = serializers.CharField(required=False, allow_null=True)  # Added for easier saving
    storage_info = StorageInfoSerializer(required=False, allow_null=True)


class AssetGenerateOutputSerializer(serializers.Serializer):
    """Output for asset generation."""

    template_id = serializers.CharField()
    variant_count = serializers.IntegerField()
    variants = AssetVariantSerializer(many=True)
    kit_analysis = serializers.CharField(required=False, allow_blank=True)


# =============================================================================
# View
# =============================================================================


@api_view(["POST"])
@permission_classes([AllowAny])  # Demo mode — tighten for production
def generate_asset_view(request: Request) -> Response:
    """Generate asset variants synchronously.

    This is a demo-friendly endpoint that runs generation synchronously
    and returns base64-encoded image variants.

    For production use with credits/tracking, use the full
    GenerationRequest flow at /api/v1/generative/requests/.

    Request body:
        {
            "template_id": "tenue_generate",
            "params": {"sleeves": "short", "neck": "round", "kit_type": "home"},
            "variant_count": 2,
            "input_images": {
                "logo": "<base64>",
                "sponsor": "<base64>",
                "reference_photo": "<base64>"
            }
        }

    Response:
        {
            "template_id": "tenue_generate",
            "variant_count": 2,
            "variants": [
                {"variant_index": 0, "image_base64": "...", "mime_type": "image/png", "filename": "..."},
                {"variant_index": 1, "image_base64": "...", "mime_type": "image/png", "filename": "..."}
            ]
        }
    """
    serializer = AssetGenerateInputSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    template_id = serializer.validated_data["template_id"]
    params = serializer.validated_data["params"]
    variant_count = serializer.validated_data["variant_count"]
    input_images_b64 = serializer.validated_data.get("input_images", {})
    input_image_urls = serializer.validated_data.get("input_image_urls", {})

    # === Context for storage and record creation ===
    project_id = serializer.validated_data.get("project_id")
    organisation_id = serializer.validated_data.get("organisation_id")
    membership_id = serializer.validated_data.get("membership_id")
    activity_id = serializer.validated_data.get("activity_id")
    asset_type = serializer.validated_data.get("asset_type")
    save_to_brand = serializer.validated_data.get("save_to_brand", True)
    save_to_media_library = serializer.validated_data.get("save_to_media_library", True)
    provider = serializer.validated_data.get("provider") or None

    # Resolve project slug → canonical project ID early so all downstream
    # references (GenerationJob record, storage_context, Celery kwargs) use
    # a consistent identifier that matches existing jobs.
    if project_id and not str(project_id).isdigit():
        try:
            from projects.models import Project

            _proj = Project.objects.only("id").get(slug=project_id)
            # Use zero-padded UUID string like "00000000-0000-0000-0000-000000000182"
            project_id = f"00000000-0000-0000-0000-{_proj.id:012d}"
            logger.debug(
                "Resolved project slug %r → %s",
                serializer.validated_data.get("project_id"),
                project_id,
            )
        except Exception:  # noqa: BLE001
            logger.debug("Could not resolve project slug %r, using as-is", project_id)

    # Decode base64 images
    input_images: dict[str, bytes] = {}
    for key, b64_str in input_images_b64.items():
        try:
            # Handle data URI prefix (data:image/png;base64,...)
            if "," in b64_str:
                b64_str = b64_str.split(",", 1)[1]
            input_images[key] = base64.b64decode(b64_str)
        except (ValueError, Exception) as e:  # noqa: BLE001
            return Response(
                {"error": f"Invalid base64 for input_images.{key}: {e}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    # Fetch images from URLs if provided (and not already in base64)
    if input_image_urls:
        import requests as http_requests

        for key, url in input_image_urls.items():
            if key not in input_images:
                try:
                    resp = http_requests.get(url, timeout=30)
                    resp.raise_for_status()
                    input_images[key] = resp.content
                except (http_requests.RequestException, OSError) as e:
                    return Response(
                        {"error": f"Failed to fetch input_image_urls.{key}: {e}"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

    # Check if this is a video template
    try:
        from .services.asset_pipeline import _get_template_output_type

        output_type = _get_template_output_type(template_id)
    except ValueError as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as e:  # noqa: BLE001
        logger.exception("Failed to resolve template output type for %s: %s", template_id, e)
        return Response(
            {"error": f"Template resolution failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Run the appropriate pipeline based on output type
    if output_type == "video":
        # Video generation is async via Celery queue (ai_generation).
        # Frontend polls GET .../generate/<task_id>/status/ for result.
        try:
            task_id = str(uuid_mod.uuid4())

            # Determine user_id safely
            user_id = request.user.id if request.user and request.user.is_authenticated else None

            # Build context for S3 storage
            storage_context = {
                "project_id": str(project_id) if project_id else None,
                "membership_id": str(membership_id) if membership_id else None,
                "activity_id": str(activity_id) if activity_id else None,
                "asset_type": asset_type,
                "save_to_brand": save_to_brand,
                "save_to_media_library": save_to_media_library,
            }

            # Store initial task status
            _cleanup_old_tasks()
            _set_task(
                task_id,
                {
                    "status": "queued",
                    "progress": 2,
                    "message": "Video generation queued…",
                },
            )

            # Persist job to DB for Workflow Queue UI
            _create_generation_job(
                task_id,
                template_id,
                "video",
                user_id=user_id,
                project_id=str(project_id) if project_id else None,
                membership_id=str(membership_id) if membership_id else None,
                output_asset_type=asset_type or "",
            )

            # Encode images to base64 for Celery serialization (JSON-safe)
            input_images_b64_for_celery: dict[str, str] = {}
            for key, img_bytes in input_images.items():
                input_images_b64_for_celery[key] = base64.b64encode(img_bytes).decode("utf-8")

            # Dispatch to Celery ai_generation queue (rate-limited, sequential)
            from .tasks_asset import generate_asset_task

            try:
                generate_asset_task.apply_async(
                    kwargs={
                        "job_id": task_id,
                        "template_id": template_id,
                        "params": params,
                        "input_images_b64": input_images_b64_for_celery,
                        "variant_count": variant_count,
                        "output_type": "video",
                        "user_id": user_id,
                        "organisation_id": str(organisation_id) if organisation_id else None,
                        "storage_context": storage_context,
                        "provider": provider,
                    },
                    queue="ai_generation",
                )
                logger.info("Video generation task %s dispatched to ai_generation queue", task_id)
            except Exception as celery_err:
                # Celery broker unavailable — fallback to old threading approach
                logger.warning(
                    "Celery dispatch failed (%s), falling back to thread for task %s",
                    celery_err,
                    task_id,
                )
                thread = threading.Thread(
                    target=_run_video_generation,
                    kwargs={
                        "task_id": task_id,
                        "template_id": template_id,
                        "params": params,
                        "input_images": input_images,
                        "user_id": user_id,
                        "organisation_id": str(organisation_id) if organisation_id else None,
                        "storage_context": storage_context,
                        "variant_count": variant_count,
                    },
                    daemon=True,
                )
                thread.start()

            return Response(
                {
                    "status": "queued",
                    "task_id": task_id,
                    "message": "Video generation queued. Poll /status/ for result.",
                },
                status=status.HTTP_202_ACCEPTED,
            )

        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:  # noqa: BLE001
            logger.exception("Video generation dispatch failed: %s", e)
            return Response(
                {"error": f"Video generation failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    # Image generation — also async via Celery queue (ai_generation).
    # All AI calls are rate-limited and tracked through the workflow queue.
    try:
        task_id = str(uuid_mod.uuid4())

        user_id = request.user.id if request.user and request.user.is_authenticated else None

        storage_context = {
            "project_id": str(project_id) if project_id else None,
            "membership_id": str(membership_id) if membership_id else None,
            "activity_id": str(activity_id) if activity_id else None,
            "asset_type": asset_type,
            "save_to_brand": save_to_brand,
            "save_to_media_library": save_to_media_library,
        }

        _set_task(
            task_id,
            {
                "status": "queued",
                "progress": 2,
                "message": "Image generation queued…",
            },
        )

        # Persist job to DB for Workflow Queue UI
        _create_generation_job(
            task_id,
            template_id,
            "image",
            user_id=user_id,
            project_id=str(project_id) if project_id else None,
            membership_id=str(membership_id) if membership_id else None,
            output_asset_type=asset_type or "",
        )

        # Encode images to base64 for Celery serialization
        input_images_b64_for_celery: dict[str, str] = {}
        for key, img_bytes in input_images.items():
            input_images_b64_for_celery[key] = base64.b64encode(img_bytes).decode("utf-8")

        from .tasks_asset import generate_asset_task

        try:
            generate_asset_task.apply_async(
                kwargs={
                    "job_id": task_id,
                    "template_id": template_id,
                    "params": params,
                    "input_images_b64": input_images_b64_for_celery,
                    "variant_count": variant_count,
                    "output_type": "image",
                    "user_id": user_id,
                    "organisation_id": str(organisation_id) if organisation_id else None,
                    "storage_context": storage_context,
                },
                queue="ai_generation",
            )
            logger.info("Image generation task %s dispatched to ai_generation queue", task_id)
        except Exception as celery_err:
            # Celery broker unavailable — fallback to synchronous generation
            logger.warning(
                "Celery dispatch failed (%s), falling back to sync for task %s",
                celery_err,
                task_id,
            )
            try:
                from .services.asset_pipeline import generate_asset

                results = generate_asset(
                    template_id=template_id,
                    params=params,
                    input_images=input_images,
                    variant_count=variant_count,
                )
                variants = []
                for r in results:
                    variants.append(
                        {
                            "variant_index": r.get("variant_index", 0),
                            "image_base64": r.get("image_base64"),
                            "mime_type": r.get("mime_type"),
                            "filename": r.get("filename"),
                            "error": r.get("error"),
                            "metadata": r.get("metadata"),
                        }
                    )
                _set_task(
                    task_id,
                    {
                        "status": "completed",
                        "progress": 100,
                        "data": {
                            "template_id": template_id,
                            "variant_count": len(variants),
                            "variants": variants,
                        },
                    },
                )
            except Exception as gen_err:
                _set_task(task_id, {"status": "failed", "error": str(gen_err)})

        return Response(
            {
                "status": "queued",
                "task_id": task_id,
                "message": "Image generation queued. Poll /status/ for result.",
            },
            status=status.HTTP_202_ACCEPTED,
        )
    except ValueError as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as e:  # noqa: BLE001
        logger.exception("Image generation dispatch failed: %s", e)
        return Response(
            {"error": f"Generation failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Save generated images to storage and include storage info in response
    try:
        from files.utils import get_storage_backend

        storage = get_storage_backend()
        storage_backend_name = storage.__class__.__name__
    except Exception as e:  # noqa: BLE001
        logger.exception("Failed to initialise storage backend: %s", e)
        # Return results without storage - base64 is still available
        clean_variants = []
        for r in results:
            clean_variants.append(
                {
                    "variant_index": r["variant_index"],
                    "image_base64": r.get("image_base64"),
                    "mime_type": r.get("mime_type"),
                    "filename": r.get("filename"),
                    "error": r.get("error"),
                    "metadata": r.get("metadata"),
                    "presigned_url": None,
                    "storage_info": None,
                }
            )
        return Response(
            {
                "template_id": template_id,
                "variant_count": variant_count,
                "variants": clean_variants,
            },
            status=status.HTTP_200_OK,
        )

    # Lookup project/organisation for proper scoping
    project = None
    organisation = None
    if project_id:
        try:
            from projects.models import Project

            # project_id can be a numeric ID or a slug string
            if str(project_id).isdigit():
                project = Project.objects.select_related("organisation").get(id=project_id)
            else:
                project = Project.objects.select_related("organisation").get(slug=project_id)
            organisation = project.organisation
        except Project.DoesNotExist:
            logger.warning(f"Project {project_id} not found")
    if not organisation and organisation_id:
        try:
            from organisations.models import Organisation

            organisation = Organisation.objects.get(id=organisation_id)
        except Organisation.DoesNotExist:
            logger.warning(f"Organisation {organisation_id} not found")

    # Lookup activity for activity-scoped storage
    activity = None
    if activity_id:
        try:
            from activities.models import Activity

            activity = Activity.objects.get(id=activity_id)
        except Activity.DoesNotExist:
            logger.warning(f"Activity {activity_id} not found")

    # Get current user for ownership
    current_user = request.user if request.user.is_authenticated else None

    clean_variants = []
    for r in results:
        variant_data = {
            "variant_index": r["variant_index"],
            "image_base64": r.get("image_base64"),
            "mime_type": r.get("mime_type"),
            "filename": r.get("filename"),
            "error": r.get("error"),
            "metadata": r.get("metadata"),
            "presigned_url": None,
            "storage_info": None,
        }

        # If we have image bytes, save to storage
        image_bytes = r.get("image_bytes")
        if image_bytes and not r.get("error"):
            try:
                from django.core.files.base import ContentFile
                from django.utils import timezone

                import uuid as uuid_module

                filename = r.get("filename") or f"generated_{r['variant_index']}.png"
                mime_type = r.get("mime_type") or "image/png"

                # Build proper S3 path based on context (media-architecture.md)
                timestamp = timezone.now().strftime("%Y%m%d")
                unique_suffix = str(uuid_module.uuid4())[:8]

                # Determine storage folder from params context
                context_type = params.get("template_type", "output")
                context_subtype = params.get("template_subtype", "")
                asset_folder = (
                    f"{context_type}/{context_subtype}" if context_subtype else context_type
                )

                # Add unique suffix to filename
                name_parts = filename.rsplit(".", 1)
                if len(name_parts) == 2:
                    name, ext = name_parts
                    unique_filename = f"{name}_{timestamp}_{unique_suffix}.{ext}"
                else:
                    unique_filename = f"{filename}_{timestamp}_{unique_suffix}"

                # Build hierarchical path based on context (media-architecture.md)
                # Priority: membership > activity > project > organisation > generic
                if membership_id:
                    storage_path_prefix = (
                        f"members/{membership_id}/generated/{asset_folder}/{unique_filename}"
                    )
                elif activity:
                    storage_path_prefix = (
                        f"activities/{activity.id}/generated/{asset_folder}/{unique_filename}"
                    )
                elif project:
                    storage_path_prefix = (
                        f"projects/{project.id}/generated/{asset_folder}/{unique_filename}"
                    )
                elif organisation:
                    storage_path_prefix = (
                        f"orgs/{organisation.id}/generated/{asset_folder}/{unique_filename}"
                    )
                else:
                    storage_path_prefix = f"generated/{asset_folder}/{unique_filename}"

                # Save to storage backend
                file_obj = ContentFile(image_bytes, name=filename)
                storage_path = storage.save(storage_path_prefix, file_obj)

                # Generate access URL
                try:
                    presigned_url = storage.get_url(storage_path, signed=True)
                except Exception:
                    presigned_url = storage.url(storage_path) if hasattr(storage, "url") else None

                # ===================================================================
                # CREATE FILEASSET (B22 File Storage)
                # ===================================================================
                file_asset = None
                file_asset_id = None
                if organisation:
                    try:
                        from files.models import FileAsset

                        file_asset = FileAsset.objects.create(
                            organization=organisation,
                            uploaded_by=current_user,
                            original_name=filename,
                            storage_path=storage_path,
                            file_size=len(image_bytes),
                            mime_type=mime_type,
                            is_public=False,
                            metadata={
                                "source": "ai_generation",
                                "asset_type": asset_type,  # Tag with intended asset type (e.g. kit_home)
                                "template_id": template_id,
                                "template_type": context_type,
                                "template_subtype": context_subtype,
                                "variant_index": r["variant_index"],
                            },
                        )
                        file_asset_id = file_asset.id
                        logger.info(f"   📄 FileAsset created: {file_asset_id}")
                    except Exception as fa_error:  # noqa: BLE001
                        logger.warning(f"Failed to create FileAsset: {fa_error}")

                # ===================================================================
                # CREATE BRANDASSET (B33 Brand Identity Manager)
                # ===================================================================
                brand_asset = None
                brand_asset_id = None
                if save_to_brand and file_asset and asset_type:
                    try:
                        from branding.models import BrandAsset, BrandProfile

                        # Get the effective brand profile
                        brand_profile = BrandProfile.get_effective_brand(
                            organisation=organisation,
                            project=project,
                        )

                        if brand_profile:
                            # Check if asset_type already exists - update or create
                            brand_asset, created = BrandAsset.objects.update_or_create(
                                profile=brand_profile,
                                asset_type=asset_type,
                                defaults={
                                    "file": file_asset,
                                    "alt_text": f"AI-generated {asset_type.replace('_', ' ')}",
                                    "is_active": True,
                                },
                            )
                            brand_asset_id = brand_asset.id
                            action = "created" if created else "updated"
                            logger.info(
                                f"   🎨 BrandAsset {action}: {brand_asset_id} (type={asset_type})"
                            )
                        else:
                            logger.warning(
                                f"No BrandProfile found for org={organisation_id} project={project_id}"
                            )
                    except Exception as ba_error:  # noqa: BLE001
                        logger.warning(f"Failed to create BrandAsset: {ba_error}")

                # ===================================================================
                # CREATE MEDIAITEM (B35 Smart Asset Library)
                # ===================================================================
                media_item = None
                media_item_id = None
                if save_to_media_library and file_asset and project:
                    try:
                        from medialib.models import MediaItem, MediaItemRelation, MediaItemState

                        # Build rich extraction_metadata with context
                        meta = {
                            "source": "ai_generation",
                            "asset_type": f"{context_subtype}_{r['variant_index']}"
                            if context_subtype
                            else f"generated_{r['variant_index']}",
                            "template_id": template_id,
                            "template_type": context_type,
                            "template_subtype": context_subtype,
                            "variant_index": r["variant_index"],
                        }

                        # Add project context (club/team)
                        if project:
                            meta["project_id"] = project.id
                            meta["project_name"] = project.name
                            if project.parent_project:
                                meta["club_name"] = project.parent_project.name
                                meta["team_name"] = project.name
                            else:
                                meta["club_name"] = project.name

                        # Add organisation context
                        if organisation:
                            meta["organisation_id"] = str(organisation.id)
                            meta["organisation_name"] = organisation.name

                        # Add activity/match context
                        if activity:
                            meta["activity_id"] = str(activity.id)
                            meta["activity_title"] = activity.title
                            if hasattr(activity, "activity_date") and activity.activity_date:
                                meta["activity_date"] = activity.activity_date.isoformat()
                            # Add match-specific fields if available
                            if hasattr(activity, "opponent") and activity.opponent:
                                meta["opponent"] = activity.opponent
                            if hasattr(activity, "home_away"):
                                meta["home_away"] = activity.home_away
                            if hasattr(activity, "score_home") and activity.score_home is not None:
                                meta["score_home"] = activity.score_home
                            if hasattr(activity, "score_away") and activity.score_away is not None:
                                meta["score_away"] = activity.score_away

                        # Add tags from params if provided
                        if params and params.get("tags"):
                            meta["tags"] = params.get("tags")

                        # Add sport type from project if available
                        if project and hasattr(project, "sport") and project.sport:
                            meta["sport_type"] = project.sport.name

                        media_item = MediaItem.objects.create(
                            project=project,
                            file=file_asset,
                            title=f"Generated {context_type} - {context_subtype or 'variant'}",
                            description=f"AI-generated content from template {template_id}",
                            mime_type=mime_type,
                            file_size_bytes=len(image_bytes),
                            state=MediaItemState.PROCESSED,
                            extraction_metadata=meta,
                            created_by=current_user,
                            activity=activity,
                        )
                        media_item_id = media_item.id
                        logger.info(f"   🎬 MediaItem created: {media_item_id}")

                        # Create MediaItemRelation to link to activity if present
                        if activity:
                            from django.contrib.contenttypes.models import ContentType

                            activity_ct = ContentType.objects.get_for_model(activity)
                            MediaItemRelation.objects.create(
                                media_item=media_item,
                                content_type=activity_ct,
                                object_id=activity.id,
                                relation_type="generated_for",
                                metadata={"template_id": template_id},
                                created_by=current_user,
                            )
                            logger.info(
                                f"   🔗 MediaItemRelation created for Activity {activity.id}"
                            )
                    except Exception as mi_error:  # noqa: BLE001
                        logger.warning(f"Failed to create MediaItem: {mi_error}")

                # Build storage_info with all IDs
                variant_data["presigned_url"] = presigned_url
                variant_data["storage_info"] = {
                    "storage_backend": storage_backend_name,
                    "storage_path": storage_path,
                    "original_name": filename,
                    "file_size_bytes": len(image_bytes),
                    "file_size_kb": round(len(image_bytes) / 1024, 1),
                    "mime_type": mime_type,
                    "created_at": timezone.now().isoformat(),
                    "file_asset_id": str(file_asset_id) if file_asset_id else None,
                    "brand_asset_id": str(brand_asset_id) if brand_asset_id else None,
                    "media_item_id": str(media_item_id) if media_item_id else None,
                }

                logger.info(
                    f"✅ Generated image saved!\n"
                    f"   📦 Storage: {storage_backend_name}\n"
                    f"   📁 Path: {storage_path}\n"
                    f"   📊 Size: {len(image_bytes):,} bytes"
                )

            except Exception as save_error:  # noqa: BLE001
                logger.warning(f"Failed to save generated image to storage: {save_error}")
                # Continue without storage info - base64 is still available

        clean_variants.append(variant_data)

    output = {
        "template_id": template_id,
        "variant_count": variant_count,
        "variants": clean_variants,
    }

    return Response(output, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def list_asset_templates_view(request: Request) -> Response:  # noqa: ARG001
    """List available asset generation templates.

    Returns template definitions (matching the frontend assetTemplates.ts).

    GET /api/v1/generative/assets/templates/
    """
    import importlib.util
    import os

    from django.conf import settings

    prompts_path = os.path.join(settings.BASE_DIR, "..", "teamreel_prompts.py")
    if not os.path.exists(prompts_path):
        prompts_path = os.path.join(settings.BASE_DIR, "teamreel_prompts.py")

    # If no prompts file exists, return empty templates list
    # This allows the page to load without errors while templates are being configured
    if not os.path.exists(prompts_path):
        return Response({"templates": []}, status=status.HTTP_200_OK)

    try:
        spec = importlib.util.spec_from_file_location("teamreel_prompts", prompts_path)
        prompts_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(prompts_module)

        templates = []
        for _tid, t in prompts_module.TEMPLATES.items():
            templates.append(
                {
                    "id": t["id"],
                    "name": t["name"],
                    "category": t["category"],
                    "description": t["description"],
                    "input_requirements": t["input_requirements"],
                    "parameters": t["parameters"],
                }
            )

        return Response({"templates": templates}, status=status.HTTP_200_OK)
    except Exception:
        # If there's any error loading the prompts file, return empty list
        return Response({"templates": []}, status=status.HTTP_200_OK)


# =============================================================================
# Save Asset Endpoint
# =============================================================================


class SaveAssetInputSerializer(serializers.Serializer):
    """Input for saving a generated asset as BrandAsset."""

    # The generated file reference
    storage_path = serializers.CharField(
        required=False,
        allow_null=True,
        help_text="S3 storage path of the generated file",
    )
    presigned_url = serializers.URLField(
        required=False,
        allow_null=True,
        help_text="Presigned URL to fetch the image",
    )
    video_url = serializers.URLField(
        required=False,
        allow_null=True,
        help_text="Video URL (alternative to presigned_url for videos)",
    )
    image_base64 = serializers.CharField(
        required=False,
        allow_null=True,
        help_text="Base64 encoded image data",
    )
    video_base64 = serializers.CharField(
        required=False,
        allow_null=True,
        help_text="Base64 encoded video data (fallback if no video_url/storage_path)",
    )
    filename = serializers.CharField(
        required=False,
        allow_null=True,
        help_text="Original filename",
    )
    mime_type = serializers.CharField(
        default="image/png",
        help_text="MIME type of the asset",
    )
    file_size_bytes = serializers.IntegerField(
        default=0,
        help_text="File size in bytes",
    )

    # Context
    organisation_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="Organisation ID for brand lookup",
    )
    project_id = serializers.CharField(
        required=False,
        allow_null=True,
        help_text="Project ID (UUID) or Slug for brand lookup",
    )
    membership_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="Membership ID for member-scoped S3 path",
    )
    activity_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="Activity (match) ID — when provided, saves as MediaItem instead of BrandAsset",
    )
    asset_type = serializers.CharField(
        required=True,
        help_text="BrandAsset type (e.g. logo, sponsor_logo, kit_home, member_intro)",
    )


@api_view(["POST"])
@permission_classes([AllowAny])  # Demo mode — tighten for production
def save_asset_view(request: Request) -> Response:
    """Save a generated asset as BrandAsset.

    This endpoint takes a generated image (by storage_path, URL, or base64)
    and creates the corresponding FileAsset + BrandAsset records.

    POST /api/v1/generative/assets/save/
    """
    serializer = SaveAssetInputSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    storage_path = serializer.validated_data.get("storage_path")
    presigned_url = serializer.validated_data.get("presigned_url")
    video_url = serializer.validated_data.get("video_url")
    image_base64 = serializer.validated_data.get("image_base64")
    video_base64 = serializer.validated_data.get("video_base64")
    filename = serializer.validated_data.get("filename") or "saved_asset.png"
    mime_type = serializer.validated_data.get("mime_type") or "image/png"
    file_size_bytes = serializer.validated_data.get("file_size_bytes") or 0
    organisation_id = serializer.validated_data.get("organisation_id")
    project_id = serializer.validated_data.get("project_id")
    membership_id = serializer.validated_data.get("membership_id")
    activity_id = serializer.validated_data.get("activity_id")
    asset_type = serializer.validated_data.get("asset_type")

    logger.info(
        f"🎯 Save asset request: type={asset_type}, org={organisation_id}, project={project_id}"
    )

    # Lookup organisation and project
    organisation = None
    project = None

    if project_id:
        from projects.models import Project
        import uuid

        # Try to parse as UUID
        is_uuid = False
        try:
            uuid.UUID(str(project_id))
            is_uuid = True
        except ValueError:
            is_uuid = False

        if is_uuid:
            try:
                project = Project.objects.select_related("organisation").get(id=project_id)
                organisation = project.organisation
            except Project.DoesNotExist:
                logger.warning(f"Project with ID {project_id} not found")
        else:
            # Try to lookup by slug
            try:
                # If we have organisation_id, prevent cross-org lookup if possible,
                # but Project slug is usually unique or scoped.
                # Assuming Project has a 'slug' field.
                query = {"slug": project_id}
                if organisation_id:
                    query["organisation__id"] = organisation_id

                project = Project.objects.select_related("organisation").get(**query)
                organisation = project.organisation
            except (Project.DoesNotExist, Exception) as e:
                logger.warning(f"Project with slug '{project_id}' not found: {e}")

    if not organisation and organisation_id:
        try:
            from organisations.models import Organisation

            organisation = Organisation.objects.get(id=organisation_id)
        except Organisation.DoesNotExist:
            logger.warning(f"Organisation {organisation_id} not found")

    if not organisation:
        return Response(
            {"error": "Organisation not found. Provide organisation_id or project_id."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Get image bytes
    image_bytes = None

    if image_base64:
        try:
            # Handle data URI prefix
            if "," in image_base64:
                image_base64 = image_base64.split(",", 1)[1]
            image_bytes = base64.b64decode(image_base64)
            file_size_bytes = len(image_bytes)
        except Exception as e:
            return Response(
                {"error": f"Invalid base64 data: {e}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
    elif video_base64:
        try:
            if "," in video_base64:
                video_base64 = video_base64.split(",", 1)[1]
            image_bytes = base64.b64decode(video_base64)
            file_size_bytes = len(image_bytes)
            # Ensure mime_type is video
            if not mime_type.startswith("video/"):
                mime_type = "video/mp4"
        except Exception as e:
            return Response(
                {"error": f"Invalid video base64 data: {e}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
    elif presigned_url or video_url:
        download_url = presigned_url or video_url
        try:
            import requests as http_requests

            resp = http_requests.get(download_url, timeout=60)  # Video downloads might take longer
            resp.raise_for_status()
            image_bytes = resp.content
            file_size_bytes = len(image_bytes)
        except Exception as e:
            return Response(
                {"error": f"Failed to fetch asset from URL: {e}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
    elif storage_path:
        # Asset already in S3, just create records pointing to it
        pass
    else:
        return Response(
            {
                "error": "Provide image_base64, video_base64, presigned_url, video_url, or storage_path"
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    current_user = request.user if request.user.is_authenticated else None

    # If we have bytes (image or video), save to proper storage location
    final_storage_path = storage_path
    if image_bytes and not storage_path:
        try:
            from django.core.files.base import ContentFile
            from django.utils import timezone

            import uuid as uuid_module

            from files.utils import get_storage_backend

            storage = get_storage_backend()

            timestamp = timezone.now().strftime("%Y%m%d")
            unique_suffix = str(uuid_module.uuid4())[:8]

            # Build proper path for brand assets
            name_parts = filename.rsplit(".", 1)
            if len(name_parts) == 2:
                name, ext = name_parts
                unique_filename = f"{name}_{timestamp}_{unique_suffix}.{ext}"
            else:
                unique_filename = f"{filename}_{timestamp}_{unique_suffix}"

            # Build hierarchical path: membership > project > org (media-architecture.md)
            if membership_id:
                storage_path_prefix = (
                    f"members/{membership_id}/generated/{asset_type}/{unique_filename}"
                )
            elif project:
                storage_path_prefix = (
                    f"projects/{project.id}/generated/{asset_type}/{unique_filename}"
                )
            else:
                storage_path_prefix = f"orgs/{organisation.id}/brand/{asset_type}/{unique_filename}"

            file_obj = ContentFile(image_bytes, name=filename)
            final_storage_path = storage.save(storage_path_prefix, file_obj)

            logger.info(f"💾 Saved to storage: {final_storage_path}")
        except Exception as e:
            logger.exception(f"Failed to save to storage: {e}")
            return Response(
                {"error": f"Failed to save to storage: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    # Create FileAsset record (or reuse existing one if storage_path already exists)
    file_asset = None
    try:
        from files.models import FileAsset

        # Check if a FileAsset already exists with this storage_path (e.g., from generation step)
        if final_storage_path:
            file_asset = FileAsset.objects.filter(storage_path=final_storage_path).first()

        if file_asset:
            logger.info(f"📄 Reusing existing FileAsset: {file_asset.id}")
        else:
            file_asset = FileAsset.objects.create(
                organization=organisation,
                uploaded_by=current_user,
                original_name=filename,
                storage_path=final_storage_path,
                file_size=file_size_bytes,
                mime_type=mime_type,
                is_public=False,
                metadata={
                    "source": "ai_generation_saved",
                    "asset_type": asset_type,
                },
            )
            logger.info(f"📄 FileAsset created: {file_asset.id}")
    except Exception as e:
        logger.exception(f"Failed to create FileAsset: {e}")
        return Response(
            {"error": f"Failed to create FileAsset: {e}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # ── Persist as MediaItem (match-scoped) OR BrandAsset (org branding) ──
    # Member-scoped assets (fullbody, closeup, intro, celebration) are NOT saved as BrandAssets.
    # They are stored per-member in membership metadata by the frontend's onAssetSaved callback.
    # We only create FileAsset + storage path here; the frontend handles member-level persistence.
    media_item = None
    brand_asset = None

    is_member_asset = (
        bool(membership_id)
        and asset_type
        and (
            asset_type.startswith("member_in_tenue")
            or asset_type.startswith("member_closeup")
            or asset_type.startswith("member_intro")
            or asset_type.startswith("member_goal_celebration")
        )
    )

    if activity_id:
        # ── MediaItem path: match/activity-scoped content (media-architecture.md) ──
        try:
            from activities.models import Activity
            from medialib.models import MediaItem, MediaItemState

            activity = Activity.objects.get(id=activity_id)

            # Determine the project: explicit project > activity's project
            media_project = project
            if not media_project and hasattr(activity, "project_id") and activity.project_id:
                from projects.models import Project as Proj

                media_project = Proj.objects.filter(id=activity.project_id).first()

            if not media_project:
                return Response(
                    {"error": "Cannot determine project for this activity."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Build rich extraction_metadata with context
            meta = {
                "source": "ai_generation_saved",
                "asset_type": asset_type,
            }

            # Add project context (club/team)
            if media_project:
                meta["project_id"] = media_project.id
                meta["project_name"] = media_project.name
                if media_project.parent_project:
                    meta["club_name"] = media_project.parent_project.name
                    meta["team_name"] = media_project.name
                else:
                    meta["club_name"] = media_project.name

            # Add organisation context
            if organisation:
                meta["organisation_id"] = str(organisation.id)
                meta["organisation_name"] = organisation.name

            # Add activity/match context
            if activity:
                meta["activity_id"] = str(activity.id)
                meta["activity_title"] = activity.title
                if hasattr(activity, "activity_date") and activity.activity_date:
                    meta["activity_date"] = activity.activity_date.isoformat()
                # Add match-specific fields if available
                if hasattr(activity, "opponent") and activity.opponent:
                    meta["opponent"] = activity.opponent
                if hasattr(activity, "home_away"):
                    meta["home_away"] = activity.home_away
                if hasattr(activity, "score_home") and activity.score_home is not None:
                    meta["score_home"] = activity.score_home
                if hasattr(activity, "score_away") and activity.score_away is not None:
                    meta["score_away"] = activity.score_away

            # Add sport type from project if available
            if media_project and hasattr(media_project, "sport") and media_project.sport:
                meta["sport_type"] = media_project.sport.name

            # Always create a NEW MediaItem (previous ones become history)
            media_item = MediaItem.objects.create(
                file=file_asset,
                activity=activity,
                project=media_project,
                title=filename,
                description=f"AI-generated {asset_type.replace('_', ' ')}",
                mime_type=mime_type,
                file_size_bytes=file_size_bytes or 0,
                state=MediaItemState.PROCESSED,
                created_by=current_user,
                extraction_metadata=meta,
            )
            logger.info(
                f"🎬 MediaItem created: {media_item.id} "
                f"(activity={activity_id}, type={asset_type})"
            )

        except Activity.DoesNotExist:
            return Response(
                {"error": f"Activity {activity_id} not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            logger.exception(f"Failed to create MediaItem: {e}")
            return Response(
                {"error": f"Failed to create MediaItem: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
    else:
        # ── BrandAsset path: organisation-level branding (logos, kits, sponsors) ──
        # Skip BrandAsset for member-scoped assets — they live in membership metadata, not brand profile.
        if is_member_asset:
            logger.info(
                f"👤 Member-scoped asset (membership={membership_id}), "
                f"skipping BrandAsset creation. FileAsset={file_asset.id if file_asset else None}"
            )
        else:
            try:
                from branding.models import BrandAsset, BrandProfile

                # Get the effective brand profile
                brand_profile = BrandProfile.get_effective_brand(
                    organisation=organisation,
                    project=project,
                )

                if not brand_profile:
                    # Create a default brand profile for this organisation
                    brand_profile = BrandProfile.objects.create(
                        organisation=organisation,
                        name=f"{organisation.name} Brand",
                        is_active=True,
                        created_by=current_user,
                    )
                    logger.info(f"🆕 Created new BrandProfile: {brand_profile.id}")

                # Create or update the BrandAsset
                brand_asset, created = BrandAsset.objects.update_or_create(
                    profile=brand_profile,
                    asset_type=asset_type,
                    defaults={
                        "file": file_asset,
                        "alt_text": f"AI-processed {asset_type.replace('_', ' ')}",
                        "is_active": True,
                    },
                )
                action = "created" if created else "updated"
                logger.info(f"🎨 BrandAsset {action}: {brand_asset.id} (type={asset_type})")

            except Exception as e:
                logger.exception(f"Failed to create BrandAsset: {e}")
                return Response(
                    {"error": f"Failed to create BrandAsset: {e}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

    # Generate presigned URL for immediate frontend display
    presigned_url = None
    if final_storage_path:
        try:
            presigned_url = storage.get_url(final_storage_path, signed=True, expiry_seconds=3600)
        except Exception:
            logger.warning("Could not generate presigned URL for save response")

    return Response(
        {
            "status": "success",
            "message": f"Asset saved as {asset_type}",
            "data": {
                "file_asset_id": str(file_asset.id) if file_asset else None,
                "media_item_id": str(media_item.id) if media_item else None,
                "brand_asset_id": str(brand_asset.id) if brand_asset else None,
                "storage_path": final_storage_path,
                "presigned_url": presigned_url,
                "asset_type": asset_type,
            },
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def list_asset_history_view(request: Request) -> Response:
    """List historical file assets, optionally filtered by asset type.

    GET /api/v1/generative/assets/history/
    GET /api/v1/generative/assets/history/?project_id=...&asset_type=kit_home

    When called without asset_type, returns recent history across all types (overview mode).
    """
    project_id = request.query_params.get("project_id")
    organisation_id = request.query_params.get("organisation_id")
    asset_type = request.query_params.get("asset_type")
    limit = int(request.query_params.get("limit", 20))

    from files.models import FileAsset

    # Build filters - is_deleted=False is always required
    filters: dict = {"is_deleted": False}

    # Only filter by asset_type if provided
    if asset_type:
        filters["metadata__asset_type"] = asset_type

    # Scoping by project or organisation (optional for overview)
    if project_id:
        # Resolve org from project if possible, but FileAsset is linked to Org
        try:
            from projects.models import Project

            # Try UUID first
            try:
                p = Project.objects.get(id=project_id)
            except (ValueError, Exception):
                # Fallback to slug lookup if supported, or other field
                # Assuming 'slug' field exists or we can't find it
                p = Project.objects.filter(slug=project_id).first()
                if not p:
                    raise Exception("Project not found")

            filters["organization"] = p.organisation
        except:  # noqa: E722
            return Response({"error": "Project not found"}, status=404)
    elif organisation_id:
        filters["organization_id"] = organisation_id
    # Note: If no project_id or organisation_id, we return global history (limited)

    # Query recent files - only include those with asset_type metadata (generated assets)
    assets_qs = (
        FileAsset.objects.filter(**filters)
        .filter(metadata__has_key="asset_type")
        .order_by("-created_at")[:limit]
    )

    # Serialize
    from files.utils import get_storage_backend

    storage = get_storage_backend()

    history = []
    for asset in assets_qs:
        url = None
        try:
            url = storage.get_url(asset.storage_path, signed=True)
        except Exception:
            url = storage.url(asset.storage_path) if hasattr(storage, "url") else None

        history.append(
            {
                "id": str(asset.id),
                "url": url,
                "created_at": asset.created_at,
                "original_name": asset.original_name,
                "asset_type": asset.metadata.get("asset_type"),
                "variant_index": asset.metadata.get("variant_index"),
                "mime_type": asset.mime_type,
            }
        )

    return Response({"history": history})


@api_view(["POST"])
@permission_classes([AllowAny])
def restore_asset_version_view(request: Request) -> Response:
    """Restore a previous FileAsset as the active BrandAsset.

    POST /api/v1/generative/assets/restore/
    {
        "file_asset_id": "...",
        "project_id": "...",
        "asset_type": "kit_home"
    }
    """
    file_asset_id = request.data.get("file_asset_id")
    project_id = request.data.get("project_id")
    organisation_id = request.data.get("organisation_id")
    asset_type = request.data.get("asset_type")

    if not file_asset_id or not asset_type:
        return Response({"error": "file_asset_id and asset_type required"}, status=400)

    from branding.models import BrandAsset, BrandProfile
    from files.models import FileAsset

    try:
        file_asset = FileAsset.objects.get(id=file_asset_id)
    except FileAsset.DoesNotExist:
        return Response({"error": "FileAsset not found"}, status=404)

    # Find BrandProfile
    organisation = None
    p = None
    if project_id:
        from projects.models import Project

        try:
            try:
                p = Project.objects.get(id=project_id)
            except (ValueError, Exception):
                p = Project.objects.filter(slug=project_id).first()

            if p:
                organisation = p.organisation
        except:  # noqa: E722
            pass
    elif organisation_id:
        from organisations.models import Organisation

        try:
            organisation = Organisation.objects.get(id=organisation_id)
        except:  # noqa: E722
            pass

    if not organisation:
        return Response({"error": "Context required"}, status=400)

    brand_profile = BrandProfile.get_effective_brand(
        organisation=organisation, project=p if project_id else None
    )

    if not brand_profile:
        return Response({"error": "BrandProfile not found"}, status=404)

    # Update BrandAsset
    BrandAsset.objects.update_or_create(
        profile=brand_profile,
        asset_type=asset_type,
        defaults={
            "file": file_asset,
            "is_active": True,
            "alt_text": f"Restored version: {file_asset.original_name}",
        },
    )

    return Response({"status": "restored", "url": str(file_asset.id)})


# =============================================================================
# Shared image upload helper — usable from both sync view and Celery tasks
# =============================================================================


def _upload_image_bytes_to_storage(
    *,
    image_bytes: bytes,
    filename: str,
    mime_type: str,
    variant_index: int = 0,
    template_id: str = "",
    template_type: str = "output",
    template_subtype: str = "",
    membership_id: str | None = None,
    organisation_id: str | None = None,
    project_id: str | None = None,
) -> dict:
    """Upload raw image bytes to the configured storage backend.

    Returns a dict:
        {storage_path, presigned_url, file_asset_id, mime_type, filename, error?}

    This is the Celery-safe version of the image upload block in generate_asset_view.
    No BrandAsset / MediaItem creation — that is reserved for the approval→link step.
    """
    try:
        from files.utils import get_storage_backend
        from django.core.files.base import ContentFile
        from django.utils import timezone
        import uuid as _uuid

        storage = get_storage_backend()

        asset_folder = f"{template_type}/{template_subtype}" if template_subtype else template_type
        timestamp = timezone.now().strftime("%Y%m%d")
        unique_suffix = str(_uuid.uuid4())[:8]

        name_parts = filename.rsplit(".", 1)
        if len(name_parts) == 2:
            unique_filename = f"{name_parts[0]}_{timestamp}_{unique_suffix}.{name_parts[1]}"
        else:
            unique_filename = f"{filename}_{timestamp}_{unique_suffix}"

        if membership_id:
            path_prefix = f"members/{membership_id}/generated/{asset_folder}/{unique_filename}"
        elif project_id:
            path_prefix = f"projects/{project_id}/generated/{asset_folder}/{unique_filename}"
        elif organisation_id:
            path_prefix = f"orgs/{organisation_id}/generated/{asset_folder}/{unique_filename}"
        else:
            path_prefix = f"generated/{asset_folder}/{unique_filename}"

        file_obj = ContentFile(image_bytes, name=filename)
        storage_path = storage.save(path_prefix, file_obj)

        try:
            presigned_url = storage.get_url(storage_path, signed=True)
        except Exception:
            presigned_url = storage.url(storage_path) if hasattr(storage, "url") else ""

        # Create FileAsset record if we have an organisation
        file_asset_id = None
        if organisation_id:
            try:
                from organisations.models import Organisation as _Org
                from files.models import FileAsset as _FA

                org = _Org.objects.get(id=organisation_id)
                fa = _FA.objects.create(
                    organization=org,
                    original_name=filename,
                    storage_path=storage_path,
                    file_size=len(image_bytes),
                    mime_type=mime_type,
                    is_public=False,
                    metadata={
                        "source": "ai_generation",
                        "template_id": template_id,
                        "template_type": template_type,
                        "template_subtype": template_subtype,
                        "variant_index": variant_index,
                    },
                )
                file_asset_id = str(fa.id)
            except Exception as fa_err:
                logger.warning("FileAsset creation failed for image upload: %s", fa_err)

        return {
            "variant_index": variant_index,
            "storage_path": storage_path,
            "presigned_url": presigned_url,
            "file_asset_id": file_asset_id,
            "mime_type": mime_type,
            "filename": filename,
        }

    except Exception as exc:
        logger.warning("_upload_image_bytes_to_storage failed: %s", exc)
        return {"variant_index": variant_index, "error": str(exc), "mime_type": mime_type}


# =============================================================================
# Async video generation – background thread + status endpoint
# =============================================================================


def _run_video_upload(
    *,
    task_id: str,
    template_id: str,
    params: dict[str, str],
    result: dict[str, Any],
    organisation_id: str | None,
    storage_context: dict[str, Any],
) -> list[dict[str, Any]]:
    """Upload video variants to S3 and return variant dicts with presigned URLs.

    Extracted from _run_video_generation to be reusable by Celery tasks.
    """
    from files.utils import get_storage_backend as _get_sb

    v_storage = _get_sb()
    v_org = None
    if organisation_id:
        try:
            from organisations.models import Organisation as Org

            v_org = Org.objects.get(id=organisation_id)
        except Exception:
            pass

    variants: list[dict[str, Any]] = []
    all_variants = result.get("variants") or []
    if not all_variants:
        all_variants = [result]

    membership_id = storage_context.get("membership_id")

    for i, v_result in enumerate(all_variants):
        variant: dict[str, Any] = {
            "variant_index": i,
            "mime_type": v_result.get("mime_type") or "video/mp4",
            "filename": v_result.get("filename"),
        }

        v_bytes = v_result.get("video_bytes")
        v_url = v_result.get("video_url")
        v_spath = v_result.get("storage_path")
        v_faid = v_result.get("file_asset_id")

        if v_url:
            variant["video_url"] = v_url
            variant["file_asset_id"] = v_faid
            variant["storage_path"] = v_spath
        elif v_spath and v_faid:
            variant["file_asset_id"] = v_faid
            variant["storage_path"] = v_spath
            try:
                purl = v_storage.get_url(v_spath, signed=True)
                variant["video_url"] = purl
                variant["presigned_url"] = purl
            except Exception as url_err:
                logger.warning("Presigned URL failed for %s: %s", v_spath, url_err)
        elif v_bytes and v_org:
            try:
                from django.core.files.base import ContentFile
                from django.utils import timezone

                fname = v_result.get("filename") or f"video_{i}.mp4"
                ts = timezone.now().strftime("%Y%m%d")
                sfx = str(uuid_mod.uuid4())[:8]

                ctx_type = params.get("template_type", "output")
                ctx_sub = params.get("template_subtype", "")
                folder = f"{ctx_type}/{ctx_sub}" if ctx_sub else ctx_type

                name_parts = fname.rsplit(".", 1)
                uf = (
                    f"{name_parts[0]}_{ts}_{sfx}.{name_parts[1]}"
                    if len(name_parts) == 2
                    else f"{fname}_{ts}_{sfx}"
                )

                if membership_id:
                    sp = f"members/{membership_id}/generated/{folder}/{uf}"
                elif v_org:
                    sp = f"orgs/{v_org.id}/generated/{folder}/{uf}"
                else:
                    sp = f"generated/{folder}/{uf}"

                fo = ContentFile(v_bytes, name=fname)
                final_sp = v_storage.save(sp, fo)

                from files.models import FileAsset

                fa = FileAsset.objects.create(
                    organization=v_org,
                    original_name=fname,
                    storage_path=final_sp,
                    file_size=len(v_bytes),
                    mime_type="video/mp4",
                    is_public=False,
                    metadata={"source": "ai_generation", "template_id": template_id},
                )

                try:
                    purl = v_storage.get_url(final_sp, signed=True)
                except Exception:
                    purl = None

                variant["video_url"] = purl
                variant["storage_path"] = final_sp
                variant["file_asset_id"] = str(fa.id)
                logger.info("Video upload variant %d stored: %s", i, final_sp)
            except Exception as store_err:
                logger.exception("Video upload variant %d S3 failed: %s", i, store_err)
                variant["video_base64"] = base64.b64encode(v_bytes).decode("utf-8")
        elif v_bytes:
            variant["video_base64"] = base64.b64encode(v_bytes).decode("utf-8")
        elif v_result.get("video_base64"):
            variant["video_base64"] = v_result["video_base64"]

        variants.append(variant)

    return variants


def _run_video_generation(
    *,
    task_id: str,
    template_id: str,
    params: dict[str, str],
    input_images: dict[str, bytes],
    user_id: int | None,
    organisation_id: str | None,
    storage_context: dict[str, Any],
    variant_count: int,
) -> None:
    """Background thread: run MiniMax video generation and store result in _VIDEO_TASKS.

    This runs outside the HTTP request lifecycle so Railway's proxy timeout does not apply.
    """
    from django.db import close_old_connections

    try:
        close_old_connections()

        _set_task(
            task_id,
            {
                "status": "processing",
                "progress": 10,
                "message": "Calling video provider (MiniMax)…",
                "_created": _get_task(task_id).get("_created", time.time()),  # type: ignore[union-attr]
            },
        )

        from .services.asset_pipeline import generate_video

        result = generate_video(
            template_id=template_id,
            params=params,
            input_images=input_images,
            user_id=user_id,
            organisation_id=organisation_id,
            context=storage_context,
            variant_count=variant_count,
        )

        if result.get("error"):
            _set_task(
                task_id,
                {
                    "status": "failed",
                    "error": result["error"],
                    "_created": _get_task(task_id).get("_created", time.time()),  # type: ignore[union-attr]
                },
            )
            logger.error("Video task %s failed: %s", task_id, result["error"])
            return

        # ── Process variants (S3 storage + presigned URLs) ──────────────
        _set_task(
            task_id,
            {
                "status": "processing",
                "progress": 75,
                "message": "Uploading video to storage…",
                "_created": _get_task(task_id).get("_created", time.time()),  # type: ignore[union-attr]
            },
        )

        variants = _run_video_upload(
            task_id=task_id,
            template_id=template_id,
            params=params,
            result=result,
            organisation_id=organisation_id,
            storage_context=storage_context,
        )

        # ── Store completed result ──────────────────────────────────────
        _set_task(
            task_id,
            {
                "status": "completed",
                "progress": 100,
                "data": {
                    "template_id": template_id,
                    "variant_count": len(variants),
                    "variants": variants,
                },
                "_created": _get_task(task_id).get("_created", time.time()),  # type: ignore[union-attr]
            },
        )
        logger.info("Video task %s completed with %d variant(s)", task_id, len(variants))

    except Exception as exc:
        logger.exception("Video task %s crashed: %s", task_id, exc)
        _set_task(
            task_id,
            {
                "status": "failed",
                "error": str(exc),
                "_created": _get_task(task_id).get("_created", time.time()),  # type: ignore[union-attr]
            },
        )
    finally:
        close_old_connections()


@api_view(["GET"])
@permission_classes([AllowAny])
def generation_task_status_view(request: Request, task_id: str) -> Response:
    """Poll for async generation status (images + videos).

    All AI generation now goes through the Celery ai_generation queue.
    Frontend polls this endpoint for both image and video tasks.

    Returns:
        - 200 with status "queued" / "waiting" / "processing" / "completed" / "failed"
        - 404 if task_id is unknown (expired or never existed)
    """
    task = _get_task(task_id)
    if task is None:
        return Response(
            {"error": "Task not found or expired", "task_id": task_id},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Don't leak internal keys
    clean = {
        "task_id": task_id,
        "status": task.get("status", "unknown"),
        "progress": task.get("progress", 0),
    }

    if task.get("status") == "completed":
        clean["data"] = task.get("data", {})
    elif task.get("status") == "failed":
        clean["error"] = task.get("error", "Unknown error")
    elif task.get("message"):
        clean["message"] = task["message"]

    return Response(clean)


# =============================================================================
# Generation Job List — Workflow Queue UI
# =============================================================================


@api_view(["GET"])
@permission_classes([AllowAny])
def list_generation_jobs_view(request: Request) -> Response:
    """List AI generation jobs for the Workflow Queue UI.

    GET /api/v1/generative/jobs/

    Query params:
      - status: comma-separated statuses to filter (e.g. queued,processing,completed)
      - project_id: filter to a specific project
      - limit: max results (default 50)

    Returns newest-first list of GenerationJob records, enriched with
    live cache status when available (for real-time progress).
    """
    from .models import GenerationJob

    qs = GenerationJob.objects.all().order_by("-created_at")

    # Filter by user when authenticated (non-admin sees only own jobs)
    if request.user and request.user.is_authenticated and not request.user.is_staff:
        qs = qs.filter(created_by_id=request.user.id)

    # Filter by status
    status_param = request.query_params.get("status", "")
    if status_param:
        statuses = [s.strip() for s in status_param.split(",") if s.strip()]
        qs = qs.filter(status__in=statuses)

    # Filter by project
    project_id_param = request.query_params.get("project_id", "")
    if project_id_param:
        # Resolve slug → canonical UUID so filtering matches stored records
        resolved_project_id = project_id_param
        if not str(project_id_param).isdigit():
            try:
                from projects.models import Project

                _proj = Project.objects.only("id").get(slug=project_id_param)
                resolved_project_id = f"00000000-0000-0000-0000-{_proj.id:012d}"
            except Exception:  # noqa: BLE001
                pass
        # Match both the resolved canonical ID and the raw slug (legacy records)
        from django.db.models import Q

        qs = qs.filter(Q(project_id=resolved_project_id) | Q(project_id=project_id_param))

    # Filter by membership
    membership_id_param = request.query_params.get("membership_id", "")
    if membership_id_param:
        qs = qs.filter(membership_id=membership_id_param)

    limit = min(int(request.query_params.get("limit", 50)), 200)
    jobs = list(qs[:limit])

    # Enrich active jobs with live cache progress
    results = []
    # Storage backend — reused across all jobs to avoid repeated instantiation
    _storage_backend = None

    def _get_fresh_url(storage_path: str) -> str:
        """Generate a fresh presigned/permanent URL from a stored storage path."""
        nonlocal _storage_backend
        if not storage_path:
            return ""
        try:
            if _storage_backend is None:
                from files.utils import get_storage_backend

                _storage_backend = get_storage_backend()
            try:
                return _storage_backend.get_url(storage_path, signed=True)
            except Exception:
                return (
                    _storage_backend.url(storage_path) if hasattr(_storage_backend, "url") else ""
                )
        except Exception:
            return ""

    for job in jobs:
        live = _get_task(str(job.task_id)) if job.is_active else None

        # For completed jobs, also try cache to backfill output_url (legacy path)
        if (
            not live
            and job.status == "completed"
            and not job.output_url
            and not job.output_variants
        ):
            live_completed = _get_task(str(job.task_id))
            if live_completed and live_completed.get("status") == "completed":
                variants = live_completed.get("data", {}).get("variants", [])
                url = next(
                    (
                        v.get("presigned_url", "") or v.get("video_url", "") or ""
                        for v in variants
                        if not v.get("error")
                    ),
                    "",
                )
                if url:
                    try:
                        job.output_url = url
                        job.save(update_fields=["output_url"])
                    except Exception:
                        pass

        # Build output_variants list with fresh presigned URLs
        fresh_variants: list[dict] = []
        for v in job.output_variants or []:
            fresh_url = _get_fresh_url(v.get("storage_path", ""))
            fresh_variants.append(
                {
                    "variant_index": v.get("variant_index", 0),
                    "storage_path": v.get("storage_path", ""),
                    "presigned_url": fresh_url,
                    "file_asset_id": v.get("file_asset_id"),
                    "mime_type": v.get("mime_type", ""),
                    "filename": v.get("filename", ""),
                    "approved": v.get("approved"),  # None/True/False per-variant
                }
            )

        # Primary output_url: prefer first approved or first available variant's fresh URL
        primary_url = job.output_url or ""
        if fresh_variants:
            first_fresh = next(
                (fv["presigned_url"] for fv in fresh_variants if fv["presigned_url"]),
                "",
            )
            if first_fresh:
                primary_url = first_fresh

        results.append(
            {
                "task_id": str(job.task_id),
                "template_id": job.template_id,
                "label": job.label,
                "output_type": job.output_type,
                "output_asset_type": job.output_asset_type,
                "project_id": job.project_id,
                "membership_id": job.membership_id,
                "status": live.get("status", job.status) if live else job.status,
                "progress": live.get("progress", job.progress) if live else job.progress,
                "message": live.get("message", "") if live else "",
                "error_message": live.get("error", job.error_message)
                if live
                else job.error_message,
                "approval_status": job.approval_status,
                "output_url": primary_url,
                "output_variants": fresh_variants,
                "created_at": job.created_at.isoformat(),
                "updated_at": job.updated_at.isoformat(),
                "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            }
        )

    return Response(
        {
            "count": len(results),
            "results": results,
        }
    )


# =============================================================================
# Crop Closeup From Fullbody — smart alpha-channel detection, no AI
# =============================================================================

# Fraction of the *person's* actual height (from bounding box) to keep.
# 0.28 → head + shoulders only (stops around mid-chest).
CLOSEUP_PERSON_RATIO = 0.28
CLOSEUP_OUTPUT_SIZE = (512, 512)  # target CLOSEUP_SPEC
CLOSEUP_ALPHA_THRESHOLD = 10  # pixels below this alpha are treated as background


def _smart_crop_closeup(img):  # type: ignore[return]  # PIL.Image
    """Return a square 512×512 closeup of head + shoulders from a transparent fullbody PNG.

    Strategy:
    1. Find the tight bounding box of the non-transparent person pixels via the
       alpha channel (``getbbox``).
    2. Take the top ``CLOSEUP_PERSON_RATIO`` fraction of the person's height,
       plus a small breathing-room pad at the top.
    3. Crop horizontally centred on the person bounding box.
    4. Resize to CLOSEUP_OUTPUT_SIZE.

    Falls back to a plain top-25%-of-frame crop if bounding box detection fails.
    """
    from PIL import Image as PilImage

    img = img.convert("RGBA")
    w, h = img.size

    # ── Detect person bounding box via alpha ──────────────────────────────────
    alpha = img.split()[3]  # A channel
    # Binarise: pixels brighter than threshold → white (person), rest → black
    binary = alpha.point(lambda v: 255 if v > CLOSEUP_ALPHA_THRESHOLD else 0)
    bbox = binary.getbbox()  # (left, top, right, bottom) or None

    if bbox:
        bx_min, by_min, bx_max, by_max = bbox
        person_h = by_max - by_min

        # How many px of person height to keep
        keep_h = max(1, int(person_h * CLOSEUP_PERSON_RATIO))

        # Add a small padding above the head so it's not cut off
        top_pad = max(0, by_min - int(person_h * 0.02))

        crop_top = top_pad
        crop_bottom = by_min + keep_h

        # Centre the crop horizontally on the person, square aspect ratio
        square_side = crop_bottom - crop_top
        cx = (bx_min + bx_max) // 2
        crop_left = max(0, cx - square_side // 2)
        crop_right = min(w, crop_left + square_side)
        # Adjust if we hit the right edge
        if crop_right == w:
            crop_left = max(0, w - square_side)
    else:
        # Fallback: top 25% of whole frame, full width (square crop from centre)
        crop_top = 0
        crop_bottom = max(1, int(h * 0.25))
        square_side = crop_bottom
        cx = w // 2
        crop_left = max(0, cx - square_side // 2)
        crop_right = min(w, crop_left + square_side)

    cropped = img.crop((crop_left, crop_top, crop_right, crop_bottom))
    return cropped.resize(CLOSEUP_OUTPUT_SIZE, PilImage.LANCZOS)


@api_view(["POST"])
@permission_classes([AllowAny])
def crop_closeup_from_fullbody_view(request: Request) -> Response:
    """Crop the top portion of an existing fullbody image to produce a closeup.

    No AI involved — pure deterministic Pillow crop.  The result is saved
    straight into ``membership.metadata.teamreel_assets.images.closeup[kit_type]``
    so the member page reflects it immediately.

    POST /api/v1/generative/assets/crop-closeup/
    Body:
        membership_id  — ProjectMembership UUID
        kit_type       — e.g. "home", "away", "third"

    Returns:
        { storage_path, presigned_url, filename }
    """
    import io

    from projects.models import ProjectMembership

    membership_id = request.data.get("membership_id", "").strip()
    kit_type = request.data.get("kit_type", "home").strip()

    if not membership_id:
        return Response({"error": "membership_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    # ── Fetch membership ──────────────────────────────────────────────────────
    try:
        membership = ProjectMembership.objects.get(id=membership_id)
    except ProjectMembership.DoesNotExist:
        return Response({"error": "Membership not found."}, status=status.HTTP_404_NOT_FOUND)

    # ── Find fullbody storage path ────────────────────────────────────────────
    metadata = membership.metadata or {}
    ta = metadata.get("teamreel_assets", {})
    images = ta.get("images", {})
    fullbody_variants = images.get("fullbody", {})
    fullbody_val = fullbody_variants.get(kit_type)

    if not fullbody_val:
        return Response(
            {"error": f"No fullbody found for kit_type='{kit_type}'. Generate a fullbody first."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Prefer the processed path; fall back to raw
    if isinstance(fullbody_val, dict):
        storage_path = fullbody_val.get("processed") or fullbody_val.get("raw") or ""
    else:
        storage_path = str(fullbody_val)

    if not storage_path:
        return Response(
            {"error": "Fullbody entry has no usable storage path."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── Download fullbody bytes from storage ──────────────────────────────────
    try:
        from files.utils import get_storage_backend

        storage = get_storage_backend()
        with storage.open(storage_path, "rb") as fh:
            raw_bytes = fh.read()
    except Exception as exc:
        logger.exception("crop_closeup: failed to download fullbody '%s': %s", storage_path, exc)
        return Response(
            {"error": f"Could not download fullbody image: {exc}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # ── Pillow smart crop + resize ────────────────────────────────────────────
    try:
        from PIL import Image as PilImage

        img = PilImage.open(io.BytesIO(raw_bytes)).convert("RGBA")
        resized = _smart_crop_closeup(img)

        out_buf = io.BytesIO()
        resized.save(out_buf, format="PNG", optimize=True)
        closeup_bytes = out_buf.getvalue()
    except Exception as exc:
        logger.exception("crop_closeup: Pillow processing failed: %s", exc)
        return Response(
            {"error": f"Image processing failed: {exc}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # ── Upload to storage ─────────────────────────────────────────────────────
    filename = f"member_closeup_kit_type-{kit_type}_crop.png"
    upload_result = _upload_image_bytes_to_storage(
        image_bytes=closeup_bytes,
        filename=filename,
        mime_type="image/png",
        template_id="closeup_in_tenue",
        template_type="output",
        template_subtype="closeup",
        membership_id=membership_id,
    )

    if "error" in upload_result:
        return Response(
            {"error": upload_result["error"]},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    new_storage_path = upload_result.get("storage_path", "")
    presigned_url = upload_result.get("presigned_url", "")

    # ── Persist in membership metadata ────────────────────────────────────────
    try:
        variant_value = {
            "raw": new_storage_path,
            "processed": new_storage_path,
            "processing_state": "processed",
            "specs": {
                "width": CLOSEUP_OUTPUT_SIZE[0],
                "height": CLOSEUP_OUTPUT_SIZE[1],
                "format": "png",
                "bg_removed": True,
                "source": "crop_from_fullbody",
            },
        }

        metadata.setdefault("teamreel_assets", {}).setdefault("images", {}).setdefault(
            "closeup", {}
        )[kit_type] = variant_value
        membership.metadata = metadata
        membership.save(update_fields=["metadata"])
        logger.info(
            "crop_closeup: saved closeup for membership=%s kit=%s path=%s",
            membership_id,
            kit_type,
            new_storage_path,
        )
    except Exception as exc:
        logger.exception("crop_closeup: failed to save to membership metadata: %s", exc)
        # Still return the URL — the frontend can show it even if metadata save failed
        return Response(
            {
                "storage_path": new_storage_path,
                "presigned_url": presigned_url,
                "filename": filename,
                "warning": f"Image generated but metadata save failed: {exc}",
            }
        )

    return Response(
        {
            "storage_path": new_storage_path,
            "presigned_url": presigned_url,
            "filename": filename,
        }
    )


# =============================================================================
# Review Generation Job — Approve / Reject
# =============================================================================


# Map of template_id → brand asset_type for brand-level image assets.
# When a job with one of these templates is approved from the queue,
# create/update a BrandAsset record so it appears on the Assets page.
BRAND_TEMPLATE_MAP: dict[str, str] = {
    "tenue_generate": "kit_home",  # default; overridden by params.kit_type
    "keeper_tenue": "kit_goalkeeper",
    "legacy_tenue_generate": "kit_legacy",
    "tracksuit_generate": "kit_training",
    "coach_outfit": "kit_coach",
    "logo_postprocess": "logo",
    "sponsor_standardize": "sponsor_logo",
    "location_standardize": "stadium_background",
}


def _propagate_approved_image_to_brand(job) -> None:  # noqa: ANN001
    """Create/update a BrandAsset when a brand-level image job is approved.

    Called after marking a job as approved so the Assets page immediately
    shows the generated asset.  For keeper_tenue the asset_type is
    "kit_goalkeeper".
    """
    from django.apps import apps

    # Resolve asset_type: prefer explicit output_asset_type, fall back to template map.
    asset_type = job.output_asset_type or BRAND_TEMPLATE_MAP.get(job.template_id)

    # For tenue_generate the kit_type differentiates home/away/third.
    # The job's output_variants filename encodes it.
    if job.template_id == "tenue_generate" and job.output_variants:
        import re

        fn = (job.output_variants[0] or {}).get("filename", "")
        kit_match = re.search(r"kit_type-(\w+?)(?:_|\.)", fn)
        if kit_match:
            asset_type = f"kit_{kit_match.group(1)}"

    if not asset_type:
        return

    # Skip member-scoped assets — those are handled by the membership propagation.
    if asset_type.startswith("member_") or asset_type.startswith("fullbody"):
        return

    approved_variants = [v for v in (job.output_variants or []) if v.get("approved") is True]
    if not approved_variants:
        return

    first = approved_variants[0]
    storage_path = first.get("storage_path", "")
    file_asset_id = first.get("file_asset_id")
    if not storage_path:
        return

    # Resolve the project from the job's project_id.
    Project = apps.get_model("projects", "Project")
    project = None
    project_id_raw = job.project_id or ""
    try:
        # Canonical format: "00000000-0000-0000-0000-000000000386" → last segment is the int PK.
        if project_id_raw.startswith("00000000-0000-0000-0000-"):
            _pk = int(project_id_raw.rsplit("-", 1)[-1])
            project = Project.objects.select_related("organisation").get(pk=_pk)
        elif project_id_raw.isdigit():
            project = Project.objects.select_related("organisation").get(pk=int(project_id_raw))
        else:
            project = Project.objects.select_related("organisation").get(slug=project_id_raw)
    except Exception:  # noqa: BLE001
        logger.warning("propagate_to_brand: cannot resolve project_id=%s", project_id_raw)
        return

    organisation = project.organisation if project else None
    if not organisation:
        return

    # Reuse existing FileAsset or create a slim reference.
    FileAsset = apps.get_model("files", "FileAsset")
    file_asset = None
    if file_asset_id:
        file_asset = FileAsset.objects.filter(id=file_asset_id).first()
    if not file_asset:
        file_asset = FileAsset.objects.filter(storage_path=storage_path).first()
    if not file_asset:
        file_asset = FileAsset.objects.create(
            organization=organisation,
            original_name=first.get("filename", "generated.png"),
            storage_path=storage_path,
            file_size=0,
            mime_type=first.get("mime_type", "image/png"),
            is_public=False,
            metadata={"source": "ai_generation_approved", "asset_type": asset_type},
        )

    # Create / update BrandAsset.
    BrandProfile = apps.get_model("branding", "BrandProfile")
    BrandAsset = apps.get_model("branding", "BrandAsset")

    brand_profile = BrandProfile.get_effective_brand(
        organisation=organisation,
        project=project,
    )
    if not brand_profile:
        brand_profile = BrandProfile.objects.create(
            organisation=organisation,
            name=f"{organisation.name} Brand",
            is_active=True,
        )

    brand_asset, created = BrandAsset.objects.update_or_create(
        profile=brand_profile,
        asset_type=asset_type,
        defaults={
            "file": file_asset,
            "alt_text": f"AI-processed {asset_type.replace('_', ' ')}",
            "is_active": True,
        },
    )
    action = "created" if created else "updated"
    logger.info(
        "propagate_to_brand: BrandAsset %s %s (type=%s, job=%s)",
        action,
        brand_asset.id,
        asset_type,
        job.task_id,
    )


def _propagate_approved_image_to_membership(job) -> None:  # noqa: ANN001
    """Write an approved generated image into ProjectMembership.metadata.teamreel_assets.images.

    Called after marking an image job as approved so the member page immediately
    reflects the new fullbody / closeup without any manual step.

    Supported template_ids:
      - "fullbody_in_tenue" → images.fullbody.{kit_type}

    After writing the raw path, queues a Celery process_member_asset task so
    background removal + resize run automatically.
    """
    import re
    from django.apps import apps

    IMAGE_TEMPLATE_MAP = {
        "fullbody_in_tenue": ("fullbody", "images"),
        # Future: "closeup_in_tenue": ("closeup", "images"),
    }
    mapping = IMAGE_TEMPLATE_MAP.get(job.template_id)
    if not mapping or not job.membership_id:
        return

    asset_type, asset_group = mapping  # e.g. "fullbody", "images"

    approved_variants = [v for v in (job.output_variants or []) if v.get("approved") is True]
    if not approved_variants:
        return

    ProjectMembership = apps.get_model("projects", "ProjectMembership")
    try:
        membership = ProjectMembership.objects.get(id=job.membership_id)
    except Exception:  # noqa: BLE001
        return

    meta = membership.metadata or {}
    ta = meta.setdefault("teamreel_assets", {})
    if not isinstance(ta, dict):
        return
    asset_group_dict = ta.setdefault(asset_group, {})
    if not isinstance(asset_group_dict, dict):
        return
    asset_type_dict = asset_group_dict.setdefault(asset_type, {})
    if not isinstance(asset_type_dict, dict):
        return

    changed = False

    # Use the first approved variant as the canonical version (best pick)
    first_variant = approved_variants[0]
    storage_path = first_variant.get("storage_path", "")
    filename = first_variant.get("filename", "")

    # Parse kit_type from filename: fullbody_in_tenue_kit_type-home_... → "home"
    kit_match = re.search(r"kit_type-(\w+?)(?:_pose|_role|_shoe|_sleeve|_v\d|$)", filename)
    kit_type = kit_match.group(1).strip("_") if kit_match else "home"

    if storage_path:
        asset_type_dict[kit_type] = {
            "raw": storage_path,
            "processed": None,
            "processing_state": "pending",
            "specs": {},
            "source": "ai_generated",
        }
        changed = True
        logger.info(
            "propagate_approved_image: membership=%s, %s.%s → %s (queuing bg-removal)",
            job.membership_id,
            asset_type,
            kit_type,
            storage_path,
        )

    if changed:
        membership.metadata = meta
        try:
            membership.save(update_fields=["metadata"])
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "propagate_approved_image: failed to save membership %s: %s",
                job.membership_id,
                exc,
            )
            return

        # Queue background removal + resize via existing Celery task
        try:
            from src.video.tasks.asset_processing import process_member_asset

            process_member_asset.delay(
                membership_id=str(job.membership_id),
                asset_type=asset_type,
                kit_type=kit_type,
                raw_url=storage_path,
                bg_removal_backend="rembg",
            )
            logger.info(
                "propagate_approved_image: queued process_member_asset for membership=%s kit=%s",
                job.membership_id,
                kit_type,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "propagate_approved_image: failed to queue processing for membership %s: %s",
                job.membership_id,
                exc,
            )


def _propagate_approved_video_to_membership(job) -> None:  # noqa: ANN001
    """Write an approved generated video into ProjectMembership.metadata.teamreel_assets.videos.

    Called after marking a video job as approved so the member page immediately
    reflects the new intro without any manual step.

    Supported template_ids:
      - "member_intro" → videos.intro.{kit_type}_{style_variant}

    Key format mirrors the rest of the codebase: "{kit_type}_{style_variant}",
    e.g. "home_hand_up".  Filename pattern:
      member_intro_kit_type-{kit_type}_style_variant-{style_variant}_{hash}_{idx}...mp4
    """
    import re
    from django.apps import apps
    from django.utils import timezone

    VIDEO_TEMPLATE_MAP = {
        "member_intro": "intro",
        "then_vs_now_sidebyside": "then_vs_now",
        "then_vs_now_transformation": "then_vs_now",
        # Future: "member_celebration": "celebration",
    }
    asset_type = VIDEO_TEMPLATE_MAP.get(job.template_id)
    if not asset_type or not job.membership_id:
        return

    approved_variants = [v for v in (job.output_variants or []) if v.get("approved") is True]
    if not approved_variants:
        return

    ProjectMembership = apps.get_model("projects", "ProjectMembership")
    try:
        membership = ProjectMembership.objects.get(id=job.membership_id)
    except Exception:  # noqa: BLE001
        return

    meta = membership.metadata or {}
    ta = meta.setdefault("teamreel_assets", {})
    if not isinstance(ta, dict):
        return
    videos = ta.setdefault("videos", {})
    if not isinstance(videos, dict):
        return
    asset_dict = videos.setdefault(asset_type, {})
    if not isinstance(asset_dict, dict):
        return

    now_iso = timezone.now().isoformat()
    changed = False

    for variant in approved_variants:
        storage_path = variant.get("storage_path", "")
        filename = variant.get("filename", "")

        # Derive the composite key based on template type
        if asset_type == "then_vs_now":
            # then_vs_now_sidebyside → "sidebyside", then_vs_now_transformation → "transformation"
            composite_key = job.template_id.replace("then_vs_now_", "")
        else:
            # Parse kit_type and style_variant from filename
            # Pattern: member_intro_kit_type-{kit}_style_variant-{style}_{hash}_{idx}.mp4
            kit_match = re.search(r"kit_type-(\w+?)_style_variant", filename)
            style_match = re.search(r"style_variant-([a-z][a-z_]*)", filename)

            kit_type = kit_match.group(1).strip("_") if kit_match else "home"
            style_variant = style_match.group(1).strip("_") if style_match else None

            composite_key = f"{kit_type}_{style_variant}" if style_variant else kit_type

        asset_dict[composite_key] = {
            "raw": storage_path,
            "processing_state": "processed",
            "processed": storage_path,
            "processed_at": now_iso,
            "specs": {},
            "source": "ai_generated",
        }
        changed = True
        logger.info(
            "propagate_approved_video: membership=%s, %s.%s → %s",
            job.membership_id,
            asset_type,
            composite_key,
            storage_path,
        )

    if changed:
        membership.metadata = meta
        try:
            membership.save(update_fields=["metadata"])
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "propagate_approved_video: failed to save membership %s: %s",
                job.membership_id,
                exc,
            )


@api_view(["POST"])
@permission_classes([AllowAny])
def review_generation_job_view(request: Request, task_id: str) -> Response:
    """Approve or reject a completed AI generation job (or a specific variant).

    POST /api/v1/generative/jobs/<task_id>/review/
    Body:
        {"action": "approve" | "reject"}                    — whole job
        {"action": "approve", "variant_index": 0}           — approve specific variant
        {"action": "approve", "variant_indices": [0, 2]}    — approve multiple variants
    """
    from .models import GenerationJob
    from django.utils import timezone

    try:
        job = GenerationJob.objects.get(task_id=task_id)
    except GenerationJob.DoesNotExist:
        return Response({"error": "Job not found"}, status=status.HTTP_404_NOT_FOUND)

    action = (request.data or {}).get("action", "")
    if action not in ("approve", "reject"):
        return Response(
            {"error": "action must be 'approve' or 'reject'"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if job.status != GenerationJob.Status.COMPLETED:
        return Response(
            {"error": f"Cannot review a job with status '{job.status}'"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Determine if this is a per-variant review
    body = request.data or {}
    variant_index = body.get("variant_index")
    variant_indices = body.get("variant_indices")

    # Build set of targeted variant indices (None = whole job)
    targeted_indices: set[int] | None = None
    if variant_indices is not None:
        targeted_indices = {int(vi) for vi in variant_indices}
    elif variant_index is not None:
        targeted_indices = {int(variant_index)}

    update_fields = ["reviewed_at", "reviewed_by_id", "updated_at"]
    job.reviewed_at = timezone.now()
    if request.user and request.user.is_authenticated:
        job.reviewed_by_id = request.user.id

    if targeted_indices is not None and job.output_variants:
        # Per-variant approval — update individual variant's `approved` flag
        updated = []
        for v in job.output_variants:
            vi = v.get("variant_index", 0)
            if vi in targeted_indices:
                v = dict(v)  # copy
                v["approved"] = action == "approve"
            updated.append(v)
        job.output_variants = updated
        update_fields.append("output_variants")

        # Also roll up job approval_status:
        # approved if any variant approved, rejected if all rejected or no approved
        any_approved = any(v.get("approved") is True for v in updated)
        all_rejected = all(
            v.get("approved") is False for v in updated if v.get("approved") is not None
        )
        if any_approved:
            job.approval_status = GenerationJob.ApprovalStatus.APPROVED
        elif all_rejected:
            job.approval_status = GenerationJob.ApprovalStatus.REJECTED
        # else remains pending_review if mixed
        update_fields.append("approval_status")
    else:
        # Whole-job approval
        job.approval_status = (
            GenerationJob.ApprovalStatus.APPROVED
            if action == "approve"
            else GenerationJob.ApprovalStatus.REJECTED
        )
        # Mark all variants as approved/rejected too
        if job.output_variants:
            job.output_variants = [
                {**v, "approved": action == "approve"} for v in job.output_variants
            ]
            update_fields.append("output_variants")
        update_fields.append("approval_status")

    job.save(update_fields=list(set(update_fields)))

    # Propagate approved video to membership metadata so the member page reflects it
    if action == "approve" and job.output_type == "video":
        try:
            _propagate_approved_video_to_membership(job)
        except Exception as propagate_exc:  # noqa: BLE001
            logger.warning(
                "review_generation_job_view: propagation failed for job %s: %s",
                task_id,
                propagate_exc,
            )

    # Propagate approved image (fullbody_in_tenue, etc.) to membership metadata
    if action == "approve" and job.output_type == "image":
        try:
            _propagate_approved_image_to_membership(job)
        except Exception as propagate_exc:  # noqa: BLE001
            logger.warning(
                "review_generation_job_view: image propagation failed for job %s: %s",
                task_id,
                propagate_exc,
            )

    # Propagate approved image to BrandAsset (kits, logos, etc.) so the Assets page reflects it
    if action == "approve" and job.output_type == "image":
        try:
            _propagate_approved_image_to_brand(job)
        except Exception as propagate_exc:  # noqa: BLE001
            logger.warning(
                "review_generation_job_view: brand propagation failed for job %s: %s",
                task_id,
                propagate_exc,
            )

    return Response(
        {
            "task_id": str(job.task_id),
            "approval_status": job.approval_status,
            "output_variants": job.output_variants or [],
            "reviewed_at": job.reviewed_at.isoformat() if job.reviewed_at else None,
        }
    )
