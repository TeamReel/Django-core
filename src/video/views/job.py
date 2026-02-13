"""ViewSet for video jobs."""

from __future__ import annotations

from typing import Any

from django.apps import apps
from django.db.models import QuerySet
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.filters import OrderingFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from src.video.models import VideoJob
from src.video.models.job import JobStatus
from src.video.pagination import VideoJobPagination
from src.video.permissions import IsProjectMember
from src.video.serializers.job import (
    VideoJobCreateSerializer,
    VideoJobDetailSerializer,
    VideoJobListSerializer,
)


class VideoJobViewSet(viewsets.ModelViewSet):
    """ViewSet for video jobs.

    list: GET /api/v1/video/jobs/
    retrieve: GET /api/v1/video/jobs/{id}/
    create: POST /api/v1/video/jobs/
    destroy: DELETE /api/v1/video/jobs/{id}/
    retry: POST /api/v1/video/jobs/{id}/retry/
    """

    queryset = VideoJob.objects.all()
    pagination_class = VideoJobPagination
    permission_classes = [IsAuthenticated, IsProjectMember]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["status", "job_type"]
    ordering_fields = ["created_at", "status", "job_type"]
    ordering = ["-created_at"]

    def get_queryset(self) -> QuerySet[VideoJob]:
        qs = (
            super()
            .get_queryset()
            .select_related(
                "project",
                "created_by",
                "input_file",
                "output_file",
                "preset",
                "platform_export",
                "workflow_instance",
                "workflow_instance__workflow",
            )
            .prefetch_related("overlays")
        )

        ProjectMembership = apps.get_model("projects", "ProjectMembership")
        membership_qs = ProjectMembership.objects.filter(user=self.request.user)

        project_id = self._get_project_id(required=self.action in ["create"])
        if project_id:
            if not membership_qs.filter(project_id=project_id).exists():
                raise PermissionDenied("You must be a project member to access this project.")
            qs = qs.filter(project_id=project_id)
        else:
            qs = qs.filter(project_id__in=membership_qs.values_list("project_id", flat=True))

        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return VideoJobCreateSerializer
        if self.action == "retrieve":
            return VideoJobDetailSerializer
        return VideoJobListSerializer

    def _get_project_id(self, required: bool = False) -> str | None:
        header_id = self.request.headers.get("X-Project-ID")
        query_id = self.request.query_params.get("project")
        project_id = header_id or query_id
        if project_id:
            self.request.project_id = project_id
            return project_id
        if required:
            raise ValidationError({"project": "Project ID is required"})
        return None

    def create(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        project_id = self._get_project_id(required=True)
        Project = apps.get_model("projects", "Project")
        project = get_object_or_404(Project, id=project_id)

        serializer = self.get_serializer(
            data=request.data,
            context={
                "project": project,
                "created_by": request.user,
            },
        )
        serializer.is_valid(raise_exception=True)
        job = serializer.save()

        output = VideoJobDetailSerializer(job, context=self.get_serializer_context())
        return Response(output.data, status=status.HTTP_201_CREATED)

    def destroy(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        job = self.get_object()
        if job.status != JobStatus.QUEUED:
            return Response(
                {"error": "Job cannot be cancelled unless queued."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        job.status = JobStatus.CANCELLED
        job.save(update_fields=["status", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def retry(self, request: Request, pk: str | None = None) -> Response:
        job = self.get_object()
        if job.status != JobStatus.FAILED:
            return Response(
                {"error": "Job can only be retried from failed status."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        job.status = JobStatus.QUEUED
        job.error_message = ""
        job.error_code = ""
        job.progress_percent = 0
        job.started_at = None
        job.completed_at = None
        job.retry_count += 1
        job.save(
            update_fields=[
                "status",
                "error_message",
                "error_code",
                "progress_percent",
                "started_at",
                "completed_at",
                "retry_count",
                "updated_at",
            ]
        )

        output = VideoJobDetailSerializer(job, context=self.get_serializer_context())
        return Response(output.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="lineup-from-template")
    def lineup_from_template(self, request: Request) -> Response:
        """Create a lineup video job from ContentTemplate + Activity.

        POST /api/v1/video/jobs/lineup-from-template/

        Request body:
        {
            "activity_id": "uuid",  # Required: match/activity ID
            "template_id": "uuid",  # Optional: ContentTemplate ID
            "output_resolution": "vertical_1080p",  # Optional
            "segments": [...]  # Optional: pre-built segments from frontend
        }

        If `segments` is provided, uses those directly.
        Otherwise, builds segments from Activity participations + brand assets.
        """
        import logging

        logger = logging.getLogger(__name__)

        from src.video.models.job import JobType
        from src.video.services.lineup_builder import build_lineup_video_config
        from src.video.tasks import process_lineup_video

        activity_id = request.data.get("activity_id")
        template_id = request.data.get("template_id")
        output_resolution = request.data.get("output_resolution", "vertical_1080p")
        frontend_segments = request.data.get("segments")  # Optional fallback

        if not activity_id:
            return Response(
                {"error": "activity_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get activity and its project
        Activity = apps.get_model("activities", "Activity")
        try:
            activity = Activity.objects.select_related("project", "period").get(id=activity_id)
        except Activity.DoesNotExist:
            return Response(
                {"error": f"Activity {activity_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Activity always has a project; Period.project can be NULL (org-wide periods)
        project = activity.project

        # Check project membership
        ProjectMembership = apps.get_model("projects", "ProjectMembership")
        if not ProjectMembership.objects.filter(project=project, user=request.user).exists():
            raise PermissionDenied("You must be a project member to create lineup videos.")

        # Build segments config from template + activity data
        try:
            config = build_lineup_video_config(
                activity_id=activity_id,
                template_id=template_id,
                output_resolution=output_resolution,
            )
            # Check if backend found player segments (more than just header + field)
            backend_segments = config.get("segments", [])
            player_segments_count = len(
                [
                    s
                    for s in backend_segments
                    if s.get("type") != "image" or "lineup" not in s.get("url", "").lower()
                ]
            )

            logger.info(
                "Backend built %d segments, player segments: %d, frontend provided: %s",
                len(backend_segments),
                player_segments_count,
                len(frontend_segments) if frontend_segments else "none",
            )

            # If backend found < 3 segments (just header+field) but frontend has segments, use frontend
            if len(backend_segments) <= 2 and frontend_segments and len(frontend_segments) > 2:
                logger.info(
                    "Using frontend segments as fallback (%d segments)", len(frontend_segments)
                )
                config["segments"] = frontend_segments

        except Exception as e:  # noqa: BLE001
            import traceback

            logger.error("Failed to build lineup config: %s\n%s", e, traceback.format_exc())
            # If frontend provided segments, use those as fallback
            if frontend_segments and len(frontend_segments) > 0:
                logger.info(
                    "Using frontend segments after backend failure (%d segments)",
                    len(frontend_segments),
                )
                config = {
                    "segments": frontend_segments,
                    "output_resolution": output_resolution,
                    "output_fps": 30,
                    "background_color": "#1a472a",
                    "fade_duration": 0.3,
                    "match_id": str(activity_id),
                    "activity_id": str(activity_id),
                }
            else:
                return Response(
                    {"error": f"Failed to build lineup config: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Create the video job
        try:
            job = VideoJob.objects.create(
                project=project,
                created_by=request.user,
                job_type=JobType.LINEUP,
                status=JobStatus.QUEUED,
                config=config,
            )
        except Exception as e:  # noqa: BLE001
            import logging
            import traceback

            logger = logging.getLogger(__name__)
            logger.error(f"Failed to create VideoJob: {e}\n{traceback.format_exc()}")
            return Response(
                {"error": f"Failed to create video job: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Queue the Celery task
        try:
            task_result = process_lineup_video.delay(str(job.id))
            logger.info(
                "Celery task queued successfully: task_id=%s, job_id=%s",
                task_result.id,
                job.id,
            )
        except Exception as e:  # noqa: BLE001
            logger.warning("Failed to queue Celery task: %s - job will remain queued", e)
            # Don't fail the request - job is created, can be processed later

        try:
            output = VideoJobDetailSerializer(job, context=self.get_serializer_context())
            return Response(output.data, status=status.HTTP_201_CREATED)
        except Exception as e:  # noqa: BLE001
            import logging
            import traceback

            logger = logging.getLogger(__name__)
            logger.error(f"Failed to serialize VideoJob: {e}\n{traceback.format_exc()}")
            # Return minimal success response
            return Response(
                {
                    "id": str(job.id),
                    "status": "queued",
                    "message": "Job created but serialization failed",
                },
                status=status.HTTP_201_CREATED,
            )
