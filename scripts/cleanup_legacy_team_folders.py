#!/usr/bin/env python
"""
Cleanup legacy team folders in S3.

Detects folders in the root `clubs/` directory that belong to Teams (projects with a parent).
These should have been moved to `clubs/{club}/teams/{team}/`.
Verifies that the file is NOT currently referenced in the database before deleting.
"""

import sys
import os
import re
import logging
from pathlib import Path

# Setup Django environment
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

import django
django.setup()

from django.conf import settings
from projects.models import Project
from files.models import FileAsset
from files.utils import get_storage_backend
from files.backends.s3 import S3StorageBackend
from botocore.exceptions import ClientError

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

def cleanup_legacy_folders(dry_run=True):
    backend = get_storage_backend()

    if not isinstance(backend, S3StorageBackend):
        logger.error("Storage backend is not S3.")
        return

    s3_client = backend._client
    bucket_name = backend.bucket_name

    logger.info(f"Scanning bucket: {bucket_name}")
    logger.info(f"Mode: {'DRY RUN (no deletions)' if dry_run else 'LIVE (will delete)'}")
    logger.info("-" * 40)

    paginator = s3_client.get_paginator('list_objects_v2')
    pages = paginator.paginate(Bucket=bucket_name, Prefix='clubs/')

    # Regex to capture top-level logo files: clubs/{slug}-{id}/logo/{filename}
    # It explicitly ensures there's no "/teams/" in the path by matching strictly
    # ^clubs/ [segment] /logo/ [filename]
    pattern = re.compile(r'^clubs/([^/]+)-(\d+)/logo/(.+)$')

    deletion_candidates = []

    # Cache projects to avoid thousands of DB queries
    # Map ID -> is_team (bool)
    project_cache = {}

    def is_team(proj_id):
        if proj_id in project_cache:
            return project_cache[proj_id]
        try:
            p = Project.objects.get(id=proj_id)
            is_t = p.parent_project_id is not None
            project_cache[proj_id] = is_t
            return is_t
        except Project.DoesNotExist:
            logger.warning(f"Project ID {proj_id} not found in DB.")
            project_cache[proj_id] = False # Treat as not-team (safe)? Or delete? Safe for now.
            return False

    processed_count = 0

    for page in pages:
        if 'Contents' not in page:
            continue

        for obj in page['Contents']:
            key = obj['Key']
            processed_count += 1

            # Skip if it is already in the new 'teams' structure
            if '/teams/' in key:
                continue

            match = pattern.match(key)
            if match:
                slug_part = match.group(1)
                proj_id = int(match.group(2))
                filename = match.group(3)

                if is_team(proj_id):
                    # It's a team, but it's in the root `clubs/` folder.
                    # This is a legacy path.

                    # Double check DB usage
                    if FileAsset.objects.filter(storage_path=key).exists():
                        logger.warning(f"SKIP (In Use): {key} - Project is Team, but DB still points here!")
                    else:
                        deletion_candidates.append(key)
                        logger.info(f"DELETE CANDIDATE: {key} (Team ID: {proj_id})")

            # Special case for reported 'clubs/ajax-ajax/' artifact
            if 'clubs/ajax-ajax/' in key:
                 if FileAsset.objects.filter(storage_path=key).exists():
                     logger.warning(f"SKIP (In Use): {key} (ajax-ajax artifact)")
                 else:
                     deletion_candidates.append(key)
                     logger.info(f"DELETE CANDIDATE: {key} (Legacy 'ajax-ajax' artifact)")

    logger.info("-" * 40)
    logger.info(f"Scanned {processed_count} objects.")
    logger.info(f"Found {len(deletion_candidates)} legacy artifacts.")

    if not deletion_candidates:
        return

    if dry_run:
        logger.info("Run with --run to execute deletions.")
        return

    # Execute Deletions
    logger.info("Deleting objects...")

    # Delete in batches of 1000 (S3 limit for delete_objects is 1000)
    batch_size = 1000
    for i in range(0, len(deletion_candidates), batch_size):
        batch = deletion_candidates[i:i + batch_size]
        objects_to_delete = [{'Key': k} for k in batch]

        try:
            response = s3_client.delete_objects(
                Bucket=bucket_name,
                Delete={'Objects': objects_to_delete}
            )
            deleted = response.get('Deleted', [])
            errors = response.get('Errors', [])

            logger.info(f"Deleted {len(deleted)} objects.")
            if errors:
                for err in errors:
                    logger.error(f"Failed to delete {err['Key']}: {err['Code']} - {err['Message']}")

        except ClientError as e:
            logger.error(f"ClientError: {e}")

    logger.info("Cleanup complete.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", action="store_true", help="Execute deletions")
    args = parser.parse_args()

    cleanup_legacy_folders(dry_run=not args.run)
