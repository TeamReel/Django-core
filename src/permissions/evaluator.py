"""
Permission evaluation engine with additive inheritance.

Evaluation Flow:
1. Check cache for recent evaluation
2. If cache miss, query role assignments for user
3. Check global scope first (short-circuit if wildcard found)
4. Check organization scope (union with global permissions)
5. Check project scope (union with org permissions)
6. Return True if permission found in any role, False otherwise
7. Cache result with TTL
8. Emit audit event if permission is sensitive or decision is deny
"""

import logging
from typing import Optional
from uuid import UUID

from permissions.audit import get_audit_backend
from permissions.cache import (
    get_cached_evaluation,
    set_cached_evaluation,
)
from permissions.models import RoleAssignment, ScopeChoices

# Audit system integration (graceful degradation if not installed)
# We only need to know whether audit is available; the module isn't used directly here.
try:
    import audit.api as _audit_api  # noqa: F401

    AUDIT_AVAILABLE = True
except ImportError:
    AUDIT_AVAILABLE = False

logger = logging.getLogger(__name__)
audit_backend = get_audit_backend()


def check_permission(
    user_id: UUID,
    permission: str,
    resource_id: Optional[UUID] = None,
    resource_type: str = "generic",
) -> bool:
    """
    Check if user has a specific permission.
    ...
    """
    # Check cache first
    cached = get_cached_evaluation(user_id, permission, resource_type, resource_id)
    if cached is not None:
        return cached

    # Deny by default
    decision = False

    try:
        # Query user's role assignments with related permissions
        assignments = (
            RoleAssignment.objects.filter(user_id=user_id)
            .select_related("role")
            .prefetch_related("role__permissions")
        )

        # Collect permissions from all relevant scopes
        granted_permissions = set()

        for assignment in assignments:
            # Check scope relevance
            if assignment.scope == ScopeChoices.GLOBAL:
                # Global roles apply everywhere
                pass
            elif assignment.scope == ScopeChoices.ORGANIZATION:
                # Organization roles apply if resource belongs to that org
                # Handle case-insensitive resource_type (e.g. "Organisation" vs "organisation")
                # Handle UUID vs string comparison for IDs
                if resource_type.lower() == "organisation" and str(resource_id) == str(
                    assignment.target_organization_id
                ):
                    pass  # Relevant
                elif resource_type.lower() == "project" and resource_id:
                    # For project checks, org roles apply if project belongs
                    # to this org. We need to look up the project's org.
                    try:
                        from projects.models import Project

                        project_org_id = (
                            Project.all_objects.filter(id=resource_id)
                            .values_list("organisation_id", flat=True)
                            .first()
                        )
                        if not project_org_id:
                            continue
                        if str(project_org_id) != str(assignment.target_organization_id):
                            continue
                    except Exception:
                        logger.debug(
                            "Permission evaluation: failed project org lookup",
                            exc_info=True,
                        )
                        continue
                else:
                    continue  # Not relevant to this resource
            elif assignment.scope == ScopeChoices.PROJECT:
                # Project roles only apply to specific project
                if resource_type.lower() == "project" and str(resource_id) == str(
                    assignment.target_project_id
                ):
                    pass  # Relevant
                else:
                    continue  # Not relevant

            # Add permissions from this role
            for perm in assignment.role.permissions.all():
                granted_permissions.add(perm.permission)

                # Check for wildcard (superuser)
                if perm.permission == "*":
                    logger.debug(
                        "User %s has wildcard permission via %s",
                        user_id,
                        assignment.role.name,
                    )
                    decision = True
                    break  # Short-circuit

            if decision:
                break  # Wildcard found, no need to check more roles

        # Check if requested permission in granted set
        if not decision:
            decision = permission in granted_permissions
            logger.debug(
                "Permission check for user %s, permission %s: %s (granted_permissions: %s)",
                user_id,
                permission,
                "granted" if decision else "denied",
                len(granted_permissions),
            )

    except Exception as e:
        logger.error("Permission evaluation error: %s", e, exc_info=True)
        decision = False  # Fail closed (deny on error)

    # Cache result
    set_cached_evaluation(user_id, permission, resource_type, resource_id, decision)

    # Emit audit event via configured backend
    # This handles B09 integration and fallback to Django logging
    try:
        # Prepare context for audit
        # Scope is not tracked without refactoring check_permission.
        context = {
            "scope": "UNKNOWN",
            "evaluated_roles": (
                [str(a.role_id) for a in assignments] if "assignments" in locals() else []
            ),
        }

        audit_backend.emit(
            user_id=str(user_id),
            permission=permission,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            decision="grant" if decision else "deny",
            context=context,
        )
    except Exception as e:
        logger.warning("Failed to emit audit event: %s", e)

    return decision


def check_permissions_batch(
    user_id: UUID,
    permissions: list[str],
    resource_id: Optional[UUID] = None,
    resource_type: str = "generic",
) -> dict[str, bool]:
    """
    Check multiple permissions in a single query.

    Optimized for UI rendering where multiple permission checks needed
    (e.g., show/hide buttons based on permissions).

    Args:
        user_id: UUID of user
        permissions: List of permission strings to check
        resource_id: Optional resource ID (same for all checks)
        resource_type: Resource type (same for all checks)

    Returns:
        Dict mapping permission string to boolean result

    Example:
        perms = check_permissions_batch(
            user.id,
            ['projects.view', 'projects.update', 'projects.delete'],
            project.id,
            'project'
        )
        # Returns: {'projects.view': True, 'projects.update': True,
        #           'projects.delete': False}
    """
    results = {}

    # Check cache first for all permissions
    cached_count = 0
    uncached_permissions = []

    for permission in permissions:
        cached = get_cached_evaluation(user_id, permission, resource_type, resource_id)
        if cached is not None:
            results[permission] = cached
            cached_count += 1
        else:
            uncached_permissions.append(permission)

    # If all cached, return immediately
    if not uncached_permissions:
        logger.debug("Batch check: all %s permissions cached", len(permissions))
        return results

    # Query role assignments once for all uncached permissions
    try:
        assignments = (
            RoleAssignment.objects.filter(user_id=user_id)
            .select_related("role")
            .prefetch_related("role__permissions")
        )

        granted_permissions = set()
        has_wildcard = False

        for assignment in assignments:
            # Scope filtering (same as check_permission)
            if assignment.scope == ScopeChoices.GLOBAL:
                pass
            elif assignment.scope == ScopeChoices.ORGANIZATION:
                if (
                    resource_type == "organisation"
                    and resource_id == assignment.target_organization_id
                ):
                    pass
                elif resource_type == "project" and resource_id:
                    try:
                        from projects.models import Project

                        project_org_id = (
                            Project.all_objects.filter(id=resource_id)
                            .values_list("organisation_id", flat=True)
                            .first()
                        )
                        if not project_org_id:
                            continue
                        if project_org_id != assignment.target_organization_id:
                            continue
                    except Exception:
                        logger.debug(
                            "Batch permission evaluation: failed project org lookup",
                            exc_info=True,
                        )
                        continue
                else:
                    continue
            elif assignment.scope == ScopeChoices.PROJECT:
                if resource_type == "project" and resource_id == assignment.target_project_id:
                    pass
                else:
                    continue

            for perm in assignment.role.permissions.all():
                granted_permissions.add(perm.permission)
                if perm.permission == "*":
                    has_wildcard = True

        # Evaluate all uncached permissions
        for permission in uncached_permissions:
            if has_wildcard:
                decision = True
            else:
                decision = permission in granted_permissions

            results[permission] = decision
            set_cached_evaluation(user_id, permission, resource_type, resource_id, decision)

        logger.debug(
            "Batch check: %s cached, %s evaluated (granted_permissions: %s)",
            cached_count,
            len(uncached_permissions),
            len(granted_permissions),
        )

    except Exception as e:
        logger.error("Batch permission evaluation error: %s", e, exc_info=True)
        # Fail closed: deny all uncached permissions
        for permission in uncached_permissions:
            results[permission] = False

    return results
