"""
B62: Activity Feed — URL Configuration
"""

from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import ActivityFeedViewSet

router = SimpleRouter()
router.register(r"activity-feed", ActivityFeedViewSet, basename="activity-feed")

urlpatterns = [
    path("", include(router.urls)),
]
