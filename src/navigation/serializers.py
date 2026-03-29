"""Serializers for navigation API endpoints."""

from typing import Any, Dict

from navigation.models import UserFavorite, UserRecent
from rest_framework import serializers


class NavigationItemSerializer(serializers.Serializer):
    """Serializer for navigation items (recents and favorites) with stale link handling."""

    id = serializers.UUIDField(read_only=True)
    path = serializers.CharField()
    label = serializers.CharField()
    is_accessible = serializers.SerializerMethodField(read_only=True)
    content_type_model = serializers.SerializerMethodField(read_only=True)
    object_id = serializers.CharField(required=False, allow_blank=True)
    context = serializers.JSONField(required=False)
    timestamp = serializers.SerializerMethodField(read_only=True)

    def get_is_accessible(self, obj: Any) -> bool:
        """
        Check if the user has access to the linked object.

        Uses accessibility map from context (set by ViewSet) to avoid N+1 queries.
        If no map exists, attempts to resolve GFK and check permissions.
        """
        accessibility_map = self.context.get("accessibility_map", {})

        # Build cache key from object_id and content_type
        cache_key = f"{obj.content_type_id}:{obj.object_id}" if obj.content_type_id else None

        if cache_key and cache_key in accessibility_map:
            return accessibility_map[cache_key]

        # Fallback: Try to resolve GFK directly (less efficient but works)
        if obj.content_object:
            return self.context.get("default_accessible", True)

        # If object doesn't exist (hard deleted), mark as inaccessible
        return False

    def get_content_type_model(self, obj: Any) -> str | None:
        """Return the model name (lowercase) of the content_type."""
        if obj.content_type:
            return obj.content_type.model
        return None

    def get_timestamp(self, obj: Any) -> str:
        """Return the appropriate timestamp (last_seen_at for recents, created_at for favorites)."""
        if hasattr(obj, "last_seen_at"):
            return obj.last_seen_at.isoformat()
        elif hasattr(obj, "created_at"):
            return obj.created_at.isoformat()
        return ""


class RecentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/logging recent items."""

    content_type_model = serializers.CharField(
        write_only=True,
        required=False,
        help_text="Model name for GFK lookup (e.g., 'project', 'activity')",
    )

    class Meta:
        model = UserRecent
        fields = ["path", "label", "content_type_model", "object_id", "context"]

    def create(self, validated_data: Dict[str, Any]) -> UserRecent:
        """Create a new recent entry using the log_visit service."""
        from navigation.services import log_visit

        user = self.context["request"].user
        path = validated_data["path"]
        label = validated_data["label"]
        object_id = validated_data.get("object_id")
        content_type_model = validated_data.get("content_type_model")
        context = validated_data.get("context", {})

        # Resolve content_object if provided
        content_object = None
        if object_id and content_type_model:
            from django.contrib.contenttypes.models import ContentType

            try:
                content_type = ContentType.objects.get(model__iexact=content_type_model)
                content_object = content_type.get_object_for_this_type(pk=object_id)
            except (ContentType.DoesNotExist, Exception):
                # If object doesn't exist, log as path-only
                pass

        # Use service to handle update-or-create and pruning
        return log_visit(
            user=user,
            path=path,
            label=label,
            content_object=content_object,
            context=context,
        )


class FavoriteCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating favorite items."""

    content_type_model = serializers.CharField(
        write_only=True,
        required=False,
        help_text="Model name for GFK lookup (e.g., 'project', 'activity')",
    )

    class Meta:
        model = UserFavorite
        fields = ["path", "label", "content_type_model", "object_id", "context"]

    def create(self, validated_data: Dict[str, Any]) -> UserFavorite:
        """Create a new favorite entry."""
        user = self.context["request"].user
        path = validated_data["path"]
        label = validated_data["label"]
        object_id = validated_data.get("object_id")
        content_type_model = validated_data.get("content_type_model")
        context = validated_data.get("context", {})

        # Resolve content_object if provided
        content_type = None
        if object_id and content_type_model:
            from django.contrib.contenttypes.models import ContentType

            try:
                content_type = ContentType.objects.get(model__iexact=content_type_model)
                # Verify object exists
                content_type.get_object_for_this_type(pk=object_id)
            except (ContentType.DoesNotExist, Exception):
                # If object doesn't exist, still create favorite with path-only
                content_type = None
                object_id = None

        # Use update_or_create to handle duplicates
        favorite, _ = UserFavorite.objects.update_or_create(
            user=user,
            content_type=content_type,
            object_id=object_id,
            defaults={
                "label": label,
                "path": path,
                "context": context,
            },
        )

        return favorite
