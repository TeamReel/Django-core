"""
DRF ViewSets for Activities & Period Hierarchy API.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count
from activities.models import Period
from .serializers import PeriodSerializer
from .permissions import PeriodPermission


class PeriodViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Period CRUD + tree navigation actions.

    Endpoints:
    - GET /api/v1/periods/ - List periods with filtering
    - POST /api/v1/periods/ - Create period
    - GET /api/v1/periods/{id}/ - Retrieve period
    - PUT /api/v1/periods/{id}/ - Update period
    - DELETE /api/v1/periods/{id}/ - Delete period (prevents if children exist)
    - GET /api/v1/periods/{id}/children/ - Get direct children
    - GET /api/v1/periods/{id}/descendants/ - Get all descendants (CTE)

    Query parameters:
    - organisation_id: Filter by organisation
    - project_id: Filter by project
    - parent_id: Filter by parent (use "null" for root periods)
    """

    queryset = (
        Period.objects.select_related("organisation", "project", "parent_period", "created_by")
        .annotate(children_count=Count("children"), activities_count=Count("activities"))
        .order_by("start_date", "name")
    )
    serializer_class = PeriodSerializer
    permission_classes = [PeriodPermission]

    def get_queryset(self):
        """Apply query param filters"""
        queryset = super().get_queryset()

        # Filter by organisation_id
        organisation_id = self.request.query_params.get("organisation_id")
        if organisation_id:
            queryset = queryset.filter(organisation_id=organisation_id)

        # Filter by project_id
        project_id = self.request.query_params.get("project_id")
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        # Filter by parent_id (supports parent_id=null for roots)
        parent_id = self.request.query_params.get("parent_id")
        if parent_id == "null":
            queryset = queryset.filter(parent_period__isnull=True)
        elif parent_id:
            queryset = queryset.filter(parent_period_id=parent_id)

        return queryset

    def destroy(self, request, *args, **kwargs):
        """Override destroy to prevent deletion if children or activities exist"""
        instance = self.get_object()

        # Check if period has children
        children_count = instance.children.count()
        if children_count > 0:
            return Response(
                {
                    "error": f"Cannot delete period with {children_count} child period(s). Delete children first."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if period has activities
        activities_count = instance.activities.count()
        if activities_count > 0:
            return Response(
                {
                    "error": f"Cannot delete period with {activities_count} activit(ies). Delete activities first."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["get"])
    def children(self, request, pk=None):
        """
        Get direct children of period.

        Returns list of immediate child periods (one level down).
        """
        period = self.get_object()
        children = (
            period.children.select_related("organisation", "project", "parent_period", "created_by")
            .annotate(children_count=Count("children"), activities_count=Count("activities"))
            .order_by("start_date", "name")
        )
        serializer = self.get_serializer(children, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def descendants(self, request, pk=None):
        """
        Get all descendants of period using recursive CTE.

        Returns all periods in the subtree (children, grandchildren, etc.).
        Uses PostgreSQL recursive CTE for efficient tree traversal.
        """
        period = self.get_object()
        descendants = (
            Period.objects.get_descendants(period.id)
            .select_related("organisation", "project", "parent_period", "created_by")
            .annotate(children_count=Count("children"), activities_count=Count("activities"))
            .order_by("start_date", "name")
        )
        serializer = self.get_serializer(descendants, many=True)
        return Response(serializer.data)
