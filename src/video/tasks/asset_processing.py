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
                "rvm" if asset_type in ("intro", "celebration", "then_vs_now") else "rembg"
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
