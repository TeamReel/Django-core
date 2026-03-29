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
from django.db import DatabaseError, transaction
from django.utils import timezone

from src.video.services.asset_processing_specs import ProcessingState
from src.video.services.asset_processor import AssetProcessingCancelled, AssetProcessor
from src.video.utils.asset_metadata import (
    build_s3_asset_path,
    get_variant_value,
    infer_role,
    media_type_for_asset,
    set_variant_value,
    update_media_aliases,
)

logger = logging.getLogger(__name__)


def _update_variant_metadata(
    membership: object,
    *,
    asset_type: str,
    kit_type: str,
    variant_id: str | None,
    variant_value: dict,
    role: str | None = None,
) -> None:
    """Update membership.metadata.teamreel_assets with a variant value.

    Writes to the new nested ``roles.{role}`` structure via set_variant_value.
    Also maintains backward-compatible ``media.*`` aliases.
    """
    if role is None:
        role = infer_role(membership, kit_type)

    media_type = media_type_for_asset(asset_type)
    variant = variant_id if variant_id and variant_id != kit_type else "default"

    set_variant_value(membership, role, media_type, asset_type, kit_type, variant, variant_value)

    best_url = (
        variant_value.get("preview_url")
        or variant_value.get("processed")
        or variant_value.get("raw")
    )
    if best_url:
        update_media_aliases(membership, asset_type, best_url)

    membership.save(update_fields=["metadata", "updated_at"])


def _get_variant_state(
    membership: object,
    *,
    asset_type: str,
    kit_type: str,
    variant_id: str | None,
    role: str | None = None,
) -> str | None:
    """Get the current processing_state for a variant.

    Returns the state string or None if not found.
    """
    if role is None:
        role = infer_role(membership, kit_type)

    media_type = media_type_for_asset(asset_type)
    variant = variant_id if variant_id and variant_id != kit_type else "default"

    value = get_variant_value(membership, role, media_type, asset_type, kit_type, variant)
    if isinstance(value, dict):
        return value.get("processing_state")
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
    role: str | None = None,
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

    # Resolve role: use explicit param, or infer from membership
    from src.video.utils.asset_metadata import infer_role

    effective_role = role or infer_role(membership, kit_type)

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
            logger.debug("DB error checking cancellation for %s", membership_id, exc_info=True)
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
            logger.debug("DB error updating progress for %s", membership_id, exc_info=True)

    try:
        processor = AssetProcessor()
        effective_backend = bg_removal_backend
        if not effective_backend:
            effective_backend = (
                "rvm"
                if asset_type
                in ("intro", "celebration", "then_vs_now", "photo_composite", "walking_composite")
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
            role=effective_role,
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
    from src.generative.views_asset import CLOSEUP_OUTPUT_SIZE, _smart_crop_closeup

    ProjectMembership = apps.get_model("projects", "ProjectMembership")
    try:
        membership = ProjectMembership.objects.get(id=membership_id)
    except Exception:  # noqa: BLE001
        logger.warning("auto_crop_closeup: membership %s not found", membership_id)
        return None

    # ── Read processed fullbody path ──────────────────────────────────────────
    from src.video.utils.asset_metadata import get_variant_value, infer_role

    role = infer_role(membership, kit_type)
    fullbody = get_variant_value(membership, role, "images", "fullbody", kit_type, "default")

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
        raise self.retry(exc=exc) from exc

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
        unique = str(_uuid.uuid4())[:8]
        upload_path = build_s3_asset_path(
            member_id=str(membership_id),
            role=role,
            asset_type="closeup",
            kit=kit_type,
            variant="default",
            content_hash=unique,
            ext="png",
        )

        file_obj = ContentFile(closeup_bytes, name=upload_path.rsplit("/", 1)[-1])
        storage_path = storage.save(upload_path, file_obj)
    except Exception as exc:
        logger.exception("auto_crop_closeup: upload failed: %s", exc)
        raise self.retry(exc=exc) from exc

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
    from src.generative.views_asset import HALFBODY_OUTPUT_SIZE, _smart_crop_halfbody

    ProjectMembership = apps.get_model("projects", "ProjectMembership")
    try:
        membership = ProjectMembership.objects.get(id=membership_id)
    except Exception:  # noqa: BLE001
        logger.warning("auto_crop_halfbody: membership %s not found", membership_id)
        return None

    # ── Read processed fullbody path ──────────────────────────────────────────
    from src.video.utils.asset_metadata import get_variant_value, infer_role

    role = infer_role(membership, kit_type)
    fullbody = get_variant_value(membership, role, "images", "fullbody", kit_type, "default")

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
        raise self.retry(exc=exc) from exc

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
        unique = str(_uuid.uuid4())[:8]
        upload_path = build_s3_asset_path(
            member_id=str(membership_id),
            role=role,
            asset_type="halfbody",
            kit=kit_type,
            variant="default",
            content_hash=unique,
            ext="png",
        )

        file_obj = ContentFile(halfbody_bytes, name=upload_path.rsplit("/", 1)[-1])
        storage_path = storage.save(upload_path, file_obj)
    except Exception as exc:
        logger.exception("auto_crop_halfbody: upload failed: %s", exc)
        raise self.retry(exc=exc) from exc

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


# ── Periodic cleanup: reprocess stuck/missing assets ─────────────────────────


@shared_task(
    bind=True,
    max_retries=0,
    soft_time_limit=600,
    time_limit=660,
    acks_late=True,
)
def reprocess_stuck_assets_periodic(self, *, stuck_minutes: int = 60) -> dict:
    """Periodic task to find and fix stuck/missing assets.

    Runs daily via Celery Beat. Scans all memberships for:
    1. Images stuck in 'processing' state > stuck_minutes
    2. Processed fullbodies missing closeup or halfbody crops

    For stuck images: resets to 'pending' state.
    For missing crops: queues auto_crop tasks.
    """
    from datetime import timedelta

    ProjectMembership = apps.get_model("projects", "ProjectMembership")
    stuck_threshold = timezone.now() - timedelta(minutes=stuck_minutes)

    stats = {
        "images_reset": 0,
        "videos_reset": 0,
        "closeups_queued": 0,
        "halfbodies_queued": 0,
        "members_modified": 0,
    }

    for membership in ProjectMembership.objects.all().iterator():
        meta = getattr(membership, "metadata", None) or {}
        tr = meta.get("teamreel_assets", {})
        if not tr:
            continue

        roles_data = tr.get("roles", {}) or {}
        member_changed = False

        for role_name, role_data in roles_data.items():
            if not isinstance(role_data, dict):
                continue

            # ── 1. Reset stuck images ────────────────────────────────
            for asset_type, asset_data in (role_data.get("images", {}) or {}).items():
                if not isinstance(asset_data, dict):
                    continue
                for kit_type, kit_data in asset_data.items():
                    if not isinstance(kit_data, dict):
                        continue
                    for _, variant in kit_data.items():
                        if not isinstance(variant, dict):
                            continue
                        state = variant.get("processing_state")
                        if state not in ("processing", "cancelling"):
                            continue

                        # Check threshold
                        started_at = variant.get("processing_started_at")
                        if started_at:
                            try:
                                from django.utils.dateparse import parse_datetime

                                started = parse_datetime(started_at)
                                if started and started > stuck_threshold:
                                    continue  # Still within time window
                            except (ValueError, TypeError):
                                pass

                        variant["processing_state"] = "pending"
                        variant.pop("processing_started_at", None)
                        variant.pop("cancel_requested_at", None)
                        member_changed = True
                        stats["images_reset"] += 1
                        logger.info(
                            "reprocess_stuck: reset %s.images.%s.%s for membership %s",
                            role_name,
                            asset_type,
                            kit_type,
                            membership.id,
                        )

            # ── 2. Reset stuck videos ────────────────────────────────
            for asset_type, asset_data in (role_data.get("videos", {}) or {}).items():
                if not isinstance(asset_data, dict):
                    continue
                for kit_type, kit_data in asset_data.items():
                    if not isinstance(kit_data, dict):
                        continue
                    for _, variant in kit_data.items():
                        if not isinstance(variant, dict):
                            continue
                        state = variant.get("processing_state")
                        if state not in ("processing", "cancelling"):
                            continue

                        raw_url = variant.get("raw")
                        if not raw_url:
                            variant["processing_state"] = "failed"
                            variant["error"] = "periodic_cleanup: no raw URL"
                        else:
                            variant["processing_state"] = "pending"
                            variant.pop("processing_started_at", None)
                            variant.pop("cancel_requested_at", None)
                            variant.pop("progress_frames", None)
                        member_changed = True
                        stats["videos_reset"] += 1
                        logger.info(
                            "reprocess_stuck: reset %s.videos.%s.%s for membership %s",
                            role_name,
                            asset_type,
                            kit_type,
                            membership.id,
                        )

            # ── 3. Queue missing crops ───────────────────────────────
            role_images = role_data.get("images", {}) or {}
            fullbodies = role_images.get("fullbody", {})
            if isinstance(fullbodies, dict):
                for kit_type, kit_data in fullbodies.items():
                    if not isinstance(kit_data, dict):
                        continue
                    for variant_id, fb_data in kit_data.items():
                        if not isinstance(fb_data, dict):
                            continue
                        if fb_data.get("processing_state") != "processed":
                            continue
                        if not (fb_data.get("processed") or fb_data.get("raw")):
                            continue

                        # Missing closeup?
                        closeup_kit = (role_images.get("closeup", {}) or {}).get(kit_type, {})
                        cu_data = (
                            closeup_kit.get(variant_id, {}) if isinstance(closeup_kit, dict) else {}
                        )
                        if not isinstance(cu_data, dict) or not cu_data.get("processed"):
                            try:
                                auto_crop_closeup_from_fullbody.delay(
                                    membership_id=str(membership.id),
                                    kit_type=kit_type,
                                )
                                stats["closeups_queued"] += 1
                                logger.info(
                                    "reprocess_stuck: queued closeup crop for membership=%s kit=%s",
                                    membership.id,
                                    kit_type,
                                )
                            except Exception:  # noqa: BLE001
                                logger.warning(
                                    "reprocess_stuck: failed to queue closeup crop for %s/%s",
                                    membership.id,
                                    kit_type,
                                )

                        # Missing halfbody?
                        halfbody_kit = (role_images.get("halfbody", {}) or {}).get(kit_type, {})
                        hb_data = (
                            halfbody_kit.get(variant_id, {})
                            if isinstance(halfbody_kit, dict)
                            else {}
                        )
                        if not isinstance(hb_data, dict) or not hb_data.get("processed"):
                            try:
                                auto_crop_halfbody_from_fullbody.delay(
                                    membership_id=str(membership.id),
                                    kit_type=kit_type,
                                )
                                stats["halfbodies_queued"] += 1
                                logger.info(
                                    "reprocess_stuck: queued halfbody crop "
                                    "for membership=%s kit=%s",
                                    membership.id,
                                    kit_type,
                                )
                            except Exception:  # noqa: BLE001
                                logger.warning(
                                    "reprocess_stuck: failed to queue halfbody crop for %s/%s",
                                    membership.id,
                                    kit_type,
                                )

        # Save metadata changes
        if member_changed:
            try:
                meta["teamreel_assets"] = tr
                membership.metadata = meta
                membership.save(update_fields=["metadata", "updated_at"])
                stats["members_modified"] += 1
            except Exception:  # noqa: BLE001
                logger.exception(
                    "reprocess_stuck: failed to save membership %s",
                    membership.id,
                )

    logger.info("reprocess_stuck_assets_periodic complete: %s", stats)
    return stats
