"""DRF ViewSet for asset generation endpoint.

POST /api/v1/generative/assets/generate/
  — Accepts template_id, params, and input images (base64 or URLs)
  — Returns generated variants (base64 images)

This is a simplified synchronous endpoint for the demo frontend.
For production, use the full GenerationRequest async flow.
"""

from __future__ import annotations

import base64
import logging

from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response

logger = logging.getLogger("generative.views.asset")


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


class StorageInfoSerializer(serializers.Serializer):
    """Storage info for saved files."""

    storage_backend = serializers.CharField()
    storage_path = serializers.CharField()
    original_name = serializers.CharField()
    file_size_bytes = serializers.IntegerField()
    file_size_kb = serializers.FloatField()
    mime_type = serializers.CharField()
    created_at = serializers.CharField()


class AssetVariantSerializer(serializers.Serializer):
    """Output for a single generated variant."""

    variant_index = serializers.IntegerField()
    image_base64 = serializers.CharField(allow_null=True)
    mime_type = serializers.CharField(allow_null=True)
    filename = serializers.CharField(allow_null=True)
    error = serializers.CharField(required=False, allow_null=True)
    metadata = serializers.DictField(required=False)
    presigned_url = serializers.CharField(required=False, allow_null=True)
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

    # Run the asset pipeline
    try:
        from .services.asset_pipeline import generate_asset

        results = generate_asset(
            template_id=template_id,
            params=params,
            input_images=input_images,
            variant_count=variant_count,
        )
    except ValueError as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as e:  # noqa: BLE001
        logger.exception("Asset generation failed: %s", e)
        return Response(
            {"error": f"Generation failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Save generated images to storage and include storage info in response
    from files.utils import get_storage_backend

    storage = get_storage_backend()
    storage_backend_name = storage.__class__.__name__

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

                # Build proper S3 path based on context from params
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

                # Build path: generated/{template_type}/{subtype}/{filename}
                storage_path_prefix = f"generated/{asset_folder}/{unique_filename}"

                # Save to storage backend
                file_obj = ContentFile(image_bytes, name=filename)
                storage_path = storage.save(storage_path_prefix, file_obj)

                # Generate access URL
                try:
                    presigned_url = storage.get_url(storage_path, signed=True)
                except Exception:
                    presigned_url = storage.url(storage_path) if hasattr(storage, "url") else None

                variant_data["presigned_url"] = presigned_url
                variant_data["storage_info"] = {
                    "storage_backend": storage_backend_name,
                    "storage_path": storage_path,
                    "original_name": filename,
                    "file_size_bytes": len(image_bytes),
                    "file_size_kb": round(len(image_bytes) / 1024, 1),
                    "mime_type": mime_type,
                    "created_at": timezone.now().isoformat(),
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

    if not os.path.exists(prompts_path):
        return Response(
            {"error": "teamreel_prompts.py not found"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

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
