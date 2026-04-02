"""ViewSet for video jobs."""

from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

from django.apps import apps
from django.db.models import QuerySet
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.filters import OrderingFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from src.video.models import VideoJob
from src.video.models.job import JobStatus, JobType
from src.video.pagination import VideoJobPagination
from src.video.permissions import IsProjectMember
from src.video.serializers.job import (
    VideoJobCreateSerializer,
    VideoJobDetailSerializer,
    VideoJobListSerializer,
)
from src.video.tasks._shared import build_extraction_metadata
from src.video.views.job_content import ContentCreationMixin
from src.video.views.job_processing import AssetProcessingMixin

logger = logging.getLogger(__name__)


class VideoJobViewSet(AssetProcessingMixin, ContentCreationMixin, viewsets.ModelViewSet):
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
        Project = apps.get_model("projects", "Project")
        membership_qs = ProjectMembership.objects.filter(
            user=self.request.user, deleted_at__isnull=True
        )

        project_id = self._get_project_id(required=self.action in ["create"])
        if project_id:
            from src.video.permissions import _has_project_access

            if not _has_project_access(self.request.user, project_id):
                raise PermissionDenied("You must be a project member to access this project.")
            qs = qs.filter(project_id=project_id)
        else:
            # Direct project memberships
            direct_ids = membership_qs.values_list("project_id", flat=True)
            # Also include child projects where user is member of parent
            child_ids = Project.objects.filter(parent_project_id__in=direct_ids).values_list(
                "id", flat=True
            )
            qs = qs.filter(project_id__in=set(direct_ids) | set(child_ids))

        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return VideoJobCreateSerializer
        if self.action == "retrieve":
            return VideoJobDetailSerializer
        return VideoJobListSerializer

    def retrieve(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Retrieve job details.

        Self-healing: if a video job remains QUEUED for too long without a start time,
        attempt to redispatch it via Celery (idempotent).
        """
        job = self.get_object()

        if (
            job.job_type
            in (
                JobType.LINEUP,
                JobType.GOAL_CELEBRATION,
                JobType.MATCH_INTRO,
                JobType.THEN_VS_NOW,
            )
            and job.status == JobStatus.QUEUED
            and job.started_at is None
            and job.created_at <= timezone.now() - timedelta(seconds=10)
        ):
            from src.video.services.video_service import VideoService

            try:
                svc = VideoService()
                svc._dispatch_job(job)
                job.refresh_from_db()
            except Exception:
                logger.exception(
                    "Auto-kick failed for stuck video job",
                    extra={"job_id": str(job.id)},
                )

        output = VideoJobDetailSerializer(job, context=self.get_serializer_context())
        return Response(output.data, status=status.HTTP_200_OK)

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
        # Allow cancelling queued jobs, and allow cancelling *processing* lineup jobs.
        if job.status == JobStatus.QUEUED:
            job.status = JobStatus.CANCELLED
            job.completed_at = timezone.now()
            job.save(update_fields=["status", "completed_at", "updated_at"])
            return Response(status=status.HTTP_204_NO_CONTENT)

        if job.status == JobStatus.PROCESSING and job.job_type == JobType.LINEUP:
            job.status = JobStatus.CANCELLED
            job.completed_at = timezone.now()
            job.save(update_fields=["status", "completed_at", "updated_at"])
            return Response(status=status.HTTP_204_NO_CONTENT)

        return Response(
            {"error": "Job cannot be cancelled unless queued (or processing for lineup)."},
            status=status.HTTP_400_BAD_REQUEST,
        )

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

    # ── Approval actions ────────────────────────────────────────────

    @action(detail=True, methods=["post"])
    def approve(self, request: Request, pk: str | None = None) -> Response:
        """Approve a completed video job.

        If the job has a linked workflow instance, execute the 'approve'
        transition.  Either way, persist ``approval_status`` in job metadata
        so the frontend can render the state without relying solely on the
        workflow engine.

        Also saves the output video as a MediaItem linked to the activity
        (match) so it appears in the match content tab.
        """
        job = self.get_object()
        # Allow approving COMPLETED jobs, and also FAILED jobs that have
        # an output file (video was generated but post-processing errored).
        if job.status == JobStatus.COMPLETED:
            pass  # normal path
        elif job.status == JobStatus.FAILED and job.output_file_id:
            logger.info(
                "Approving failed job with output file (likely post-processing error)",
                extra={"job_id": str(job.id)},
            )
        else:
            return Response(
                {"error": "Only completed jobs can be approved."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Workflow transition (best-effort)
        if job.workflow_instance:
            try:
                from src.workflows.services.engine import WorkflowEngine

                engine = WorkflowEngine()

                # If the workflow is stuck at "processing" (the
                # processing_complete transition on job completion may have
                # failed silently), advance it first so the "approve"
                # transition can proceed.
                wf_state = (
                    job.workflow_instance.current_state.name
                    if hasattr(job.workflow_instance.current_state, "name")
                    else str(job.workflow_instance.current_state)
                )
                if wf_state == "processing":
                    logger.info(
                        "Workflow stuck at 'processing' — executing processing_complete first",
                        extra={"job_id": str(job.id)},
                    )
                    engine.execute_transition(
                        instance=job.workflow_instance,
                        action="processing_complete",
                        user=request.user,
                        comment="Auto-advanced from processing (was stuck)",
                    )
                    # Refresh so the next transition sees ready_for_review
                    job.workflow_instance.refresh_from_db()

                engine.execute_transition(
                    instance=job.workflow_instance,
                    action="approve",
                    user=request.user,
                    comment="Approved via video approval UI",
                )
                # Refresh so the serializer sees the updated state
                job.workflow_instance.refresh_from_db()
            except Exception as exc:
                logger.warning(
                    "Workflow approve transition failed – saving metadata anyway: %s",
                    exc,
                    extra={"job_id": str(job.id)},
                )

        # Persist in metadata so it works even without workflow
        meta = job.metadata or {}
        meta["approval_status"] = "approved"
        meta["approved_by"] = request.user.id
        meta["approved_at"] = timezone.now().isoformat()
        job.metadata = meta
        job.save(update_fields=["metadata", "updated_at"])

        # ── Auto-save output as MediaItem for the linked activity ──
        save_result = self._save_approved_video_to_activity(job, request.user)

        # Store save result in metadata so frontend can see issues
        meta = job.metadata or {}
        meta["media_item_saved"] = save_result
        job.metadata = meta
        job.save(update_fields=["metadata", "updated_at"])

        output = VideoJobDetailSerializer(job, context=self.get_serializer_context())
        return Response(output.data, status=status.HTTP_200_OK)

    def _save_approved_video_to_activity(self, job: VideoJob, user) -> dict[str, Any]:
        """Create a MediaItem linking the approved video to its activity/match.

        Returns a dict with success/error info for debugging.
        """
        activity_id = (job.config or {}).get("activity_id")
        if not activity_id:
            logger.info("No activity_id in job config – skipping MediaItem creation")
            return {"saved": False, "reason": "no_activity_id"}

        if not job.output_file_id:
            logger.info("No output_file on job – skipping MediaItem creation")
            return {"saved": False, "reason": "no_output_file"}

        try:
            Activity = apps.get_model("activities", "Activity")
            MediaItem = apps.get_model("medialib", "MediaItem")
            from medialib.models import MediaItemState

            # Prevent duplicate MediaItems (auto-created on job completion)
            existing = MediaItem.objects.filter(file_id=job.output_file_id).first()
            if existing:
                logger.info(
                    "MediaItem already exists for output file – skipping approve creation",
                    extra={"job_id": str(job.id), "media_item_id": str(existing.id)},
                )
                return {"saved": True, "media_item_id": str(existing.id), "already_existed": True}

            activity = Activity.objects.select_related(
                "project",
                "project__parent_project",
                "project__organisation",
            ).get(id=activity_id)
            project = activity.project or job.project

            if not project:
                return {"saved": False, "reason": "no_project", "activity_id": str(activity_id)}

            extraction_meta = build_extraction_metadata(
                job, activity, project, source="video_job_approved",
            )
            asset_type = extraction_meta["asset_type"]

            file_asset = job.output_file
            mime_type = getattr(file_asset, "mime_type", "video/mp4") or "video/mp4"
            file_size = (
                getattr(file_asset, "file_size", None)
                or getattr(file_asset, "file_size_bytes", None)
                or 0
            )

            media_item = MediaItem.objects.create(
                file=file_asset,
                activity=activity,
                project=project,
                title=f"{job.job_type.replace('_', ' ').title()} Video",
                description=f"Approved {job.job_type} video for {activity.title}",
                mime_type=mime_type,
                file_size_bytes=file_size,
                state=MediaItemState.PROCESSED,
                created_by=user if user and user.is_authenticated else None,
                extraction_metadata=extraction_meta,
            )
            logger.info(
                "MediaItem created for approved video job: media=%s job=%s activity=%s project=%s",
                media_item.id,
                str(job.id),
                activity_id,
                project.id,
            )
            return {
                "saved": True,
                "media_item_id": str(media_item.id),
                "activity_id": str(activity_id),
                "project_id": project.id,
                "asset_type": asset_type,
            }
        except Exception as exc:
            logger.error(
                "Failed to create MediaItem for approved video: %s",
                exc,
                extra={"job_id": str(job.id)},
                exc_info=True,
            )
            return {"saved": False, "error": str(exc)}

    @action(detail=True, methods=["post"])
    def reject(self, request: Request, pk: str | None = None) -> Response:
        """Reject a completed video job."""
        job = self.get_object()
        if job.status != JobStatus.COMPLETED:
            return Response(
                {"error": "Only completed jobs can be rejected."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if job.workflow_instance:
            try:
                from src.workflows.services.engine import WorkflowEngine

                engine = WorkflowEngine()

                # Handle stuck workflow at "processing" state
                wf_state = (
                    job.workflow_instance.current_state.name
                    if hasattr(job.workflow_instance.current_state, "name")
                    else str(job.workflow_instance.current_state)
                )
                if wf_state == "processing":
                    engine.execute_transition(
                        instance=job.workflow_instance,
                        action="processing_complete",
                        user=request.user,
                        comment="Auto-advanced from processing (was stuck)",
                    )
                    job.workflow_instance.refresh_from_db()

                engine.execute_transition(
                    instance=job.workflow_instance,
                    action="reject",
                    user=request.user,
                    comment="Rejected via video approval UI",
                )
                job.workflow_instance.refresh_from_db()
            except Exception as exc:
                logger.warning(
                    "Workflow reject transition failed – saving metadata anyway: %s",
                    exc,
                    extra={"job_id": str(job.id)},
                )

        meta = job.metadata or {}
        meta["approval_status"] = "rejected"
        meta["rejected_by"] = request.user.id
        meta["rejected_at"] = timezone.now().isoformat()
        job.metadata = meta
        job.save(update_fields=["metadata", "updated_at"])

        output = VideoJobDetailSerializer(job, context=self.get_serializer_context())
        return Response(output.data, status=status.HTTP_200_OK)

