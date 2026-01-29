"""
B31 Content Generation - URL Configuration
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ContentApprovalViewSet, ContentItemViewSet, ContentTemplateViewSet

router = DefaultRouter()
router.register(r"templates", ContentTemplateViewSet, basename="contenttemplate")
router.register(r"items", ContentItemViewSet, basename="contentitem")
router.register(r"approvals", ContentApprovalViewSet, basename="contentapproval")

urlpatterns = [
    path("", include(router.urls)),
]
