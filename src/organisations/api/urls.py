"""
URL configuration for organisations API.
"""

from rest_framework.routers import DefaultRouter

from .views import OrganisationViewSet

router = DefaultRouter()
router.register("", OrganisationViewSet, basename="organisation")

urlpatterns = router.urls
