"""URL routing for navigation API endpoints."""

from django.urls import include, path
from navigation.views import FavoriteViewSet, RecentViewSet
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r"recents", RecentViewSet, basename="recent")
router.register(r"favorites", FavoriteViewSet, basename="favorite")

app_name = "navigation"

urlpatterns = [
    path("", include(router.urls)),
]
