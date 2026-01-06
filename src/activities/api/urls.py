"""
URL configuration for Activities & Period Hierarchy API.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PeriodViewSet, ActivityViewSet

router = DefaultRouter()
router.register(r"periods", PeriodViewSet, basename="period")
router.register(r"activities", ActivityViewSet, basename="activity")

urlpatterns = [
    path("", include(router.urls)),
]
