"""Trash API serializers."""

from django.contrib.contenttypes.models import ContentType
from rest_framework import serializers
from trash.models import TrashItem


class ContentTypeSerializer(serializers.ModelSerializer):
    """Lightweight serializer for content type labels."""

    label = serializers.SerializerMethodField()

    class Meta:
        model = ContentType
        fields = ["id", "app_label", "model", "label"]

    def get_label(self, obj) -> str:
        return obj.model_class()._meta.verbose_name.title() if obj.model_class() else obj.model


class TrashItemSerializer(serializers.ModelSerializer):
    """Read serializer for trash items."""

    content_type_detail = ContentTypeSerializer(source="content_type", read_only=True)
    deleted_by_email = serializers.EmailField(
        source="deleted_by.email", read_only=True, default=None
    )
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = TrashItem
        fields = [
            "id",
            "content_type",
            "content_type_detail",
            "object_id",
            "organisation",
            "deleted_at",
            "deleted_by",
            "deleted_by_email",
            "expires_at",
            "object_repr",
            "original_data",
            "restore_path",
            "is_expired",
        ]
        read_only_fields = fields


class TrashStatsSerializer(serializers.Serializer):
    """Serializer for trash statistics response."""

    content_type = serializers.CharField()
    count = serializers.IntegerField()
    total = serializers.IntegerField()
