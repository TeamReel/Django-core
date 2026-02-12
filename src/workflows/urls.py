"""URL configuration for workflows app."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from src.workflows.views import (
    ProjectPermissionOverrideViewSet,
    TransitionHistoryViewSet,
    WorkflowInstanceViewSet,
    WorkflowTemplateViewSet,
)
from src.workflows.views.content_types import ContentTypeLookupView

app_name = "workflows"

router = DefaultRouter()
router.register(r"templates", WorkflowTemplateViewSet, basename="template")
router.register(r"instances", WorkflowInstanceViewSet, basename="instance")
router.register(r"permissions", ProjectPermissionOverrideViewSet, basename="permission")
router.register(r"history", TransitionHistoryViewSet, basename="history")

urlpatterns = [
    path("content-types/", ContentTypeLookupView.as_view(), name="content-type-lookup"),
] + router.urls
