"""Backfill missing closeup/halfbody crops for members that have a processed fullbody.

For every member with a valid fullbody but missing closeup or halfbody,
this command generates the crop synchronously (no Celery/Redis needed).

Usage:
    python manage.py backfill_missing_crops          # dry-run
    python manage.py backfill_missing_crops --apply  # actually crop & upload
"""
from __future__ import annotations

import io
import logging
import uuid as _uuid

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Generate missing closeup/halfbody crops from existing fullbody images"

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            default=False,
            help="Actually crop & upload (default is dry-run)",
        )

    def _find_processed_path(self, data: dict) -> str | None:
        """Return first valid processed (or raw) path from a kit-level dict."""
        if not isinstance(data, dict):
            return None
        for _, val in data.items():
            if not isinstance(val, dict):
                continue
            p = val.get("processed") or val.get("raw")
            if isinstance(p, str) and p:
                return p
        # Direct {raw, processed} at kit level
        p = data.get("processed") or data.get("raw")
        if isinstance(p, str) and p:
            return p
        return None

    def _has_valid_crop(self, images: dict, asset_type: str, kit_type: str) -> bool:
        """Check if a valid non-broken crop exists for this asset_type and kit."""
        at_data = images.get(asset_type, {})
        if not isinstance(at_data, dict):
            return False
        kit_data = at_data.get(kit_type, {})
        if not isinstance(kit_data, dict):
            return False
        # Check direct {processed} or inside variant
        p = kit_data.get("processed", "")
        if isinstance(p, str) and p and "generated/output" not in p:
            return True
        for val in kit_data.values():
            if isinstance(val, dict):
                p = val.get("processed", "")
                if isinstance(p, str) and p and "generated/output" not in p:
                    return True
        return False

    def handle(self, *args, **options):
        from django.core.files.base import ContentFile
        from files.utils import get_storage_backend
        from PIL import Image as PilImage
        from projects.models import ProjectMembership

        from src.generative.views_asset import (
            CLOSEUP_OUTPUT_SIZE,
            HALFBODY_OUTPUT_SIZE,
            _smart_crop_closeup,
            _smart_crop_halfbody,
        )
        from src.video.services.asset_processing_specs import ProcessingState
        from src.video.tasks.asset_processing import _update_variant_metadata
        from src.video.utils.asset_metadata import (
            build_s3_asset_path,
            infer_role,
        )

        apply = options["apply"]
        storage = get_storage_backend() if apply else None

        missing: list[dict] = []

        for m in ProjectMembership.objects.all().iterator():
            meta = m.metadata or {}
            tr = meta.get("teamreel_assets", {})
            images = tr.get("images", {}) or {}

            # Find fullbody kits with valid processed path
            fb_data = images.get("fullbody", {})
            if not isinstance(fb_data, dict):
                continue

            for kit_type, kit_data in fb_data.items():
                if not isinstance(kit_data, dict):
                    continue

                source_path = kit_data.get("processed") or kit_data.get("raw")
                if not isinstance(source_path, str) or not source_path:
                    continue
                if "generated/output" in source_path:
                    continue  # broken fullbody — skip

                role = infer_role(m, kit_type)

                for asset_type in ("closeup", "halfbody"):
                    if not self._has_valid_crop(images, asset_type, kit_type):
                        missing.append(
                            {
                                "membership": m,
                                "role": role,
                                "asset_type": asset_type,
                                "kit_type": kit_type,
                                "fullbody_path": source_path,
                            }
                        )

        self.stdout.write(f"Found {len(missing)} missing crops")
        for entry in missing:
            self.stdout.write(
                f"  {entry['asset_type']:10s} | kit={entry['kit_type']:12s} | "
                f"member={entry['membership'].id}"
            )

        if not missing:
            self.stdout.write(self.style.SUCCESS("All members have complete crops!"))
            return

        if not apply:
            self.stdout.write(
                self.style.WARNING(
                    f"\nDry-run: {len(missing)} crops to generate. Run with --apply."
                )
            )
            return

        generated = 0
        errors = 0

        for entry in missing:
            m = entry["membership"]
            role = entry["role"]
            asset_type = entry["asset_type"]
            kit_type = entry["kit_type"]
            source_path = entry["fullbody_path"]

            # Download fullbody
            try:
                with storage.open(source_path, "rb") as fh:
                    raw_bytes = fh.read()
            except Exception as exc:
                self.stdout.write(
                    self.style.ERROR(f"  SKIP {asset_type} for {m.id}: download failed: {exc}")
                )
                errors += 1
                continue

            # Crop
            try:
                img = PilImage.open(io.BytesIO(raw_bytes)).convert("RGBA")
                if asset_type == "closeup":
                    cropped = _smart_crop_closeup(img)
                    output_size = CLOSEUP_OUTPUT_SIZE
                else:
                    cropped = _smart_crop_halfbody(img)
                    output_size = HALFBODY_OUTPUT_SIZE

                out_buf = io.BytesIO()
                cropped.save(out_buf, format="PNG", optimize=True)
                crop_bytes = out_buf.getvalue()
            except Exception as exc:
                self.stdout.write(
                    self.style.ERROR(f"  SKIP {asset_type} for {m.id}: crop failed: {exc}")
                )
                errors += 1
                continue

            # Upload
            try:
                unique = str(_uuid.uuid4())[:8]
                upload_path = build_s3_asset_path(
                    member_id=str(m.id),
                    role=role,
                    asset_type=asset_type,
                    kit=kit_type,
                    variant="default",
                    content_hash=unique,
                    ext="png",
                )
                file_obj = ContentFile(crop_bytes, name=upload_path.rsplit("/", 1)[-1])
                storage_path = storage.save(upload_path, file_obj)
            except Exception as exc:
                self.stdout.write(
                    self.style.ERROR(f"  SKIP {asset_type} for {m.id}: upload failed: {exc}")
                )
                errors += 1
                continue

            # Update metadata
            try:
                m.refresh_from_db()
                new_variant = {
                    "raw": storage_path,
                    "processed": storage_path,
                    "processing_state": ProcessingState.PROCESSED.value,
                    "processed_at": timezone.now().isoformat(),
                    "specs": {
                        "width": output_size[0],
                        "height": output_size[1],
                        "format": "png",
                        "bg_removed": True,
                        "source": "backfill_missing_crops",
                    },
                }
                with transaction.atomic():
                    _update_variant_metadata(
                        m,
                        asset_type=asset_type,
                        kit_type=kit_type,
                        variant_id=None,
                        variant_value=new_variant,
                    )
                    # Update flat images structure
                    meta = m.metadata or {}
                    tr = meta.setdefault("teamreel_assets", {})
                    images = tr.setdefault("images", {})
                    at_data = images.setdefault(asset_type, {})
                    at_data[kit_type] = new_variant
                    images[asset_type] = at_data
                    # Update media aliases
                    media = tr.setdefault("media", {})
                    media[asset_type] = {"url": storage_path}
                    m.save(update_fields=["metadata"])

                generated += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  OK {asset_type} for {m.id} kit={kit_type} -> {storage_path}"
                    )
                )
            except Exception as exc:
                self.stdout.write(
                    self.style.ERROR(f"  SKIP {asset_type} for {m.id}: metadata save failed: {exc}")
                )
                errors += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone: {generated} generated, {errors} errors out of {len(missing)} total"
            )
        )
