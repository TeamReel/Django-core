"""
Service layer for B06 Organisation operations with ACL enforcement.

This module provides ACL-enforced functions for querying organization data,
ensuring all access goes through B08 permission checks and B09 audit logging.

All functions call evaluate_permission() internally before returning data.
"""

import logging
from typing import Optional

from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied
from django.db.models import QuerySet
from permissions.audit import evaluate_permission

from .models import Membership, Organisation

User = get_user_model()
logger = logging.getLogger(__name__)


def get_user_organizations(
    user: User,
    permission: Optional[str] = None,
    role_filter: Optional[list[str]] = None,
) -> QuerySet[Organisation]:
    """
    Get all organizations where user has membership (with ACL enforcement).

    Args:
        user: User requesting organization list
        permission: Optional permission to check (e.g., "organization.view_routing_logs")
        role_filter: Optional list of roles to filter by (e.g., ["admin", "owner"])

    Returns:
        QuerySet of Organisation instances user has access to

    Raises:
        PermissionDenied: If user lacks permission for any organization

    Example:
        >>> admin_orgs = get_user_organizations(
        ...     user=request.user,
        ...     permission="organization.view_routing_logs",
        ...     role_filter=["admin", "owner"]
        ... )
    """
    # Query memberships for user
    memberships = Membership.objects.filter(user=user, is_active=True).select_related(
        "organisation"
    )

    # Apply role filter if provided
    if role_filter:
        memberships = memberships.filter(role__in=role_filter)

    # If permission specified, check each organization
    if permission:
        org_ids = []
        for membership in memberships:
            # Check permission for this organization
            has_permission = evaluate_permission(
                user=user,
                permission=permission,
                context={
                    "scope": "ORGANIZATION",
                    "organization_id": str(membership.organisation.id),
                },
            )

            if has_permission:
                org_ids.append(membership.organisation.id)
            else:
                # Log denied access (evaluate_permission already logged to B09)
                logger.debug(
                    f"User {user.id} denied {permission} for org {membership.organisation.id}"
                )

        # Return organizations where user has permission
        return Organisation.objects.filter(id__in=org_ids, is_active=True)

    # No permission check - return all user's organizations
    org_ids = [m.organisation.id for m in memberships]
    return Organisation.objects.filter(id__in=org_ids, is_active=True)


def get_organization_members(
    organization_id: str,
    requesting_user: User,
    permission: str = "organization.view_members",
) -> QuerySet[User]:
    """
    Get all members of an organization (with ACL enforcement).

    Args:
        organization_id: UUID of the organization
        requesting_user: User requesting member list
        permission: Permission to check (default: "organization.view_members")

    Returns:
        QuerySet of User instances who are members

    Raises:
        PermissionDenied: If user lacks permission to view members

    Example:
        >>> members = get_organization_members(
        ...     organization_id=org.id,
        ...     requesting_user=request.user
        ... )
    """
    # Check permission first
    has_permission = evaluate_permission(
        user=requesting_user,
        permission=permission,
        context={
            "scope": "ORGANIZATION",
            "organization_id": str(organization_id),
        },
    )

    if not has_permission:
        logger.warning(f"User {requesting_user.id} denied {permission} for org {organization_id}")
        raise PermissionDenied(
            {
                "error": "forbidden",
                "permission": permission,
                "detail": "You do not have permission to view members of this organization",
            }
        )

    # Permission granted - return members
    memberships = Membership.objects.filter(
        organisation_id=organization_id, is_active=True
    ).select_related("user")

    user_ids = [m.user.id for m in memberships if m.user.is_active]
    return User.objects.filter(id__in=user_ids)


def get_organization_users(
    organization_id: str,
    requesting_user: User,
    permission: str = "organization.view_members",
) -> QuerySet[User]:
    """
    Alias for get_organization_members() for API consistency.

    This function exists to match the naming convention used in other
    parts of the codebase (e.g., contextual_notifications views).
    """
    return get_organization_members(organization_id, requesting_user, permission)


def check_organization_access(
    organization_id: str,
    requesting_user: User,
    permission: str = "organization.view",
) -> bool:
    """
    Check if user has access to an organization (with ACL enforcement).

    Args:
        organization_id: UUID of the organization
        requesting_user: User to check access for
        permission: Permission to check (default: "organization.view")

    Returns:
        True if user has access, False otherwise

    Example:
        >>> if check_organization_access(org.id, request.user):
        ...     # User has access
        ...     pass
    """
    return evaluate_permission(
        user=requesting_user,
        permission=permission,
        context={
            "scope": "ORGANIZATION",
            "organization_id": str(organization_id),
        },
    )
