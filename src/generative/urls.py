"""URL routing for B34 Generative Pipelines API.

Registers DRF ViewSets with DefaultRouter for:
- /templates/ - Template CRUD and clone
- /requests/ - Request submission and cancellation
- /outputs/ - Output retrieval

Constitution Principle VII: Versioned API under /api/v1/generative/
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    GenerationOutputViewSet,
    GenerationRequestViewSet,
    GenerationTemplateViewSet,
    health_check,
)
from .views_asset import generate_asset_view, list_asset_templates_view, save_asset_view

# Create router and register viewsets
router = DefaultRouter()
router.register(r"templates", GenerationTemplateViewSet, basename="generation-template")
router.register(r"requests", GenerationRequestViewSet, basename="generation-request")
router.register(r"outputs", GenerationOutputViewSet, basename="generation-output")

# URL patterns
urlpatterns = [
    path("health/", health_check, name="generative-health-check"),
    # Asset generation (TeamReel demo)
    path("assets/generate/", generate_asset_view, name="asset-generate"),
    path("assets/save/", save_asset_view, name="asset-save"),
    path("assets/templates/", list_asset_templates_view, name="asset-templates-list"),
    # Standard CRUD
    path("", include(router.urls)),
]
