"""API views for notifications."""

from django.db.models import Count
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from notifications.filters import NotificationFilter
from notifications.models import Notification
from notifications.pagination import NotificationPagination
from notifications.serializers import (
    NotificationListSerializer,
    NotificationSerializer,
)


@extend_schema_view(
    list=extend_schema(
        summary="List notifications",
        description="List all notifications with pagination and filtering support.",
        parameters=[
            OpenApiParameter(
                name="status",
                description="Filter by notification status",
                required=False,
                type=str,
                enum=["pending", "sent", "failed", "read"],
            ),
            OpenApiParameter(
                name="channel",
                description="Filter by delivery channel",
                required=False,
                type=str,
                enum=["email", "in_app", "webhook"],
            ),
            OpenApiParameter(
                name="type",
                description="Filter by notification type code (case-insensitive)",
                required=False,
                type=str,
            ),
            OpenApiParameter(
                name="recipient",
                description="Search recipient (partial match)",
                required=False,
                type=str,
            ),
            OpenApiParameter(
                name="date_from",
                description="Filter notifications created after this date",
                required=False,
                type=str,
            ),
            OpenApiParameter(
                name="date_to",
                description="Filter notifications created before this date",
                required=False,
                type=str,
            ),
            OpenApiParameter(
                name="search",
                description="Search across recipient, type code, and type name",
                required=False,
                type=str,
            ),
            OpenApiParameter(
                name="page_size",
                description="Number of results per page (max 100)",
                required=False,
                type=int,
            ),
        ],
    ),
    retrieve=extend_schema(
        summary="Get notification details",
        description="Retrieve a single notification with full delivery attempt history.",
    ),
)
class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API viewset for querying notification history.

    Provides:
    - List view with lightweight serializer (no delivery attempts)
    - Detail view with full delivery attempt history
    - Filtering by status, type, date_range, recipient
    - Pagination (50/page, max 100)
    - Query optimization (select_related, prefetch_related)
    """

    queryset = Notification.objects.all()
    pagination_class = NotificationPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = NotificationFilter
    ordering_fields = ["created_at", "updated_at", "status"]
    ordering = ["-created_at"]  # Default: newest first

    def get_serializer_class(self):
        """Use lightweight serializer for list, full serializer for detail."""
        if self.action == "list":
            return NotificationListSerializer
        return NotificationSerializer

    def get_queryset(self):
        """
        Optimize queries with select_related and prefetch_related.

        - select_related: type, type.retry_policy (1 JOIN)
        - prefetch_related: delivery_attempts (detail view only)
        - annotate: attempts_count (list view)
        """
        queryset = super().get_queryset()

        # Always optimize type relationship
        queryset = queryset.select_related("type", "type__retry_policy")

        # List view: annotate attempt count
        if self.action == "list":
            queryset = queryset.annotate(attempts_count=Count("deliveryattempt"))
        # Detail view: prefetch delivery attempts
        else:
            queryset = queryset.prefetch_related("deliveryattempt_set")

        return queryset

    @extend_schema(
        summary="Notification statistics",
        description=(
            "Get aggregated notification statistics by status and channel "
            "with optional filtering."
        ),
        responses={200: {"type": "object"}},
    )
    @action(detail=False, methods=["get"])
    def stats(self, request):
        """
        Get notification statistics summary.

        Returns:
        - Total notifications
        - Count by status
        - Count by channel
        """
        queryset = self.filter_queryset(self.get_queryset())

        stats = {
            "total": queryset.count(),
            "by_status": {},
            "by_channel": {},
        }

        # Group by status
        for status_data in queryset.values("status").annotate(count=Count("id")):
            stats["by_status"][status_data["status"]] = status_data["count"]

        # Group by channel
        for channel_data in queryset.values("channel").annotate(count=Count("id")):
            stats["by_channel"][channel_data["channel"]] = channel_data["count"]

        return Response(stats)
