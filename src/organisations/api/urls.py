"""
URL configuration for organisations API.
"""

from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import MembershipViewSet, OrganisationViewSet

router = DefaultRouter()
router.register("", OrganisationViewSet, basename="organisation")

# Nested membership URLs
membership_list = MembershipViewSet.as_view({"get": "list", "post": "create"})
membership_detail = MembershipViewSet.as_view(
    {"get": "retrieve", "patch": "partial_update", "delete": "destroy"}
)

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
]
