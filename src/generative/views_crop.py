"""Image cropping views — closeup and halfbody crops from fullbody images."""
from __future__ import annotations

import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from ._asset_helpers import (
    CLOSEUP_OUTPUT_SIZE,
    HALFBODY_OUTPUT_SIZE,
    _crop_closeup_guest_player,
    _smart_crop_closeup,
    _smart_crop_halfbody,
    _upload_image_bytes_to_storage,
)

logger = logging.getLogger("generative.views.asset")


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
