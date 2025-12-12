"""
URL configuration for permissions API.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from permissions.api.views import PermissionsCurrentView, RoleAssignmentViewSet, RoleViewSet

router = DefaultRouter()
router.register(r"roles", RoleViewSet, basename="role")
router.register(r"role-assignments", RoleAssignmentViewSet, basename="roleassignment")

app_name = "permissions"

urlpatterns = [
    path("current/", PermissionsCurrentView.as_view(), name="permissions-current"),
    path("", include(router.urls)),
]
