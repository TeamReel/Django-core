"""URL configuration for workflows app."""

from rest_framework.routers import DefaultRouter

from src.workflows.views import (
    ProjectPermissionOverrideViewSet,
    WorkflowInstanceViewSet,
    WorkflowTemplateViewSet,
)

app_name = "workflows"

router = DefaultRouter()
router.register(r"templates", WorkflowTemplateViewSet, basename="template")
router.register(r"instances", WorkflowInstanceViewSet, basename="instance")
router.register(r"permissions", ProjectPermissionOverrideViewSet, basename="permission")

urlpatterns = router.urls
