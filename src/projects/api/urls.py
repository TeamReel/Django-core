"""URL routing for Projects & Workspaces API."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    ProjectFunctionalRoleViewSet,
    ProjectInviteViewSet,
    ProjectMembershipPromotionViewSet,
    ProjectMembershipViewSet,
    ProjectViewSet,
)

# Top-level router for /api/projects/ routes
router = DefaultRouter()
router.register(
    r"(?P<project_pk>[^/.]+)/members", ProjectMembershipViewSet, basename="project-members"
)
router.register(
    r"(?P<project_pk>[^/.]+)/functional-roles",
    ProjectFunctionalRoleViewSet,
    basename="project-functional-roles",
)
router.register(
    r"(?P<project_pk>[^/.]+)/invitations",
    ProjectInviteViewSet,
    basename="project-invitations",
)
router.register(
    r"(?P<project_pk>[^/.]+)/promotions",
    ProjectMembershipPromotionViewSet,
    basename="project-promotions",
)
router.register(r"", ProjectViewSet, basename="project")

# Public invitation routes (no nested project_pk)
invitation_urls = [
    path(
        "invitations/<str:token>/",
        ProjectInviteViewSet.as_view({"get": "get_by_token"}),
        name="invitation-detail",
    ),
    path(
        "invitations/<str:token>/accept/",
        ProjectInviteViewSet.as_view({"post": "accept"}),
        name="invitation-accept",
    ),
]

# Promotion action routes (top-level)
promotion_urls = [
    path(
        "promotions/<uuid:pk>/",
        ProjectMembershipPromotionViewSet.as_view({"get": "retrieve"}),
        name="promotion-detail",
    ),
    path(
        "promotions/<uuid:pk>/accept/",
        ProjectMembershipPromotionViewSet.as_view({"post": "accept"}),
        name="promotion-accept",
    ),
    path(
        "promotions/<uuid:pk>/decline/",
        ProjectMembershipPromotionViewSet.as_view({"post": "decline"}),
        name="promotion-decline",
    ),
    path(
        "promotions/<uuid:pk>/cancel/",
        ProjectMembershipPromotionViewSet.as_view({"delete": "cancel"}),
        name="promotion-cancel",
    ),
]

# For nested routes under organisations, we define explicit patterns
# These will be included in organisations app's URL configuration
urlpatterns = router.urls + invitation_urls + promotion_urls
