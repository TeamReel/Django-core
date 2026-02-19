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
    project_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text="Project ID for scoping storage and brand lookup",
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

            project = Project.objects.select_related("organisation").get(id=project_id)
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
    media_item = None
    brand_asset = None

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

    return Response(
        {
            "status": "success",
            "message": f"Asset saved as {asset_type}",
            "data": {
                "file_asset_id": str(file_asset.id) if file_asset else None,
                "media_item_id": str(media_item.id) if media_item else None,
                "brand_asset_id": str(brand_asset.id) if brand_asset else None,
                "storage_path": final_storage_path,
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
