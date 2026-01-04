"""URL routing for Projects & Workspaces API."""

from rest_framework.routers import DefaultRouter

from .views import ProjectMembershipViewSet, ProjectViewSet

# Top-level router for /api/projects/ routes
router = DefaultRouter()
router.register(
    r"projects/(?P<project_pk>[^/.]+)/members", ProjectMembershipViewSet, basename="project-members"
)
router.register(r"projects", ProjectViewSet, basename="project")

# For nested routes under organisations, we define explicit patterns
# These will be included in organisations app's URL configuration
urlpatterns = router.urls
