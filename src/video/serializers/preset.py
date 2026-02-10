"""Serializers for VideoPreset."""

from rest_framework import serializers

from src.video.models import VideoPreset


class VideoPresetSerializer(serializers.ModelSerializer):
    """Read-only serializer for video presets."""

    class Meta:
        model = VideoPreset
        fields = [
            "id",
            "name",
            "description",
            "output_format",
            "video_codec",
            "audio_codec",
            "resolution",
            "bitrate_video",
            "bitrate_audio",
            "framerate",
            "crf",
            "extra_params",
            "is_system",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class PresetReferenceSerializer(serializers.ModelSerializer):
    """Lightweight preset reference serializer."""

    class Meta:
        model = VideoPreset
        fields = ["id", "name"]
        read_only_fields = fields
