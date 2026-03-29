"""Shared helpers, constants, and serializers for asset generation views."""
from __future__ import annotations

import base64
import logging
import time
import uuid as uuid_mod
from typing import Any

from rest_framework import serializers, status
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
        import uuid

        from .models import GenerationJob

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
        help_text=(
            "Input images as base64 strings."
            " Keys: logo, sponsor, reference_photo, person_photo"
        ),
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
        help_text=(
            "Explicit model ID (e.g. gen4_turbo, video-01)."
            " If omitted, uses provider default."
        ),
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
        import uuid as _uuid

        from django.core.files.base import ContentFile
        from django.utils import timezone
        from files.utils import get_storage_backend

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
                from files.models import FileAsset as _FA
                from organisations.models import Organisation as _Org

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
        except Exception as e:
            logger.warning("Failed to resolve related object: %s", e)

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
        except Exception as e:
            logger.warning("Failed to resolve related object: %s", e)
    if not v_org and storage_context.get("project_id"):
        try:
            from projects.models import Project

            _proj = Project.objects.select_related("organisation").get(
                id=storage_context["project_id"]
            )
            v_org = _proj.organisation
            logger.debug("Resolved org from project %s: %s", _proj.id, v_org.id)
        except Exception as e:
            logger.warning("Failed to resolve related object: %s", e)

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
                "error": (
                    f"No guest fullbody found for kit_type='{kit_type}'."
                    " Generate a fullbody first."
                )
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


# =============================================================================
# Brand & Membership propagation helpers
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
                    "propagate_approved_image: queued"
                    " process_member_asset for membership=%s kit=%s",
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

    for kit_type, variant_name, _composite_key, raw_url in items:
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
