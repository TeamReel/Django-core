"""Serializers for VideoJob and related references."""

from __future__ import annotations

from typing import Any

from django.contrib.auth import get_user_model
from files.models import FileAsset
from files.utils import get_storage_backend
from rest_framework import serializers

from src.video.models import PlatformExport, VideoJob, VideoPreset
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
    workflow_instance = serializers.SerializerMethodField()
    approval_status = serializers.SerializerMethodField()

    config = serializers.JSONField(read_only=True)

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
            "config",
            "error_message",
            "retry_count",
            "created_at",
            "started_at",
            "completed_at",
            "output_url",
            "thumbnail_url",
            "workflow_instance",
            "approval_status",
        ]
        read_only_fields = fields

    def get_output_url(self, obj: VideoJob) -> str | None:
        if not obj.output_file:
            return None
        return FileReferenceSerializer(obj.output_file, context=self.context).data.get("url")

    def get_thumbnail_url(self, obj: VideoJob) -> str | None:
        thumbnail = obj.metadata.get("thumbnail_url") if obj.metadata else None
        return thumbnail

    def get_approval_status(self, obj: VideoJob) -> str | None:
        """Derive approval status from workflow state or metadata fallback."""
        if obj.workflow_instance:
            state = obj.workflow_instance.current_state
            name = state.name if hasattr(state, "name") else str(state)
            if name == "approved":
                return "approved"
            if name == "rejected":
                return "rejected"
            if name == "ready_for_review":
                return "pending"
            return None
        # Fallback: check metadata (set by approve/reject endpoints)
        meta = obj.metadata or {}
        return meta.get("approval_status")

    def get_workflow_instance(self, obj: VideoJob) -> dict | None:
        """Return workflow instance info with available actions for approval UI."""
        if not obj.workflow_instance:
            return None
        workflow = obj.workflow_instance
        current_state = (
            workflow.current_state.name
            if hasattr(workflow.current_state, "name")
            else str(workflow.current_state)
        )

        # Get available actions using workflow engine
        available_actions = []
        try:
            from django.apps import apps

            WorkflowEngine = apps.get_model("workflows", "WorkflowEngine", require_ready=False)
            if WorkflowEngine is None:
                # Fallback: use the engine service directly
                from src.workflows.services.engine import WorkflowEngine as Engine

                engine = Engine()
            else:
                engine = WorkflowEngine()

            # Request context may have user for permission checks
            request = self.context.get("request")
            if request and hasattr(request, "user") and request.user.is_authenticated:
                actions = engine.get_available_actions(workflow, request.user)
                available_actions = [a["action"] for a in actions]
            else:
                # No user context - return actions based on workflow snapshot
                transitions = workflow.workflow_snapshot.get("transitions", [])
                available_actions = [
                    t["action"] for t in transitions if t.get("from_state") == current_state
                ]
        except Exception:  # noqa: S110
            pass

        return {
            "id": workflow.id,
            "current_state": current_state,
            "template_name": getattr(workflow.workflow, "name", None),
            "available_actions": available_actions,
        }


class VideoJobDetailSerializer(VideoJobListSerializer):
    """Detail serializer with overlays and workflow info."""

    config = serializers.JSONField()
    metadata = serializers.JSONField()
    workflow_instance = serializers.SerializerMethodField()
    workflow_status = serializers.SerializerMethodField()
    workflow_assignees = serializers.SerializerMethodField()
    workflow_history = serializers.SerializerMethodField()
    publishable = serializers.BooleanField(read_only=True)
    overlays = VideoOverlaySerializer(many=True, read_only=True)
    created_by = UserReferenceSerializer(read_only=True)

    class Meta(VideoJobListSerializer.Meta):
        fields = VideoJobListSerializer.Meta.fields + [
            "config",
            "metadata",
            "workflow_instance",
            "workflow_status",
            "workflow_assignees",
            "workflow_history",
            "publishable",
            "overlays",
            "created_by",
        ]

    def get_workflow_instance(self, obj: VideoJob) -> dict | None:
        if not obj.workflow_instance:
            return None
        workflow = obj.workflow_instance
        return {
            "id": workflow.id,
            "current_state": workflow.current_state.name
            if hasattr(workflow.current_state, "name")
            else str(workflow.current_state),
            "template_name": getattr(workflow.workflow, "name", None),
        }

    def get_workflow_status(self, obj: VideoJob) -> dict | None:
        """Return workflow state and available transitions."""
        if not obj.workflow_instance:
            return None

        workflow = obj.workflow_instance
        try:
            # Get available transitions for current state
            available_transitions = []
            if hasattr(workflow, "get_available_transitions"):
                available_transitions = [
                    {
                        "action": t.action,
                        "to_state": t.to_state.name
                        if hasattr(t.to_state, "name")
                        else str(t.to_state),
                    }
                    for t in workflow.get_available_transitions()
                ]

            return {
                "state": workflow.current_state.name
                if hasattr(workflow.current_state, "name")
                else str(workflow.current_state),
                "can_transition": available_transitions,
            }
        except Exception:
            return {
                "state": str(workflow.current_state),
                "can_transition": [],
            }

    def get_workflow_assignees(self, obj: VideoJob) -> list[dict]:
        """Return list of workflow assignees."""
        if not obj.workflow_instance:
            return []

        try:
            workflow = obj.workflow_instance
            if hasattr(workflow, "assignees") and workflow.assignees:
                return [
                    {
                        "id": str(a.user.id),
                        "name": a.user.get_full_name() or a.user.email,
                        "email": a.user.email,
                    }
                    for a in workflow.assignees.all()
                ]
        except Exception:  # noqa: S110
            pass

        return []

    def get_workflow_history(self, obj: VideoJob) -> list[dict]:
        """Return workflow transition history."""
        if not obj.workflow_instance:
            return []

        try:
            workflow = obj.workflow_instance
            if hasattr(workflow, "transitions"):
                return [
                    {
                        "from_state": t.from_state.name
                        if hasattr(t.from_state, "name")
                        else str(t.from_state),
                        "to_state": t.to_state.name
                        if hasattr(t.to_state, "name")
                        else str(t.to_state),
                        "action": t.action if hasattr(t, "action") else None,
                        "user": t.user.get_full_name()
                        if (hasattr(t, "user") and t.user)
                        else "System",
                        "timestamp": t.created_at.isoformat() if hasattr(t, "created_at") else None,
                        "comment": t.comment if hasattr(t, "comment") else None,
                    }
                    for t in workflow.transitions.order_by("created_at")
                ]
        except Exception:  # noqa: S110
            pass

        return []


class VideoJobCreateSerializer(serializers.Serializer):
    """Serializer for creating video jobs."""

    job_type: serializers.ChoiceField = serializers.ChoiceField(choices=JobType.choices)
    input_file_id: serializers.PrimaryKeyRelatedField = serializers.PrimaryKeyRelatedField(
        source="input_file",
        queryset=FileAsset.objects.all(),
        required=False,  # Optional for lineup jobs that use segments instead
        allow_null=True,
    )
    preset_id: serializers.PrimaryKeyRelatedField = serializers.PrimaryKeyRelatedField(
        source="preset",
        queryset=VideoPreset.objects.all(),
        required=False,
        allow_null=True,
    )
    platform_export_id: serializers.PrimaryKeyRelatedField = serializers.PrimaryKeyRelatedField(
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
        input_file = attrs.get("input_file")
        config = attrs.get("config") or {}

        if job_type != JobType.COMPOSE and overlays:
            raise serializers.ValidationError(
                {"overlays": "Overlays are only allowed for compose jobs."}
            )

        # Lineup jobs require segments in config instead of input_file
        if job_type == JobType.LINEUP:
            if not config.get("segments"):
                raise serializers.ValidationError(
                    {"config": "Lineup jobs require 'segments' in config."}
                )
        elif not input_file:
            # Other job types require input_file
            raise serializers.ValidationError(
                {"input_file_id": "This field is required for non-lineup jobs."}
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

        from src.video.services.video_service import VideoService

        service = VideoService()
        job = service.create_job(
            project=project,
            user=created_by,
            input_file=validated_data.get("input_file"),
            job_type=validated_data.get("job_type", ""),
            preset=validated_data.get("preset"),
            platform_export=validated_data.get("platform_export"),
            overlays=overlays_data if overlays_data else None,
            config=validated_data.get("config"),
        )

        return job
