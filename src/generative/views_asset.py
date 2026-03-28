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
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

logger = logging.getLogger("generative.views.asset")


# =============================================================================
# Model Registry — single source of truth for available AI models & pricing
# =============================================================================
# Each entry: { provider, model_id, label, description, output_type,
#               cost_per_unit, cost_unit, default }
# cost_per_unit is in USD; frontend converts to EUR (×0.92).
# "default" marks the auto-selected model for that provider+output combo.

MODEL_REGISTRY: list[dict[str, Any]] = [
    # ── Image Generation (Gemini) ────────────────────────────────────
    {
        "provider": "gemini",
        "model_id": "nano-banana-pro-preview",
        "label": "Nano Banana Pro",
        "description": "Google image gen model, fast & cheap. Default.",
        "output_type": "image",
        "cost_per_unit": 0.04,
        "cost_unit": "per image",
        "cost_input_per_1m": 0.10,
        "cost_output_per_1m": 30.00,
        "default": True,
    },
    {
        "provider": "gemini",
        "model_id": "gemini-2.5-flash-preview-native-audio-dialog",
        "label": "Gemini 2.5 Flash Image",
        "description": "Gemini 2.5 Flash met native image output. Iets beter, iets duurder.",
        "output_type": "image",
        "cost_per_unit": 0.043,
        "cost_unit": "per image",
        "cost_input_per_1m": 0.15,
        "cost_output_per_1m": 30.00,
        "default": False,
    },
    # ── Video Generation (MiniMax) ───────────────────────────────────
    {
        "provider": "minimax",
        "model_id": "video-01",
        "label": "MiniMax Video-01",
        "description": "Standaard Hailuo video model, 6s clips. Goedkoop.",
        "output_type": "video",
        "cost_per_unit": 0.05,
        "cost_unit": "per video",
        "default": True,
    },
    {
        "provider": "minimax",
        "model_id": "video-01-live2d",
        "label": "MiniMax Live2D",
        "description": "Geoptimaliseerd voor 2D-naar-video animatie.",
        "output_type": "video",
        "cost_per_unit": 0.05,
        "cost_unit": "per video",
        "default": False,
    },
    # ── Video Generation (Runway) ────────────────────────────────────
    {
        "provider": "runway",
        "model_id": "gen4_turbo",
        "label": "Runway Gen-4 Turbo",
        "description": "Snel & goedkoop. 5 credits/s (~$0.096/s). Default.",
        "output_type": "video",
        "cost_per_unit": 0.096,
        "cost_unit": "per second",
        "default_duration": 5,
        "default": True,
    },
    {
        "provider": "runway",
        "model_id": "gen4",
        "label": "Runway Gen-4",
        "description": "Hogere kwaliteit, 12 credits/s (~$0.23/s).",
        "output_type": "video",
        "cost_per_unit": 0.23,
        "cost_unit": "per second",
        "default_duration": 5,
        "default": False,
    },
    # ── Video Generation (Pika) ──────────────────────────────────────
    {
        "provider": "pika",
        "model_id": "pika-2.2",
        "label": "Pika 2.2",
        "description": "Via fal.ai. I2V & T2V, tot 1080p.",
        "output_type": "video",
        "cost_per_unit": 0.05,
        "cost_unit": "per second",
        "default_duration": 5,
        "default": True,
    },
    # ── Video Generation (Veo) ───────────────────────────────────────
    {
        "provider": "veo",
        "model_id": "veo-3.1-fast",
        "label": "Veo 3.1 Fast",
        "description": "Google Veo 3. Snel, $0.15/video.",
        "output_type": "video",
        "cost_per_unit": 0.15,
        "cost_unit": "per video",
        "default": True,
    },
    {
        "provider": "veo",
        "model_id": "veo-3.1-generate",
        "label": "Veo 3.1 Standard",
        "description": "Google Veo 3 Standard. Hogere kwaliteit, $0.60/video.",
        "output_type": "video",
        "cost_per_unit": 0.60,
        "cost_unit": "per video",
        "default": False,
    },
]

# Quick lookup: model_id → registry entry
_MODEL_LOOKUP: dict[str, dict[str, Any]] = {m["model_id"]: m for m in MODEL_REGISTRY}

# Provider → default model_id (per output_type)
_PROVIDER_DEFAULT_MODEL: dict[str, dict[str, str]] = {}
for _m in MODEL_REGISTRY:
    _key = f"{_m['provider']}_{_m['output_type']}"
    if _m.get("default"):
        _PROVIDER_DEFAULT_MODEL[_key] = _m["model_id"]


def _get_model_cost_usd(
    provider: str,
    model_id: str | None,
    variant_count: int = 1,
    content_duration: float | None = None,
    template_id: str | None = None,
) -> float | None:
    """Calculate estimated cost in USD for a given model.

    Returns None if model is not in registry.
    """
    if not model_id:
        # Fallback to default model for provider
        for m in MODEL_REGISTRY:
            if m["provider"] == provider and m.get("default"):
                model_id = m["model_id"]
                break
    entry = _MODEL_LOOKUP.get(model_id or "")
    if not entry:
        return None

    unit = entry["cost_unit"]
    rate = entry["cost_per_unit"]

    if unit == "per image":
        return rate * variant_count
    elif unit == "per video":
        return rate * variant_count
    elif unit == "per second":
        dur = content_duration or entry.get("default_duration", 5)
        return rate * dur * variant_count
    return None


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

    # === Provider & Model selection ===
    provider = serializers.ChoiceField(
        choices=["minimax", "runway", "pika", "veo"],
        required=False,
        allow_null=True,
        allow_blank=True,
        default=None,
        help_text="Explicit video provider (minimax, runway, pika, veo). If omitted, auto-selects.",
    )
    model = serializers.CharField(
        required=False,
        allow_null=True,
        allow_blank=True,
        default=None,
        help_text="Explicit model ID (e.g. gen4_turbo, video-01). If omitted, uses provider default.",
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
@permission_classes([IsAuthenticated])
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
    model = serializer.validated_data.get("model") or None

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
        from urllib.parse import unquote, urlparse

        from django.conf import settings

        # Detect our own S3 bucket URLs and download directly via boto3
        s3_bucket = getattr(settings, "AWS_S3_BUCKET_NAME", "teamreel-assets-demo")
        s3_url_prefix = ".s3."  # matches *.s3.*.amazonaws.com

        for key, url in input_image_urls.items():
            if key not in input_images:
                try:
                    # Check if this URL points to our own S3 bucket
                    parsed = urlparse(url)
                    is_own_s3 = (
                        parsed.hostname
                        and s3_bucket in parsed.hostname
                        and s3_url_prefix in parsed.hostname
                    )

                    if is_own_s3:
                        # Extract the S3 key from the URL path (decode %20 etc.)
                        s3_key = unquote(parsed.path.lstrip("/"))
                        from files.utils import get_storage_backend

                        backend = get_storage_backend()
                        file_obj = backend.open(s3_key)
                        input_images[key] = file_obj.read()
                    else:
                        resp = http_requests.get(url, timeout=30)
                        resp.raise_for_status()
                        input_images[key] = resp.content
                except (http_requests.RequestException, OSError, Exception) as e:
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

    # ── Fast synchronous path for Pillow-only postprocess templates ───
    # Templates like logo_postprocess, sponsor_postprocess, kit_postprocess,
    # location_postprocess are pure Pillow (no AI call). Running them through
    # the Celery ai_generation queue adds unnecessary latency and UI
    # complexity. Execute them inline and return the result immediately.
    from .services.asset_pipeline import PILLOW_ONLY_TEMPLATES

    if template_id in PILLOW_ONLY_TEMPLATES:
        try:
            from .services.asset_pipeline import generate_asset

            results = generate_asset(
                template_id=template_id,
                params=params,
                input_images=input_images,
                variant_count=variant_count,
            )

            # Upload results to storage and build response
            stored_variants = []
            for r in results:
                image_bytes = r.get("image_bytes")
                if image_bytes and not r.get("error"):
                    upload_result = _upload_image_bytes_to_storage(
                        image_bytes=image_bytes,
                        filename=r.get("filename", f"{template_id}_postprocessed.png"),
                        mime_type=r.get("mime_type", "image/png"),
                        variant_index=r.get("variant_index", 0),
                        template_id=template_id,
                        template_type="output",
                        template_subtype=template_id.replace("_postprocess", ""),
                        project_id=str(project_id) if project_id else None,
                        organisation_id=str(organisation_id) if organisation_id else None,
                        membership_id=str(membership_id) if membership_id else None,
                    )
                    stored_variants.append(
                        {
                            "variant_index": r.get("variant_index", 0),
                            "image_base64": r.get("image_base64"),
                            "mime_type": r.get("mime_type"),
                            "filename": r.get("filename"),
                            "error": None,
                            "metadata": r.get("metadata"),
                            "storage_path": upload_result.get("storage_path"),
                            "presigned_url": upload_result.get("presigned_url"),
                            "storage_info": upload_result,
                        }
                    )
                else:
                    stored_variants.append(
                        {
                            "variant_index": r.get("variant_index", 0),
                            "image_base64": None,
                            "mime_type": None,
                            "filename": None,
                            "error": r.get("error", "No image bytes produced"),
                        }
                    )

            logger.info(
                "Pillow-only postprocess %s completed synchronously",
                template_id,
            )

            # Return 200 with variants directly (sync path).
            # The frontend useAssetGeneration hook handles 200 responses
            # by immediately setting step='completed' with the variants,
            # which triggers auto-accept in the AssetsTab useEffect.
            return Response(
                {
                    "template_id": template_id,
                    "variant_count": len(stored_variants),
                    "variants": stored_variants,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:  # noqa: BLE001
            logger.exception("Pillow-only postprocess failed for %s: %s", template_id, e)
            return Response(
                {"error": f"Postprocess failed: {e}"},
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
                "role": params.get("role") or None,
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
                        "model": model,
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
            "role": params.get("role") or None,
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
                    "model": model,
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


# =============================================================================
# Models endpoint — returns available AI models per provider with pricing
# =============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_asset_models_view(request: Request) -> Response:  # noqa: ARG001
    """List available AI models with pricing info.

    GET /api/v1/generative/assets/models/
    Optional query params:
      - output_type: filter by 'image' or 'video'
      - provider: filter by provider name
    """
    output_type = request.query_params.get("output_type")
    provider_filter = request.query_params.get("provider")

    models = MODEL_REGISTRY
    if output_type:
        models = [m for m in models if m["output_type"] == output_type]
    if provider_filter:
        models = [m for m in models if m["provider"] == provider_filter]

    return Response(models, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
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
    task_id = serializers.CharField(
        required=False,
        allow_null=True,
        allow_blank=True,
        help_text="Generation task_id — when provided, auto-approves the GenerationJob",
    )
    variant_index = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Index of the chosen variant to mark as approved",
    )
    label = serializers.CharField(
        required=False,
        allow_null=True,
        allow_blank=True,
        help_text="Display label for multi-instance types (e.g. club backgrounds)",
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
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
    task_id = serializer.validated_data.get("task_id")
    variant_index = serializer.validated_data.get("variant_index")
    label = serializer.validated_data.get("label") or ""

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
            or asset_type.startswith("photo_composite")
            or asset_type.startswith("member_action_photo")
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

                # When saving for a specific project, ensure a project-level
                # BrandProfile exists (don't fall back to org/parent profile,
                # otherwise the frontend can't find the asset when querying
                # by project_id).
                brand_profile = None
                if project:
                    brand_profile = BrandProfile.objects.filter(
                        project=project, is_active=True
                    ).first()
                    if not brand_profile:
                        brand_profile = BrandProfile.objects.create(
                            project=project,
                            name=f"{project.name} Brand",
                            is_active=True,
                            created_by=current_user,
                        )
                        logger.info(
                            f"🆕 Created project-level BrandProfile: {brand_profile.id} "
                            f"(project={project.id})"
                        )
                else:
                    # No project specified — use org-level profile
                    brand_profile = BrandProfile.objects.filter(
                        organisation=organisation, is_active=True
                    ).first()
                    if not brand_profile:
                        brand_profile = BrandProfile.objects.create(
                            organisation=organisation,
                            name=f"{organisation.name} Brand",
                            is_active=True,
                            created_by=current_user,
                        )
                        logger.info(f"🆕 Created org-level BrandProfile: {brand_profile.id}")

                # Multi-instance types (e.g. club_background) use label-based
                # update_or_create when a label is provided (so regenerating
                # replaces the existing processed asset for that label).
                # Without a label they always create new.
                MULTI_INSTANCE_ASSET_TYPES = {"club_background", "club_background_upload"}

                if asset_type in MULTI_INSTANCE_ASSET_TYPES:
                    if label:
                        brand_asset, created = BrandAsset.objects.update_or_create(
                            profile=brand_profile,
                            asset_type=asset_type,
                            label=label,
                            defaults={
                                "file": file_asset,
                                "alt_text": f"AI-processed {asset_type.replace('_', ' ')}",
                                "is_active": True,
                            },
                        )
                    else:
                        brand_asset = BrandAsset.objects.create(
                            profile=brand_profile,
                            asset_type=asset_type,
                            file=file_asset,
                            label=label,
                            alt_text=f"AI-processed {asset_type.replace('_', ' ')}",
                            is_active=True,
                        )
                        created = True
                else:
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

    # ── Auto-approve GenerationJob if task_id provided ────────────────
    if task_id:
        try:
            from .models import GenerationJob
            from django.utils import timezone as tz

            job = GenerationJob.objects.get(task_id=task_id)
            job.approval_status = GenerationJob.ApprovalStatus.APPROVED
            job.reviewed_at = tz.now()
            if current_user and current_user.is_authenticated:
                job.reviewed_by_id = current_user.id

            # Mark the chosen variant as approved in output_variants
            if job.output_variants and variant_index is not None:
                updated = []
                for v in job.output_variants:
                    v = dict(v)
                    if v.get("variant_index") == variant_index:
                        v["approved"] = True
                    else:
                        v["approved"] = False
                    updated.append(v)
                job.output_variants = updated

            job.save(
                update_fields=[
                    "approval_status",
                    "reviewed_at",
                    "reviewed_by_id",
                    "output_variants",
                    "updated_at",
                ]
            )
            logger.info(f"✅ Auto-approved GenerationJob {task_id} " f"(variant={variant_index})")

            # Propagate approved image to brand assets / membership
            if job.output_type == "image":
                try:
                    _propagate_approved_image_to_brand(job)
                except Exception:
                    logger.warning("Auto-approve: brand propagation failed for %s", task_id)
                try:
                    _propagate_approved_image_to_membership(job)
                except Exception:
                    logger.warning("Auto-approve: membership propagation failed for %s", task_id)
            elif job.output_type == "video":
                try:
                    _propagate_approved_video_to_membership(job)
                except Exception:
                    logger.warning("Auto-approve: video propagation failed for %s", task_id)

        except GenerationJob.DoesNotExist:
            logger.warning(f"Auto-approve: GenerationJob {task_id} not found")
        except Exception as approve_err:
            logger.warning(f"Auto-approve failed for {task_id}: {approve_err}")

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
@permission_classes([IsAuthenticated])
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
@permission_classes([IsAuthenticated])
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

    # Resolve organisation from membership/project if not provided directly
    if not v_org and membership_id:
        try:
            from memberships.models import Membership

            _mem = Membership.objects.select_related("project__organisation").get(id=membership_id)
            v_org = _mem.project.organisation
            logger.debug("Resolved org from membership %s: %s", membership_id, v_org.id)
        except Exception:
            pass
    if not v_org and storage_context.get("project_id"):
        try:
            from projects.models import Project

            _proj = Project.objects.select_related("organisation").get(
                id=storage_context["project_id"]
            )
            v_org = _proj.organisation
            logger.debug("Resolved org from project %s: %s", _proj.id, v_org.id)
        except Exception:
            pass

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
        elif v_bytes:
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

                # Create FileAsset record if organisation is available
                if v_org:
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
                    variant["file_asset_id"] = str(fa.id)
                else:
                    logger.warning(
                        "Video upload variant %d: no org available, "
                        "skipping FileAsset record (storage_path=%s)",
                        i,
                        final_sp,
                    )

                try:
                    purl = v_storage.get_url(final_sp, signed=True)
                except Exception:
                    purl = None

                variant["video_url"] = purl
                variant["storage_path"] = final_sp
                logger.info("Video upload variant %d stored: %s", i, final_sp)
            except Exception as store_err:
                logger.exception("Video upload variant %d S3 failed: %s", i, store_err)
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
@permission_classes([IsAuthenticated])
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
    elif task.get("status") == "retrying":
        clean["error"] = task.get("error", "")
        clean["message"] = task.get("message", "Wordt automatisch opnieuw geprobeerd…")
        clean["retry_attempt"] = task.get("retry_attempt", 0)
        clean["retry_max"] = task.get("retry_max", 3)
    elif task.get("message"):
        clean["message"] = task["message"]

    return Response(clean)


# =============================================================================
# Generation Job List — Workflow Queue UI
# =============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
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

    # ── Resolve project + membership names for directory display ────────
    _project_ids = {j.project_id for j in jobs if j.project_id}
    _project_name_map: dict[str, str] = {}
    _project_parent_map: dict[str, str | None] = {}  # project_id → parent project name (club)
    if _project_ids:
        try:
            from projects.models import Project

            # Try matching on id, slug, and canonical UUID variants
            from django.db.models import Q

            q = Q()
            for pid in _project_ids:
                q |= Q(id__iexact=pid) | Q(slug=pid)
                # Handle canonical UUID format: 00000000-0000-0000-0000-000000000123
                if str(pid).isdigit():
                    canonical = f"00000000-0000-0000-0000-{int(pid):012d}"
                    q |= Q(id__iexact=canonical)
            for p in (
                Project.objects.filter(q)
                .select_related("parent_project")
                .only("id", "name", "slug", "parent_project__id", "parent_project__name")
            ):
                _project_name_map[str(p.id)] = p.name
                _project_name_map[p.slug] = p.name
                _project_parent_map[str(p.id)] = p.parent_project.name if p.parent_project else None
                _project_parent_map[p.slug] = p.parent_project.name if p.parent_project else None
        except Exception:  # noqa: BLE001
            pass

    _membership_ids = {j.membership_id for j in jobs if j.membership_id}
    _membership_name_map: dict[str, str] = {}
    if _membership_ids:
        try:
            from projects.models import ProjectMembership

            for m in (
                ProjectMembership.objects.filter(id__in=_membership_ids)
                .select_related("user")
                .only("id", "user__first_name", "user__last_name")
            ):
                full = f"{m.user.first_name or ''} {m.user.last_name or ''}".strip()
                _membership_name_map[str(m.id)] = full or f"Member {m.id}"
        except Exception:  # noqa: BLE001
            pass

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

        # ── AI metadata: provider, model, duration ──────────────────────
        ai_provider = (live or {}).get("provider", "")
        if not ai_provider:
            # Infer provider from output_type when cache is expired
            ai_provider = "gemini" if job.output_type == "image" else "minimax"

        # Model name inference — prefer model from job metadata, then provider default
        _provider_model_map = {
            "gemini": "nano-banana-pro-preview",
            "minimax": "video-01",
            "runway": "gen4_turbo",
            "pika": "pika-2.2",
            "veo": "veo-3.1-fast",
        }
        ai_model_id = _provider_model_map.get(ai_provider, "")
        # Try to get the actual model from live cache or job metadata
        if live:
            ai_model_id = (live.get("data") or {}).get("model") or live.get("model") or ai_model_id
        # Look up display label from registry
        _reg_entry = _MODEL_LOOKUP.get(ai_model_id)
        ai_model = _reg_entry["label"] if _reg_entry else ai_model_id

        # Processing duration (time from creation to completion)
        duration_seconds: float | None = None
        if job.completed_at and job.created_at:
            duration_seconds = round((job.completed_at - job.created_at).total_seconds(), 1)

        # Content duration (video length in seconds) — from cache or persisted variants
        content_duration: float | None = None
        if live:
            content_duration = (live.get("data") or {}).get("content_duration_seconds")
        if content_duration is None and job.output_variants:
            for _v in job.output_variants:
                if _v.get("content_duration_seconds") is not None:
                    content_duration = _v["content_duration_seconds"]
                    break
        # Default content duration for known video providers (when not persisted)
        if content_duration is None and job.output_type == "video" and job.status == "completed":
            _default_content_dur = {"minimax": 6, "runway": 5, "pika": 5, "veo": 4}
            content_duration = _default_content_dur.get(ai_provider)

        # ── Token & Cost estimation (based on provider documentation) ────
        #
        # Gemini (image gen via nano-banana-pro-preview):
        #   Input:  ~200 text tokens + 560 tokens per input image
        #   Output: 1290 tokens per generated image (at $30/1M tokens)
        #   Analysis step (kit analysis via gemini-2.0-flash): +760 in, +375 out
        #   Source: https://ai.google.dev/gemini-api/docs/pricing
        #
        # MiniMax Video-01: $0.05/video (fixed per video, ~6s output)
        # Runway Gen-4 Turbo: ~5 credits/s, ~$0.096/s at standard rate
        # Pika 2.2 via fal.ai: ~$0.05/s
        # Veo 3.1 Fast: $0.15/video (720p/1080p)
        # EUR conversion: ×0.92
        # ─────────────────────────────────────────────────────────────────

        _variant_ct = len(fresh_variants) or (live or {}).get("variant_count") or 1

        # Input image count per template (for Gemini token estimation)
        _tpl_input_images: dict[str, int] = {
            "logo_standardize": 1,
            "sponsor_standardize": 1,
            "location_standardize": 1,
            "tenue_generate": 3,
            "legacy_tenue_generate": 3,
            "keeper_tenue": 3,
            "tracksuit_generate": 2,
            "coach_outfit": 3,
            "fullbody_in_tenue": 4,
            "closeup_in_tenue": 4,
        }
        # Templates that trigger a Gemini Flash kit-analysis step
        _tpls_with_analysis = {
            "tenue_generate",
            "legacy_tenue_generate",
            "keeper_tenue",
            "tracksuit_generate",
            "coach_outfit",
            "fullbody_in_tenue",
            "closeup_in_tenue",
        }

        est_input_tokens: int | None = None
        est_output_tokens: int | None = None
        estimated_cost_eur: float | None = None

        if ai_provider == "gemini":
            # Gemini image generation — token-based pricing
            n_imgs = _tpl_input_images.get(job.template_id or "", 2)
            has_analysis = (job.template_id or "") in _tpls_with_analysis

            # Per-variant: ~200 prompt tokens + 560 per input image
            in_per_variant = 200 + (n_imgs * 560)
            out_per_variant = 1290  # 1 output image = 1290 tokens

            # Analysis step: prompt (~200 tok) + 1 image (560 tok) → ~375 output
            analysis_in = 760 if has_analysis else 0
            analysis_out = 375 if has_analysis else 0

            est_input_tokens = analysis_in + (in_per_variant * _variant_ct)
            est_output_tokens = analysis_out + (out_per_variant * _variant_ct)

            # Cost: input at $0.10/1M, image-output at $30/1M → convert to EUR
            cost_usd = est_input_tokens * 0.10 / 1_000_000 + est_output_tokens * 30.0 / 1_000_000
            estimated_cost_eur = round(cost_usd * 0.92, 4)

        elif ai_provider == "minimax":
            # Use model registry for model-specific pricing
            cost_usd = _get_model_cost_usd(ai_provider, ai_model_id, _variant_ct, content_duration)
            if cost_usd is not None:
                estimated_cost_eur = round(cost_usd * 0.92, 4)

        elif ai_provider == "runway":
            # Use model registry — picks up gen4 vs gen4_turbo pricing
            cost_usd = _get_model_cost_usd(ai_provider, ai_model_id, _variant_ct, content_duration)
            if cost_usd is not None:
                estimated_cost_eur = round(cost_usd * 0.92, 4)

        elif ai_provider == "pika":
            cost_usd = _get_model_cost_usd(ai_provider, ai_model_id, _variant_ct, content_duration)
            if cost_usd is not None:
                estimated_cost_eur = round(cost_usd * 0.92, 4)

        elif ai_provider == "veo":
            cost_usd = _get_model_cost_usd(ai_provider, ai_model_id, _variant_ct, content_duration)
            if cost_usd is not None:
                estimated_cost_eur = round(cost_usd * 0.92, 4)

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
                # AI metadata
                "provider": ai_provider,
                "model": ai_model,
                "duration_seconds": duration_seconds,
                "content_duration_seconds": content_duration,
                "estimated_cost_eur": estimated_cost_eur,
                "estimated_input_tokens": est_input_tokens,
                "estimated_output_tokens": est_output_tokens,
                "variant_count": len(fresh_variants) or (live or {}).get("variant_count"),
                # Resolved names for directory display
                "project_name": _project_name_map.get(job.project_id or "", ""),
                "club_name": _project_parent_map.get(job.project_id or "", "") or "",
                "membership_name": _membership_name_map.get(job.membership_id or "", ""),
            }
        )

    return Response(
        {
            "count": len(results),
            "results": results,
        }
    )


# =============================================================================
# Generation Job Counts — lightweight aggregate for queue badges
# =============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def generation_job_counts_view(request: Request) -> Response:
    """Return aggregated status counts for AI generation jobs.

    GET /api/v1/generative/jobs/counts/

    This is a lightweight alternative to list_generation_jobs_view designed
    for queue badge/tab counts.  It performs a single DB aggregation query
    instead of loading, enriching and serialising every job.

    Response shape::

        {
            "ai_review": 3,
            "ai_active": 1,
            "ai_approved": 12,
            "ai_rejected": 0,
            "ai_total": 16
        }
    """
    from django.db.models import Count, Q

    from .models import GenerationJob

    qs = GenerationJob.objects.all()

    # Non-admin users only see their own jobs (same rule as list endpoint)
    if request.user and request.user.is_authenticated and not request.user.is_staff:
        qs = qs.filter(created_by_id=request.user.id)

    agg = qs.aggregate(
        review=Count(
            "id",
            filter=Q(status="completed")
            & (Q(approval_status="pending_review") | Q(approval_status__isnull=True)),
        ),
        active=Count(
            "id",
            filter=Q(status__in=["queued", "waiting", "processing", "retrying"]),
        ),
        approved=Count("id", filter=Q(approval_status="approved")),
        rejected=Count("id", filter=Q(approval_status="rejected")),
        failed=Count("id", filter=Q(status__in=["failed", "cancelled"])),
        total=Count("id"),
    )

    return Response(
        {
            "ai_review": agg["review"],
            "ai_active": agg["active"],
            "ai_approved": agg["approved"],
            "ai_rejected": agg["rejected"],
            "ai_failed": agg["failed"],
            "ai_total": agg["total"],
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

# Halfbody settings: head to waist/navel
HALFBODY_PERSON_RATIO = 0.55  # 55% of person height (head to navel)
HALFBODY_OUTPUT_SIZE = (768, 1024)  # 3:4 aspect ratio, tall


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


def _smart_crop_halfbody(img):  # type: ignore[return]  # PIL.Image
    """Return a 768×1024 (3:4) halfbody crop from head to waist from a transparent fullbody PNG.

    Strategy:
    1. Find the tight bounding box of the non-transparent person pixels via the
       alpha channel (``getbbox``).
    2. Take the top ``HALFBODY_PERSON_RATIO`` fraction of the person's height (55%),
       plus a small breathing-room pad at the top.
    3. Crop horizontally centred on the person bounding box with 3:4 aspect ratio.
    4. Resize to HALFBODY_OUTPUT_SIZE.

    Falls back to a plain top-55%-of-frame crop if bounding box detection fails.
    """
    from PIL import Image as PilImage

    img = img.convert("RGBA")
    w, h = img.size

    # ── Detect person bounding box via alpha ──────────────────────────────────
    alpha = img.split()[3]  # A channel
    binary = alpha.point(lambda v: 255 if v > CLOSEUP_ALPHA_THRESHOLD else 0)
    bbox = binary.getbbox()

    if bbox:
        bx_min, by_min, bx_max, by_max = bbox
        person_h = by_max - by_min

        # How many px of person height to keep (55% = head to waist)
        keep_h = max(1, int(person_h * HALFBODY_PERSON_RATIO))

        # Add a small padding above the head
        top_pad = max(0, by_min - int(person_h * 0.02))

        crop_top = top_pad
        crop_bottom = by_min + keep_h

        # 3:4 aspect ratio crop, centred horizontally on the person
        crop_height = crop_bottom - crop_top
        crop_width = int(crop_height * 3 / 4)
        cx = (bx_min + bx_max) // 2
        crop_left = max(0, cx - crop_width // 2)
        crop_right = min(w, crop_left + crop_width)
        # Adjust if we hit the right edge
        if crop_right == w:
            crop_left = max(0, w - crop_width)
            crop_right = w
    else:
        # Fallback: top 55% of whole frame
        crop_top = 0
        crop_bottom = max(1, int(h * 0.55))
        crop_height = crop_bottom
        crop_width = int(crop_height * 3 / 4)
        cx = w // 2
        crop_left = max(0, cx - crop_width // 2)
        crop_right = min(w, crop_left + crop_width)

    cropped = img.crop((crop_left, crop_top, crop_right, crop_bottom))
    return cropped.resize(HALFBODY_OUTPUT_SIZE, PilImage.LANCZOS)


def _crop_closeup_guest_player(request: Request, project_id: str, kit_type: str) -> Response:
    """Crop closeup from the guest player fullbody stored in project metadata.

    Reads ``project.metadata.guest_player.images.fullbody.home``, applies the
    same smart crop as regular members, and writes the result into
    ``project.metadata.guest_player.images.closeup.home``.
    """
    import io

    from projects.models import Project

    try:
        project = Project.objects.get(id=project_id)
    except Project.DoesNotExist:
        return Response({"error": "Project not found."}, status=status.HTTP_404_NOT_FOUND)

    # ── Find guest fullbody storage path ──────────────────────────────────────
    meta = project.metadata or {}
    guest_player = meta.get("guest_player", {})
    if not isinstance(guest_player, dict):
        return Response(
            {"error": "No guest player data found on this project."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    images = guest_player.get("images", {})
    fullbody_variants = images.get("fullbody", {})
    fullbody_val = fullbody_variants.get(kit_type)

    if not fullbody_val:
        return Response(
            {
                "error": f"No guest fullbody found for kit_type='{kit_type}'. Generate a fullbody first."
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Prefer the processed path; fall back to raw
    if isinstance(fullbody_val, dict):
        storage_path = fullbody_val.get("processed") or fullbody_val.get("raw") or ""
    else:
        storage_path = str(fullbody_val)

    if not storage_path:
        return Response(
            {"error": "Guest fullbody entry has no usable storage path."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── Download fullbody bytes from storage ──────────────────────────────────
    try:
        from files.utils import get_storage_backend

        backend = get_storage_backend()
        with backend.open(storage_path, "rb") as fh:
            raw_bytes = fh.read()
    except Exception as exc:
        logger.exception(
            "crop_closeup_guest: failed to download fullbody '%s': %s", storage_path, exc
        )
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
        logger.exception("crop_closeup_guest: Pillow processing failed: %s", exc)
        return Response(
            {"error": f"Image processing failed: {exc}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # ── Upload to storage ─────────────────────────────────────────────────────
    filename = f"guest_closeup_kit_type-{kit_type}_crop.png"
    upload_result = _upload_image_bytes_to_storage(
        image_bytes=closeup_bytes,
        filename=filename,
        mime_type="image/png",
        template_id="closeup_in_tenue",
        template_type="output",
        template_subtype="closeup",
        project_id=project_id,
    )

    if "error" in upload_result:
        return Response(
            {"error": upload_result["error"]},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    new_storage_path = upload_result.get("storage_path", "")
    presigned_url = upload_result.get("presigned_url", "")

    # ── Persist in project.metadata.guest_player ──────────────────────────────
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

        guest_player.setdefault("images", {}).setdefault("closeup", {})[kit_type] = variant_value
        meta["guest_player"] = guest_player
        project.metadata = meta
        project.save(update_fields=["metadata"])
        logger.info(
            "crop_closeup_guest: saved closeup for project=%s kit=%s path=%s",
            project_id,
            kit_type,
            new_storage_path,
        )
    except Exception as exc:
        logger.exception("crop_closeup_guest: failed to save to project metadata: %s", exc)
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


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def crop_closeup_from_fullbody_view(request: Request) -> Response:
    """Crop the top portion of an existing fullbody image to produce a closeup.

    No AI involved — pure deterministic Pillow crop.  The result is saved
    straight into ``membership.metadata.teamreel_assets.images.closeup[kit_type]``
    so the member page reflects it immediately.

    Also supports guest players: pass ``project_id`` instead of ``membership_id``
    to crop from the guest player fullbody stored in
    ``project.metadata.guest_player.images.fullbody.home``.

    POST /api/v1/generative/assets/crop-closeup/
    Body:
        membership_id  — ProjectMembership UUID  (for regular members)
        project_id     — Project UUID            (for guest player)
        kit_type       — e.g. "home", "away", "third"

    Returns:
        { storage_path, presigned_url, filename }
    """
    import io

    membership_id = request.data.get("membership_id", "").strip()
    project_id = request.data.get("project_id", "").strip()
    kit_type = request.data.get("kit_type", "home").strip()

    # ── Guest player path ─────────────────────────────────────────────────────
    if project_id:
        return _crop_closeup_guest_player(request, project_id, kit_type)

    if not membership_id:
        return Response(
            {"error": "membership_id or project_id is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    from projects.models import ProjectMembership

    # ── Fetch membership ──────────────────────────────────────────────────────
    try:
        membership = ProjectMembership.objects.get(id=membership_id)
    except ProjectMembership.DoesNotExist:
        return Response({"error": "Membership not found."}, status=status.HTTP_404_NOT_FOUND)

    # ── Find fullbody storage path ────────────────────────────────────────────
    from src.video.utils.asset_metadata import get_variant_value, infer_role

    role = infer_role(membership, kit_type)
    fullbody_val = get_variant_value(membership, role, "images", "fullbody", kit_type, "default")

    if not fullbody_val:
        return Response(
            {"error": f"No fullbody found for kit_type='{kit_type}'. Generate a fullbody first."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    storage_path = fullbody_val.get("processed") or fullbody_val.get("raw") or ""

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
        from src.video.utils.asset_metadata import (
            infer_role,
            set_variant_value,
            update_media_aliases,
        )

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

        role = infer_role(membership, kit_type)
        set_variant_value(membership, role, "images", "closeup", kit_type, "default", variant_value)
        update_media_aliases(membership, "closeup", new_storage_path)
        membership.save(update_fields=["metadata", "updated_at"])
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
# Crop Halfbody From Fullbody — smart alpha-channel detection, no AI
# =============================================================================


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def crop_halfbody_from_fullbody_view(request: Request) -> Response:
    """Crop a halfbody (head to waist) image from the stored fullbody PNG.

    No AI credit cost — pure Pillow image processing.

    POST /api/v1/generative/assets/crop-halfbody/
    Body:
        membership_id  — ProjectMembership UUID
        kit_type       — e.g. "home", "away", "third"

    Returns:
        { storage_path, presigned_url, filename }
    """
    import io

    membership_id = request.data.get("membership_id", "").strip()
    kit_type = request.data.get("kit_type", "home").strip()

    if not membership_id:
        return Response(
            {"error": "membership_id is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    from projects.models import ProjectMembership

    # ── Fetch membership ──────────────────────────────────────────────────────
    try:
        membership = ProjectMembership.objects.get(id=membership_id)
    except ProjectMembership.DoesNotExist:
        return Response({"error": "Membership not found."}, status=status.HTTP_404_NOT_FOUND)

    # ── Find fullbody storage path ────────────────────────────────────────────
    from src.video.utils.asset_metadata import get_variant_value, infer_role

    role = infer_role(membership, kit_type)
    fullbody_val = get_variant_value(membership, role, "images", "fullbody", kit_type, "default")

    if not fullbody_val:
        return Response(
            {"error": f"No fullbody found for kit_type='{kit_type}'. Generate a fullbody first."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    storage_path = fullbody_val.get("processed") or fullbody_val.get("raw") or ""

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
        logger.exception("crop_halfbody: failed to download fullbody '%s': %s", storage_path, exc)
        return Response(
            {"error": f"Could not download fullbody image: {exc}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # ── Pillow smart crop + resize ────────────────────────────────────────────
    try:
        from PIL import Image as PilImage

        img = PilImage.open(io.BytesIO(raw_bytes)).convert("RGBA")
        resized = _smart_crop_halfbody(img)

        out_buf = io.BytesIO()
        resized.save(out_buf, format="PNG", optimize=True)
        halfbody_bytes = out_buf.getvalue()
    except Exception as exc:
        logger.exception("crop_halfbody: Pillow processing failed: %s", exc)
        return Response(
            {"error": f"Image processing failed: {exc}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # ── Upload to storage ─────────────────────────────────────────────────────
    filename = f"member_halfbody_kit_type-{kit_type}_crop.png"
    upload_result = _upload_image_bytes_to_storage(
        image_bytes=halfbody_bytes,
        filename=filename,
        mime_type="image/png",
        template_id="halfbody_in_tenue",
        template_type="output",
        template_subtype="halfbody",
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
        from src.video.utils.asset_metadata import (
            infer_role,
            set_variant_value,
            update_media_aliases,
        )

        variant_value = {
            "raw": new_storage_path,
            "processed": new_storage_path,
            "processing_state": "processed",
            "specs": {
                "width": HALFBODY_OUTPUT_SIZE[0],
                "height": HALFBODY_OUTPUT_SIZE[1],
                "format": "png",
                "bg_removed": True,
                "source": "crop_from_fullbody",
            },
        }

        role = infer_role(membership, kit_type)
        set_variant_value(
            membership, role, "images", "halfbody", kit_type, "default", variant_value
        )
        update_media_aliases(membership, "halfbody", new_storage_path)
        membership.save(update_fields=["metadata", "updated_at"])
        logger.info(
            "crop_halfbody: saved halfbody for membership=%s kit=%s path=%s",
            membership_id,
            kit_type,
            new_storage_path,
        )
    except Exception as exc:
        logger.exception("crop_halfbody: failed to save to membership metadata: %s", exc)
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

        fn = (job.output_variants[0] or {}).get("filename", "") or (
            job.output_variants[0] or {}
        ).get("storage_path", "")
        kit_match = re.search(r"kit_type-([a-zA-Z0-9]+)", fn)
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

    # Create / update BrandAsset — scoped to the exact project (team or club),
    # NOT walking up the hierarchy.  This prevents a team-level generation
    # from overwriting the club-level asset.
    BrandProfile = apps.get_model("branding", "BrandProfile")
    BrandAsset = apps.get_model("branding", "BrandAsset")

    brand_profile = None
    if project:
        brand_profile = BrandProfile.objects.filter(project=project, is_active=True).first()
        if not brand_profile:
            brand_profile = BrandProfile.objects.create(
                project=project,
                name=f"{project.name} Brand",
                is_active=True,
            )
    else:
        brand_profile = BrandProfile.objects.filter(
            organisation=organisation, project__isnull=True, is_active=True
        ).first()
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
      - "closeup_in_tenue" → images.closeup.{kit_type}
      - "member_action_photo" → images.action_photo.{kit_type}_{style_variant}

    After writing the raw path, queues a Celery process_member_asset task so
    background removal + resize run automatically.
    """
    import re
    from django.apps import apps

    IMAGE_TEMPLATE_MAP = {
        "fullbody_in_tenue": ("fullbody", "images"),
        "closeup_in_tenue": ("closeup", "images"),
        "photo_composite_gemini": ("photo_composite", "images"),
        "walking_composite_far": ("walking_composite", "images"),
        "walking_composite_near": ("walking_composite", "images"),
        "member_action_photo": ("action_photo", "images"),
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

    changed = False

    # Use the first approved variant as the canonical version (best pick)
    first_variant = approved_variants[0]
    storage_path = first_variant.get("storage_path", "")
    filename = first_variant.get("filename", "")

    # Parse kit_type from filename or storage_path.
    # Filename pattern: fullbody_in_tenue_kit_type-legacy_neck-round_sleeves-short_v1_xxx.png
    # Use [a-zA-Z0-9]+ (no underscore) to stop at the next param boundary.
    source_str = filename or storage_path or ""
    kit_match = re.search(r"kit_type-([a-zA-Z0-9]+)", source_str)

    # Walking composite: derive key from template_id (far/near)
    if job.template_id == "walking_composite_far":
        kit_type = "far"
    elif job.template_id == "walking_composite_near":
        kit_type = "near"
    else:
        kit_type = kit_match.group(1) if kit_match else "home"

    # Action photo uses composite key: {kit_type}_{style_variant} (e.g. home_dribbling)
    variant_name = "default"
    if job.template_id == "member_action_photo":
        style_match = re.search(r"style_variant-([a-z]+(?:_[a-z]{2,})*)", source_str)
        style_variant = style_match.group(1) if style_match else None
        if style_variant:
            variant_name = style_variant

    if storage_path:
        from src.video.utils.asset_metadata import (
            infer_role,
            media_type_for_asset,
            set_variant_value,
            update_media_aliases,
        )

        role = infer_role(membership, kit_type)
        mt = media_type_for_asset(asset_type)

        # Photo composite / walking composite images are already composited —
        # no bg removal needed.  They go directly to "processed" state.
        # Action photo DOES need processing (bg removal) like fullbody.
        needs_processing = asset_type not in (
            "photo_composite",
            "walking_composite",
        )
        variant_value = {
            "raw": storage_path,
            "processed": None if needs_processing else storage_path,
            "processing_state": "pending" if needs_processing else "processed",
            "specs": {},
            "source": "ai_generated",
        }
        set_variant_value(membership, role, mt, asset_type, kit_type, variant_name, variant_value)
        update_media_aliases(membership, asset_type, storage_path)
        changed = True
        logger.info(
            "propagate_approved_image: membership=%s, %s.%s.%s → %s (needs_processing=%s)",
            job.membership_id,
            asset_type,
            kit_type,
            variant_name,
            storage_path,
            needs_processing,
        )

    if changed:
        try:
            membership.save(update_fields=["metadata", "updated_at"])
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "propagate_approved_image: failed to save membership %s: %s",
                job.membership_id,
                exc,
            )
            return

        # Queue background removal + resize via existing Celery task
        # Skip for photo_composite — those are already final composites.
        if asset_type not in ("photo_composite",):
            try:
                from src.video.tasks.asset_processing import process_member_asset

                process_member_asset.delay(
                    membership_id=str(job.membership_id),
                    asset_type=asset_type,
                    kit_type=kit_type,
                    raw_url=storage_path,
                    bg_removal_backend="rembg",
                    role=role,
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
        "member_goal_celebration": "celebration",
        "then_vs_now_sidebyside": "then_vs_now",
        "then_vs_now_transformation": "then_vs_now",
        "photo_composite_video": "photo_composite",
        "walking_composite_video": "walking_composite",
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

    from src.video.utils.asset_metadata import (
        get_variant_value,
        infer_role,
        set_variant_value,
        update_media_aliases,
    )

    now_iso = timezone.now().isoformat()
    changed = False
    _auto_process_queue: list[tuple[str, str, str, str]] = []  # (kit, variant, composite_key, path)

    for variant in approved_variants:
        storage_path = variant.get("storage_path", "")
        filename = variant.get("filename", "")

        # Derive kit + variant based on template type
        if asset_type == "then_vs_now":
            base_key = job.template_id.replace("then_vs_now_", "")
            source_str = filename or storage_path or ""
            style_match = re.search(r"style_variant-([a-z]+(?:_[a-z]{2,})*)", source_str)
            kit_type = "home"
            variant_name = f"{base_key}_{style_match.group(1)}" if style_match else base_key
        elif asset_type in ("photo_composite", "walking_composite"):
            kit_type = "home"
            variant_name = "default"
        else:
            source_str = filename or storage_path or ""
            kit_match = re.search(r"kit_type-([a-zA-Z0-9]+)", source_str)
            style_match = re.search(r"style_variant-([a-z]+(?:_[a-z]{2,})*)", source_str)
            kit_type = kit_match.group(1) if kit_match else "home"
            variant_name = style_match.group(1) if style_match else "default"

        role = infer_role(membership, kit_type)
        composite_key = f"{kit_type}_{variant_name}" if variant_name != "default" else kit_type

        # Guard: don't re-process if the same raw asset is already fully processed
        existing = get_variant_value(membership, role, "videos", asset_type, kit_type, variant_name)
        if (
            isinstance(existing, dict)
            and existing.get("processing_state") == "processed"
            and existing.get("raw") == storage_path
        ):
            logger.info(
                "propagate_approved_video: skipping %s.%s — same asset already processed",
                asset_type,
                composite_key,
            )
            continue

        needs_processing = asset_type in (
            "intro",
            "celebration",
            "then_vs_now",
            "photo_composite",
            "walking_composite",
        )
        variant_value = {
            "raw": storage_path,
            "processing_state": "processing" if needs_processing else "processed",
            "processed": storage_path,
            "processed_at": None if needs_processing else now_iso,
            "specs": {},
            "source": "ai_generated",
        }
        set_variant_value(
            membership, role, "videos", asset_type, kit_type, variant_name, variant_value
        )
        changed = True

        if needs_processing and storage_path:
            _auto_process_queue.append((kit_type, variant_name, composite_key, storage_path))

        logger.info(
            "propagate_approved_video: membership=%s, %s.%s.%s → %s (auto_process=%s)",
            job.membership_id,
            asset_type,
            kit_type,
            variant_name,
            storage_path,
            needs_processing,
        )

    if changed:
        if storage_path:
            update_media_aliases(membership, asset_type, storage_path)

        try:
            membership.save(update_fields=["metadata", "updated_at"])
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "propagate_approved_video: failed to save membership %s: %s",
                job.membership_id,
                exc,
            )
            return

        if _auto_process_queue:
            _auto_dispatch_rvm_processing(str(membership.id), asset_type, _auto_process_queue)


def _auto_dispatch_rvm_processing(
    membership_id: str,
    asset_type: str,
    items: list[tuple[str, str, str, str]],
) -> None:
    """Auto-dispatch RVM background removal for newly-approved AI video variants.

    Called after AI generation approval propagates a video to membership metadata.
    Dispatches process_member_asset to the video_slow queue so the variant gets
    its background removed without manual user action.

    Args:
        membership_id: ProjectMembership UUID
        asset_type: "intro", "celebration", "then_vs_now", "photo_composite", or "walking_composite"
        items: list of (kit_type, variant_name, composite_key, raw_storage_path)
    """
    from django.db import transaction

    from src.video.tasks.asset_processing import process_member_asset

    for kit_type, variant_name, composite_key, raw_url in items:
        variant_id = variant_name if variant_name != "default" else None

        # Use default args to capture loop variables in the closure
        def _dispatch(
            mid: str = membership_id,
            at: str = asset_type,
            kt: str = kit_type,
            vid: str | None = variant_id,
            url: str = raw_url,
        ) -> None:
            process_member_asset.delay(
                membership_id=mid,
                asset_type=at,
                kit_type=kt,
                raw_url=url,
                variant_id=vid,
                bg_removal_backend="rvm",
            )
            logger.info(
                "auto_dispatch_rvm: queued RVM for %s.%s (membership=%s)",
                at,
                f"{kt}_{vid}" if vid else kt,
                mid,
            )

        transaction.on_commit(_dispatch)


def _propagate_approved_guest_avatar_to_project(job) -> None:  # noqa: ANN001
    """Write an approved guest_player asset into Project.metadata.guest_player.

    Called after marking a guest_player generation job as approved so the guest
    player assets appear immediately on the project season page.

    Supported asset types:
    - guest_player          → project.metadata.guest_player.images.fullbody.home
    - guest_player_closeup  → project.metadata.guest_player.images.closeup.home
    - guest_player_intro    → project.metadata.guest_player.videos.intro.home
    - guest_player_celebration → project.metadata.guest_player.videos.celebration.home
    """
    asset_type = job.output_asset_type or ""
    if not asset_type.startswith("guest_player") or not job.project_id:
        return

    from django.apps import apps

    approved_variants = [v for v in (job.output_variants or []) if v.get("approved") is True]
    if not approved_variants:
        return

    Project = apps.get_model("projects", "Project")
    try:
        project = Project.objects.get(id=job.project_id)
    except Exception:  # noqa: BLE001
        logger.warning(
            "propagate_guest_avatar: project %s not found for job %s",
            job.project_id,
            job.task_id,
        )
        return

    meta = project.metadata or {}
    guest_player = meta.setdefault("guest_player", {})
    if not isinstance(guest_player, dict):
        return

    # Use first approved variant
    first_variant = approved_variants[0]
    storage_path = first_variant.get("storage_path", "")

    if not storage_path:
        return

    asset_entry = {
        "raw": storage_path,
        "processed": None,
        "processing_state": "pending",
        "specs": {},
        "source": "ai_generated",
        "generated_at": project.updated_at.isoformat() if project.updated_at else None,
    }

    # Determine where to write based on asset_type
    if asset_type == "guest_player":
        # Fullbody image → images.fullbody.home
        images = guest_player.setdefault("images", {})
        if not isinstance(images, dict):
            return
        fullbody = images.setdefault("fullbody", {})
        if not isinstance(fullbody, dict):
            return
        fullbody["home"] = asset_entry
    elif asset_type == "guest_player_closeup":
        # Closeup image → images.closeup.home
        images = guest_player.setdefault("images", {})
        if not isinstance(images, dict):
            return
        closeup = images.setdefault("closeup", {})
        if not isinstance(closeup, dict):
            return
        closeup["home"] = asset_entry
    elif asset_type == "guest_player_intro":
        # Intro video → videos.intro.home
        videos = guest_player.setdefault("videos", {})
        if not isinstance(videos, dict):
            return
        intro = videos.setdefault("intro", {})
        if not isinstance(intro, dict):
            return
        intro["home"] = asset_entry
    elif asset_type == "guest_player_celebration":
        # Celebration video → videos.celebration.home
        videos = guest_player.setdefault("videos", {})
        if not isinstance(videos, dict):
            return
        celebration = videos.setdefault("celebration", {})
        if not isinstance(celebration, dict):
            return
        celebration["home"] = asset_entry
    else:
        logger.info(
            "propagate_guest_avatar: unknown guest asset_type %s — skipping",
            asset_type,
        )
        return

    project.metadata = meta
    try:
        project.save(update_fields=["metadata"])
        logger.info(
            "propagate_guest_avatar: project=%s updated with %s (job=%s)",
            job.project_id,
            asset_type,
            job.task_id,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "propagate_guest_avatar: failed to save project %s: %s",
            job.project_id,
            exc,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
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

    # Propagate approved guest_player avatar to Project.metadata so the season page reflects it
    if action == "approve" and (job.output_asset_type or "").startswith("guest_player"):
        try:
            _propagate_approved_guest_avatar_to_project(job)
        except Exception as propagate_exc:  # noqa: BLE001
            logger.warning(
                "review_generation_job_view: guest avatar propagation failed for job %s: %s",
                task_id,
                propagate_exc,
            )

    # B64: Publish approval decided event
    try:
        from rtc_websockets.events import (
            ApprovalDecidedPayload,
            EventType,
            build_event,
        )
        from rtc_websockets.services import RealtimeEventPublisher

        publisher = RealtimeEventPublisher()
        reviewer = request.user if request.user and request.user.is_authenticated else None
        event = build_event(
            EventType.APPROVAL_DECIDED,
            ApprovalDecidedPayload(
                content_item_id=int(str(job.task_id)[:8], 16) if job.task_id else 0,
                project_id=job.project_id or 0,
                decision="approved" if action == "approve" else "rejected",
                reviewer_name=(reviewer.get_full_name() or reviewer.username)
                if reviewer
                else "system",
            ),
            actor_id=reviewer.id if reviewer else None,
        )
        if job.project_id:
            publisher.publish_to_project(job.project_id, event)
    except Exception:
        pass

    return Response(
        {
            "task_id": str(job.task_id),
            "approval_status": job.approval_status,
            "output_variants": job.output_variants or [],
            "reviewed_at": job.reviewed_at.isoformat() if job.reviewed_at else None,
        }
    )
