"""
B67: Bulk Content Generation — API Views

ViewSet for creating and managing bulk content generation jobs.
"""

from __future__ import annotations

import logging

from django.apps import apps
from django.db import transaction
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from api.pagination import BaseAPIPagination
from src.bulk_generation.models import (
    BulkGenerationItem,
    BulkGenerationJob,
    ItemStatus,
    JobStatus,
)

from .serializers import (
    BulkGenerationItemListSerializer,
    BulkGenerationItemSerializer,
    BulkGenerationJobCreateSerializer,
    BulkGenerationJobListSerializer,
    BulkGenerationJobSerializer,
)

logger = logging.getLogger(__name__)


class BulkGenerationJobViewSet(viewsets.ModelViewSet):
    """
    ViewSet for BulkGenerationJob.

    Endpoints:
    - POST   /api/v1/bulk-generate/          — Create a new bulk job
    - GET    /api/v1/bulk-generate/           — List jobs (project-scoped)
    - GET    /api/v1/bulk-generate/{id}/      — Retrieve job details
    - POST   /api/v1/bulk-generate/{id}/cancel/       — Cancel job
    - POST   /api/v1/bulk-generate/{id}/retry-failed/  — Retry failed items
    - GET    /api/v1/bulk-generate/{id}/items/          — List items
    """

    permission_classes = [permissions.IsAuthenticated]
    pagination_class = BaseAPIPagination
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        """Return bulk jobs for projects the user is a member of."""
        ProjectMembership = apps.get_model("projects", "ProjectMembership")
        project_ids = ProjectMembership.objects.filter(
            user=self.request.user, deleted_at__isnull=True
        ).values_list("project_id", flat=True)

        qs = BulkGenerationJob.objects.filter(
            project_id__in=project_ids
        ).select_related("project", "created_by")

        # Optional project filter
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)

        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return BulkGenerationJobCreateSerializer
        if self.action == "list":
            return BulkGenerationJobListSerializer
        return BulkGenerationJobSerializer

    def create(self, request, *args, **kwargs):
        """
        Create a bulk generation job.

        Validates project membership, activity existence, then creates
        the job with items and dispatches to Celery.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        project_id = serializer.validated_data["project_id"]
        content_type = serializer.validated_data["content_type"]
        activity_ids = serializer.validated_data["activity_ids"]
        metadata = serializer.validated_data.get("metadata", {})

        # Validate project access
        Project = apps.get_model("projects", "Project")
        ProjectMembership = apps.get_model("projects", "ProjectMembership")

        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response(
                {"error": "Project not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not ProjectMembership.objects.filter(
            project=project, user=request.user, deleted_at__isnull=True
        ).exists():
            raise PermissionDenied("You must be a project member.")

        # Validate activities exist and belong to the project
        Activity = apps.get_model("activities", "Activity")
        activities = Activity.objects.filter(
            id__in=activity_ids, project=project
        )
        found_ids = set(activities.values_list("id", flat=True))
        missing = set(activity_ids) - found_ids
        if missing:
            return Response(
                {"error": f"Activities not found in project: {[str(m) for m in missing]}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create job + items atomically
        with transaction.atomic():
            bulk_job = BulkGenerationJob.objects.create(
                project=project,
                created_by=request.user,
                content_type=content_type,
                metadata=metadata,
                total_items=len(activity_ids),
                status=JobStatus.QUEUED,
            )

            items = BulkGenerationItem.objects.bulk_create(
                [
                    BulkGenerationItem(
                        bulk_job=bulk_job,
                        activity=act,
                    )
                    for act in activities
                ]
            )

            # Dispatch Celery task after commit
            from src.bulk_generation.tasks import process_bulk_generation_job

            transaction.on_commit(
                lambda: process_bulk_generation_job.delay(str(bulk_job.id))
            )

        logger.info(
            "bulk_generation_job_created",
            extra={
                "job_id": str(bulk_job.id),
                "content_type": content_type,
                "total_items": len(activity_ids),
            },
        )

        return Response(
            BulkGenerationJobSerializer(bulk_job).data,
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        """Cancel a bulk generation job and all pending items."""
        job = self.get_object()

        if job.status in (JobStatus.COMPLETED, JobStatus.CANCELLED):
            return Response(
                {"error": f"Cannot cancel job with status '{job.status}'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        job.cancel()
        logger.info("bulk_generation_job_cancelled", extra={"job_id": str(job.id)})
        return Response(BulkGenerationJobSerializer(job).data)

    @action(detail=True, methods=["post"], url_path="retry-failed")
    def retry_failed(self, request, pk=None):
        """Retry all failed items in a bulk job."""
        job = self.get_object()

        failed_items = job.items.filter(status=ItemStatus.FAILED)
        count = failed_items.count()
        if count == 0:
            return Response(
                {"error": "No failed items to retry"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Reset failed items to pending
        failed_items.update(
            status=ItemStatus.PENDING,
            error_message="",
            started_at=None,
            completed_at=None,
        )

        # Update job stats and status
        job.status = JobStatus.PROCESSING
        job.failed_items = 0
        job.completed_at = None
        job.save(update_fields=["status", "failed_items", "completed_at", "updated_at"])

        # Re-dispatch
        from src.bulk_generation.tasks import process_bulk_generation_job

        transaction.on_commit(
            lambda: process_bulk_generation_job.delay(str(job.id))
        )

        logger.info(
            "bulk_generation_retry_failed",
            extra={"job_id": str(job.id), "retried_items": count},
        )
        return Response(BulkGenerationJobSerializer(job).data)

    @action(detail=True, methods=["get"], url_path="items")
    def items(self, request, pk=None):
        """List items for a bulk job with status info."""
        job = self.get_object()
        items_qs = job.items.select_related("activity", "video_job")

        # Optional status filter
        item_status = request.query_params.get("status")
        if item_status:
            items_qs = items_qs.filter(status=item_status)

        page = self.paginate_queryset(items_qs)
        if page is not None:
            serializer = BulkGenerationItemListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = BulkGenerationItemSerializer(items_qs, many=True)
        return Response(serializer.data)
