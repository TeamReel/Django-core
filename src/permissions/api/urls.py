"""
URL configuration for permissions API.
"""

from django.urls import include, path
from permissions.api.views import PermissionsCurrentView, RoleAssignmentViewSet, RoleViewSet
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r"roles", RoleViewSet, basename="role")
router.register(r"role-assignments", RoleAssignmentViewSet, basename="roleassignment")

app_name = "permissions"

urlpatterns = [
    path("current/", PermissionsCurrentView.as_view(), name="permissions-current"),
    path("", include(router.urls)),
]
