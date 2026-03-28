"""DRF ViewSets for B34 Generative Pipelines API.

This module defines REST API endpoints for:
- GenerationTemplate: CRUD with admin-only modifications and clone action
- GenerationRequest: Submit, list, cancel with async processing
- GenerationOutput: Read-only access to generation results

Constitution Principle VII: DRF standards with versioning and consistent responses.
"""

from typing import Any

from django.db import connection
from django.db.models import QuerySet
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
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

    queryset = GenerationRequest.objects.select_related(
        "template", "requester", "project"
    ).all()
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

        return qs

    def create(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Submit generation request and dispatch to Celery.

        Returns HTTP 202 Accepted with request details.
        Processing happens asynchronously via Celery task.

        Raises:
            PaymentRequired (HTTP 402): If user has insufficient credits
        """
        from decimal import Decimal

        from django.db import transaction as db_transaction

        from organisations.models import Membership

        from .exceptions import PaymentRequired
        from .credit_service import GenerationCreditService, InsufficientCreditsException

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Get organisation and project from user context
        membership = (
            Membership.objects.filter(user=request.user, is_active=True)
            .select_related("organisation")
            .first()
        )

        if not membership:
            return Response(
                {
                    "error_code": "NO_ORGANISATION",
                    "message": "User has no active organisation membership",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        organisation = membership.organisation
        project = serializer.validated_data.get("project")
        template = serializer.validated_data["template"]

        # Get estimated cost from template config (default to 0 if not set)
        estimated_cost = Decimal(str(template.pipeline_config.get("estimated_cost", 0.0)))

        # Reserve credits and create request atomically
        try:
            with db_transaction.atomic():
                # Create request first to get ID for idempotency key
                generation_request = serializer.save(
                    requester=request.user,
                    estimated_cost=estimated_cost,
                )

                # Reserve credits
                transaction_id = GenerationCreditService.reserve_credits(
                    user=request.user,
                    organisation=organisation,
                    project=project,
                    amount=estimated_cost,
                    description=f"Generation: {template.name} (Request {generation_request.id})",
                    idempotency_key=f"gen-req-{generation_request.id}",
                )

                # Store transaction ID
                generation_request.transaction_id = transaction_id
                generation_request.save(update_fields=["transaction_id"])

                # Dispatch async processing (task implemented in WP04)
                try:
                    from src.generative.tasks import process_generation_request

                    process_generation_request.delay(generation_request.id)
                except ImportError:
                    # Task not yet implemented (WP04), continue without error
                    pass

        except InsufficientCreditsException as e:
            # Convert to HTTP 402 Payment Required
            raise PaymentRequired(
                detail={
                    "error_code": "INSUFFICIENT_CREDITS",
                    "message": str(e),
                    "details": {
                        "current_balance": float(e.current_balance),
                        "required_amount": float(e.required_amount),
                    },
                }
            )

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
        from django.db import transaction as db_transaction

        from organisations.models import Membership

        from .credit_service import GenerationCreditService

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

        # Atomic cancel + refund
        with db_transaction.atomic():
            # Update status
            obj.mark_cancelled()

            # Refund credits
            if obj.transaction_id:
                # Get organisation from user's active membership
                membership = (
                    Membership.objects.filter(user=request.user, is_active=True)
                    .select_related("organisation")
                    .first()
                )

                if membership:
                    try:
                        GenerationCreditService.refund_credits(
                            transaction_id=obj.transaction_id,
                            reason="Request cancelled by user",
                            user=request.user,
                            organisation=membership.organisation,
                        )
                    except Exception as e:
                        # Log but don't fail (credit refund is best-effort)
                        import logging

                        logger = logging.getLogger(__name__)
                        logger.error(
                            "Failed to refund credits for request %s: %s",
                            obj.id,
                            str(e),
                            exc_info=True,
                        )
                else:
                    import logging

                    logger = logging.getLogger(__name__)
                    logger.warning(
                        "Cannot refund credits: user %s has no active membership",
                        request.user.id,
                    )

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

    queryset = GenerationOutput.objects.select_related(
        "request", "request__template", "request__requester"
    ).all()
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

        return qs


# ==============================================================================
# WP07: Operational Endpoints
# ==============================================================================


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request: Request) -> Response:
    """Health check endpoint for monitoring and load balancers.

    WP07 T061: Health Check Endpoint

    Performs basic checks:
    - Database connectivity
    - Celery worker availability (optional)

    Returns:
        200 OK: Service healthy
        503 Service Unavailable: Service unhealthy

    Example:
        GET /api/v1/generative/health/
        {
            "status": "healthy",
            "database": "ok",
            "celery": "ok"
        }
    """
    health_status = {"status": "healthy"}

    try:
        # Check database connectivity
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        health_status["database"] = "ok"

        # Check Celery workers (optional, non-blocking)
        try:
            from celery import current_app

            inspect = current_app.control.inspect()
            stats = inspect.stats()

            if stats and len(stats) > 0:
                health_status["celery"] = "ok"
                health_status["celery_workers"] = len(stats)
            else:
                health_status["celery"] = "no_workers"
                health_status["status"] = "degraded"

        except Exception as celery_error:  # noqa: BLE001
            health_status["celery"] = "unavailable"
            health_status["celery_error"] = str(celery_error)
            # Don't fail health check if Celery is down
            # (allows graceful degradation)

        # Return 200 if healthy or degraded
        status_code = status.HTTP_200_OK

    except Exception as e:
        # Database failure = service unavailable
        health_status["status"] = "unhealthy"
        health_status["database"] = "error"
        health_status["error"] = str(e)
        status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return Response(health_status, status=status_code)
