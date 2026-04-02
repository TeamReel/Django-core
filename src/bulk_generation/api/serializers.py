"""
B67: Bulk Content Generation — Serializers

Read/write serializers for BulkGenerationJob and BulkGenerationItem.
"""

from __future__ import annotations

from rest_framework import serializers

from src.bulk_generation.models import (
    BulkGenerationItem,
    BulkGenerationJob,
    BulkContentType,
    ItemStatus,
    JobStatus,
)


class BulkGenerationItemSerializer(serializers.ModelSerializer):
    """Read serializer for individual bulk generation items."""

    activity_title = serializers.CharField(source="activity.title", read_only=True)

    class Meta:
        model = BulkGenerationItem
        fields = [
            "id",
            "activity",
            "activity_title",
            "video_job",
            "status",
            "error_message",
            "metadata",
            "created_at",
            "started_at",
            "completed_at",
        ]
        read_only_fields = fields


class BulkGenerationItemListSerializer(serializers.ModelSerializer):
    """Lightweight list serializer for items."""

    class Meta:
        model = BulkGenerationItem
        fields = ["id", "activity", "status", "video_job", "error_message"]
        read_only_fields = fields


class BulkGenerationJobSerializer(serializers.ModelSerializer):
    """Read serializer for bulk generation jobs — includes progress stats."""

    progress_percent = serializers.IntegerField(read_only=True)
    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True, default=""
    )

    class Meta:
        model = BulkGenerationJob
        fields = [
            "id",
            "project",
            "created_by",
            "created_by_name",
            "status",
            "content_type",
            "metadata",
            "total_items",
            "completed_items",
            "failed_items",
            "progress_percent",
            "created_at",
            "started_at",
            "completed_at",
        ]
        read_only_fields = fields


class BulkGenerationJobListSerializer(serializers.ModelSerializer):
    """Lightweight list serializer for jobs."""

    progress_percent = serializers.IntegerField(read_only=True)

    class Meta:
        model = BulkGenerationJob
        fields = [
            "id",
            "status",
            "content_type",
            "total_items",
            "completed_items",
            "failed_items",
            "progress_percent",
            "created_at",
        ]
        read_only_fields = fields


class BulkGenerationJobCreateSerializer(serializers.Serializer):
    """
    Write serializer for creating a bulk generation job.

    Accepts a project, content type, list of activity IDs, and optional metadata.
    """

    project_id = serializers.IntegerField(help_text="Project (team) ID")
    content_type = serializers.ChoiceField(
        choices=BulkContentType.choices,
        help_text="Type of content to generate",
    )
    activity_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        max_length=50,
        help_text="List of activity UUIDs to generate content for (max 50)",
    )
    metadata = serializers.DictField(
        required=False,
        default=dict,
        help_text="Optional config: template_id, style_variant, etc.",
    )

    def validate_activity_ids(self, value: list) -> list:
        """Ensure no duplicate activity IDs."""
        if len(value) != len(set(value)):
            raise serializers.ValidationError("Duplicate activity IDs are not allowed.")
        return value
