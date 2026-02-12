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
