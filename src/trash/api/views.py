"""Trash API views."""

from django.db.models import Count
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from trash.models import TrashItem

from .serializers import TrashItemSerializer, TrashStatsSerializer


class TrashPagination(PageNumberPagination):
    page_size = 20
    max_page_size = 100


class IsOrgAdmin(permissions.BasePermission):
    """Permission: restore = owner or admin, permanent delete = admin only."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        # Restore: allowed for the user who deleted the item or org admin
        if view.action == "restore":
            if obj.deleted_by == request.user:
                return True

        # All write actions: org admin check
        from organisations.models import Membership

        return Membership.objects.filter(
            organisation=obj.organisation,
            user=request.user,
            role="admin",
        ).exists()


class TrashViewSet(viewsets.GenericViewSet):
    """
    ViewSet for the unified trash/recycle bin.

    Endpoints:
    - GET /api/v1/trash/ — List trashed items (org-scoped)
    - POST /api/v1/trash/{id}/restore/ — Restore item
    - DELETE /api/v1/trash/{id}/ — Permanent delete (admin only)
    - POST /api/v1/trash/empty/ — Empty all expired trash (admin only)
    - GET /api/v1/trash/stats/ — Trash statistics per content type
    """

    serializer_class = TrashItemSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrgAdmin]
    pagination_class = TrashPagination
    lookup_field = "pk"

    def get_queryset(self):
        """Org-scoped trash items with related data prefetched."""
        user = self.request.user

        # Get all organisations the user is a member of
        from organisations.models import Membership

        user_org_ids = Membership.objects.filter(user=user, is_active=True).values_list(
            "organisation_id", flat=True
        )

        return TrashItem.objects.filter(organisation_id__in=user_org_ids).select_related(
            "content_type", "deleted_by", "organisation"
        )

    def list(self, request):
        """List trashed items for current organisation."""
        queryset = self.get_queryset()

        # Optional filter by content type
        ct_id = request.query_params.get("content_type")
        if ct_id:
            queryset = queryset.filter(content_type_id=ct_id)

        # Optional filter by original object ID (for undo operations)
        object_id = request.query_params.get("object_id")
        if object_id:
            queryset = queryset.filter(object_id=object_id)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def destroy(self, request, pk=None):
        """Permanently delete a trashed item (admin only)."""
        trash_item = self.get_object()
        self._permanent_delete_item(trash_item)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        """Restore a soft-deleted item from trash."""
        trash_item = self.get_object()
        obj = trash_item.content_object

        if obj is None:
            trash_item.delete()
            return Response(
                {"detail": "Original object no longer exists."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Restore the original object (signal will clean up TrashItem)
        if hasattr(obj, "restore"):
            obj.restore()
        else:
            obj.deleted_at = None
            obj.deleted_by = None
            obj.save(update_fields=["deleted_at", "deleted_by"])

        return Response({"detail": "Item restored."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"])
    def empty(self, request):
        """Permanently delete all expired trash items (admin only)."""
        from organisations.models import Membership

        # Get organisations where user is admin
        admin_org_ids = Membership.objects.filter(
            user=request.user, role="admin", is_active=True
        ).values_list("organisation_id", flat=True)

        if not admin_org_ids:
            return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)

        # Delete all trash for orgs where user is admin
        queryset = TrashItem.objects.filter(organisation_id__in=admin_org_ids)
        count = 0
        for item in queryset.iterator():
            self._permanent_delete_item(item)
            count += 1

        return Response(
            {"detail": f"{count} items permanently deleted."}, status=status.HTTP_200_OK
        )

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Return trash statistics per content type."""
        queryset = self.get_queryset()
        stats = (
            queryset.values("content_type__app_label", "content_type__model")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        total = queryset.count()
        result = [
            {
                "content_type": f"{s['content_type__app_label']}.{s['content_type__model']}",
                "count": s["count"],
                "total": total,
            }
            for s in stats
        ]

        serializer = TrashStatsSerializer(result, many=True)
        return Response(serializer.data)

    @staticmethod
    def _permanent_delete_item(trash_item: TrashItem) -> None:
        """Permanently delete the original object and the TrashItem."""
        obj = trash_item.content_object
        if obj is not None:
            if hasattr(obj, "permanent_delete"):
                obj.permanent_delete()
            else:
                obj.delete()
        trash_item.delete()
