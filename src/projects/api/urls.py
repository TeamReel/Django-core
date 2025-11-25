"""URL routing for Projects & Workspaces API."""

from rest_framework_nested import routers

from .views import ProjectViewSet

# Top-level router for /api/projects/ routes
router = routers.DefaultRouter()
router.register(r"projects", ProjectViewSet, basename="project")

# Nested router for /api/organisations/{organisation_id}/projects/ routes
# This will be registered by the organisations app
organisations_router = routers.DefaultRouter()
nested_projects_router = routers.NestedDefaultRouter(
    organisations_router, r"organisations", lookup="organisation"
)
nested_projects_router.register(r"projects", ProjectViewSet, basename="organisation-project")

urlpatterns = [
    *router.urls,  # Top-level /api/projects/ routes
    *nested_projects_router.urls,  # Nested /api/organisations/{organisation_id}/projects/ routes
]
