"""Business logic services for navigation management."""

from typing import TYPE_CHECKING, Any, Optional

from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.db import models

if TYPE_CHECKING:
    from django.contrib.auth import get_user_model
    from navigation.models import UserRecent

    User = get_user_model()


def prune_recents(user: "User") -> int:
    """
    Prune UserRecent items to maintain the maximum limit per user.

    Keeps the most recent N items (where N = NAVIGATION_RECENTS_MAX_COUNT)
    and deletes older items to prevent database bloat.

    Args:
        user: The user whose recents should be pruned

    Returns:
        Number of items deleted

    Example:
        >>> from django.contrib.auth import get_user_model
        >>> user = get_user_model().objects.get(email="user@example.com")
        >>> deleted = prune_recents(user)
        >>> print(f"Deleted {deleted} old items")
    """
    from navigation.models import UserRecent

    max_count = getattr(settings, "NAVIGATION_RECENTS_MAX_COUNT", 50)

    # Count current items
    current_count = UserRecent.objects.filter(user=user).count()

    if current_count <= max_count:
        return 0  # Nothing to prune

    # Get IDs of items to keep (most recent N)
    keep_ids = list(
        UserRecent.objects.filter(user=user)
        .order_by("-last_seen_at")[:max_count]
        .values_list("id", flat=True)
    )

    # Delete older items
    deleted_count, _ = UserRecent.objects.filter(user=user).exclude(id__in=keep_ids).delete()

    return deleted_count


def log_visit(
    user: "User",
    path: str,
    label: str,
    content_object: Optional[models.Model] = None,
    context: Optional[dict[str, Any]] = None,
) -> "UserRecent":
    """
    Log a user visit to a navigation target with update_or_create semantics.

    If the user has already visited this target, the timestamp is updated.
    Otherwise, a new recent entry is created. Automatically prunes old items
    to maintain the maximum limit.

    Args:
        user: The user who visited the target
        path: Frontend route path (must start with '/')
        label: Display label for the target
        content_object: Optional Django model instance to link to
        context: Optional additional frontend state

    Returns:
        UserRecent instance (created or updated)

    Raises:
        ValidationError: If path is invalid (absolute URL or doesn't start with '/')

    Example:
        >>> from django.contrib.auth import get_user_model
        >>> from projects.models import Project
        >>> user = get_user_model().objects.get(email="user@example.com")
        >>> project = Project.objects.first()
        >>> recent = log_visit(
        ...     user=user,
        ...     path=f"/projects/{project.id}",
        ...     label=project.name,
        ...     content_object=project,
        ...     context={"org_id": str(project.organisation.id)}
        ... )
    """
    from navigation.models import UserRecent, validate_relative_path

    # Validate path security
    validate_relative_path(path)

    # Prepare context
    if context is None:
        context = {}

    # Determine lookup fields
    if content_object is not None:
        content_type = ContentType.objects.get_for_model(content_object)
        object_id = str(content_object.pk)
        lookup_kwargs = {
            "user": user,
            "content_type": content_type,
            "object_id": object_id,
        }
    else:
        # Path-based fallback (no content_object)
        lookup_kwargs = {
            "user": user,
            "content_type": None,
            "object_id": None,
            "path": path,
        }

    # Update or create the recent entry
    recent, created = UserRecent.objects.update_or_create(
        **lookup_kwargs,
        defaults={
            "label": label,
            "path": path,
            "context": context,
        },
    )

    # Prune old items to maintain limit
    prune_recents(user)

    return recent
