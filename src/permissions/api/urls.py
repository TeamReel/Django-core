"""
URL configuration for permissions API.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from permissions.api.views import RoleAssignmentViewSet, RoleViewSet

router = DefaultRouter()
router.register(r"roles", RoleViewSet, basename="role")
router.register(r"role-assignments", RoleAssignmentViewSet, basename="roleassignment")

app_name = "permissions"

urlpatterns = [
    path("", include(router.urls)),
]
