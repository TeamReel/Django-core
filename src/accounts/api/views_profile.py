"""User profile views — update profile, change password, avatar management."""
from __future__ import annotations

import logging

from accounts.models import User
from accounts.serializers import UserListSerializer
from audit.api import audit_log
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

logger = logging.getLogger(__name__)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """
    Update authenticated user's profile.

    Request Body:
        {
            "first_name": str (optional),
            "last_name": str (optional),
            "email": str (optional),
            "two_factor_enabled": bool (optional),
            "current_password": str (required for verification)
        }

    Returns:
        200 OK: Updated user profile
        400 Bad Request: Validation errors (B13 envelope)
        401 Unauthorized: Session expired
    """
    if not request.user.is_authenticated:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "not_authenticated",
                    "message": "Authentication credentials were not provided.",
                    "details": {},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    user = request.user
    data = request.data

    # Validate current_password (required for security)
    current_password = data.get("current_password")
    if not current_password:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "validation_error",
                    "message": "Current password is required",
                    "details": {"current_password": ["This field is required"]},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not user.check_password(current_password):
        # Generic error to prevent password guessing
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "authentication_failed",
                    "message": "Unable to verify credentials.",
                    "details": {},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Update fields if provided
    errors = {}
    has_update_fields = False

    first_name = data.get("first_name")
    if first_name is not None:
        has_update_fields = True
        if not first_name.strip():
            errors["first_name"] = ["First name cannot be empty"]
        elif len(first_name) > 150:
            errors["first_name"] = ["First name must be 150 characters or fewer"]
        else:
            user.first_name = first_name.strip()

    last_name = data.get("last_name")
    if last_name is not None:
        has_update_fields = True
        if not last_name.strip():
            errors["last_name"] = ["Last name cannot be empty"]
        elif len(last_name) > 150:
            errors["last_name"] = ["Last name must be 150 characters or fewer"]
        else:
            user.last_name = last_name.strip()

    email = data.get("email")
    if email is not None:
        has_update_fields = True
        email_value = str(email).strip().lower()
        if not email_value:
            errors["email"] = ["Email cannot be empty"]
        elif len(email_value) > 254:
            errors["email"] = ["Email must be 254 characters or fewer"]
        else:
            # Enforce uniqueness
            if User.objects.filter(email__iexact=email_value).exclude(pk=user.pk).exists():
                errors["email"] = ["A user with that email already exists"]
            else:
                user.email = email_value

    two_factor_enabled = data.get("two_factor_enabled")
    if two_factor_enabled is not None:
        has_update_fields = True
        user.two_factor_enabled = bool(two_factor_enabled)

    # Check if at least one field was provided
    if not has_update_fields:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "validation_error",
                    "message": "At least one field must be provided to update.",
                    "details": {},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if errors:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "validation_error",
                    "message": "Validation failed",
                    "details": errors,
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Save updates
    user.save()

    # Return updated profile (same format as /auth/me)
    serializer = UserListSerializer(user)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Change the authenticated user's password.

    Request Body:
        {
            "current_password": str (required),
            "new_password": str (required),
            "new_password_confirm": str (required)
        }
    """
    if not request.user.is_authenticated:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "not_authenticated",
                    "message": "Authentication credentials were not provided.",
                    "details": {},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    user = request.user
    data = request.data or {}

    current_password = data.get("current_password")
    new_password = data.get("new_password")
    new_password_confirm = data.get("new_password_confirm")

    errors: dict[str, list[str]] = {}

    if not current_password:
        errors["current_password"] = ["This field is required"]
    if not new_password:
        errors["new_password"] = ["This field is required"]
    if not new_password_confirm:
        errors["new_password_confirm"] = ["This field is required"]

    if errors:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "validation_error",
                    "message": "Validation failed",
                    "details": errors,
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not user.check_password(current_password):
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "authentication_failed",
                    "message": "Unable to verify credentials.",
                    "details": {},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if str(new_password) != str(new_password_confirm):
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "validation_error",
                    "message": "Validation failed",
                    "details": {"new_password": ["Passwords do not match."]},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    from django.contrib.auth import update_session_auth_hash
    from django.contrib.auth.password_validation import validate_password

    try:
        validate_password(str(new_password), user=user)
    except Exception as exc:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "validation_error",
                    "message": "Validation failed",
                    "details": {"new_password": [str(exc)]},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.set_password(str(new_password))
    user.save(update_fields=["password"])
    update_session_auth_hash(request, user)
    audit_log.record("auth.password_changed", user=user, request=request)

    serializer = UserListSerializer(user)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def update_avatar(request):
    """Upload/update the authenticated user's avatar image."""

    if not request.user.is_authenticated:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "not_authenticated",
                    "message": "Authentication credentials were not provided.",
                    "details": {},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    user = request.user
    file_obj = (request.FILES or {}).get("avatar")
    if not file_obj:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "validation_error",
                    "message": "Validation failed",
                    "details": {"avatar": ["This field is required"]},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    content_type = getattr(file_obj, "content_type", "") or ""
    if not content_type.startswith("image/"):
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "validation_error",
                    "message": "Validation failed",
                    "details": {"avatar": ["Avatar must be an image"]},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Some clients/browsers may provide a path-like name (e.g. C:\fakepath\avatar.png).
    # Sanitise to a safe basename to prevent storage/path errors.
    try:
        import os

        original_name = str(getattr(file_obj, "name", "") or "").strip()
        safe_name = os.path.basename(original_name.replace("\\", "/"))
        safe_name = safe_name or "avatar"
        file_obj.name = safe_name
    except Exception:
        # If sanitisation fails, continue with storage's default handling.
        logger.debug("Avatar filename sanitisation failed", exc_info=True)

    # Save avatar with defensive error handling (storage backends can raise).
    # Upload to S3 via the files storage backend instead of relying on
    # Django's default FileSystemStorage (which fails on ephemeral Railway FS).
    try:
        import uuid

        from files.utils import get_storage_backend

        backend = get_storage_backend()
        avatar_uuid = uuid.uuid4()
        storage_path = f"avatars/{user.id}/{avatar_uuid}/{file_obj.name}"
        saved_path = backend.save(storage_path, file_obj)

        user.avatar.name = saved_path
        user.save(update_fields=["avatar"])
        audit_log.record("auth.avatar_updated", user=user, request=request)

        # Sync avatar path to active project membership metadata
        from accounts.utils import sync_avatar_to_memberships

        sync_avatar_to_memberships(user)
    except Exception:
        import logging

        logging.getLogger(__name__).exception(
            "Avatar upload failed", extra={"user_id": getattr(user, "id", None)}
        )
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "server_error",
                    "message": "Failed to save avatar. Please try again.",
                    "details": {"correlation_id": getattr(request, "correlation_id", None)},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    serializer = UserListSerializer(user)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def set_avatar_from_path(request):
    """Set the authenticated user's avatar from an existing S3 path.

    This is useful when migrating existing images (e.g., player photos from SoccerWiki)
    to be used as user avatars without re-uploading.

    Request body:
        {
            "path": "players/12345.png"  # Relative path in S3 bucket
        }
    """
    if not request.user.is_authenticated:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "not_authenticated",
                    "message": "Authentication credentials were not provided.",
                    "details": {},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    user = request.user
    path = (request.data or {}).get("path", "").strip()

    if not path:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "validation_error",
                    "message": "Validation failed",
                    "details": {"path": ["This field is required"]},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate path doesn't contain directory traversal
    if ".." in path or path.startswith("/"):
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "validation_error",
                    "message": "Validation failed",
                    "details": {"path": ["Invalid path"]},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Set the avatar path directly (this will be resolved to S3 URL by get_avatar_url)
    try:
        # The ImageField.name stores the relative path
        user.avatar.name = path
        user.save(update_fields=["avatar"])
        audit_log.record(
            "auth.avatar_path_set", user=user, request=request, metadata={"path": path}
        )

        # Sync avatar path to active project membership metadata
        from accounts.utils import sync_avatar_to_memberships

        sync_avatar_to_memberships(user)
    except Exception:
        import logging

        logging.getLogger(__name__).exception(
            "Avatar path set failed", extra={"user_id": getattr(user, "id", None)}
        )
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "server_error",
                    "message": "Failed to set avatar path. Please try again.",
                    "details": {"correlation_id": getattr(request, "correlation_id", None)},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    serializer = UserListSerializer(user)
    return Response(
        {
            "status": "success",
            "data": serializer.data,
            "meta": {"timestamp": timezone.now().isoformat()},
        },
        status=status.HTTP_200_OK,
    )
