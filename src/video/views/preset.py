"""ViewSet for video presets."""

from django.db.models import QuerySet
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.filters import OrderingFilter
from rest_framework.permissions import IsAuthenticated

from src.video.models import VideoPreset
from src.video.serializers.preset import VideoPresetSerializer


class VideoPresetViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only viewset for video presets."""

    queryset = VideoPreset.objects.all()
    serializer_class = VideoPresetSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["output_format", "is_system"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_queryset(self) -> QuerySet[VideoPreset]:
        return super().get_queryset()
