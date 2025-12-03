"""DRF viewsets for routing decision logs (B09 audit events)."""

from django_filters import rest_framework as filters
from rest_framework import viewsets
from rest_framework.filters import OrderingFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated

from audit.models import AuditEvent

from ..serializers.routing_serializers import RoutingDecisionLogSerializer


class StandardResultsSetPagination(PageNumberPagination):
    """Standard pagination for API results."""

    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 100


class RoutingDecisionLogFilter(filters.FilterSet):
    """Filter for routing decision audit logs."""

    event_type = filters.CharFilter(field_name="event_type", lookup_expr="icontains")
    org_id = filters.NumberFilter(field_name="organization__id")
    user_id = filters.NumberFilter(field_name="user__id")
    start_date = filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    end_date = filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")

    class Meta:
        model = AuditEvent
        fields = ["event_type", "org_id", "user_id", "start_date", "end_date"]


class RoutingDecisionLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for querying routing decision audit logs from B09 AuditEvent.

    Provides read-only access to routing decisions for admin debugging.
    Filters to show only notification routing events.
    """

    serializer_class = RoutingDecisionLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.DjangoFilterBackend, OrderingFilter]
    filterset_class = RoutingDecisionLogFilter
    pagination_class = StandardResultsSetPagination
    ordering = ["-created_at"]
    ordering_fields = ["created_at", "event_type"]

    def get_queryset(self):
        """
        Return routing decision audit events.

        Filters to notification_routing_decision events.
        Org admins see only their org's events.
        Superusers see all events.
        """
        user = self.request.user
        queryset = AuditEvent.objects.filter(
            event_type="notification_routing_decision"
        ).select_related("user", "organization", "project")

        # Superusers see all routing decisions
        if user.is_superuser:
            return queryset

        # Org admins see only their organization's routing decisions
        # Get all organizations where user has admin role
        from organisations.models import OrganisationUser

        admin_org_ids = OrganisationUser.objects.filter(
            user=user, role__in=["admin", "owner"]
        ).values_list("organisation_id", flat=True)

        if admin_org_ids:
            return queryset.filter(organization_id__in=admin_org_ids)

        # Regular users cannot access routing logs
        return queryset.none()
