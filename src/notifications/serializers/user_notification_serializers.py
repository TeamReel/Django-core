"""Serializers for user-facing in-app notifications."""

from notifications.models import Notification
from rest_framework import serializers


class UserNotificationSerializer(serializers.ModelSerializer):
    """Serializer for user's in-app notifications."""

    is_read = serializers.SerializerMethodField()
    level = serializers.SerializerMethodField()
    action_url = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "title",
            "message",
            "level",
            "is_read",
            "action_url",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_is_read(self, obj):
        """Return whether notification has been read."""
        return obj.read_at is not None

    def get_level(self, obj):
        """Extract level/severity from metadata."""
        return obj.metadata.get("level", "info")

    def get_action_url(self, obj):
        """Extract optional navigation target from payload."""
        return obj.payload.get("action_url", None) if obj.payload else None

    def get_title(self, obj):
        """Extract title from payload."""
        return obj.payload.get("title", "Notification")

    def get_message(self, obj):
        """Extract message from payload."""
        return obj.payload.get("message", "")

    # Make title and message available as properties for serialization
    title = serializers.SerializerMethodField()
    message = serializers.SerializerMethodField()


class UserNotificationUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating notification read status."""

    is_read = serializers.BooleanField(required=True)

    class Meta:
        model = Notification
        fields = ["is_read"]

    def update(self, instance, validated_data):
        """Update read_at based on is_read boolean."""
        is_read = validated_data.get("is_read")

        if is_read and instance.read_at is None:
            # Mark as read
            instance.mark_as_read()
        elif not is_read and instance.read_at is not None:
            # Mark as unread
            instance.read_at = None
            instance.save(update_fields=["read_at"])

        return instance
