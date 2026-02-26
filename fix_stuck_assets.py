"""Fix stuck assets for the Helden 6 project.

Synchronous script (no Celery needed) that:
1. Fixes fullbodies stuck in "processing" (copies raw→processed for AI images)
2. Creates missing closeup/halfbody crops from processed fullbodies
3. Resets stuck video states to "failed" (videos need Railway Celery workers)

Usage:
    # Dry-run
    python fix_stuck_assets.py

    # Apply
    python fix_stuck_assets.py --apply
"""
from __future__ import annotations

import io
import os
import sys
import uuid as _uuid

# Django setup
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
base_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, base_dir)
sys.path.insert(0, os.path.join(base_dir, "src"))

import django
django.setup()

from django.db import transaction
from django.utils import timezone

# ── Config ────────────────────────────────────────────────────────────────
PROJECT_SLUG = "helden-6"
APPLY = "--apply" in sys.argv


def main():
    import boto3
    from botocore.config import Config
    from PIL import Image as PilImage
    from projects.models import ProjectMembership
    from src.generative.views_asset import (
        CLOSEUP_OUTPUT_SIZE,
        HALFBODY_OUTPUT_SIZE,
        _smart_crop_closeup,
        _smart_crop_halfbody,
    )

    # S3 setup
    aws_key = os.environ.get("AWS_ACCESS_KEY_ID")
    aws_secret = os.environ.get("AWS_SECRET_ACCESS_KEY")
    bucket = os.environ.get("AWS_S3_BUCKET_NAME", "teamreel-assets-demo")
    region = os.environ.get("AWS_S3_REGION", "eu-north-1")

    if not aws_key or not aws_secret:
        print("ERROR: Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY env vars")
        sys.exit(1)

    s3 = boto3.client(
        "s3",
        aws_access_key_id=aws_key,
        aws_secret_access_key=aws_secret,
        region_name=region,
        config=Config(signature_version="s3v4"),
    )

    print(f"S3 bucket={bucket}, region={region}")
    print(f"Mode: {'APPLY' if APPLY else 'DRY RUN'}")
    print(f"Project: {PROJECT_SLUG}")
    print("=" * 60)

    memberships = ProjectMembership.objects.select_related(
        "project", "user"
    ).filter(project__slug=PROJECT_SLUG)

    stats = {
        "fullbodies_fixed": 0,
        "closeups_created": 0,
        "halfbodies_created": 0,
        "videos_reset": 0,
    }

    for membership in memberships:
        meta = membership.metadata or {}
        tr = meta.get("teamreel_assets", {})
        if not tr:
            continue

        name = f"{membership.user.first_name} {membership.user.last_name}" if membership.user else str(membership.id)
        member_changed = False

        images = tr.get("images", {})

        # ── 1. Fix stuck fullbodies ──────────────────────────────────
        fullbodies = images.get("fullbody", {})
        if isinstance(fullbodies, dict):
            for kit_type, fb_data in list(fullbodies.items()):
                if not isinstance(fb_data, dict):
                    continue
                state = fb_data.get("processing_state")
                raw_url = fb_data.get("raw")
                processed_url = fb_data.get("processed")

                if state in ("processing", "pending", "failed") and raw_url and not processed_url:
                    print(f"  [{name}] fullbody/{kit_type}: STUCK ({state})")

                    if APPLY:
                        try:
                            # Download raw
                            response = s3.get_object(Bucket=bucket, Key=raw_url)
                            raw_bytes = response["Body"].read()

                            # AI-generated images already have transparent bg
                            # Just re-upload as "processed"
                            unique = str(_uuid.uuid4())[:8]
                            processed_key = f"members/{membership.id}/processed/fullbody/{kit_type}_{unique}.png"

                            s3.put_object(
                                Bucket=bucket,
                                Key=processed_key,
                                Body=raw_bytes,
                                ContentType="image/png",
                            )

                            # Update metadata
                            fb_data["processed"] = processed_key
                            fb_data["processing_state"] = "processed"
                            fb_data["processed_at"] = timezone.now().isoformat()
                            fb_data["specs"] = {
                                "width": 1080,
                                "height": 1920,
                                "format": "png",
                                "bg_removed": True,
                            }
                            fb_data.pop("processing_started_at", None)
                            fb_data.pop("error", None)

                            # Update media.fullbody and media.kit
                            media = tr.setdefault("media", {})
                            media["fullbody"] = {"url": processed_key}
                            media["kit"] = {"url": processed_key}

                            member_changed = True
                            stats["fullbodies_fixed"] += 1
                            print(f"    -> Fixed: {processed_key}")
                        except Exception as exc:
                            print(f"    X Failed: {exc}")
                    else:
                        stats["fullbodies_fixed"] += 1

        # ── 2. Create missing closeup from processed fullbody ────────
        fullbodies = images.get("fullbody", {})
        closeups = images.setdefault("closeup", {})

        if isinstance(fullbodies, dict):
            for kit_type, fb_data in fullbodies.items():
                if not isinstance(fb_data, dict):
                    continue
                if fb_data.get("processing_state") != "processed":
                    continue
                source_path = fb_data.get("processed") or fb_data.get("raw")
                if not source_path:
                    continue

                # Check if closeup already exists
                cu_data = closeups.get(kit_type, {}) if isinstance(closeups, dict) else {}
                if isinstance(cu_data, dict) and cu_data.get("processed"):
                    continue

                print(f"  [{name}] MISSING closeup/{kit_type}")

                if APPLY:
                    try:
                        # Download fullbody
                        response = s3.get_object(Bucket=bucket, Key=source_path)
                        raw_bytes = response["Body"].read()

                        # Crop closeup
                        img = PilImage.open(io.BytesIO(raw_bytes)).convert("RGBA")
                        cropped = _smart_crop_closeup(img)
                        out_buf = io.BytesIO()
                        cropped.save(out_buf, format="PNG", optimize=True)
                        closeup_bytes = out_buf.getvalue()

                        # Upload
                        timestamp = timezone.now().strftime("%Y%m%d")
                        unique = str(_uuid.uuid4())[:8]
                        filename = f"member_closeup_kit_type-{kit_type}_crop_{timestamp}_{unique}.png"
                        upload_path = f"members/{membership.id}/generated/output/closeup/{filename}"

                        s3.put_object(
                            Bucket=bucket,
                            Key=upload_path,
                            Body=closeup_bytes,
                            ContentType="image/png",
                        )

                        # Write metadata
                        closeups[kit_type] = {
                            "raw": upload_path,
                            "processed": upload_path,
                            "processing_state": "processed",
                            "processed_at": timezone.now().isoformat(),
                            "specs": {
                                "width": CLOSEUP_OUTPUT_SIZE[0],
                                "height": CLOSEUP_OUTPUT_SIZE[1],
                                "format": "png",
                                "bg_removed": True,
                                "source": "fix_script_crop_from_fullbody",
                            },
                        }
                        media = tr.setdefault("media", {})
                        media["closeup"] = {"url": upload_path, "caption": ""}

                        member_changed = True
                        stats["closeups_created"] += 1
                        print(f"    -> Created: {upload_path}")
                    except Exception as exc:
                        print(f"    X Failed: {exc}")
                else:
                    stats["closeups_created"] += 1

        # ── 3. Create missing halfbody from processed fullbody ───────
        halfbodies = images.setdefault("halfbody", {})

        if isinstance(fullbodies, dict):
            for kit_type, fb_data in fullbodies.items():
                if not isinstance(fb_data, dict):
                    continue
                if fb_data.get("processing_state") != "processed":
                    continue
                source_path = fb_data.get("processed") or fb_data.get("raw")
                if not source_path:
                    continue

                # Check if halfbody already exists
                hb_data = halfbodies.get(kit_type, {}) if isinstance(halfbodies, dict) else {}
                if isinstance(hb_data, dict) and hb_data.get("processed"):
                    continue

                print(f"  [{name}] MISSING halfbody/{kit_type}")

                if APPLY:
                    try:
                        # Download fullbody
                        response = s3.get_object(Bucket=bucket, Key=source_path)
                        raw_bytes = response["Body"].read()

                        # Crop halfbody
                        img = PilImage.open(io.BytesIO(raw_bytes)).convert("RGBA")
                        cropped = _smart_crop_halfbody(img)
                        out_buf = io.BytesIO()
                        cropped.save(out_buf, format="PNG", optimize=True)
                        halfbody_bytes = out_buf.getvalue()

                        # Upload
                        timestamp = timezone.now().strftime("%Y%m%d")
                        unique = str(_uuid.uuid4())[:8]
                        filename = f"member_halfbody_kit_type-{kit_type}_crop_{timestamp}_{unique}.png"
                        upload_path = f"members/{membership.id}/generated/output/halfbody/{filename}"

                        s3.put_object(
                            Bucket=bucket,
                            Key=upload_path,
                            Body=halfbody_bytes,
                            ContentType="image/png",
                        )

                        # Write metadata
                        halfbodies[kit_type] = {
                            "raw": upload_path,
                            "processed": upload_path,
                            "processing_state": "processed",
                            "processed_at": timezone.now().isoformat(),
                            "specs": {
                                "width": HALFBODY_OUTPUT_SIZE[0],
                                "height": HALFBODY_OUTPUT_SIZE[1],
                                "format": "png",
                                "bg_removed": True,
                                "source": "fix_script_crop_from_fullbody",
                            },
                        }
                        media = tr.setdefault("media", {})
                        media["halfbody"] = {"url": upload_path, "caption": ""}

                        member_changed = True
                        stats["halfbodies_created"] += 1
                        print(f"    -> Created: {upload_path}")
                    except Exception as exc:
                        print(f"    X Failed: {exc}")
                else:
                    stats["halfbodies_created"] += 1

        # ── 4. Reset stuck videos ────────────────────────────────────
        videos = tr.get("videos", {})
        if isinstance(videos, dict):
            for asset_type in list(videos.keys()):
                variants = videos.get(asset_type, {})
                if not isinstance(variants, dict):
                    continue
                for variant_key, variant in list(variants.items()):
                    if not isinstance(variant, dict):
                        continue
                    state = variant.get("processing_state")
                    raw_url = variant.get("raw")

                    if state in ("processing", "cancelling"):
                        print(f"  [{name}] videos.{asset_type}.{variant_key}: STUCK ({state})")

                        if APPLY:
                            if not raw_url:
                                # No raw URL → mark as failed
                                variant["processing_state"] = "failed"
                                variant["error"] = "fix_script: no raw URL available"
                            else:
                                # Reset to pending so it can be retried via Celery
                                variant["processing_state"] = "pending"
                                variant.pop("processing_started_at", None)
                                variant.pop("cancel_requested_at", None)
                                variant.pop("progress_frames", None)
                            member_changed = True

                        stats["videos_reset"] += 1

        # ── Save changes ─────────────────────────────────────────────
        if member_changed and APPLY:
            meta["teamreel_assets"] = tr
            membership.metadata = meta
            with transaction.atomic():
                membership.save(update_fields=["metadata", "updated_at"])
            print(f"  OK: Saved {name}")

    # Summary
    print()
    print("=" * 60)
    print(f"Summary ({'APPLIED' if APPLY else 'DRY RUN'}):")
    print(f"  Fullbodies fixed:     {stats['fullbodies_fixed']}")
    print(f"  Closeups created:     {stats['closeups_created']}")
    print(f"  Halfbodies created:   {stats['halfbodies_created']}")
    print(f"  Videos reset:         {stats['videos_reset']}")
    print("=" * 60)

    if not APPLY and any(v > 0 for v in stats.values()):
        print("\nRun with --apply to actually fix these assets")


if __name__ == "__main__":
    main()
