"""B67: Bulk Content Generation — URL Configuration."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .api.views import BulkGenerationJobViewSet

router = DefaultRouter()
router.register(r"", BulkGenerationJobViewSet, basename="bulkgenerationjob")

urlpatterns = [
    path("", include(router.urls)),
]
