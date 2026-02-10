"""Serializers for VideoJob and related references."""

from __future__ import annotations

from typing import Any

from django.contrib.auth import get_user_model
from rest_framework import serializers

from files.models import FileAsset
from files.utils import get_storage_backend
from src.video.models import PlatformExport, VideoJob, VideoOverlay, VideoPreset
from src.video.models.job import JobType
from src.video.serializers.overlay import VideoOverlayCreateSerializer, VideoOverlaySerializer
from src.video.serializers.preset import PresetReferenceSerializer


class FileReferenceSerializer(serializers.ModelSerializer):
    """File reference serializer for API responses."""

    filename = serializers.CharField(source="original_name")
    size = serializers.IntegerField(source="file_size")
    url = serializers.SerializerMethodField()

    class Meta:
        model = FileAsset
        fields = ["id", "filename", "url", "size", "mime_type"]
        read_only_fields = fields

    def get_url(self, obj: FileAsset) -> str | None:
        try:
            backend = get_storage_backend()
            return backend.get_url(obj.storage_path, signed=not obj.is_public)
        except Exception:
            return None


class UserReferenceSerializer(serializers.ModelSerializer):
    """User reference serializer."""

    full_name = serializers.SerializerMethodField()

    class Meta:
        model = get_user_model()
        fields = ["id", "email", "full_name"]
        read_only_fields = fields

    def get_full_name(self, obj) -> str:
        return obj.get_full_name() or obj.email


class WorkflowReferenceSerializer(serializers.Serializer):
    """Workflow reference serializer."""

    id = serializers.UUIDField(read_only=True)
    current_state = serializers.CharField(read_only=True)
    template_name = serializers.CharField(read_only=True)


class VideoJobListSerializer(serializers.ModelSerializer):
    """List serializer for video jobs."""

    input_file = FileReferenceSerializer(read_only=True)
    output_file = FileReferenceSerializer(read_only=True)
    preset = PresetReferenceSerializer(read_only=True)
    output_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = VideoJob
        fields = [
            "id",
            "job_type",
            "status",
            "progress_percent",
            "input_file",
            "output_file",
            "preset",
            "error_message",
            "retry_count",
            "created_at",
            "started_at",
            "completed_at",
            "output_url",
            "thumbnail_url",
        ]
        read_only_fields = fields

    def get_output_url(self, obj: VideoJob) -> str | None:
        if not obj.output_file:
            return None
        return FileReferenceSerializer(obj.output_file, context=self.context).data.get("url")

    def get_thumbnail_url(self, obj: VideoJob) -> str | None:
        thumbnail = obj.metadata.get("thumbnail_url") if obj.metadata else None
        return thumbnail


class VideoJobDetailSerializer(VideoJobListSerializer):
    """Detail serializer with overlays and workflow info."""

    config = serializers.JSONField()
    metadata = serializers.JSONField()
    workflow_instance = serializers.SerializerMethodField()
    overlays = VideoOverlaySerializer(many=True, read_only=True)
    created_by = UserReferenceSerializer(read_only=True)

    class Meta(VideoJobListSerializer.Meta):
        fields = VideoJobListSerializer.Meta.fields + [
            "config",
            "metadata",
            "workflow_instance",
            "overlays",
            "created_by",
        ]

    def get_workflow_instance(self, obj: VideoJob) -> dict | None:
        if not obj.workflow_instance:
            return None
        workflow = obj.workflow_instance
        return {
            "id": workflow.id,
            "current_state": workflow.current_state,
            "template_name": getattr(workflow.workflow, "name", None),
        }


class VideoJobCreateSerializer(serializers.Serializer):
    """Serializer for creating video jobs."""

    job_type = serializers.ChoiceField(choices=JobType.choices)
    input_file_id = serializers.PrimaryKeyRelatedField(
        source="input_file",
        queryset=FileAsset.objects.all(),
    )
    preset_id = serializers.PrimaryKeyRelatedField(
        source="preset",
        queryset=VideoPreset.objects.all(),
        required=False,
        allow_null=True,
    )
    platform_export_id = serializers.PrimaryKeyRelatedField(
        source="platform_export",
        queryset=PlatformExport.objects.all(),
        required=False,
        allow_null=True,
    )
    workflow_template_id = serializers.UUIDField(required=False, allow_null=True)
    config = serializers.JSONField(required=False)
    overlays = VideoOverlayCreateSerializer(many=True, required=False)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        job_type = attrs.get("job_type")
        overlays = attrs.get("overlays")
        if job_type != JobType.COMPOSE and overlays:
            raise serializers.ValidationError(
                {"overlays": "Overlays are only allowed for compose jobs."}
            )
        return attrs

    def create(self, validated_data: dict[str, Any]) -> VideoJob:
        overlays_data = validated_data.pop("overlays", [])
        workflow_template_id = validated_data.pop("workflow_template_id", None)
        config = validated_data.get("config") or {}

        if workflow_template_id:
            config.setdefault("workflow_template_id", str(workflow_template_id))
            validated_data["config"] = config

        project = self.context.get("project")
        created_by = self.context.get("created_by")

        job = VideoJob.objects.create(
            project=project,
            created_by=created_by,
            **validated_data,
        )

        if overlays_data:
            overlays = [VideoOverlay(job=job, **overlay) for overlay in overlays_data]
            VideoOverlay.objects.bulk_create(overlays)

        return job
