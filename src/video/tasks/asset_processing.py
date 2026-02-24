"""Celery task for TeamReel member asset processing.

This takes a raw member asset (image/video) and produces the standardized
"processed" variant used by the lineup composer.

It updates ProjectMembership.metadata.teamreel_assets in-place.

We keep this task intentionally narrow so it can be called from management
commands and batch tooling.
"""

from __future__ import annotations

import logging
import time

from celery import shared_task
from django.apps import apps
from django.db import DatabaseError
from django.db import transaction
from django.utils import timezone

from src.video.services.asset_processing_specs import ProcessingState
from src.video.services.asset_processor import AssetProcessor
from src.video.services.asset_processor import AssetProcessingCancelled

logger = logging.getLogger(__name__)


def _update_variant_metadata(
    membership: object,
    *,
    asset_type: str,
    kit_type: str,
    variant_id: str | None,
    variant_value: dict,
) -> None:
    """Update membership.metadata.teamreel_assets with a variant value.

    Mirrors the logic in the API view, but lives here so Celery can update
    metadata without importing DRF.
    """

    meta = getattr(membership, "metadata", None) or {}
    tr = meta.get("teamreel_assets", {})

    if asset_type in ("fullbody", "closeup"):
        images = tr.setdefault("images", {})
        cat = images.setdefault(asset_type, {})
        cat[kit_type] = variant_value
    else:
        videos = tr.setdefault("videos", {})
        cat = videos.setdefault(asset_type, {})
        composite_key = f"{kit_type}_{variant_id}" if variant_id else kit_type
        cat[composite_key] = variant_value
        if variant_id and variant_id in cat and variant_id != composite_key:
            cat.pop(variant_id, None)

    best_url = variant_value.get("processed") or variant_value.get("raw")
    if best_url:
        media = tr.setdefault("media", {})
        slot = media.get(asset_type, {})
        if isinstance(slot, dict):
            slot["url"] = best_url
        else:
            slot = {"url": best_url, "caption": ""}
        media[asset_type] = slot

        # Legacy alias: fullbody is also stored/read via media.kit in some places.
        if asset_type == "fullbody":
            kit_slot = media.get("kit", {})
            if isinstance(kit_slot, dict):
                kit_slot["url"] = best_url
            else:
                kit_slot = {"url": best_url, "caption": ""}
            media["kit"] = kit_slot

    meta["teamreel_assets"] = tr
    membership.metadata = meta
    membership.save(update_fields=["metadata", "updated_at"])


def _get_variant_state(
    membership: object,
    *,
    asset_type: str,
    kit_type: str,
    variant_id: str | None,
) -> str | None:
    """Get the current processing_state for a variant.

    Returns the state string or None if not found.
    """
    meta = getattr(membership, "metadata", None) or {}
    tr = meta.get("teamreel_assets", {})

    if asset_type in ("fullbody", "closeup"):
        variant_val = (tr.get("images", {}).get(asset_type, {}) or {}).get(kit_type)
    else:
        composite_key = f"{kit_type}_{variant_id}" if variant_id else kit_type
        variant_val = (tr.get("videos", {}).get(asset_type, {}) or {}).get(composite_key)

    if isinstance(variant_val, dict):
        return variant_val.get("processing_state")
    return None


@shared_task(
    bind=True,
    max_retries=2,
    soft_time_limit=3600,
    time_limit=3900,
    acks_late=True,
    retry_backoff=60,
    retry_jitter=True,
)
def process_member_asset(
    self,
    *,
    membership_id: str,
    asset_type: str,
    kit_type: str,
    raw_url: str,
    variant_id: str | None = None,
    bg_removal_backend: str | None = None,
) -> str:
    """Process a single TeamReel member asset and update metadata."""

    logger.info(
        "process_member_asset received",
        extra={
            "task_id": getattr(self.request, "id", None),
            "membership_id": membership_id,
            "asset_type": asset_type,
            "kit_type": kit_type,
            "variant_id": variant_id,
        },
    )

    ProjectMembership = apps.get_model("projects", "ProjectMembership")

    membership = (
        ProjectMembership.objects.select_related("project").filter(id=membership_id).first()
    )
    if not membership:
        logger.warning("process_member_asset: membership not found", extra={"id": membership_id})
        return membership_id

    # Mark processing state first (best-effort)
    try:
        _update_variant_metadata(
            membership,
            asset_type=asset_type,
            kit_type=kit_type,
            variant_id=variant_id,
            variant_value={
                "raw": raw_url,
                "processed": None,
                "processing_state": ProcessingState.PROCESSING.value,
                "processing_started_at": timezone.now().isoformat(),
            },
        )
    except (DatabaseError, ValueError, TypeError) as mark_exc:
        logger.exception(
            "Failed to mark processing state",
            extra={"membership_id": membership_id, "error": str(mark_exc)},
        )

    # Create a should_cancel callback that checks the DB for "cancelling" state.
    # We use a closure to avoid re-querying too often (check at most every 5s).
    _last_check = {"time": 0.0, "cancelled": False}

    def should_cancel() -> bool:
        import time as time_module

        now = time_module.time()
        # Only check DB at most every 5 seconds
        if now - _last_check["time"] < 5.0:
            return _last_check["cancelled"]

        _last_check["time"] = now
        try:
            membership.refresh_from_db(fields=["metadata"])
            state = _get_variant_state(
                membership,
                asset_type=asset_type,
                kit_type=kit_type,
                variant_id=variant_id,
            )
            if state == "cancelling":
                logger.info(
                    "process_member_asset: cancellation requested",
                    extra={"membership_id": membership_id},
                )
                _last_check["cancelled"] = True
                return True
        except Exception:  # noqa: BLE001
            pass  # On DB error, don't cancel
        return False

    # Create a progress callback that updates metadata with frame progress.
    # Uses the same throttling pattern as should_cancel (update at most every 5s).
    _last_progress = {"time": 0.0, "frame": 0}

    def progress_callback(current_frame: int, total_frames: int) -> None:
        import time as time_module

        now = time_module.time()
        # Only update DB at most every 5 seconds
        if now - _last_progress["time"] < 5.0:
            return

        _last_progress["time"] = now
        _last_progress["frame"] = current_frame
        try:
            membership.refresh_from_db(fields=["metadata"])
            _update_variant_metadata(
                membership,
                asset_type=asset_type,
                kit_type=kit_type,
                variant_id=variant_id,
                variant_value={
                    "raw": raw_url,
                    "processed": None,
                    "processing_state": ProcessingState.PROCESSING.value,
                    "progress_frames": current_frame,
                    "total_frames": total_frames,
                },
            )
        except Exception:  # noqa: BLE001
            pass  # On DB error, continue processing

    try:
        processor = AssetProcessor()
        effective_backend = bg_removal_backend
        if not effective_backend:
            effective_backend = (
                "rvm"
                if asset_type in ("intro", "celebration", "then_vs_now", "photo_composite")
                else "rembg"
            )

        result = processor.process_asset(
            raw_url=raw_url,
            asset_type=asset_type,
            membership_id=str(membership_id),
            kit_type=kit_type,
            variant_id=variant_id,
            organisation_id=str(membership.project.organisation_id)
            if hasattr(membership.project, "organisation_id")
            else None,
            bg_removal_backend=effective_backend,
            should_cancel=should_cancel,
            progress_callback=progress_callback,
        )

        # Refresh before writing final result (avoid clobber)
        membership.refresh_from_db()
        with transaction.atomic():
            _update_variant_metadata(
                membership,
                asset_type=asset_type,
                kit_type=kit_type,
                variant_id=variant_id,
                variant_value=result,
            )

        logger.info(
            "process_member_asset complete",
            extra={
                "membership_id": membership_id,
                "asset_type": asset_type,
                "kit_type": kit_type,
                "variant_id": variant_id,
                "state": result.get("processing_state"),
            },
        )

        # Auto-crop closeup and halfbody from processed fullbody image.
        # The crop uses the bg-removed fullbody, so the results are immediately "processed".
        if (
            asset_type == "fullbody"
            and result.get("processing_state") == ProcessingState.PROCESSED.value
        ):
            # Queue closeup crop
            try:
                auto_crop_closeup_from_fullbody.delay(
                    membership_id=str(membership_id),
                    kit_type=kit_type,
                )
                logger.info(
                    "process_member_asset: queued auto-crop closeup",
                    extra={"membership_id": membership_id, "kit_type": kit_type},
                )
            except Exception as crop_exc:  # noqa: BLE001
                logger.warning(
                    "process_member_asset: failed to queue closeup crop: %s",
                    crop_exc,
                )

            # Queue halfbody crop
            try:
                auto_crop_halfbody_from_fullbody.delay(
                    membership_id=str(membership_id),
                    kit_type=kit_type,
                )
                logger.info(
                    "process_member_asset: queued auto-crop halfbody",
                    extra={"membership_id": membership_id, "kit_type": kit_type},
                )
            except Exception as crop_exc:  # noqa: BLE001
                logger.warning(
                    "process_member_asset: failed to queue halfbody crop: %s",
                    crop_exc,
                )

        # Cooldown delay for video processing to let Railway CPU credits recover
        # This prevents throttling when processing multiple videos in batch
        if asset_type in ("intro", "celebration", "then_vs_now"):
            cooldown_secs = 45
            logger.info(
                "process_member_asset cooldown",
                extra={"cooldown_secs": cooldown_secs, "reason": "cpu_credits_recovery"},
            )
            time.sleep(cooldown_secs)

        return membership_id

    except AssetProcessingCancelled:
        logger.info(
            "process_member_asset cancelled by user",
            extra={
                "membership_id": membership_id,
                "asset_type": asset_type,
                "kit_type": kit_type,
                "variant_id": variant_id,
            },
        )
        # Write cancelled state to metadata
        try:
            membership.refresh_from_db()
            _update_variant_metadata(
                membership,
                asset_type=asset_type,
                kit_type=kit_type,
                variant_id=variant_id,
                variant_value={
                    "raw": raw_url,
                    "processed": None,
                    "processing_state": "cancelled",
                    "processed_at": timezone.now().isoformat(),
                },
            )
        except (DatabaseError, ValueError, TypeError) as write_exc:
            logger.exception(
                "Failed to write cancelled state",
                extra={"membership_id": membership_id, "error": str(write_exc)},
            )
        return membership_id

    except Exception as exc:  # noqa: BLE001
        logger.exception(
            "process_member_asset failed",
            extra={
                "membership_id": membership_id,
                "asset_type": asset_type,
                "kit_type": kit_type,
                "variant_id": variant_id,
            },
        )
        # Last-resort metadata update (don’t throw away raw)
        try:
            membership.refresh_from_db()
            _update_variant_metadata(
                membership,
                asset_type=asset_type,
                kit_type=kit_type,
                variant_id=variant_id,
                variant_value={
                    "raw": raw_url,
                    "processed": None,
                    "processing_state": ProcessingState.FAILED.value,
                    "error": str(exc)[:500],
                    "processed_at": timezone.now().isoformat(),
                },
            )
        except (DatabaseError, ValueError, TypeError) as write_exc:
            logger.exception(
                "Failed to write failure state",
                extra={"membership_id": membership_id, "error": str(write_exc)},
            )
        raise


@shared_task(
    bind=True,
    max_retries=1,
    soft_time_limit=120,
    time_limit=150,
    acks_late=True,
    retry_backoff=30,
)
def auto_crop_closeup_from_fullbody(
    self,
    *,
    membership_id: str,
    kit_type: str,
) -> str | None:
    """Auto-crop a closeup from a processed fullbody image.

    Dispatched automatically after process_member_asset completes for a fullbody.
    Downloads the processed (bg-removed) fullbody, crops head+shoulders via
    Pillow, uploads the result, and writes metadata as "processed" (no further
    bg removal needed — the source is already transparent).
    """
    import io
    import uuid as _uuid

    from django.core.files.base import ContentFile
    from PIL import Image as PilImage

    # Import crop algorithm + constants from views_asset (pure Pillow, no Django deps)
    from src.generative.views_asset import CLOSEUP_OUTPUT_SIZE
    from src.generative.views_asset import _smart_crop_closeup

    ProjectMembership = apps.get_model("projects", "ProjectMembership")
    try:
        membership = ProjectMembership.objects.get(id=membership_id)
    except Exception:  # noqa: BLE001
        logger.warning("auto_crop_closeup: membership %s not found", membership_id)
        return None

    # ── Read processed fullbody path ──────────────────────────────────────────
    meta = membership.metadata or {}
    ta = meta.get("teamreel_assets", {})
    images = ta.get("images", {})
    fullbody = images.get("fullbody", {}).get(kit_type, {})

    if not isinstance(fullbody, dict):
        logger.warning(
            "auto_crop_closeup: no fullbody dict for membership=%s kit=%s",
            membership_id,
            kit_type,
        )
        return None

    # Prefer processed (bg-removed); fall back to raw
    source_path = fullbody.get("processed") or fullbody.get("raw")
    if not source_path:
        logger.warning(
            "auto_crop_closeup: no fullbody path for membership=%s kit=%s",
            membership_id,
            kit_type,
        )
        return None

    # ── Download fullbody from S3 ─────────────────────────────────────────────
    try:
        from files.utils import get_storage_backend

        storage = get_storage_backend()
        with storage.open(source_path, "rb") as fh:
            raw_bytes = fh.read()
    except Exception as exc:
        logger.exception(
            "auto_crop_closeup: download failed for %s: %s",
            source_path,
            exc,
        )
        raise self.retry(exc=exc)

    # ── Pillow smart crop ─────────────────────────────────────────────────────
    try:
        img = PilImage.open(io.BytesIO(raw_bytes)).convert("RGBA")
        cropped = _smart_crop_closeup(img)

        out_buf = io.BytesIO()
        cropped.save(out_buf, format="PNG", optimize=True)
        closeup_bytes = out_buf.getvalue()
    except Exception as exc:
        logger.exception("auto_crop_closeup: crop failed: %s", exc)
        return None

    # ── Upload closeup to S3 ──────────────────────────────────────────────────
    try:
        timestamp = timezone.now().strftime("%Y%m%d")
        unique = str(_uuid.uuid4())[:8]
        filename = f"member_closeup_kit_type-{kit_type}_crop_{timestamp}_{unique}.png"
        upload_path = f"members/{membership_id}/generated/output/closeup/{filename}"

        file_obj = ContentFile(closeup_bytes, name=filename)
        storage_path = storage.save(upload_path, file_obj)
    except Exception as exc:
        logger.exception("auto_crop_closeup: upload failed: %s", exc)
        raise self.retry(exc=exc)

    # ── Write metadata ────────────────────────────────────────────────────────
    try:
        membership.refresh_from_db()
        with transaction.atomic():
            _update_variant_metadata(
                membership,
                asset_type="closeup",
                kit_type=kit_type,
                variant_id=None,
                variant_value={
                    "raw": storage_path,
                    "processed": storage_path,  # already bg-removed from fullbody
                    "processing_state": ProcessingState.PROCESSED.value,
                    "processed_at": timezone.now().isoformat(),
                    "specs": {
                        "width": CLOSEUP_OUTPUT_SIZE[0],
                        "height": CLOSEUP_OUTPUT_SIZE[1],
                        "format": "png",
                        "bg_removed": True,
                        "source": "auto_crop_from_fullbody",
                    },
                },
            )
        logger.info(
            "auto_crop_closeup: saved closeup for membership=%s kit=%s path=%s",
            membership_id,
            kit_type,
            storage_path,
        )
    except Exception as exc:
        logger.exception("auto_crop_closeup: metadata save failed: %s", exc)
        return None

    return membership_id


@shared_task(
    bind=True,
    max_retries=2,
    time_limit=150,
    acks_late=True,
    retry_backoff=30,
)
def auto_crop_halfbody_from_fullbody(
    self,
    *,
    membership_id: str,
    kit_type: str,
) -> str | None:
    """Auto-crop a halfbody (head to waist) from a processed fullbody image.

    Dispatched automatically after process_member_asset completes for a fullbody.
    Downloads the processed (bg-removed) fullbody, crops top 55% via Pillow,
    uploads the result, and writes metadata as "processed".
    """
    import io
    import uuid as _uuid

    from django.core.files.base import ContentFile
    from PIL import Image as PilImage

    # Import crop algorithm + constants from views_asset
    from src.generative.views_asset import HALFBODY_OUTPUT_SIZE
    from src.generative.views_asset import _smart_crop_halfbody

    ProjectMembership = apps.get_model("projects", "ProjectMembership")
    try:
        membership = ProjectMembership.objects.get(id=membership_id)
    except Exception:  # noqa: BLE001
        logger.warning("auto_crop_halfbody: membership %s not found", membership_id)
        return None

    # ── Read processed fullbody path ──────────────────────────────────────────
    meta = membership.metadata or {}
    ta = meta.get("teamreel_assets", {})
    images = ta.get("images", {})
    fullbody = images.get("fullbody", {}).get(kit_type, {})

    if not isinstance(fullbody, dict):
        logger.warning(
            "auto_crop_halfbody: no fullbody dict for membership=%s kit=%s",
            membership_id,
            kit_type,
        )
        return None

    # Prefer processed (bg-removed); fall back to raw
    source_path = fullbody.get("processed") or fullbody.get("raw")
    if not source_path:
        logger.warning(
            "auto_crop_halfbody: no fullbody path for membership=%s kit=%s",
            membership_id,
            kit_type,
        )
        return None

    # ── Download fullbody from S3 ─────────────────────────────────────────────
    try:
        from files.utils import get_storage_backend

        storage = get_storage_backend()
        with storage.open(source_path, "rb") as fh:
            raw_bytes = fh.read()
    except Exception as exc:
        logger.exception(
            "auto_crop_halfbody: download failed for %s: %s",
            source_path,
            exc,
        )
        raise self.retry(exc=exc)

    # ── Pillow smart crop ─────────────────────────────────────────────────────
    try:
        img = PilImage.open(io.BytesIO(raw_bytes)).convert("RGBA")
        cropped = _smart_crop_halfbody(img)

        out_buf = io.BytesIO()
        cropped.save(out_buf, format="PNG", optimize=True)
        halfbody_bytes = out_buf.getvalue()
    except Exception as exc:
        logger.exception("auto_crop_halfbody: crop failed: %s", exc)
        return None

    # ── Upload halfbody to S3 ──────────────────────────────────────────────────
    try:
        timestamp = timezone.now().strftime("%Y%m%d")
        unique = str(_uuid.uuid4())[:8]
        filename = f"member_halfbody_kit_type-{kit_type}_crop_{timestamp}_{unique}.png"
        upload_path = f"members/{membership_id}/generated/output/halfbody/{filename}"

        file_obj = ContentFile(halfbody_bytes, name=filename)
        storage_path = storage.save(upload_path, file_obj)
    except Exception as exc:
        logger.exception("auto_crop_halfbody: upload failed: %s", exc)
        raise self.retry(exc=exc)

    # ── Write metadata ────────────────────────────────────────────────────────
    try:
        membership.refresh_from_db()
        with transaction.atomic():
            _update_variant_metadata(
                membership,
                asset_type="halfbody",
                kit_type=kit_type,
                variant_id=None,
                variant_value={
                    "raw": storage_path,
                    "processed": storage_path,  # already bg-removed from fullbody
                    "processing_state": ProcessingState.PROCESSED.value,
                    "processed_at": timezone.now().isoformat(),
                    "specs": {
                        "width": HALFBODY_OUTPUT_SIZE[0],
                        "height": HALFBODY_OUTPUT_SIZE[1],
                        "format": "png",
                        "bg_removed": True,
                        "source": "auto_crop_from_fullbody",
                    },
                },
            )
        logger.info(
            "auto_crop_halfbody: saved halfbody for membership=%s kit=%s path=%s",
            membership_id,
            kit_type,
            storage_path,
        )
    except Exception as exc:
        logger.exception("auto_crop_halfbody: metadata save failed: %s", exc)
        return None

    return membership_id
