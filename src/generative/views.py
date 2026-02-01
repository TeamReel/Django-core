"""DRF ViewSets for B34 Generative Pipelines API.

This module defines REST API endpoints for:
- GenerationTemplate: CRUD with admin-only modifications and clone action
- GenerationRequest: Submit, list, cancel with async processing
- GenerationOutput: Read-only access to generation results

Constitution Principle VII: DRF standards with versioning and consistent responses.
"""

from typing import Any

from django.db.models import QuerySet
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from .models import GenerationOutput, GenerationRequest, GenerationTemplate
from .permissions import IsOrgAdmin, IsProjectMember, IsRequestOwner
from .serializers import (
    GenerationOutputSerializer,
    GenerationRequestSerializer,
    GenerationTemplateSerializer,
)


class GenerativePagination(PageNumberPagination):
    """Pagination for generative endpoints (20 items/page, max 100)."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class GenerationTemplateViewSet(viewsets.ModelViewSet):
    """Template CRUD with admin-only create/update/delete.

    - List: All active templates in user's organization
    - Retrieve: Single template details
    - Create: Admin-only, auto-set created_by and organisation
    - Update/Patch: Admin-only
    - Delete: Admin-only (soft delete via is_active=False)
    - Clone: Create new version with parent_template FK
    """

    queryset = GenerationTemplate.objects.all()
    serializer_class = GenerationTemplateSerializer
    pagination_class = GenerativePagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["is_active", "is_latest", "parent_template"]
    search_fields = ["name", "description", "slug"]
    ordering_fields = ["created_at", "name", "version"]
    ordering = ["-created_at"]

    def get_permissions(self):
        """Admin-only for create/update/delete, member for read."""
        if self.action in ["create", "update", "partial_update", "destroy", "clone"]:
            return [IsAuthenticated(), IsOrgAdmin()]
        return [IsAuthenticated(), IsProjectMember()]

    def get_queryset(self) -> QuerySet[GenerationTemplate]:
        """Filter by user's organisation and optional project."""
        qs = super().get_queryset()

        # Filter by user's organisation (via membership)
        if self.request.user and self.request.user.is_authenticated:
            from organisations.models import Membership

            membership = (
                Membership.objects.filter(user=self.request.user, is_active=True)
                .select_related("organisation")
                .first()
            )

            if membership:
                qs = qs.filter(organisation=membership.organisation)
            else:
                # User has no active org membership
                qs = qs.none()

        # Optional: Filter by project (extend model later with project FK)
        project_id = self.request.query_params.get("project")
        if project_id:
            # Future: Add project FK to template or use many-to-many
            pass

        # Use select_related for performance
        qs = qs.select_related("organisation", "created_by", "parent_template")

        return qs

    def perform_create(self, serializer: GenerationTemplateSerializer) -> None:
        """Auto-set created_by and organisation from request user."""
        from organisations.models import Membership

        membership = (
            Membership.objects.filter(user=self.request.user, is_active=True)
            .select_related("organisation")
            .first()
        )

        if not membership:
            from rest_framework.exceptions import ValidationError

            raise ValidationError({"organisation": "User must be a member of an organisation"})

        serializer.save(created_by=self.request.user, organisation=membership.organisation)

    def perform_destroy(self, instance: GenerationTemplate) -> None:
        """Soft delete by setting is_active=False."""
        instance.is_active = False
        instance.save()

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsOrgAdmin])
    def clone(self, request: Request, pk: str | None = None) -> Response:
        """Clone template to create new version.

        Creates a new template with:
        - parent_template = original template
        - version = bumped (X.Y.Z → X.Y+1.0)
        - is_latest = True (original is_latest stays True)
        """
        parent = self.get_object()

        # Build new template data
        data = request.data.copy()
        data["parent_template"] = parent.id

        # Auto-bump version if not provided
        if "version" not in data:
            try:
                major, minor, patch = parent.version.split(".")
                data["version"] = f"{major}.{int(minor) + 1}.0"
            except ValueError:
                # Fallback if version format is unexpected
                data["version"] = "1.0.0"

        # Clone input_schema and pipeline_config if not overridden
        if "input_schema" not in data:
            data["input_schema"] = parent.input_schema
        if "pipeline_config" not in data:
            data["pipeline_config"] = parent.pipeline_config

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        return Response(serializer.data, status=status.HTTP_201_CREATED)


class GenerationRequestViewSet(viewsets.ModelViewSet):
    """Request submission and tracking.

    - List: User's requests with optional status/template filters
    - Retrieve: Single request details
    - Create: Submit new request (async processing via Celery)
    - Cancel: Cancel pending/processing request with credit refund
    - Delete: Disabled (use cancel instead)
    """

    queryset = GenerationRequest.objects.all()
    serializer_class = GenerationRequestSerializer
    pagination_class = GenerativePagination
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["status", "template", "project", "error_category"]
    ordering_fields = ["created_at", "completed_at", "actual_cost"]
    ordering = ["-created_at"]
    http_method_names = ["get", "post", "patch", "head", "options"]  # No PUT/DELETE

    def get_permissions(self):
        """Authenticated + project member + request owner."""
        return [IsAuthenticated(), IsProjectMember(), IsRequestOwner()]

    def get_queryset(self) -> QuerySet[GenerationRequest]:
        """Filter by requester (user can only see own requests)."""
        qs = super().get_queryset()

        # Filter by requester
        if self.request.user:
            qs = qs.filter(requester=self.request.user)

        # Optional project filter
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)

        # Use select_related for performance
        qs = qs.select_related("template", "requester", "project")

        return qs

    def create(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Submit generation request and dispatch to Celery.

        Returns HTTP 202 Accepted with request details.
        Processing happens asynchronously via Celery task.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Create request with requester
        generation_request = serializer.save(requester=request.user)

        # Dispatch async processing (task implemented in WP04)
        try:
            from src.generative.tasks import process_generation_request

            process_generation_request.delay(generation_request.id)
        except ImportError:
            # Task not yet implemented (WP04), continue without error
            pass

        # Return 202 Accepted
        return Response(
            GenerationRequestSerializer(generation_request).data,
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=["post"])
    def cancel(self, request: Request, pk: str | None = None) -> Response:
        """Cancel pending or processing request.

        - Sets status to 'cancelled'
        - Refunds reserved credits (WP05 implementation)
        - Only works for pending/processing requests
        """
        obj = self.get_object()

        # Check if request can be cancelled
        if obj.status not in ["pending", "processing"]:
            return Response(
                {
                    "error_code": "CANNOT_CANCEL",
                    "message": f"Request with status '{obj.status}' cannot be cancelled",
                    "details": {"current_status": obj.status},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update status
        obj.mark_cancelled()

        # Refund credits (WP05 implementation)
        try:
            from src.credits.services import refund_transaction

            if obj.transaction_id:
                refund_transaction(obj.transaction_id)
        except ImportError:
            # Credits service not yet implemented
            pass

        return Response(GenerationRequestSerializer(obj).data, status=status.HTTP_200_OK)

    def destroy(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Prevent DELETE, use cancel instead."""
        return Response(
            {
                "error_code": "METHOD_NOT_ALLOWED",
                "message": "Use POST /requests/{id}/cancel/ to cancel a request",
                "details": {"allowed_methods": ["GET", "POST /requests/{id}/cancel/"]},
            },
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )


class GenerationOutputViewSet(viewsets.ReadOnlyModelViewSet):
    """Output retrieval (read-only).

    - List: User's outputs with optional filters
    - Retrieve: Single output with presigned URL (if file)
    """

    queryset = GenerationOutput.objects.all()
    serializer_class = GenerationOutputSerializer
    pagination_class = GenerativePagination
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["output_type", "request__template", "request__project"]
    ordering_fields = ["created_at", "expires_at"]
    ordering = ["-created_at"]

    def get_permissions(self):
        """Authenticated + request owner."""
        return [IsAuthenticated(), IsRequestOwner()]

    def get_queryset(self) -> QuerySet[GenerationOutput]:
        """Filter by request ownership (user's outputs only)."""
        qs = super().get_queryset()

        # Filter by request requester
        if self.request.user:
            qs = qs.filter(request__requester=self.request.user)

        # Use select_related for performance
        qs = qs.select_related("request", "request__template", "request__requester")

        return qs
