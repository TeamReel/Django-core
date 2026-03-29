"""Backfill halfbody crops for all existing fullbody assets.

This management command iterates through all ProjectMembership records,
finds fullbody assets that don't have a corresponding halfbody, and
crops them synchronously (no Celery/Redis needed).

Usage:
    python manage.py backfill_halfbody          # dry-run
    python manage.py backfill_halfbody --apply  # actually crop & upload
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
    help = "Backfill halfbody crops from existing fullbody assets"

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            default=False,
            help="Actually crop & upload (default is dry-run)",
        )

    def handle(self, *args, **options):
        from projects.models import ProjectMembership

        apply = options["apply"]
        pairs: list[tuple] = []  # (membership, membership_id_str, kit_type)

        for m in ProjectMembership.objects.all().iterator():
            meta = m.metadata or {}
            images = meta.get("teamreel_assets", {}).get("images", {})
            fb = images.get("fullbody", {})
            hb = images.get("halfbody", {})
            if not isinstance(fb, dict):
                continue
            for kit_type, val in fb.items():
                if isinstance(val, dict) and (val.get("processed") or val.get("raw")):
                    existing_hb = hb.get(kit_type, {}) if isinstance(hb, dict) else {}
                    has_hb = isinstance(existing_hb, dict) and (
                        existing_hb.get("processed") or existing_hb.get("raw")
                    )
                    if not has_hb:
                        pairs.append((m, str(m.id), kit_type))

        self.stdout.write(f"Found {len(pairs)} fullbody assets that need halfbody crop")

        if not pairs:
            self.stdout.write(self.style.SUCCESS("Nothing to do — all halfbody assets exist"))
            return

        if not apply:
            for _m, mid, kt in pairs:
                self.stdout.write(f"  [DRY-RUN] {mid[:8]}... kit={kt}")
            self.stdout.write(
                self.style.WARNING(
                    f"\nRun with --apply to crop & upload {len(pairs)} halfbody assets"
                )
            )
            return

        # Synchronous processing (no Celery/Redis needed)
        # Use S3 directly if AWS credentials are in env (Django settings may not load them)
        import os

        import boto3
        from botocore.config import Config
        from django.core.files.base import ContentFile
        from files.utils import get_storage_backend
        from PIL import Image as PilImage

        from src.generative.views_asset import HALFBODY_OUTPUT_SIZE, _smart_crop_halfbody

        aws_key = os.environ.get("AWS_ACCESS_KEY_ID")
        aws_secret = os.environ.get("AWS_SECRET_ACCESS_KEY")
        if aws_key and aws_secret:
            bucket = os.environ.get("AWS_S3_BUCKET_NAME", "teamreel-assets-demo")
            region = os.environ.get("AWS_S3_REGION", "eu-north-1")
            s3_client = boto3.client(
                "s3",
                aws_access_key_id=aws_key,
                aws_secret_access_key=aws_secret,
                region_name=region,
                config=Config(signature_version="s3v4"),
            )
            self.stdout.write(f"Using S3 backend: bucket={bucket}, region={region}")
            use_s3 = True
        else:
            storage = get_storage_backend()
            use_s3 = False
            s3_client = None
            bucket = None
        done = 0
        failed = 0

        def _save_halfbody_metadata(membership, kit_type, storage_path):
            """Write halfbody metadata into membership.metadata (inline, no Celery import)."""
            meta = membership.metadata or {}
            tr = meta.setdefault("teamreel_assets", {})
            images = tr.setdefault("images", {})
            hb = images.setdefault("halfbody", {})
            hb[kit_type] = {
                "raw": storage_path,
                "processed": storage_path,
                "processing_state": "processed",
                "processed_at": timezone.now().isoformat(),
                "specs": {
                    "width": HALFBODY_OUTPUT_SIZE[0],
                    "height": HALFBODY_OUTPUT_SIZE[1],
                    "format": "png",
                    "bg_removed": True,
                    "source": "backfill_from_fullbody",
                },
            }
            # Update media slot
            media = tr.setdefault("media", {})
            media["halfbody"] = {"url": storage_path, "caption": ""}
            meta["teamreel_assets"] = tr
            membership.metadata = meta
            membership.save(update_fields=["metadata", "updated_at"])

        for membership, mid, kt in pairs:
            try:
                # Read fullbody source path
                meta = membership.metadata or {}
                fb_data = (
                    meta.get("teamreel_assets", {})
                    .get("images", {})
                    .get("fullbody", {})
                    .get(kt, {})
                )
                source_path = fb_data.get("processed") or fb_data.get("raw")
                if not source_path:
                    self.stdout.write(
                        self.style.WARNING(f"  [SKIP] {mid[:8]}... kit={kt}: no path")
                    )
                    continue

                # Download fullbody from storage
                if use_s3:
                    response = s3_client.get_object(Bucket=bucket, Key=source_path)
                    raw_bytes = response["Body"].read()
                else:
                    with storage.open(source_path, "rb") as fh:
                        raw_bytes = fh.read()

                # Crop halfbody
                img = PilImage.open(io.BytesIO(raw_bytes)).convert("RGBA")
                cropped = _smart_crop_halfbody(img)
                out_buf = io.BytesIO()
                cropped.save(out_buf, format="PNG", optimize=True)
                halfbody_bytes = out_buf.getvalue()

                # Upload to storage
                timestamp = timezone.now().strftime("%Y%m%d")
                unique = str(_uuid.uuid4())[:8]
                filename = f"member_halfbody_kit_type-{kt}_crop_{timestamp}_{unique}.png"
                upload_path = f"members/{mid}/generated/output/halfbody/{filename}"

                if use_s3:
                    s3_client.put_object(
                        Bucket=bucket,
                        Key=upload_path,
                        Body=halfbody_bytes,
                        ContentType="image/png",
                    )
                    storage_path = upload_path
                else:
                    file_obj = ContentFile(halfbody_bytes, name=filename)
                    storage_path = storage.save(upload_path, file_obj)

                # Write metadata
                membership.refresh_from_db()
                with transaction.atomic():
                    _save_halfbody_metadata(membership, kt, storage_path)

                done += 1
                self.stdout.write(self.style.SUCCESS(f"  [OK] {mid[:8]}... kit={kt}"))
            except Exception as exc:
                failed += 1
                self.stdout.write(self.style.ERROR(f"  [FAILED] {mid[:8]}... kit={kt}: {exc}"))

        self.stdout.write(self.style.SUCCESS(f"\nDone: {done} cropped, {failed} failed"))
