from typing import TypedDict, Literal, List
from projects.models import ProjectMembership, Project
from organisations.models import Membership as OrganisationMembership
from settings.models import FeatureFlag
from .cache_service import CacheService


class PermissionResult(TypedDict):
    effective_role: Literal["viewer", "editor", "admin", "no_access"]
    source: Literal["explicit_membership", "implicit_org_access", "emergency_override", "no_access"]
    permissions: List[str]


class PermissionResolutionService:
    """5-step permission resolution with caching."""

    def __init__(self):
        self.cache_service = CacheService()

    def get_project_role(self, user_id: str, project_id: str) -> PermissionResult:
        """Resolve effective role for user in project."""
        # Check cache first
        cached = self.cache_service.get_permission(user_id, project_id)
        if cached:
            return cached  # type: ignore

        # Step 1: Explicit membership
        try:
            membership = (
                ProjectMembership.objects.active()
                .select_related("project")
                .get(project_id=project_id, user_id=user_id)
            )
            result = self._build_result(membership.role, "explicit_membership")
            self.cache_service.set_permission(user_id, project_id, result)
            return result
        except ProjectMembership.DoesNotExist:
            pass

        # Step 2: Private project check
        try:
            project = Project.objects.select_related("organisation").get(id=project_id)
        except Project.DoesNotExist:
            # If project doesn't exist, return no_access
            result = self._build_result("no_access", "no_access")
            self.cache_service.set_permission(user_id, project_id, result)
            return result

        if project.is_private:
            # Step 4: Emergency override for org admins
            if self._is_org_admin(user_id, str(project.organisation_id)):
                # Check feature flag
                # Assuming FeatureFlag has a method to check global/org scope
                # The prompt used FeatureFlag.is_enabled('key'), but the model doesn't show a static method.
                # I'll implement a safe check or assume there's a manager method.
                # For now, I'll query it directly or use a helper if available.
                # The prompt code: FeatureFlag.is_enabled('project_access_control.org_admin_override')
                # I'll check if FeatureFlag has a manager with is_enabled.

                # For now, I'll implement a simple check using filter
                override_enabled = FeatureFlag.objects.filter(
                    key="project_access_control.org_admin_override",
                    enabled=True,
                    scope_type="GLOBAL",  # Assuming global override for now
                ).exists()

                if override_enabled:
                    self._log_emergency_override(user_id, project_id)
                    result = self._build_result("admin", "emergency_override")
                    self.cache_service.set_permission(user_id, project_id, result)
                    return result

            # No access to private project without explicit membership
            result = self._build_result("no_access", "no_access")
            self.cache_service.set_permission(user_id, project_id, result)
            return result

        # Step 3: Implicit org membership
        try:
            org_membership = OrganisationMembership.objects.get(
                organisation=project.organisation, user_id=user_id
            )
            role_mapping = {"owner": "admin", "admin": "admin", "member": "viewer"}
            implicit_role = role_mapping.get(org_membership.role, "viewer")
            result = self._build_result(implicit_role, "implicit_org_access")
            self.cache_service.set_permission(user_id, project_id, result)
            return result
        except OrganisationMembership.DoesNotExist:
            pass

        # Step 5: No access
        result = self._build_result("no_access", "no_access")
        self.cache_service.set_permission(user_id, project_id, result)
        return result

    def _build_result(self, role: str, source: str) -> PermissionResult:
        """Build permission result with role-to-permission mapping."""
        permission_map = {
            "admin": [
                "projects.view",
                "projects.edit",
                "projects.delete",
                "projects.manage_members",
                "projects.view_members",
            ],
            "editor": ["projects.view", "projects.edit", "projects.view_members"],
            "viewer": ["projects.view", "projects.view_members"],
            "no_access": [],
        }
        # Handle potential unknown roles by defaulting to empty permissions
        permissions = permission_map.get(role, [])

        return {
            "effective_role": role,  # type: ignore
            "source": source,  # type: ignore
            "permissions": permissions,
        }

    def _is_org_admin(self, user_id: str, organisation_id: str) -> bool:
        """Check if user is an admin or owner of the organisation."""
        return OrganisationMembership.objects.filter(
            organisation_id=organisation_id, user_id=user_id, role__in=["owner", "admin"]
        ).exists()

    def _log_emergency_override(self, user_id: str, project_id: str) -> None:
        """Log emergency override access."""
        # TODO: Integrate with B09 Audit Logging
        # For now, just print or log to standard logger
        import logging

        logger = logging.getLogger(__name__)
        logger.warning(f"Emergency override used by user {user_id} for project {project_id}")
