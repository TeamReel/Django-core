"""API views for user-facing in-app notifications."""

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from notifications.models import Notification
from notifications.serializers import (
    UserNotificationSerializer,
    UserNotificationUpdateSerializer,
)


class UserNotificationPagination(PageNumberPagination):
    """Simple pagination for user notifications."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class UserNotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user's in-app notifications.

    - list: GET /api/v1/user-notifications/ - list user's notifications
    - partial_update: PATCH /api/v1/user-notifications/{id}/ - toggle read status
    """

    permission_classes = [IsAuthenticated]
    pagination_class = UserNotificationPagination
    lookup_field = "id"

    def get_queryset(self):
        """Return only current user's in-app notifications."""
        return (
            Notification.objects.select_related("recipient_user")
            .filter(recipient_user=self.request.user, channel="in_app")
            .order_by("-created_at")
        )

    def get_serializer_class(self):
        """Use different serializers for read vs update."""
        if self.action in ["partial_update", "update"]:
            return UserNotificationUpdateSerializer
        return UserNotificationSerializer

    def list(self, request, *args, **kwargs):
        """List user's notifications with pagination."""
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        """Toggle read/unread status."""
        instance = self.get_object()

        # Verify ownership
        if instance.recipient_user != request.user:
            return Response(
                {"detail": "You do not have permission to update this notification."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Return updated notification with read serializer
        output_serializer = UserNotificationSerializer(instance)
        return Response(output_serializer.data)

    def update(self, request, *args, **kwargs):
        """Full update not allowed, only partial."""
        return self.partial_update(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        """Creation not allowed via this endpoint."""
        return Response(
            {"detail": "Creating notifications via API is not supported."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def destroy(self, request, *args, **kwargs):
        """Deletion not allowed for now."""
        return Response(
            {"detail": "Deleting notifications is not supported."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        """Mark all user's notifications as read."""
        updated_count = (
            self.get_queryset().filter(read_at__isnull=True).update(read_at=timezone.now())
        )
        return Response(
            {
                "detail": f"{updated_count} notification(s) marked as read.",
                "updated_count": updated_count,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="mark-all-unread")
    def mark_all_unread(self, request):
        """Mark all user's notifications as unread."""
        updated_count = self.get_queryset().filter(read_at__isnull=False).update(read_at=None)
        return Response(
            {
                "detail": f"{updated_count} notification(s) marked as unread.",
                "updated_count": updated_count,
            },
            status=status.HTTP_200_OK,
        )
