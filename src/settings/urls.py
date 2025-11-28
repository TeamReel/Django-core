"""URL routing for settings REST API."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import FeatureFlagViewSet, SettingViewSet

# Create a router and register viewsets
router = DefaultRouter()
router.register(r"feature-flags", FeatureFlagViewSet, basename="featureflag")
router.register(r"settings", SettingViewSet, basename="setting")

# Wire up the API URLs
urlpatterns = [
    path("api/", include(router.urls)),
]

# Available endpoints:
# GET  /api/feature-flags/           - List all feature flags
# POST /api/feature-flags/           - Create new feature flag
# GET  /api/feature-flags/{id}/      - Retrieve specific feature flag
# PUT  /api/feature-flags/{id}/      - Update specific feature flag
# PATCH /api/feature-flags/{id}/     - Partial update feature flag
# DELETE /api/feature-flags/{id}/    - Delete feature flag
# GET  /api/feature-flags/resolve/{key}/ - Resolve flag value with hierarchy

# GET  /api/settings/                - List all settings
# POST /api/settings/                - Create new setting
# GET  /api/settings/{id}/           - Retrieve specific setting
# PUT  /api/settings/{id}/           - Update specific setting
# PATCH /api/settings/{id}/          - Partial update setting
# DELETE /api/settings/{id}/         - Delete setting
# GET  /api/settings/resolve/{key}/  - Resolve setting value with hierarchy
