"""
B31 Content Templates & Generation - DRF ViewSets

API views for ContentTemplate, ContentItem, and ContentApproval with custom actions
for duplicate detection, status polling, and retry logic.
"""

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import ContentApproval, ContentItem, ContentStatus, ContentTemplate
from .serializers import (
    ContentApprovalSerializer,
    ContentItemSerializer,
    ContentTemplateSerializer,
)


class ContentTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ContentTemplate management

    List, create, retrieve, update, and delete content templates.
    """

    queryset = ContentTemplate.objects.select_related("organisation", "project", "created_by")
    serializer_class = ContentTemplateSerializer
    filterset_fields = ["template_type", "sport_type", "is_active", "organisation", "project"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ContentItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ContentItem management with duplicate detection,
    status polling, and retry functionality.
    """

    serializer_class = ContentItemSerializer
    filterset_fields = ["project", "status", "template", "activity"]

    def get_queryset(self):
        return ContentItem.objects.active().select_related(
            "template", "project", "activity", "output_file", "created_by"
        )

    def create(self, request, *args, **kwargs):
        """
        Create ContentItem with duplicate detection warning.

        Returns 200 with warning if in-progress duplicate exists,
        201 on successful creation with queued Celery task.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Check for existing in-progress generation (duplicate detection)
        template_id = serializer.validated_data["template"].id
        activity_id = (
            serializer.validated_data.get("activity").id
            if serializer.validated_data.get("activity")
            else None
        )

        existing = (
            ContentItem.objects.filter(
                template_id=template_id,
                activity_id=activity_id,
                status__in=[ContentStatus.QUEUED, ContentStatus.GENERATING],
            )
            .filter(deleted_at__isnull=True)
            .first()
        )

        if existing:
            # Warning response but allow user to proceed
            return Response(
                {
                    "warning": "A generation for this template and activity is already in progress",
                    "existing_item_id": existing.id,
                    "existing_status": existing.status,
                    "proceed": True,
                },
                status=status.HTTP_200_OK,
            )

        # Create ContentItem with status "queued"
        content_item = serializer.save(created_by=request.user, status=ContentStatus.QUEUED)

        # Queue Celery task
        from .tasks import generate_content_task

        generate_content_task.delay(content_item.id)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=["get"], url_path="status")
    def get_status(self, request, pk=None):
        """
        Get current generation status for polling (WebSocket fallback).

        Returns status and progress metadata if available.
        """
        item = self.get_object()

        response_data = {
            "id": item.id,
            "status": item.status,
            "updated_at": item.updated_at,
        }

        # Add progress if available in metadata
        if "progress_percent" in item.metadata:
            response_data["progress_percent"] = item.metadata["progress_percent"]
        if "estimated_completion_seconds" in item.metadata:
            response_data["estimated_completion_seconds"] = item.metadata[
                "estimated_completion_seconds"
            ]
        if item.error_message:
            response_data["error_message"] = item.error_message

        return Response(response_data)

    @action(detail=True, methods=["post"], url_path="retry")
    def retry(self, request, pk=None):
        """
        Re-queue failed or rejected content generation.

        Only allows retry for FAILED or REJECTED status.
        """
        item = self.get_object()

        if item.status not in [ContentStatus.FAILED, ContentStatus.REJECTED]:
            return Response(
                {"error": f'Cannot retry content item with status "{item.status}"'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Reset status to queued
        item.status = ContentStatus.QUEUED
        item.error_message = None
        item.save()

        # Re-queue Celery task
        from .tasks import generate_content_task

        generate_content_task.delay(item.id)

        return Response({"id": item.id, "status": item.status, "message": "Generation re-queued"})


class ContentApprovalViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ContentApproval management

    Create, retrieve, and list approval records.
    """

    queryset = ContentApproval.objects.select_related(
        "content_item", "content_item__template", "reviewer"
    )
    serializer_class = ContentApprovalSerializer
    filterset_fields = ["content_item", "status", "reviewer"]

    def perform_create(self, serializer):
        serializer.save(reviewer=self.request.user)
