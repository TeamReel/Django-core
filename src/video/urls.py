"""URL configuration for video processing endpoints."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

app_name = "video"

# Router will be populated in WP02 with ViewSets
router = DefaultRouter()

urlpatterns = [
    path("", include(router.urls)),
]
