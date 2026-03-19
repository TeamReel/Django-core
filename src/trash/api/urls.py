"""Trash API URL configuration."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import TrashViewSet

router = DefaultRouter()
router.register(r"", TrashViewSet, basename="trash")

urlpatterns = [
    path("", include(router.urls)),
]
