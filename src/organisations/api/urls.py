"""
URL configuration for organisations API.
"""

from django.urls import path
from projects.api.views import ProjectViewSet
from rest_framework.routers import DefaultRouter

from .views import MembershipViewSet, OrganisationViewSet

router = DefaultRouter()
router.register("", OrganisationViewSet, basename="organisation")

# Nested membership URLs
membership_list = MembershipViewSet.as_view({"get": "list", "post": "create"})
membership_detail = MembershipViewSet.as_view(
    {"get": "retrieve", "patch": "partial_update", "delete": "destroy"}
)

# Nested projects URLs
projects_list = ProjectViewSet.as_view({"get": "list", "post": "create"})
projects_detail = ProjectViewSet.as_view(
    {"get": "retrieve", "patch": "partial_update", "delete": "destroy"}
)
projects_archive = ProjectViewSet.as_view({"post": "archive"})
projects_restore = ProjectViewSet.as_view({"post": "restore"})

urlpatterns = router.urls + [
    path(
        "<uuid:organisation_pk>/members/",
        membership_list,
        name="organisation-members-list",
    ),
    path(
        "<uuid:organisation_pk>/members/<uuid:pk>/",
        membership_detail,
        name="organisation-members-detail",
    ),
    # Projects nested under organisations
    path(
        "<uuid:organisation_id>/projects/",
        projects_list,
        name="organisation-projects-list",
    ),
    path(
        "<uuid:organisation_id>/projects/<int:id>/",
        projects_detail,
        name="organisation-projects-detail",
    ),
    path(
        "<uuid:organisation_id>/projects/<int:id>/archive/",
        projects_archive,
        name="organisation-projects-archive",
    ),
    path(
        "<uuid:organisation_id>/projects/<int:id>/restore/",
        projects_restore,
        name="organisation-projects-restore",
    ),
]
