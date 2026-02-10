"""ViewSet for platform exports."""

from django.db.models import QuerySet
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.filters import OrderingFilter
from rest_framework.permissions import IsAuthenticated

from src.video.models import PlatformExport
from src.video.serializers.platform import PlatformExportSerializer


class PlatformExportViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only viewset for platform exports."""

    queryset = PlatformExport.objects.all()
    serializer_class = PlatformExportSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["platform", "recommended", "is_active"]
    ordering_fields = ["platform", "name"]
    ordering = ["platform", "name"]

    def get_queryset(self) -> QuerySet[PlatformExport]:
        return super().get_queryset().select_related("preset")
