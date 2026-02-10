"""Permission classes for video processing API."""

from django.apps import apps
from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import View


class IsProjectMember(BasePermission):
    """Allow access only to members of the referenced project."""

    def has_permission(self, request: Request, view: View) -> bool:
        project_id = (
            request.data.get("project")
            or request.query_params.get("project")
            or getattr(request, "project_id", None)
        )

        if not project_id:
            return True

        ProjectMembership = apps.get_model("projects", "ProjectMembership")
        return ProjectMembership.objects.filter(project_id=project_id, user=request.user).exists()

    def has_object_permission(self, request: Request, view: View, obj) -> bool:
        if not hasattr(obj, "project") or not obj.project:
            return True

        ProjectMembership = apps.get_model("projects", "ProjectMembership")
        return ProjectMembership.objects.filter(project=obj.project, user=request.user).exists()
