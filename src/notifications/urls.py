"""URL configuration for notifications API."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from notifications.views import NotificationViewSet
from notifications.views.health_views import HealthCheckView

app_name = "notifications"

router = DefaultRouter()
router.register(r"notifications", NotificationViewSet, basename="notification")

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health-check"),
] + router.urls
