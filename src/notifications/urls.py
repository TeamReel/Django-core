"""URL configuration for notifications API."""

from rest_framework.routers import DefaultRouter

from notifications.views import NotificationViewSet

app_name = "notifications"

router = DefaultRouter()
router.register(r"notifications", NotificationViewSet, basename="notification")

urlpatterns = router.urls
