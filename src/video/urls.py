"""URL configuration for video processing endpoints."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from src.video.views import PlatformExportViewSet, VideoJobViewSet, VideoPresetViewSet

app_name = "video"

router = DefaultRouter()
router.register("jobs", VideoJobViewSet, basename="videojob")
router.register("presets", VideoPresetViewSet, basename="videopreset")
router.register("platforms", PlatformExportViewSet, basename="platformexport")

urlpatterns = [
    path("", include(router.urls)),
]
