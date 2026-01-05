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
    project = filters.CharFilter(field_name="project__id")
    organization = filters.CharFilter(field_name="organization__id")

    class Meta:
        model = AuditEvent
        fields = ["event_type", "project", "organization"]

    def filter_user_name(self, queryset, name, value):
        return queryset.filter(
            models.Q(user__first_name__icontains=value)
            | models.Q(user__last_name__icontains=value)
            | models.Q(user__email__icontains=value)
        )


class AuditEventViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditEventSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = AuditEventPagination
    filter_backends = [filters.DjangoFilterBackend]
    filterset_class = AuditEventFilter

    def get_queryset(self):
        queryset = (
            AuditEvent.objects.all()
            .select_related("user", "organization", "project")
            .order_by("-created_at")
        )

        user = self.request.user
        if user.is_superuser:
            return queryset

        # Filter by user's access
        # 1. Events in organisations where user is an active member
        org_ids = user.organisation_memberships.filter(is_active=True).values_list(
            "organisation_id", flat=True
        )

        # 2. Events in projects where user is an active member (not soft deleted)
        project_ids = user.project_memberships.filter(deleted_at__isnull=True).values_list(
            "project_id", flat=True
        )

        return queryset.filter(
            models.Q(organization_id__in=org_ids)
            | models.Q(project_id__in=project_ids)
            | models.Q(user=user)
        ).distinct()
