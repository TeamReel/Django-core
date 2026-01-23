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

# Team (child project) resolution under a club: /organisations/{org}/projects/{club}/teams/{team}/
project_team_detail = ProjectViewSet.as_view({"get": "retrieve_team_under_club"})

urlpatterns = router.urls + [
    path(
        "<slug:organisation_pk>/members/",
        membership_list,
        name="organisation-members-list",
    ),
    path(
        "<slug:organisation_pk>/members/<uuid:pk>/",
        membership_detail,
        name="organisation-members-detail",
    ),
    # Projects nested under organisations
    path(
        "<slug:organisation_id>/projects/",
        projects_list,
        name="organisation-projects-list",
    ),
    path(
        "<slug:organisation_id>/projects/<slug:slug>/",
        projects_detail,
        name="organisation-projects-detail",
    ),
    path(
        "<slug:organisation_id>/projects/<slug:slug>/archive/",
        projects_archive,
        name="organisation-projects-archive",
    ),
    path(
        "<slug:organisation_id>/projects/<slug:slug>/restore/",
        projects_restore,
        name="organisation-projects-restore",
    ),
    path(
        "<slug:organisation_id>/projects/<slug:club_slug>/teams/<slug:team_slug>/",
        project_team_detail,
        name="organisation-project-team-detail",
    ),
]
