"""Brand Identity Manager URL configuration.

Defines REST API routes for brand profiles, design tokens, and brand assets.
"""
from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import (
    AppBackgroundViewSet,
    BrandAssetViewSet,
    BrandProfileViewSet,
    DesignTokenViewSet,
    TokenResolutionView,
)

# Main router for profiles
router = SimpleRouter()
router.register(r"profiles", BrandProfileViewSet, basename="brandprofile")

# Register token and asset viewsets at top level
# Note: These are scoped by profile_pk kwarg from URL pattern
router.register(r"tokens", DesignTokenViewSet, basename="designtoken")
router.register(r"assets", BrandAssetViewSet, basename="brandasset")
router.register(r"app-backgrounds", AppBackgroundViewSet, basename="appbackground")

urlpatterns = [
    # Token resolution endpoint - MUST be BEFORE router.urls to prevent
    # the router's tokens/<pk>/ pattern from capturing "resolve" as a pk
    path("tokens/resolve/", TokenResolutionView.as_view(), name="token-resolve"),
    # Router URLs (profiles, tokens, assets CRUD)
    path("", include(router.urls)),
    # Nested routes manually defined for clarity
    path(
        "profiles/<uuid:profile_pk>/tokens/",
        DesignTokenViewSet.as_view({"get": "list", "post": "create"}),
        name="profile-tokens-list",
    ),
    path(
        "profiles/<uuid:profile_pk>/tokens/<uuid:pk>/",
        DesignTokenViewSet.as_view(
            {"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}
        ),
        name="profile-tokens-detail",
    ),
    path(
        "profiles/<uuid:profile_pk>/assets/",
        BrandAssetViewSet.as_view({"get": "list", "post": "create"}),
        name="profile-assets-list",
    ),
    path(
        "profiles/<uuid:profile_pk>/assets/<uuid:pk>/",
        BrandAssetViewSet.as_view(
            {"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}
        ),
        name="profile-assets-detail",
    ),
]
