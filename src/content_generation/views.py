"""
B31 Content Templates & Generation - DRF ViewSets

API views for ContentTemplate, ContentItem, and ContentApproval with custom actions
for duplicate detection, status polling, and retry logic.
"""

from django.http import HttpResponseRedirect
from django_filters import rest_framework as filters
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from .models import ContentApproval, ContentItem, ContentStatus, ContentTemplate
from .permissions import (
    ContentApprovalPermissionMixin,
    ContentItemPermissionMixin,
    ContentTemplatePermissionMixin,
)
from .serializers import (
    ContentApprovalSerializer,
    ContentItemSerializer,
    ContentTemplateSerializer,
)


class ContentItemPagination(PageNumberPagination):
    """
    Pagination for ContentItem list views.

    Supports page_size parameter with default of 50 and max of 200.
    """

    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200


class ContentTemplateFilter(filters.FilterSet):
    """
    Filter for ContentTemplate queries.

    Supports filtering by sport, sport_type, is_active, project, organisation, and template_type.
    """

    sport = filters.NumberFilter(field_name="sport")
    sport_type = filters.CharFilter(field_name="sport_type")
    is_active = filters.BooleanFilter(field_name="is_active")
    project = filters.NumberFilter(field_name="project")
    organisation = filters.NumberFilter(field_name="organisation")
    template_type = filters.CharFilter(field_name="template_type")

    class Meta:
        model = ContentTemplate
        fields = ["sport", "sport_type", "is_active", "project", "organisation", "template_type"]


class ContentItemFilter(filters.FilterSet):
    """
    Filter for ContentItem queries.

    Supports filtering by project, status, template, activity, and created_by.
    Includes date range filters for created_at.
    """

    project = filters.NumberFilter(field_name="project")
    status = filters.CharFilter(field_name="status")
    template = filters.NumberFilter(field_name="template")
    activity = filters.NumberFilter(field_name="activity")
    created_by = filters.NumberFilter(field_name="created_by")
    created_at_after = filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_at_before = filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")

    class Meta:
        model = ContentItem
        fields = [
            "project",
            "status",
            "template",
            "activity",
            "created_by",
            "created_at_after",
            "created_at_before",
        ]


class ContentTemplateViewSet(ContentTemplatePermissionMixin, viewsets.ModelViewSet):
    """
    ViewSet for ContentTemplate management

    List, create, retrieve, update, and delete content templates.
    Includes delete protection for templates with existing ContentItems.
    Requires content.manage_templates permission.

    Global templates (organisation=NULL) are visible to all users but
    can only be edited by superusers.
    """

    serializer_class = ContentTemplateSerializer
    filterset_class = ContentTemplateFilter

    def get_queryset(self):
        """
        Return templates for the organisation + global templates (organisation=NULL).

        Global templates are system-seeded and available to all organisations.
        """
        from django.db.models import Q

        qs = ContentTemplate.objects.select_related(
            "organisation", "project", "created_by", "sport", "formation"
        )

        # If organisation filter is specified, include both org templates AND global templates
        org_id = self.request.query_params.get("organisation")
        if org_id:
            qs = qs.filter(Q(organisation_id=org_id) | Q(organisation__isnull=True))

        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        """
        Override delete to prevent deletion of templates with existing ContentItems.

        Returns 400 Bad Request if the template has any associated content items.
        """
        template = self.get_object()

        # Check if any ContentItems exist (including soft-deleted)
        content_items_count = template.contentitem_set.count()
        if content_items_count > 0:
            return Response(
                {
                    "error": "Cannot delete template with existing content items",
                    "content_items_count": content_items_count,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().destroy(request, *args, **kwargs)


class ContentItemViewSet(ContentItemPermissionMixin, viewsets.ModelViewSet):
    """
    ViewSet for ContentItem management with duplicate detection,
    status polling, and retry functionality.

    Supports pagination (default 50, max 200) and filtering by
    project, status, template, activity, created_by, and date range.

    Permissions:
    - list/retrieve/get_status: content.view_library
    - create/retry: content.generate_content
    - approve/reject/request_revision: content.approve_content
    - download: content.download_content
    """

    serializer_class = ContentItemSerializer
    pagination_class = ContentItemPagination
    filterset_class = ContentItemFilter

    def get_queryset(self):
        return (
            ContentItem.objects.active()
            .select_related("template", "project", "activity", "output_file", "created_by")
            .prefetch_related("contentapproval_set")
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

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        """
        Approve completed content.

        Creates ContentApproval with status='approved' and updates
        ContentItem status to 'approved'. Sends B17 notification.
        """
        item = self.get_object()

        # Validate content is completed
        if item.status != ContentStatus.COMPLETED:
            return Response(
                {
                    "error": (
                        f'Cannot approve content with status "{item.status}". '
                        "Only completed content can be approved."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create approval record
        approval = ContentApproval.objects.create(
            content_item=item,
            reviewer=request.user,
            status="approved",
            feedback_text=request.data.get("feedback_text", ""),
        )

        # Update ContentItem status
        item.status = ContentStatus.APPROVED
        item.save()

        # Send B17 notification
        from .tasks import send_notification_b17

        try:
            send_notification_b17(
                user=item.created_by,
                notification_type="content_approved",
                message=(
                    f"Your content '{item.template.name}' has been approved "
                    f"by {request.user.username}"
                ),
                related_object_type="ContentItem",
                related_object_id=item.id,
            )
        except Exception as e:
            # Log but don't fail the approval
            import logging

            logging.warning(f"Failed to send approval notification: {e}")

        return Response(
            {
                "id": item.id,
                "status": item.status,
                "approval_id": approval.id,
                "message": "Content approved successfully",
            }
        )

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        """
        Reject completed content with feedback.

        Requires feedback_text. Creates ContentApproval with status='rejected'
        and updates ContentItem status to 'rejected'. Sends B17 notification.
        """
        item = self.get_object()

        # Validate content is completed
        if item.status != ContentStatus.COMPLETED:
            return Response(
                {
                    "error": (
                        f'Cannot reject content with status "{item.status}". '
                        "Only completed content can be rejected."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate feedback is provided
        feedback_text = request.data.get("feedback_text", "").strip()
        if not feedback_text:
            return Response(
                {"error": "feedback_text is required when rejecting content"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create approval record
        approval = ContentApproval.objects.create(
            content_item=item,
            reviewer=request.user,
            status="rejected",
            feedback_text=feedback_text,
        )

        # Update ContentItem status
        item.status = ContentStatus.REJECTED
        item.save()

        # Send B17 notification
        from .tasks import send_notification_b17

        try:
            send_notification_b17(
                user=item.created_by,
                notification_type="content_rejected",
                message=(
                    f"Your content '{item.template.name}' was rejected "
                    f"by {request.user.username}: {feedback_text}"
                ),
                related_object_type="ContentItem",
                related_object_id=item.id,
            )
        except Exception as e:
            import logging

            logging.warning(f"Failed to send rejection notification: {e}")

        return Response(
            {
                "id": item.id,
                "status": item.status,
                "approval_id": approval.id,
                "feedback": feedback_text,
                "message": "Content rejected",
            }
        )

    @action(detail=True, methods=["post"], url_path="request-revision")
    def request_revision(self, request, pk=None):
        """
        Request revision for completed content with feedback.

        Requires feedback_text. Creates ContentApproval with
        status='revision_requested' and updates ContentItem status.
        Sends B17 notification.
        """
        item = self.get_object()

        # Validate content is completed
        if item.status != ContentStatus.COMPLETED:
            return Response(
                {
                    "error": (
                        f'Cannot request revision for content with status "{item.status}". '
                        "Only completed content can have revision requested."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate feedback is provided
        feedback_text = request.data.get("feedback_text", "").strip()
        if not feedback_text:
            return Response(
                {"error": "feedback_text is required when requesting revision"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create approval record
        approval = ContentApproval.objects.create(
            content_item=item,
            reviewer=request.user,
            status="revision_requested",
            feedback_text=feedback_text,
        )

        # Update ContentItem status
        item.status = ContentStatus.REVISION_REQUESTED
        item.save()

        # Send B17 notification
        from .tasks import send_notification_b17

        try:
            send_notification_b17(
                user=item.created_by,
                notification_type="content_revision_requested",
                message=(
                    f"Revision requested for '{item.template.name}' "
                    f"by {request.user.username}: {feedback_text}"
                ),
                related_object_type="ContentItem",
                related_object_id=item.id,
            )
        except Exception as e:
            import logging

            logging.warning(f"Failed to send revision request notification: {e}")

        return Response(
            {
                "id": item.id,
                "status": item.status,
                "approval_id": approval.id,
                "feedback": feedback_text,
                "message": "Revision requested",
            }
        )

    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        """
        Download the output file for a completed content item.

        Redirects to the file URL if output_file exists.
        Returns 404 if no output file is available.
        """
        item = self.get_object()

        if not item.output_file or not item.output_file.file:
            return Response(
                {"error": "No output file available for this content item"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Redirect to the file URL
        return HttpResponseRedirect(item.output_file.file.url)


class ContentApprovalViewSet(ContentApprovalPermissionMixin, viewsets.ModelViewSet):
    """
    ViewSet for ContentApproval management

    Create, retrieve, and list approval records.

    Permissions:
    - list/retrieve: content.view_library
    - create/update/delete: content.approve_content
    """

    queryset = ContentApproval.objects.select_related(
        "content_item", "content_item__template", "reviewer"
    )
    serializer_class = ContentApprovalSerializer
    filterset_fields = ["content_item", "status", "reviewer"]

    def perform_create(self, serializer):
        serializer.save(reviewer=self.request.user)
