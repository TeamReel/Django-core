"""Utility functions for accounts module."""

import logging
import os

from django.conf import settings

logger = logging.getLogger(__name__)


def sync_avatar_to_memberships(user) -> int:
    """Sync User.avatar path to all active ProjectMembership metadata.

    Writes the raw S3 path into ``metadata.teamreel_assets.media.profile.url``
    so the frontend can resolve it via ``getAssetUrl()``.

    Returns the number of memberships updated.
    """
    from projects.models import ProjectMembership

    avatar_name = getattr(user.avatar, "name", None) if user.avatar else None
    if not avatar_name:
        return 0

    memberships = ProjectMembership.objects.filter(
        user=user,
        deleted_at__isnull=True,
    )

    updated = 0
    for m in memberships:
        meta = m.metadata or {}
        tr = meta.get("teamreel_assets")
        if tr is None:
            continue
        media = tr.setdefault("media", {})
        profile = media.setdefault("profile", {})
        if profile.get("url") == avatar_name:
            continue
        profile["url"] = avatar_name
        m.metadata = meta
        m.save(update_fields=["metadata"])
        updated += 1

    if updated:
        logger.info(
            "Synced avatar to %d membership(s) for user %s",
            updated,
            user.id,
        )
    return updated


def get_avatar_url(avatar_field):
    """
    Get the full URL for a user's avatar.

    Handles both local file storage and S3 storage.
    When AWS credentials are configured, generates a presigned S3 URL
    to work with buckets that have Block Public Access enabled.

    Args:
        avatar_field: Django ImageField/FileField or string path

    Returns:
        str: Full URL to the avatar, or None if no avatar
    """
    if not avatar_field:
        return None

    try:
        # Get the avatar path/name
        avatar_name = avatar_field.name if hasattr(avatar_field, "name") else str(avatar_field)
        if not avatar_name:
            return None

        # Use the files storage backend for presigned URL generation
        # This respects the configured storage (S3, local, etc.)
        bucket = os.environ.get("AWS_S3_BUCKET_NAME") or getattr(
            settings, "AWS_S3_BUCKET_NAME", None
        )

        if bucket:
            try:
                from files.utils import get_storage_backend

                backend = get_storage_backend()
                return backend.get_url(avatar_name, signed=True, expiry_seconds=86400)
            except Exception:
                # Fallback to raw URL if presigned generation fails
                region = os.environ.get("AWS_S3_REGION") or getattr(
                    settings, "AWS_S3_REGION", "eu-north-1"
                )
                return f"https://{bucket}.s3.{region}.amazonaws.com/{avatar_name}"

        # Fallback to Django's default URL generation
        if hasattr(avatar_field, "url"):
            return avatar_field.url

        return None
    except Exception:
        return None
