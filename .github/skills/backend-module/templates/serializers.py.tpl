"""Serializers for B{NUMBER}: {MODULE_TITLE}."""

from rest_framework import serializers

from ..models import {MODEL_NAME}


class {MODEL_NAME}ListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list endpoints — minimal fields, no nesting."""

    class Meta:
        model = {MODEL_NAME}
        fields = ["id", "{DISPLAY_FIELD}", "created_at"]
        read_only_fields = fields


class {MODEL_NAME}DetailSerializer(serializers.ModelSerializer):
    """Full serializer for retrieve endpoints — all fields + computed."""

    created_by_display = serializers.SerializerMethodField()

    class Meta:
        model = {MODEL_NAME}
        fields = [
            "id",
            # {ALL_FIELDS}
            "metadata",
            "created_by",
            "created_by_display",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "created_by"]

    def get_created_by_display(self, obj) -> dict | None:
        if obj.created_by:
            return {"id": str(obj.created_by.id), "email": obj.created_by.email}
        return None


class {MODEL_NAME}WriteSerializer(serializers.ModelSerializer):
    """Serializer for create/update — writable fields only."""

    class Meta:
        model = {MODEL_NAME}
        fields = [
            # {WRITABLE_FIELDS}
        ]

    def validate(self, data):
        """Cross-field validation."""
        return data

    def create(self, validated_data):
        request = self.context["request"]
        validated_data["created_by"] = request.user
        validated_data["organisation"] = request.user.organisation
        return super().create(validated_data)
