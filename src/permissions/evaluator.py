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
from permissions.models import Permission, RoleAssignment, ScopeChoices

# Audit system integration (graceful degradation if not installed)
try:
    from audit.api import audit_log

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

    Evaluation order:
    1. Check cache
    2. Query global roles (short-circuit if wildcard found)
    3. Query organization roles (if resource_id provided and belongs to org)
    4. Query project roles (if resource_id provided and is project)
    5. Union all permissions from matched roles
    6. Return True if permission in set, False otherwise
    7. Cache result

    Args:
        user_id: UUID of user to check
        permission: Permission string (e.g., 'projects.delete')
        resource_id: Optional UUID of resource being accessed
        resource_type: Type of resource ('project', 'organisation', 'generic')

    Returns:
        True if user has permission, False otherwise (deny-by-default)

    Example:
        has_perm = check_permission(
            user.id,
            'projects.delete',
            project.id,
            'project'
        )
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
                if (
                    resource_type == "organisation"
                    and resource_id == assignment.target_organization_id
                ):
                    pass  # Relevant
                elif resource_type == "project" and resource_id:
                    # For project checks, org roles apply if project belongs
                    # to this org. We need to look up the project's org.
                    # For now, skip this check (will be refined in WP03)
                    pass
                else:
                    continue  # Not relevant to this resource
            elif assignment.scope == ScopeChoices.PROJECT:
                # Project roles only apply to specific project
                if resource_type == "project" and resource_id == assignment.target_project_id:
                    pass  # Relevant
                else:
                    continue  # Not relevant

            # Add permissions from this role
            for perm in assignment.role.permissions.all():
                granted_permissions.add(perm.permission)

                # Check for wildcard (superuser)
                if perm.permission == "*":
                    logger.debug(
                        f"User {user_id} has wildcard permission via " f"{assignment.role.name}"
                    )
                    decision = True
                    break  # Short-circuit

            if decision:
                break  # Wildcard found, no need to check more roles

        # Check if requested permission in granted set
        if not decision:
            decision = permission in granted_permissions
            logger.debug(
                f"Permission check for user {user_id}, permission "
                f"{permission}: {'granted' if decision else 'denied'} "
                f"(granted_permissions: {len(granted_permissions)})"
            )

    except Exception as e:
        logger.error(f"Permission evaluation error: {e}", exc_info=True)
        decision = False  # Fail closed (deny on error)

    # Cache result
    set_cached_evaluation(user_id, permission, resource_type, resource_id, decision)

    # NEW: Log permission check to audit system (B09 integration)
    if AUDIT_AVAILABLE:
        try:
            # Get user object for audit context
            from django.contrib.auth import get_user_model

            user_model = get_user_model()
            try:
                user = user_model.objects.get(id=user_id)
            except user_model.DoesNotExist:
                user = None

            # Get organization/project context if resource_id provided
            organization = None
            project = None

            if resource_id:
                if resource_type == "organisation":
                    from organisations.models import Organisation

                    try:
                        organization = Organisation.objects.get(id=resource_id)
                    except Organisation.DoesNotExist:
                        pass
                elif resource_type == "project":
                    from projects.models import Project

                    try:
                        project = Project.objects.get(id=resource_id)
                        organization = project.organisation if project else None
                    except Project.DoesNotExist:
                        pass

            # Record permission check event
            audit_log.record(
                "permission.checked",
                user=user,
                organization=organization,
                project=project,
                metadata={
                    "permission": permission,
                    "result": "allowed" if decision else "denied",
                    "resource_type": resource_type,
                    "resource_id": str(resource_id) if resource_id else None,
                },
            )
        except Exception as e:
            # Graceful degradation: audit failure doesn't break permission check
            logger.warning("Failed to log permission check to audit system: %s", e)

    # Emit audit event if permission is sensitive or decision is deny (legacy B08 audit)
    try:
        perm_obj = Permission.objects.filter(permission=permission).first()
        is_sensitive = perm_obj.is_sensitive if perm_obj else False
    except Exception:
        is_sensitive = False

    if is_sensitive or not decision:
        audit_backend.emit(
            user_id=str(user_id),
            permission=permission,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            decision="grant" if decision else "deny",
            context={
                "evaluated_roles": (
                    [str(a.role_id) for a in assignments] if "assignments" in locals() else []
                ),
                "cache_hit": cached is not None,
            },
        )

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
        logger.debug(f"Batch check: all {len(permissions)} permissions cached")
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
                    # Skip org-project relationship check for now
                    pass
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
            f"Batch check: {cached_count} cached, "
            f"{len(uncached_permissions)} evaluated "
            f"(granted_permissions: {len(granted_permissions)})"
        )

    except Exception as e:
        logger.error(f"Batch permission evaluation error: {e}", exc_info=True)
        # Fail closed: deny all uncached permissions
        for permission in uncached_permissions:
            results[permission] = False

    return results
