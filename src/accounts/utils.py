"""Utility functions for accounts module."""

import os
from django.conf import settings


def get_avatar_url(avatar_field):
    """
    Get the full URL for a user's avatar.

    Handles both local file storage and S3 storage.
    When AWS_S3_BUCKET_NAME is configured (via env var or settings),
    constructs the full S3 URL.

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

        # Check if S3 is configured via environment variables
        bucket = os.environ.get("AWS_S3_BUCKET_NAME") or getattr(
            settings, "AWS_S3_BUCKET_NAME", None
        )
        region = os.environ.get("AWS_S3_REGION") or getattr(settings, "AWS_S3_REGION", "eu-north-1")

        if bucket:
            # S3 is configured - construct full S3 URL
            return f"https://{bucket}.s3.{region}.amazonaws.com/{avatar_name}"

        # Fallback to Django's default URL generation
        if hasattr(avatar_field, "url"):
            return avatar_field.url

        return None
    except Exception:
        return None
