"""
URL configuration for Activities & Period Hierarchy API.
"""

from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import ActivityEventViewSet, ActivityViewSet, ParticipationViewSet, PeriodViewSet

router = SimpleRouter()
router.register(r"periods", PeriodViewSet, basename="period")
router.register(r"activities", ActivityViewSet, basename="activity")
router.register(r"participations", ParticipationViewSet, basename="participation")
router.register(r"activity-events", ActivityEventViewSet, basename="activityevent")

urlpatterns = [
    path("", include(router.urls)),
]
