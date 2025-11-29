from typing import Any

from rest_framework import serializers


class BaseSerializer(serializers.ModelSerializer):
    """
    Base serializer for all API resources.

    Provides:
    - Consistent timestamp formatting (ISO 8601 with UTC)
    - Meta field conventions
    - Field-level validation patterns

    Usage:
        class UserSerializer(BaseSerializer):
            class Meta:
                model = User
                fields = ["id", "username", "email", "created_at"]
                read_only_fields = ["id", "created_at"]
    """

    # Ensure timestamps are ISO 8601 with 'Z' suffix
    created_at = serializers.DateTimeField(
        format="%Y-%m-%dT%H:%M:%SZ",
        read_only=True,
        required=False,
    )
    updated_at = serializers.DateTimeField(
        format="%Y-%m-%dT%H:%M:%SZ",
        read_only=True,
        required=False,
    )

    def to_representation(self, instance: Any) -> dict[str, Any]:
        """
        Convert model instance to JSON-serializable dict.
        Override to add custom transformations.
        """
        data = super().to_representation(instance)

        # Remove null values by default (cleaner API responses)
        return {key: value for key, value in data.items() if value is not None}
