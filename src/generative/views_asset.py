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


class AssetVariantSerializer(serializers.Serializer):
    """Output for a single generated variant."""

    variant_index = serializers.IntegerField()
    image_base64 = serializers.CharField(allow_null=True)
    mime_type = serializers.CharField(allow_null=True)
    filename = serializers.CharField(allow_null=True)
    error = serializers.CharField(required=False, allow_null=True)
    metadata = serializers.DictField(required=False)


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

    # Strip binary image_bytes from response (keep only base64)
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
            }
        )

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
