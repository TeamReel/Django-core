#!/usr/bin/env python
"""
Migrate existing logos to the new S3 folder structure.

Old structure: logos/clubs/{id}.png (or similar generic paths)
New structure: clubs/{slug}-{id}/logo/{filename}

This script:
1. Iterates over all BadgeAssets (type='logo' or 'logo_upload')
2. Checks current storage path
3. Copies object to new location if needed
4. Updates FileAsset record
"""

import sys
import os
import logging
import requests
import time
import mimetypes
from io import BytesIO
from pathlib import Path

# Setup Django environment
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

import django
django.setup()

from django.conf import settings
from branding.models import BrandAsset
from files.utils import get_storage_backend
from files.backends.s3 import S3StorageBackend
from botocore.exceptions import ClientError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_logos(dry_run=True):
    backend = get_storage_backend()

    if not isinstance(backend, S3StorageBackend):
        logger.error("Storage backend is not S3. This script only works with S3.")
        return

    s3_client = backend._client
    bucket_name = backend.bucket_name

    # Find logo assets hooked to a Project
    assets = BrandAsset.objects.filter(
        asset_type__in=["logo", "logo_upload"],
        profile__project__isnull=False
    ).select_related("file", "profile", "profile__project", "profile__project__parent_project")

    logger.info(f"Found {assets.count()} logo assets to check.")

    migrated_count = 0
    skipped_count = 0
    error_count = 0

    for asset in assets:
        project = asset.profile.project
        file_asset = asset.file
        old_path = file_asset.storage_path

        # Generate new path
        # Clubs: clubs/{club-slug}-{club-id}/logo/{filename}
        # Teams: clubs/{club-slug}-{club-id}/teams/{team-slug}-{team-id}/logo/{filename}

        slug = project.slug or project.name.lower().replace(" ", "-")
        # Sanitize slug
        slug = "".join(c for c in slug if c.isalnum() or c in "-").strip("-")

        if project.parent_project:
            # It's a team (child project)
            parent = project.parent_project
            parent_slug = parent.slug or parent.name.lower().replace(" ", "-")
            parent_slug = "".join(c for c in parent_slug if c.isalnum() or c in "-").strip("-")
            new_folder = f"clubs/{parent_slug}-{parent.id}/teams/{slug}-{project.id}/logo"
        else:
            # It's a club (root project)
            new_folder = f"clubs/{slug}-{project.id}/logo"

        # Keep original filename
        filename = Path(file_asset.original_name).name
        # Fallback if original_name is path or empty
        if not filename or "/" in filename:
            filename = Path(old_path).name

        new_path = f"{new_folder}/{filename}"

        if old_path == new_path:
            logger.info(f"Skipping {project.name}: already in place ({old_path})")
            skipped_count += 1
            continue

        logger.info(f"Migrating {project.name}...\n  Old: {old_path}\n  New: {new_path}")

        if dry_run:
            continue

        try:
            # 1. Copy/Upload Object
            if old_path.startswith('http://') or old_path.startswith('https://'):
                logger.info(f"  Downloading from URL: {old_path}")
                time.sleep(1) # Be polite to external servers
                headers = {'User-Agent': 'DjangoMigrationScript/1.0 (contact@teamreel.com)'}
                response = requests.get(old_path, headers=headers, timeout=10)
                if response.status_code == 200:
                    content_type = response.headers.get('Content-Type')
                    if not content_type:
                        content_type, _ = mimetypes.guess_type(filename)

                    logger.info(f"  Uploading to S3 (Size: {len(response.content)} bytes)...")
                    s3_client.put_object(
                        Bucket=bucket_name,
                        Key=new_path,
                        Body=response.content,
                        ContentType=content_type or 'application/octet-stream',
                        # ACL='public-read' # Removed
                    )
                else:
                    logger.error(f"  Failed to download: {response.status_code}")
                    error_count += 1
                    continue
            else:
                logger.info(f"  Copying object on S3...")
                s3_client.copy_object(
                    Bucket=bucket_name,
                    CopySource={'Bucket': bucket_name, 'Key': old_path},
                    Key=new_path,
                    # ACL='public-read' # Removed: Bucket does not allow ACLs
                )

            # 2. Update FileAsset
            logger.info(f"  Updating DB record...")
            file_asset.storage_path = new_path
            file_asset.save()

            # 3. (Optional) Delete old object?
            # Safer to keep for now, or maybe delete if confident.
            # Let's keep distinct old paths for now to be safe.

            migrated_count += 1
            logger.info("  Done.")

        except ClientError as e:
            if e.response['Error']['Code'] == "404":
                logger.warning(f"  Source file not found on S3: {old_path}")
            else:
                logger.error(f"  AWS Error: {e}")
            error_count += 1
        except Exception as e:
            logger.error(f"  Error migrating {project.name}: {e}")
            error_count += 1

    logger.info("-" * 40)
    logger.info(f"Migration Complete.\nMigrated: {migrated_count}\nSkipped: {skipped_count}\nErrors: {error_count}")

    if dry_run:
        logger.info("\nThis was a DRY RUN. Pass --run to execute changes.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", action="store_true", help="Execute changes")
    args = parser.parse_args()

    # Check for boto3 again here to be safe if run directly
    try:
        import boto3
    except ImportError:
        print("boto3 not installed. Please install it.")
        sys.exit(1)

    migrate_logos(dry_run=not args.run)
