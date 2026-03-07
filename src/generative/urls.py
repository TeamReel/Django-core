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
from .views_asset import (
    crop_closeup_from_fullbody_view,
    crop_halfbody_from_fullbody_view,
    generate_asset_view,
    generation_job_counts_view,
    generation_task_status_view,
    list_asset_history_view,
    list_asset_models_view,
    list_asset_templates_view,
    list_generation_jobs_view,
    restore_asset_version_view,
    review_generation_job_view,
    save_asset_view,
)

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
    path(
        "assets/generate/<str:task_id>/status/",
        generation_task_status_view,
        name="asset-generate-status",
    ),
    path("assets/save/", save_asset_view, name="asset-save"),
    path("assets/templates/", list_asset_templates_view, name="asset-templates-list"),
    path("assets/models/", list_asset_models_view, name="asset-models-list"),
    path("assets/history/", list_asset_history_view, name="asset-history"),
    path("assets/restore/", restore_asset_version_view, name="asset-restore"),
    path("assets/crop-closeup/", crop_closeup_from_fullbody_view, name="asset-crop-closeup"),
    path("assets/crop-halfbody/", crop_halfbody_from_fullbody_view, name="asset-crop-halfbody"),
    # Generation job queue (Workflow UI)
    path("jobs/", list_generation_jobs_view, name="generation-jobs-list"),
    path("jobs/counts/", generation_job_counts_view, name="generation-jobs-counts"),
    path("jobs/<str:task_id>/review/", review_generation_job_view, name="generation-job-review"),
    # Standard CRUD
    path("", include(router.urls)),
]
