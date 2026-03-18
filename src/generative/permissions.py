"""Permission classes for B34 Generative Pipelines API.

This module defines permission checks for:
- IsProjectMember: Restricts access to project members
- IsOrgAdmin: Restricts operations to organization admins

Constitution Principle V: Security-first with granular permission checks.
"""

from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import View


class IsProjectMember(BasePermission):
    """Allow access only to project members and authorised admins.

    Checks both request-level (query params, post data) and object-level
    (obj.project) membership.  In addition to direct project membership
    the following elevated roles are granted access:

    - Superusers / staff
    - Organisation admins (admin membership on the project's organisation)
    - Club admins (ADMIN membership on the team's parent club project)
    """

    # ── helpers ─────────────────────────────────────────────────────

    @staticmethod
    def _is_project_accessible(user, project_id) -> bool:  # noqa: ANN001
        """Return ``True`` if *user* may access the project identified by *project_id*."""
        from projects.models import Project, ProjectMembership

        # Superuser / staff bypass
        if user.is_superuser or user.is_staff:
            return True

        # Direct project membership (any role)
        if ProjectMembership.objects.filter(
            project_id=project_id, user=user, deleted_at__isnull=True
        ).exists():
            return True

        # Resolve the project for org / parent checks
        try:
            project = Project.objects.select_related("organisation").get(pk=project_id)
        except (Project.DoesNotExist, ValueError):
            return False

        # Organisation admin
        if project.organisation_id:
            from organisations.models import Membership as OrgMembership

            if OrgMembership.objects.filter(
                organisation_id=project.organisation_id,
                user=user,
                role="admin",
                is_active=True,
            ).exists():
                return True

        # Club admin – ADMIN membership on the parent (club) project
        if project.parent_project_id:
            if ProjectMembership.objects.filter(
                project_id=project.parent_project_id,
                user=user,
                role=ProjectMembership.Role.ADMIN,
                deleted_at__isnull=True,
            ).exists():
                return True

        return False

    # ── DRF interface ───────────────────────────────────────────────

    def has_permission(self, request: Request, view: View) -> bool:
        """Check if user is member of project specified in request."""
        # Extract project_id from various sources
        project_id = (
            request.data.get("project")
            or request.query_params.get("project")
            or getattr(request, "project_id", None)
        )

        if not project_id:
            # No project filter = allow (org-level filtering in ViewSet)
            return True

        return self._is_project_accessible(request.user, project_id)

    def has_object_permission(self, request: Request, view: View, obj) -> bool:
        """Check if user can access object's project."""
        # If object has no project, allow (org-level)
        if not hasattr(obj, "project") or not obj.project:
            return True

        return self._is_project_accessible(request.user, obj.project_id)


class IsOrgAdmin(BasePermission):
    """Allow only organization administrators to perform action.

    Used for template create/update/delete operations which require
    admin privileges at the organization level.
    """

    def has_permission(self, request: Request, view: View) -> bool:
        """Check if user is admin of their organization."""
        if not request.user or not request.user.is_authenticated:
            return False

        # Check if user has admin role via membership
        from organisations.models import Membership

        return Membership.objects.filter(user=request.user, role="admin", is_active=True).exists()

    def has_object_permission(self, request: Request, view: View, obj) -> bool:
        """Check if user is admin of object's organization."""
        if not request.user or not request.user.is_authenticated:
            return False

        # Get organization from object
        if hasattr(obj, "organisation"):
            org = obj.organisation
        elif hasattr(obj, "template") and hasattr(obj.template, "organisation"):
            org = obj.template.organisation
        else:
            return False

        # Check admin role
        from organisations.models import Membership

        return Membership.objects.filter(
            organisation=org, user=request.user, role="admin", is_active=True
        ).exists()


class IsRequestOwner(BasePermission):
    """Allow only the request owner to access request/output.

    Used for GenerationRequest and GenerationOutput endpoints to ensure
    users can only see their own generation results.
    """

    def has_object_permission(self, request: Request, view: View, obj) -> bool:
        """Check if user owns the request."""
        # For GenerationRequest
        if hasattr(obj, "requester"):
            return obj.requester == request.user

        # For GenerationOutput (check request.requester)
        if hasattr(obj, "request") and hasattr(obj.request, "requester"):
            return obj.request.requester == request.user

        return False
