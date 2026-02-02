"""
B35 Smart Asset Library - URL Configuration
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MediaItemViewSet, MediaTagViewSet, CollectionViewSet

app_name = "medialib35"

router = DefaultRouter()
router.register(r"items", MediaItemViewSet, basename="media-item")
router.register(r"tags", MediaTagViewSet, basename="media-tag")
router.register(r"collections", CollectionViewSet, basename="collection")

urlpatterns = [
    path("", include(router.urls)),
]
