"""URL configuration for notifications API."""

from django.urls import path
from notifications.views import NotificationViewSet
from notifications.views.health_views import HealthCheckView
from notifications.views.user_notification_views import UserNotificationViewSet
from rest_framework.routers import DefaultRouter

app_name = "notifications"

router = DefaultRouter()
router.register(r"notifications", NotificationViewSet, basename="notification")
router.register(r"user-notifications", UserNotificationViewSet, basename="user-notification")

urlpatterns = [
    # Note: notifications health check is at /api/v1/notifications/health/
    # There's also a transactions health check at /api/v1/health/
    path("notifications/health/", HealthCheckView.as_view(), name="health-check"),
] + router.urls
