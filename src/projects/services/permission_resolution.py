import time
from typing import List, Literal, TypedDict

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from organisations.models import Membership as OrganisationMembership
from projects.metrics import (
    emergency_override_total,
    permission_cache_hits_total,
    permission_cache_misses_total,
    permission_resolution_duration_seconds,
    permission_resolution_total,
)
from projects.models import Project, ProjectMembership
from settings.models import FeatureFlag

from .cache_service import CacheService

User = get_user_model()


class PermissionResult(TypedDict):
    effective_role: Literal["viewer", "editor", "admin", "no_access"]
    source: Literal["explicit_membership", "implicit_org_access", "emergency_override", "no_access"]
    permissions: List[str]


class PermissionResolutionService:
    """5-step permission resolution with caching and B08 audit integration."""

    def __init__(self):
        self.cache_service = CacheService()

    def check_project_access(
        self, user: User, project_id: str, required_permission: str = "projects.view"
    ) -> bool:
        """
        Check if user has specific permission on project with B08 audit logging.

        This is the B08-integrated entry point that should be used for permission
        checks in views and services. It wraps get_project_role() with audit logging.

        Args:
            user: Django User instance
            project_id: UUID of project
            required_permission: Permission code to check (e.g., 'projects.edit')

        Returns:
            True if user has the required permission, False otherwise

        Side Effects:
            - Emits audit event via B08 evaluate_permission
            - Updates cache if needed
        """
        from permissions.audit import evaluate_permission

        # Get project for context
        try:
            project = Project.objects.select_related("organisation").get(id=project_id)
        except Project.DoesNotExist:
            # Audit the denial - project not found
            evaluate_permission(
                user=user,
                permission=required_permission,
                resource=None,
                context={
                    "scope": "PROJECT",
                    "project_id": project_id,
                    "resolution_source": "project_not_found",
                },
            )
            return False

        # Get the role resolution
        result = self.get_project_role(str(user.id), project_id)

        # Check if required permission is in the result's permissions list
        has_permission = required_permission in result["permissions"]

        # Emit audit event via B08
        evaluate_permission(
            user=user,
            permission=required_permission,
            resource=project,
            context={
                "scope": "PROJECT",
                "project_id": project_id,
                "organization_id": str(project.organisation_id),
                "effective_role": result["effective_role"],
                "resolution_source": result["source"],
            },
        )

        return has_permission

    def get_project_role(self, user_id: str, project_id: str) -> PermissionResult:
        """Resolve effective role for user in project."""
        # Start timing for metrics
        start_time = time.time()

        # Check cache first
        cached = self.cache_service.get_permission(user_id, project_id)
        if cached:
            # Record cache hit
            permission_cache_hits_total.inc()
            # Record successful resolution with metrics
            permission_resolution_total.labels(
                source=cached["source"], role=cached["effective_role"]
            ).inc()
            permission_resolution_duration_seconds.observe(time.time() - start_time)
            return cached  # type: ignore

        # Cache miss
        permission_cache_misses_total.inc()

        # Step 1: Explicit membership
        memberships_qs = (
            ProjectMembership.objects.active()
            .filter(project_id=project_id, user_id=user_id)
            .only("role", "created_at")
            .order_by("-created_at")
        )

        # Important: avoid an .exists() check (extra query). Evaluate once.
        memberships = list(memberships_qs)

        if memberships:
            best_role = self._pick_best_membership_role(memberships)
            result = self._build_result(best_role, "explicit_membership")
            self.cache_service.set_permission(user_id, project_id, result)

            # Record metrics
            permission_resolution_total.labels(
                source="explicit_membership", role=result["effective_role"]
            ).inc()
            permission_resolution_duration_seconds.observe(time.time() - start_time)

            return result

        # Step 2: Private project check
        try:
            project = Project.objects.select_related("organisation").get(id=project_id)
        except Project.DoesNotExist:
            # If project doesn't exist, return no_access
            result = self._build_result("no_access", "no_access")
            self.cache_service.set_permission(user_id, project_id, result)

            # Record metrics
            permission_resolution_total.labels(source="no_access", role="no_access").inc()
            permission_resolution_duration_seconds.observe(time.time() - start_time)

            return result

        # Private project enforcement is controlled by a global feature flag.
        # Defaults to enforced unless explicitly disabled.
        private_flag = (
            FeatureFlag.objects.filter(
                key="project_access_control.private_projects",
                scope_type="GLOBAL",
            )
            .order_by("-id")
            .first()
        )
        private_projects_enabled = True if private_flag is None else bool(private_flag.enabled)

        is_private_enforced = project.is_private and private_projects_enabled

        if is_private_enforced:
            # Step 4: Emergency override for org admins
            if self._is_org_admin(user_id, str(project.organisation_id)):
                # Check feature flag
                override_enabled = FeatureFlag.objects.filter(
                    key="project_access_control.org_admin_override",
                    enabled=True,
                    scope_type="GLOBAL",
                ).exists()

                if override_enabled and self._check_override_rate_limit(user_id):
                    self._log_emergency_override(user_id, project_id)

                    # Record emergency override metric
                    emergency_override_total.labels(
                        organization_id=str(project.organisation_id)
                    ).inc()

                    result = self._build_result("admin", "emergency_override")
                    self.cache_service.set_permission(user_id, project_id, result)

                    # Record metrics
                    permission_resolution_total.labels(
                        source="emergency_override", role="admin"
                    ).inc()
                    permission_resolution_duration_seconds.observe(time.time() - start_time)

                    return result

            # No access to private project without explicit membership
            result = self._build_result("no_access", "no_access")
            self.cache_service.set_permission(user_id, project_id, result)

            # Record metrics
            permission_resolution_total.labels(source="no_access", role="no_access").inc()
            permission_resolution_duration_seconds.observe(time.time() - start_time)

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

            # Record metrics
            permission_resolution_total.labels(
                source="implicit_org_access", role=implicit_role
            ).inc()
            permission_resolution_duration_seconds.observe(time.time() - start_time)

            return result
        except OrganisationMembership.DoesNotExist:
            pass

        # Step 5: No access
        result = self._build_result("no_access", "no_access")
        self.cache_service.set_permission(user_id, project_id, result)

        # Record metrics
        permission_resolution_total.labels(source="no_access", role="no_access").inc()
        permission_resolution_duration_seconds.observe(time.time() - start_time)

        return result

    def _build_result(self, role: str, source: str) -> PermissionResult:
        """Build permission result with role-to-permission mapping."""
        role = self._normalize_membership_role(role)
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

    def _normalize_membership_role(self, value: str) -> str:
        """Normalize legacy/TeamReel membership role strings to access roles.

        Core access roles: admin/editor/viewer/no_access.
        TeamReel seeders historically used roles like owner/coach/player/staff.
        """
        raw = (value or "").strip().lower()
        if raw in {"admin", "editor", "viewer", "no_access"}:
            return raw

        # TeamReel / legacy role names
        if raw in {"owner", "coach", "manager", "team_admin"}:
            return "admin"
        if raw in {"staff", "assistant", "player", "supporter", "member"}:
            return "viewer"

        return "viewer" if raw else "no_access"

    def _pick_best_membership_role(self, memberships: list[ProjectMembership]) -> str:
        """Choose the most privileged access role from a set of memberships."""
        role_rank = {"no_access": 0, "viewer": 10, "editor": 20, "admin": 30}

        best_role = "no_access"
        best_rank = 0

        for membership in memberships:
            normalized = self._normalize_membership_role(getattr(membership, "role", ""))
            rank = role_rank.get(normalized, 0)
            if rank > best_rank:
                best_rank = rank
                best_role = normalized

        return best_role

    def _is_org_admin(self, user_id: str, organisation_id: str) -> bool:
        """Check if user is an admin or owner of the organisation."""
        return OrganisationMembership.objects.filter(
            organisation_id=organisation_id, user_id=user_id, role__in=["owner", "admin"]
        ).exists()

    def _log_emergency_override(self, user_id: str, project_id: str) -> None:
        """Log emergency override access via B08 audit."""
        try:
            from audit.api import audit_log

            user = User.objects.get(id=user_id)
            project = Project.objects.get(id=project_id)

            # Emit special audit event for emergency override
            audit_log.record(
                "project.access.emergency_override",
                user=user,
                project=project,
                organization=project.organisation,
                metadata={
                    "project_id": project_id,
                    "organization_id": str(project.organisation_id),
                    "user_id": user_id,
                    "override_type": "org_admin_private_project_access",
                    "feature_flag": "project_access_control.org_admin_override",
                },
            )
        except Exception as e:
            # Fallback to standard logging if audit fails
            import logging

            logger = logging.getLogger(__name__)
            logger.warning(
                f"Emergency override used by user {user_id} for project {project_id}",
                extra={"exception": str(e)},
            )

    def _check_override_rate_limit(self, user_id: str) -> bool:
        """
        Check if user has exceeded daily override limit.

        Limit: 5 overrides per day.
        Key: rate_limit:override:{user_id}:{date}
        """
        today = timezone.now().date().isoformat()
        key = f"rate_limit:override:{user_id}:{today}"
        limit = 5

        # Use add() to set initial value if key doesn't exist (atomic)
        # Returns True if key was set, False if it already existed
        if cache.add(key, 1, timeout=86400):
            return True

        # Key exists, increment and check
        try:
            count = cache.incr(key)
            return count <= limit
        except ValueError:
            # Should not happen if add returned False, but handle race condition
            # If key expired/deleted between add and incr
            cache.set(key, 1, timeout=86400)
            return True
