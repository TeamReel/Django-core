"""Celery task for TeamReel member asset processing.

This takes a raw member asset (image/video) and produces the standardized
"processed" variant used by the lineup composer.

It updates ProjectMembership.metadata.teamreel_assets in-place.

We keep this task intentionally narrow so it can be called from management
commands and batch tooling.
"""

from __future__ import annotations

import logging

from celery import shared_task
from django.apps import apps
from django.db import DatabaseError
from django.db import transaction
from django.utils import timezone

from src.video.services.asset_processing_specs import ProcessingState
from src.video.services.asset_processor import AssetProcessor

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

    try:
        processor = AssetProcessor()
        effective_backend = bg_removal_backend
        if not effective_backend:
            effective_backend = "rvm" if asset_type in ("intro", "celebration") else "rembg"

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
