"""Serializers for VideoOverlay."""

from files.models import FileAsset
from files.utils import get_storage_backend
from rest_framework import serializers

from src.video.models import VideoOverlay


class OverlayPositionField(serializers.CharField):
    """Normalize overlay position between API and model values."""

    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        return value.replace("-", "_") if isinstance(value, str) else value

    def to_representation(self, value):
        if isinstance(value, str):
            return value.replace("_", "-")
        return value


class VideoOverlaySerializer(serializers.ModelSerializer):
    """Read-only overlay serializer."""

    position = OverlayPositionField()
    asset_file = serializers.SerializerMethodField()

    class Meta:
        model = VideoOverlay
        fields = [
            "id",
            "overlay_type",
            "position",
            "position_x",
            "position_y",
            "padding_percent",
            "opacity",
            "start_time",
            "end_time",
            "z_index",
            "content",
            "asset_file",
        ]
        read_only_fields = fields

    def get_asset_file(self, obj):
        if not obj.asset_file:
            return None
        asset = obj.asset_file
        try:
            backend = get_storage_backend()
            url = backend.get_url(asset.storage_path, signed=not asset.is_public)
        except Exception:
            url = None
        return {
            "id": asset.id,
            "filename": asset.original_name,
            "url": url,
            "size": asset.file_size,
            "mime_type": asset.mime_type,
        }


class VideoOverlayCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating overlays nested under a job."""

    position = OverlayPositionField()
    asset_file_id: serializers.PrimaryKeyRelatedField = serializers.PrimaryKeyRelatedField(
        source="asset_file",
        queryset=FileAsset.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = VideoOverlay
        fields = [
            "overlay_type",
            "position",
            "position_x",
            "position_y",
            "padding_percent",
            "opacity",
            "start_time",
            "end_time",
            "z_index",
            "content",
            "asset_file_id",
        ]

    def validate(self, attrs):
        position = attrs.get("position")
        if position == "custom":
            if attrs.get("position_x") is None or attrs.get("position_y") is None:
                raise serializers.ValidationError(
                    "position_x and position_y are required when position is custom."
                )
        return attrs
