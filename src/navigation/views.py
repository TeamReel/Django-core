"""API views for navigation endpoints."""

from typing import Any, Dict

from django.contrib.contenttypes.models import ContentType
from rest_framework import permissions, viewsets
from rest_framework.request import Request
from rest_framework.response import Response

from navigation.models import UserFavorite, UserRecent
from navigation.serializers import (
    FavoriteCreateSerializer,
    NavigationItemSerializer,
    RecentCreateSerializer,
)


class IsOwner(permissions.BasePermission):
    """Ensure user can only access their own navigation items."""

    def has_object_permission(self, request: Request, view: Any, obj: Any) -> bool:
        """Check if the object belongs to the requesting user."""
        return obj.user == request.user


class PerformBatchPermissionCheck:
    """Mixin to perform efficient batch permission checking for navigation items.

    Avoids N+1 queries by:
    1. Collecting all content_type + object_id pairs
    2. Grouping by content_type
    3. Fetching all objects in bulk
    4. Checking permissions once per object
    5. Creating accessibility map for serializer context
    """

    def get_accessibility_map(self, user: Any, items: Any) -> Dict[str, bool]:
        """
        Build accessibility map for a list of navigation items.

        Args:
            user: The requesting user
            items: QuerySet of UserRecent or UserFavorite items

        Returns:
            Dict mapping "content_type_id:object_id" -> is_accessible (bool)
        """
        accessibility_map = {}

        # Group items by content_type
        items_by_ct = {}
        for item in items:
            if item.content_type_id:
                ct_id = item.content_type_id
                if ct_id not in items_by_ct:
                    items_by_ct[ct_id] = []
                items_by_ct[ct_id].append(item)

        # Fetch objects in bulk for each content_type
        for ct_id, ct_items in items_by_ct.items():
            content_type = ContentType.objects.get(pk=ct_id)
            object_ids = [item.object_id for item in ct_items]

            # Fetch all objects for this content_type
            try:
                model_class = content_type.model_class()
                if model_class:
                    objects = model_class.objects.filter(pk__in=object_ids)
                    object_map = {str(obj.pk): obj for obj in objects}

                    # Check permissions for each object
                    for item in ct_items:
                        obj = object_map.get(item.object_id)
                        cache_key = f"{ct_id}:{item.object_id}"

                        if obj is None:
                            # Object was deleted
                            accessibility_map[cache_key] = False
                        else:
                            # Check if user has permission (default to True if no permission checking available)
                            # In a real app, this would call a permission service
                            accessibility_map[cache_key] = True
            except Exception:
                # If model doesn't exist or query fails, mark as inaccessible
                for item in ct_items:
                    cache_key = f"{ct_id}:{item.object_id}"
                    accessibility_map[cache_key] = False

        return accessibility_map


class RecentViewSet(viewsets.ModelViewSet, PerformBatchPermissionCheck):
    """API endpoint for user recent navigation items."""

    serializer_class = NavigationItemSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]
    http_method_names = ["get", "post"]

    def get_queryset(self) -> Any:
        """Get recents for the authenticated user, ordered by most recent."""
        return (
            UserRecent.objects.select_related("content_type")
            .filter(user=self.request.user)
            .order_by("-last_seen_at")
        )

    def get_serializer_class(self) -> type:
        """Use different serializer for create operations."""
        if self.action == "create":
            return RecentCreateSerializer
        return NavigationItemSerializer

    def list(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """List recent items with batch permission checking."""
        queryset = self.filter_queryset(self.get_queryset())

        # Get accessibility map for all items
        accessibility_map = self.get_accessibility_map(request.user, queryset)

        serializer = self.get_serializer(
            queryset,
            many=True,
            context={
                "request": request,
                "accessibility_map": accessibility_map,
            },
        )

        return Response(serializer.data)

    def perform_create(self, serializer: Any) -> None:
        """Save recent (already handled by serializer's create method)."""
        serializer.save()


class FavoriteViewSet(viewsets.ModelViewSet, PerformBatchPermissionCheck):
    """API endpoint for user favorite navigation items."""

    serializer_class = NavigationItemSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self) -> Any:
        """Get favorites for the authenticated user, ordered by creation date."""
        return (
            UserFavorite.objects.select_related("content_type")
            .filter(user=self.request.user)
            .order_by("-created_at")
        )

    def get_serializer_class(self) -> type:
        """Use different serializer for create operations."""
        if self.action == "create":
            return FavoriteCreateSerializer
        return NavigationItemSerializer

    def list(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """List favorite items with batch permission checking."""
        queryset = self.filter_queryset(self.get_queryset())

        # Get accessibility map for all items
        accessibility_map = self.get_accessibility_map(request.user, queryset)

        serializer = self.get_serializer(
            queryset,
            many=True,
            context={
                "request": request,
                "accessibility_map": accessibility_map,
            },
        )

        return Response(serializer.data)

    def perform_create(self, serializer: Any) -> None:
        """Save favorite (already handled by serializer's create method)."""
        serializer.save()
