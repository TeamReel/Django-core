"""Serializers for PlatformExport."""

from rest_framework import serializers

from src.video.models import PlatformExport
from src.video.serializers.preset import PresetReferenceSerializer


class PlatformExportSerializer(serializers.ModelSerializer):
    """Read-only serializer for platform exports."""

    preset = PresetReferenceSerializer(read_only=True)

    class Meta:
        model = PlatformExport
        fields = [
            "id",
            "platform",
            "name",
            "aspect_ratio",
            "max_duration_seconds",
            "max_file_size_mb",
            "resolution",
            "preset",
            "crop_strategy",
            "recommended",
            "is_active",
        ]
        read_only_fields = fields
