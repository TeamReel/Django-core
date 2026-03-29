"""Serializers for notifications API."""

from notifications.models import DeliveryAttempt, Notification, NotificationType
from rest_framework import serializers


class DeliveryAttemptSerializer(serializers.ModelSerializer):
    """Serializer for delivery attempt history."""

    class Meta:
        model = DeliveryAttempt
        fields = [
            "id",
            "attempt_number",
            "attempted_at",
            "outcome",
            "error_message",
            "duration_ms",
            "http_status_code",
            "smtp_response_code",
            "response_body_snippet",
        ]
        read_only_fields = fields


class NotificationTypeSerializer(serializers.ModelSerializer):
    """Serializer for notification type information."""

    class Meta:
        model = NotificationType
        fields = ["code", "name", "description", "default_channel"]
        read_only_fields = fields


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for notification with delivery history."""

    delivery_attempts = DeliveryAttemptSerializer(many=True, read_only=True)
    type_code = serializers.CharField(source="type.code", read_only=True)
    type_name = serializers.CharField(source="type.name", read_only=True)
    type = NotificationTypeSerializer(read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id",
            "type",
            "type_code",
            "type_name",
            "channel",
            "recipient",
            "status",
            "payload",
            "metadata",
            "created_at",
            "updated_at",
            "read_at",
            "delivery_attempts",
        ]
        read_only_fields = fields


class NotificationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for notification list views (no attempts)."""

    type_code = serializers.CharField(source="type.code", read_only=True)
    type_name = serializers.CharField(source="type.name", read_only=True)
    attempts_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id",
            "type_code",
            "type_name",
            "channel",
            "recipient",
            "status",
            "created_at",
            "updated_at",
            "attempts_count",
        ]
        read_only_fields = fields
