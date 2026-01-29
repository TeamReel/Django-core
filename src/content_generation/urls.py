# B31 Content Generation - URL Configuration
from django.urls import include, path
from rest_framework.routers import DefaultRouter

router = DefaultRouter()

# ViewSets will be registered here in WP02-WP04

urlpatterns = [
    path("", include(router.urls)),
]
