"""
Sync RBAC RoleAssignment when a ProjectMembership role changes.

Mapping logic (from teamreel-rbac-config.md):
  - admin  on root project (parent_project=NULL) → Club Admin
  - admin  on child project (parent_project≠NULL) → Team Admin
  - viewer on child project (parent_project≠NULL) → Team Member
  - viewer on root project  (parent_project=NULL) → Supporter
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)


def _rbac_role_name_for_membership(membership_role: str, is_root_project: bool) -> str:
    """Return the RBAC Role.name matching a membership role + project level."""
    role = str(membership_role).strip().lower()
    if role == "admin":
        return "Club Admin" if is_root_project else "Team Admin"
    # viewer / editor → member or supporter
    return "Supporter" if is_root_project else "Team Member"


def sync_rbac_for_membership(
    *,
    user_id,
    project_id,
    membership_role: str,
    actor=None,
) -> Optional[str]:
    """
    Create / update the RBAC RoleAssignment so it matches the membership role.

    Returns the new RBAC role name on success, or None on error.
    """
    try:
        from permissions.models import Role, RoleAssignment, ScopeChoices
        from projects.models import Project

        project = Project.objects.select_related("parent_project").get(pk=project_id)
        is_root = project.parent_project_id is None
        target_role_name = _rbac_role_name_for_membership(membership_role, is_root)

        # Look up the Role object
        role = Role.objects.filter(name=target_role_name, scope=ScopeChoices.PROJECT).first()
        if not role:
            logger.warning("RBAC Role %r not found — skipping sync", target_role_name)
            return None

        # All project-level RBAC role names we might need to replace
        project_role_names = {"Club Admin", "Team Admin", "Team Member", "Supporter"}

        # Delete any existing project-scoped RBAC assignment for this user + project
        # (there should be at most one, but delete all to be safe)
        deleted_count, _ = RoleAssignment.objects.filter(
            user_id=user_id,
            scope=ScopeChoices.PROJECT,
            target_project_id=project_id,
            role__name__in=project_role_names,
        ).delete()

        if deleted_count:
            logger.info(
                "Removed %d old RBAC assignment(s) for user %s on project %s",
                deleted_count,
                user_id,
                project_id,
            )

        # Create the new assignment
        RoleAssignment.objects.create(
            user_id=user_id,
            role=role,
            scope=ScopeChoices.PROJECT,
            target_project_id=project_id,
            assigned_by=actor,
        )

        logger.info(
            "RBAC synced: user=%s project=%s → %s",
            user_id,
            project_id,
            target_role_name,
        )

        # Invalidate permission cache for this user
        try:
            from django.core.cache import cache

            cache.delete(f"permissions:user:{user_id}")
        except Exception:
            logger.debug("Failed to invalidate permission cache for user %s", user_id, exc_info=True)

        return target_role_name

    except Exception:
        logger.exception("Failed to sync RBAC for user %s on project %s", user_id, project_id)
        return None
