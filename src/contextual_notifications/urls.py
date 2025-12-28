"""URL routing for contextual notifications DRF APIs."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views.preference_views import NotificationPreferenceViewSet
from .views.routing_logs_views import RoutingDecisionLogViewSet

app_name = "contextual_notifications"

router = DefaultRouter()
router.register(r"routing-logs", RoutingDecisionLogViewSet, basename="routing-decision-log")
router.register(r"preferences", NotificationPreferenceViewSet, basename="notification-preference")

urlpatterns = [
    path("", include(router.urls)),
]
