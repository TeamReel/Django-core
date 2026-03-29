"""One-off command to reprocess closeup/halfbody crops with broken S3 paths.

These were generated with a `generated/output/` prefix that is not publicly
accessible. This command clears those entries and re-runs the crop tasks
synchronously (no Celery/Redis needed).

Usage:
    python manage.py reprocess_broken_crops          # dry-run
    python manage.py reprocess_broken_crops --apply  # actually re-crop
"""
from __future__ import annotations

import io
import logging
import uuid as _uuid

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

BROKEN_PREFIX = "generated/output/"


class Command(BaseCommand):
    help = "Reprocess closeup/halfbody crops that have broken generated/output/ S3 paths"

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            default=False,
            help="Actually re-crop & upload (default is dry-run)",
        )

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
            get_variant_value,
            infer_role,
        )

        apply = options["apply"]
        storage = get_storage_backend() if apply else None

        broken: list[dict] = []

        for m in ProjectMembership.objects.all().iterator():
            meta = m.metadata or {}
            tr = meta.get("teamreel_assets", {})

            # ── Scan roles-based structure ──
            roles_data = tr.get("roles", {}) or {}
            for role_name, role_data in roles_data.items():
                if not isinstance(role_data, dict):
                    continue
                role_images = role_data.get("images", {}) or {}

                for asset_type in ("closeup", "halfbody"):
                    asset_data = role_images.get(asset_type, {})
                    if not isinstance(asset_data, dict):
                        continue
                    for kit_type, kit_data in asset_data.items():
                        if not isinstance(kit_data, dict):
                            continue
                        for variant_id, variant in kit_data.items():
                            if not isinstance(variant, dict):
                                continue
                            processed = variant.get("processed", "")
                            if isinstance(processed, str) and BROKEN_PREFIX in processed:
                                broken.append(
                                    {
                                        "membership": m,
                                        "role": role_name,
                                        "asset_type": asset_type,
                                        "kit_type": kit_type,
                                        "variant_id": variant_id,
                                        "broken_path": processed,
                                        "format": "roles",
                                    }
                                )

            # ── Scan nested images structure (images.closeup.home.{processed}) ──
            nested_images = tr.get("images", {}) or {}
            for asset_type in ("closeup", "halfbody"):
                at_data = nested_images.get(asset_type, {})
                if not isinstance(at_data, dict):
                    continue
                for kit_type, kit_data in at_data.items():
                    if not isinstance(kit_data, dict):
                        continue
                    # Direct {raw, processed} at kit level
                    processed = kit_data.get("processed", "")
                    if isinstance(processed, str) and BROKEN_PREFIX in processed:
                        broken.append(
                            {
                                "membership": m,
                                "role": infer_role(m, kit_type),
                                "asset_type": asset_type,
                                "kit_type": kit_type,
                                "variant_id": "default",
                                "broken_path": processed,
                                "format": "nested",
                            }
                        )
                        continue
                    # Variant level: images.closeup.home.default.{processed}
                    for variant_id, variant in kit_data.items():
                        if not isinstance(variant, dict):
                            continue
                        processed = variant.get("processed", "")
                        if isinstance(processed, str) and BROKEN_PREFIX in processed:
                            broken.append(
                                {
                                    "membership": m,
                                    "role": infer_role(m, kit_type),
                                    "asset_type": asset_type,
                                    "kit_type": kit_type,
                                    "variant_id": variant_id,
                                    "broken_path": processed,
                                    "format": "nested-variant",
                                }
                            )

        self.stdout.write(f"Found {len(broken)} broken crop paths")

        if not broken:
            self.stdout.write(self.style.SUCCESS("Nothing to fix!"))
            return

        for entry in broken:
            self.stdout.write(
                f"  {entry['asset_type']:10s} | kit={entry['kit_type']:12s} | "
                f"role={entry['role']:10s} | member={entry['membership'].id} | "
                f"path={entry['broken_path'][:60]}..."
            )

        if not apply:
            self.stdout.write(
                self.style.WARNING(
                    f"\nDry-run: {len(broken)} crops need fixing. Run with --apply to fix."
                )
            )
            return

        fixed = 0
        errors = 0

        for entry in broken:
            m = entry["membership"]
            role = entry["role"]
            asset_type = entry["asset_type"]
            kit_type = entry["kit_type"]

            # Get fullbody source — try roles structure first, then flat
            fullbody = get_variant_value(m, role, "images", "fullbody", kit_type, "default")
            if not isinstance(fullbody, dict):
                # Try flat images.fullbody.{kit}
                tr = (m.metadata or {}).get("teamreel_assets", {})
                flat_fb = tr.get("images", {}).get("fullbody", {}).get(kit_type, {})
                if isinstance(flat_fb, dict) and (flat_fb.get("processed") or flat_fb.get("raw")):
                    fullbody = flat_fb

            if not isinstance(fullbody, dict):
                self.stdout.write(
                    self.style.ERROR(
                        f"  SKIP {asset_type} for {m.id} kit={kit_type}: no fullbody data"
                    )
                )
                errors += 1
                continue

            source_path = fullbody.get("processed") or fullbody.get("raw")
            if not source_path:
                self.stdout.write(
                    self.style.ERROR(
                        f"  SKIP {asset_type} for {m.id} kit={kit_type}: no fullbody path"
                    )
                )
                errors += 1
                continue

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

            # Upload to correct path
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
                        "source": "reprocess_broken_crops",
                    },
                }
                with transaction.atomic():
                    # Update roles-based structure
                    _update_variant_metadata(
                        m,
                        asset_type=asset_type,
                        kit_type=kit_type,
                        variant_id=None,
                        variant_value=new_variant,
                    )
                    # Also update flat images structure if it exists
                    meta = m.metadata or {}
                    tr = meta.setdefault("teamreel_assets", {})
                    images = tr.setdefault("images", {})
                    at_data = images.get(asset_type, {})
                    if isinstance(at_data, dict) and kit_type in at_data:
                        at_data[kit_type] = new_variant
                        images[asset_type] = at_data
                    # Also update media aliases
                    media = tr.setdefault("media", {})
                    media[asset_type] = {"url": storage_path}
                    m.save(update_fields=["metadata"])
                fixed += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  FIXED {asset_type} for {m.id} kit={kit_type} → {storage_path}"
                    )
                )
            except Exception as exc:
                self.stdout.write(
                    self.style.ERROR(f"  SKIP {asset_type} for {m.id}: metadata save failed: {exc}")
                )
                errors += 1

        self.stdout.write(
            self.style.SUCCESS(f"\nDone: {fixed} fixed, {errors} errors out of {len(broken)} total")
        )
