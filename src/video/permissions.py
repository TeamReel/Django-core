"""Permission classes for video processing API."""

from django.apps import apps
from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import View


def _has_project_access(user, project_id) -> bool:
    """Check if user has membership on the project or its parent project."""
    ProjectMembership = apps.get_model("projects", "ProjectMembership")
    if ProjectMembership.objects.filter(
        project_id=project_id, user=user, deleted_at__isnull=True
    ).exists():
        return True
    # Hierarchy: check if user is member of the parent project
    Project = apps.get_model("projects", "Project")
    try:
        parent_id = Project.objects.values_list("parent_project_id", flat=True).get(pk=project_id)
    except Project.DoesNotExist:
        return False
    if parent_id:
        return ProjectMembership.objects.filter(
            project_id=parent_id, user=user, deleted_at__isnull=True
        ).exists()
    return False


class IsProjectMember(BasePermission):
    """Allow access only to members of the referenced project (or its parent)."""

    def has_permission(self, request: Request, view: View) -> bool:
        project_id = (
            request.headers.get("X-Project-ID")
            or request.data.get("project")
            or request.query_params.get("project")
            or getattr(request, "project_id", None)
        )

        if project_id:
            request.project_id = project_id

        if not project_id:
            return True

        return _has_project_access(request.user, project_id)

    def has_object_permission(self, request: Request, view: View, obj) -> bool:
        if not hasattr(obj, "project") or not obj.project:
            return True

        return _has_project_access(request.user, obj.project_id)
