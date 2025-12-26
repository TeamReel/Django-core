from django.db import models
from django_filters import rest_framework as filters
from rest_framework import permissions, viewsets
from rest_framework.pagination import LimitOffsetPagination

from .models import AuditEvent
from .serializers import AuditEventSerializer


class AuditEventPagination(LimitOffsetPagination):
    default_limit = 50
    max_limit = 100


class AuditEventFilter(filters.FilterSet):
    user__name__icontains = filters.CharFilter(method="filter_user_name")
    event_type = filters.CharFilter(lookup_expr="exact")

    class Meta:
        model = AuditEvent
        fields = ["event_type"]

    def filter_user_name(self, queryset, name, value):
        return queryset.filter(
            models.Q(user__first_name__icontains=value)
            | models.Q(user__last_name__icontains=value)
            | models.Q(user__email__icontains=value)
        )


class AuditEventViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = (
        AuditEvent.objects.all()
        .select_related("user", "organization", "project")
        .order_by("-created_at")
    )
    serializer_class = AuditEventSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = AuditEventPagination
    filter_backends = [filters.DjangoFilterBackend]
    filterset_class = AuditEventFilter
