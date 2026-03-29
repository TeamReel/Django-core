"""API views for notifications."""

from django.db.models import Count
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from permissions.audit import evaluate_permission
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from notifications.filters import NotificationFilter
from notifications.models import Notification
from notifications.pagination import NotificationPagination
from notifications.permissions import IsOwnerOrAdmin
from notifications.serializers import (
    NotificationListSerializer,
    NotificationSerializer,
)


class HasNotificationPermission(IsAuthenticated):
    """
    Custom permission class for notification endpoints.

    Integrates with B08 hierarchical ACL via evaluate_permission()
    for comprehensive audit logging and ACL bypass prevention (WP03).

    Checks 'notifications.view' permission for all read operations.
    """

    required_permission = "notifications.view"

    def has_permission(self, request, view):
        """Check if user has notification view permission."""
        # First verify authentication
        if not super().has_permission(request, view):
            return False

        # Use centralized evaluator for audit logging (WP01)
        try:
            has_perm = evaluate_permission(
                user=request.user,
                permission=self.required_permission,
                resource=None,
                context={
                    "scope": "USER",
                    "request_id": request.META.get("HTTP_X_REQUEST_ID"),
                    "endpoint": f"{view.__class__.__name__}.{view.action or 'list'}",
                },
            )
        except Exception:
            # Fail closed on evaluation errors
            has_perm = False

        if not has_perm:
            # Raise structured 403 response (WP06-T036)
            raise PermissionDenied(
                {
                    "error": "forbidden",
                    "permission": self.required_permission,
                    "detail": f"Permission denied: '{self.required_permission}' required",
                    "scope": "USER",
                }
            )

        return has_perm


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
    - ACL enforcement via HasNotificationPermission (WP03)
    """

    queryset = Notification.objects.all()
    pagination_class = NotificationPagination
    permission_classes = [HasNotificationPermission, IsOwnerOrAdmin]  # ✅ ACL enforcement
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

        ARCHITECTURAL NOTE (WP03):
        B16 notifications use USER-SCOPED isolation, not org/project-scoped.

        The Notification model only has a `recipient_user` ForeignKey - it does NOT
        have `organization` or `project` ForeignKey fields. This architectural decision
        means notifications are personal to individual users, not shared at the
        organization or project level.

        Tenant isolation strategy:
        - In-app notifications: Filtered by `recipient_user=request.user`
        - Users can ONLY see their own notifications (strict user-scoping)
        - Staff/superuser bypass is intentional for admin operations

        Why user-scoped (not org/project-scoped)?
        1. Notifications represent personal delivery events (email sent, webhook fired)
        2. No business requirement for shared/organization-wide notification viewing
        3. Simpler data model aligns with notification service architecture
        4. If org/project context is needed, it's stored in `metadata` JSONField

        Security: User-scoping provides complete tenant isolation - users cannot
        enumerate or access other users' notifications even if they share an organization.

        Query optimizations:
        - select_related: type, type.retry_policy (1 JOIN)
        - prefetch_related: delivery_attempts (detail view only)
        - annotate: attempts_count (list view)
        """
        queryset = super().get_queryset()

        # Filter by user ownership (for in-app notifications)
        if not (self.request.user.is_staff or self.request.user.is_superuser):
            # Non-admin users only see their own in-app notifications
            queryset = queryset.filter(channel="in_app", recipient_user=self.request.user)

        # Always optimize type relationship
        queryset = queryset.select_related("type", "type__retry_policy")

        # List view: annotate attempt count
        if self.action == "list":
            queryset = queryset.annotate(attempts_count=Count("delivery_attempts"))
        # Detail view: prefetch delivery attempts
        else:
            queryset = queryset.prefetch_related("delivery_attempts")

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
        # Clear ordering to ensure correct aggregation
        queryset = queryset.order_by()

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

    @extend_schema(
        summary="Mark notification as read",
        description="Mark a single in-app notification as read by setting read_at timestamp.",
        responses={200: {"type": "object"}},
    )
    @action(detail=True, methods=["put", "patch"])
    def mark_read(self, request, pk=None):
        """
        Mark notification as read.

        Updates read_at timestamp for in-app notifications.
        Only works for in-app channel.
        """
        notification = self.get_object()

        # Validate channel
        if notification.channel != "in_app":
            return Response(
                {"error": "Only in-app notifications can be marked as read"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Mark as read (idempotent)
        if not notification.read_at:
            notification.read_at = timezone.now()
            notification.save(update_fields=["read_at"])

        return Response(
            {
                "id": str(notification.id),
                "status": "read",
                "read_at": notification.read_at,
            }
        )

    @extend_schema(
        summary="Mark all notifications as read",
        description="Bulk mark all unread in-app notifications as read for current user.",
        responses={200: {"type": "object"}},
    )
    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        """
        Mark all unread notifications as read.

        Bulk operation for current user's in-app notifications.
        Returns count of notifications marked as read.
        """
        # Get unread in-app notifications for user
        unread_notifications = Notification.objects.filter(
            channel="in_app",
            recipient_user=request.user,
            read_at__isnull=True,
        )

        # Bulk update read_at
        count = unread_notifications.update(read_at=timezone.now())

        return Response(
            {
                "status": "success",
                "marked_read": count,
                "timestamp": timezone.now(),
            }
        )
