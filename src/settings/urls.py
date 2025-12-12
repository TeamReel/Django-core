"""URL routing for settings REST API."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import FeatureFlagViewSet, SettingViewSet

# Create a router and register viewsets
router = DefaultRouter()
router.register(r"feature-flags", FeatureFlagViewSet, basename="featureflag")
router.register(r"settings", SettingViewSet, basename="setting")

# Wire up the API URLs (prefix is handled by config/urls.py: /api/v1/settings/)
urlpatterns = [
    path("", include(router.urls)),
]

# Available endpoints:
# GET  /api/v1/settings/feature-flags/           - List all feature flags
# POST /api/v1/settings/feature-flags/           - Create new feature flag
# GET  /api/v1/settings/feature-flags/{id}/      - Retrieve specific feature flag
# PUT  /api/v1/settings/feature-flags/{id}/      - Update specific feature flag
# PATCH /api/v1/settings/feature-flags/{id}/     - Partial update feature flag
# DELETE /api/v1/settings/feature-flags/{id}/    - Delete feature flag
# GET  /api/v1/settings/feature-flags/resolve/{key}/ - Resolve flag value with hierarchy

# GET  /api/v1/settings/settings/                - List all settings
# POST /api/v1/settings/settings/                - Create new setting
# GET  /api/v1/settings/settings/{id}/           - Retrieve specific setting
# PUT  /api/v1/settings/settings/{id}/           - Update specific setting
# PATCH /api/settings/{id}/          - Partial update setting
# DELETE /api/settings/{id}/         - Delete setting
# GET  /api/settings/resolve/{key}/  - Resolve setting value with hierarchy
