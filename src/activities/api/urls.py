"""
URL configuration for Activities & Period Hierarchy API.
"""

from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import PeriodViewSet, ActivityViewSet, ParticipationViewSet

router = SimpleRouter()
router.register(r"periods", PeriodViewSet, basename="period")
router.register(r"activities", ActivityViewSet, basename="activity")
router.register(r"participations", ParticipationViewSet, basename="participation")

urlpatterns = [
    path("", include(router.urls)),
]
