"""URL configuration for workflows app."""

from rest_framework.routers import DefaultRouter

from src.workflows.views import WorkflowTemplateViewSet

app_name = "workflows"

router = DefaultRouter()
router.register(r"templates", WorkflowTemplateViewSet, basename="template")

urlpatterns = router.urls
