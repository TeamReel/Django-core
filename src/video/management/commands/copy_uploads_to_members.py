"""Copy uploads from uploads/ prefix to members/{id}/uploads/ so they become
publicly accessible via the bucket policy.

Finds all memberships where metadata contains uploads/ paths
(media.legacy_photo.url, old.profile_photo_url) and:
1. Copies the S3 object to members/{member_id}/uploads/{type}_{hash}.{ext}
2. Updates metadata with the new path

Usage:
    python manage.py copy_uploads_to_members          # dry-run
    python manage.py copy_uploads_to_members --apply   # actually copy
"""
from __future__ import annotations

import hashlib
import logging
from pathlib import PurePosixPath

from django.core.management.base import BaseCommand
from django.db import transaction

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Copy uploads/ S3 objects to members/{id}/uploads/ for public access"

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            default=False,
            help="Actually copy & update (default is dry-run)",
        )

    @staticmethod
    def _short_hash(value: str) -> str:
        return hashlib.md5(value.encode()).hexdigest()[:8]

    def _find_upload_refs(self, tr: dict) -> list[tuple[str, str]]:
        """Return list of (metadata_dotpath, uploads_s3_key) from teamreel_assets."""
        refs = []
        media = tr.get("media", {}) or {}
        legacy = media.get("legacy_photo", {}) or {}
        url = legacy.get("url", "")
        if isinstance(url, str) and url.startswith("uploads/"):
            refs.append(("media.legacy_photo.url", url))

        profile = media.get("profile", {}) or {}
        purl = profile.get("url", "")
        if isinstance(purl, str) and purl.startswith("uploads/"):
            refs.append(("media.profile.url", purl))

        old = tr.get("old", {}) or {}
        ourl = old.get("profile_photo_url", "")
        if isinstance(ourl, str) and ourl.startswith("uploads/"):
            refs.append(("old.profile_photo_url", ourl))

        return refs

    @staticmethod
    def _set_nested(obj: dict, dotpath: str, value: str) -> None:
        """Set a value in a nested dict using dot notation."""
        parts = dotpath.split(".")
        for part in parts[:-1]:
            obj = obj.setdefault(part, {})
        obj[parts[-1]] = value

    def handle(self, *args, **options):
        import boto3
        from botocore.config import Config as BotoConfig
        from django.conf import settings
        from projects.models import ProjectMembership

        apply = options["apply"]

        # Build S3 client
        s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION,
            config=BotoConfig(signature_version="s3v4"),
        )
        bucket = settings.AWS_S3_BUCKET_NAME

        # Collect all memberships with uploads/ paths
        to_copy: list[dict] = []
        for m in ProjectMembership.objects.all().iterator():
            meta = m.metadata or {}
            tr = meta.get("teamreel_assets", {})
            refs = self._find_upload_refs(tr)
            if not refs:
                continue
            for dotpath, old_key in refs:
                ext = PurePosixPath(old_key).suffix or ".png"
                h = self._short_hash(old_key)
                # Derive type from dotpath: media.legacy_photo.url → legacy_photo
                asset_type = dotpath.split(".")[1] if "." in dotpath else "upload"
                new_key = f"members/{m.id}/uploads/{asset_type}_{h}{ext}"
                to_copy.append(
                    {
                        "membership": m,
                        "dotpath": dotpath,
                        "old_key": old_key,
                        "new_key": new_key,
                    }
                )

        self.stdout.write(f"Found {len(to_copy)} uploads/ references to copy")
        for entry in to_copy:
            self.stdout.write(f"  {entry['dotpath']:30s} | member={entry['membership'].id}")
            self.stdout.write(f"    FROM: {entry['old_key'][:80]}")
            self.stdout.write(f"      TO: {entry['new_key']}")

        if not to_copy:
            self.stdout.write(self.style.SUCCESS("No uploads/ paths found — nothing to do."))
            return

        if not apply:
            self.stdout.write(
                self.style.WARNING(f"\nDry-run: {len(to_copy)} copies to make. Run with --apply.")
            )
            return

        # Execute copies
        copied = 0
        skipped = 0
        errors = 0

        for entry in to_copy:
            m = entry["membership"]
            old_key = entry["old_key"]
            new_key = entry["new_key"]
            dotpath = entry["dotpath"]

            # Check source exists
            try:
                s3.head_object(Bucket=bucket, Key=old_key)
            except Exception:
                self.stdout.write(
                    self.style.WARNING(f"  SKIP {m.id}: source not found: {old_key[:60]}")
                )
                skipped += 1
                continue

            # Copy object (server-side)
            try:
                s3.copy_object(
                    Bucket=bucket,
                    Key=new_key,
                    CopySource={"Bucket": bucket, "Key": old_key},
                    MetadataDirective="COPY",
                )
            except Exception as exc:
                self.stdout.write(self.style.ERROR(f"  ERROR {m.id}: copy failed: {exc}"))
                errors += 1
                continue

            # Update metadata
            try:
                m.refresh_from_db()
                meta = m.metadata or {}
                tr = meta.setdefault("teamreel_assets", {})
                self._set_nested(tr, dotpath, new_key)
                with transaction.atomic():
                    m.save(update_fields=["metadata"])
                copied += 1
                self.stdout.write(self.style.SUCCESS(f"  OK {m.id}: {dotpath} → {new_key}"))
            except Exception as exc:
                self.stdout.write(
                    self.style.ERROR(f"  ERROR {m.id}: metadata update failed: {exc}")
                )
                errors += 1

        self.stdout.write(f"\nDone: {copied} copied, {skipped} skipped, {errors} errors")
