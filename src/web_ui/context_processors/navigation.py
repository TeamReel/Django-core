"""Context processor for navigation and user state."""

from typing import Any, Dict

from django.http import HttpRequest


def navigation_context(request: HttpRequest) -> Dict[str, Any]:
    """
    Provide navigation context for all templates.

    Precomputes permission flags to avoid N+1 queries during navigation rendering.
    Execution target: < 5ms per request (SC-010).

    Exposes:
    - user: Current user (from request.user)
    - is_authenticated: Boolean auth state
    - can_view_orgs: Boolean permission flag
    - can_manage_orgs: Boolean permission flag
    - can_view_projects: Boolean permission flag
    - has_perm: Permission helper function for edge cases

    Args:
        request: The HTTP request object

    Returns:
        Dict with context variables for templates
    """
    user = request.user
    context: Dict[str, Any] = {
        "user": user,
        "is_authenticated": user.is_authenticated,
    }

    # Precompute permission flags for navigation (avoids per-item checks)
    if user.is_authenticated:
        # Use B08 permission system
        # Note: Permission codenames match B08 implementation
        context["can_view_orgs"] = user.has_perm("organisations.view_organisation")
        context["can_manage_orgs"] = user.has_perm("organisations.manage_organisation")
        context["can_view_projects"] = user.has_perm("projects.view_project")
    else:
        # Anonymous user - no permissions
        context["can_view_orgs"] = False
        context["can_manage_orgs"] = False
        context["can_view_projects"] = False

    # Provide helper function for edge case permission checks
    def has_perm(perm: str) -> bool:
        """Check if user has a specific permission (for edge cases)."""
        return user.has_perm(perm) if user.is_authenticated else False

    context["has_perm"] = has_perm

    return context
