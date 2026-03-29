"""
B35 Smart Asset Library - URL Configuration
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CollectionViewSet, MediaItemViewSet, MediaTagViewSet

app_name = "medialib35"

router = DefaultRouter()
router.register(r"items", MediaItemViewSet, basename="media-item")
router.register(r"tags", MediaTagViewSet, basename="media-tag")
router.register(r"collections", CollectionViewSet, basename="collection")

urlpatterns = [
    path("", include(router.urls)),
]
