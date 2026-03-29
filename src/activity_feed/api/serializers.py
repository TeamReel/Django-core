"""
B62: Activity Feed — Serializers

Read-only serializers for feed events, plus a write serializer for
marking feed position (read status).
"""

from activity_feed.models import ActivityLog, FeedPosition
from rest_framework import serializers


class ActivityLogSerializer(serializers.ModelSerializer):
    """
    Serializer for feed events — read-only.

    Includes actor email, target type, and resolved human-readable description.
    """

    actor_email = serializers.EmailField(source="actor.email", read_only=True, default=None)
    target_type = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = [
            "id",
            "actor",
            "actor_email",
            "verb",
            "target_content_type",
            "target_object_id",
            "target_type",
            "organisation",
            "project",
            "extra_data",
            "created_at",
        ]
        read_only_fields = fields

    def get_target_type(self, obj) -> str | None:
        """Return the model name of the target (e.g. 'activity', 'participation')."""
        if obj.target_content_type:
            return obj.target_content_type.model
        return None


class ActivityLogGroupSerializer(serializers.Serializer):
    """
    Serializer for aggregated feed groups.

    Groups similar events within a 5-minute window:
    e.g. "3 spelers bevestigd" instead of 3 separate events.
    """

    verb = serializers.CharField()
    count = serializers.IntegerField()
    events = ActivityLogSerializer(many=True)
    first_at = serializers.DateTimeField()
    last_at = serializers.DateTimeField()


class FeedPositionSerializer(serializers.ModelSerializer):
    """Serializer for read position — write to mark feed as read."""

    class Meta:
        model = FeedPosition
        fields = ["id", "user", "organisation", "last_read_at", "updated_at"]
        read_only_fields = ["id", "user", "organisation", "updated_at"]


class MarkReadSerializer(serializers.Serializer):
    """Input serializer for the mark-as-read action."""

    last_read_at = serializers.DateTimeField(
        required=False,
        help_text="Timestamp to mark as read up to. Defaults to now.",
    )


class UnreadCountSerializer(serializers.Serializer):
    """Output serializer for the unread count response."""

    unread_count = serializers.IntegerField()
    last_read_at = serializers.DateTimeField(allow_null=True)
