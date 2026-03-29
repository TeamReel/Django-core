"""
DRF permission classes for permissions API.

This module provides custom Django REST Framework permission classes
that integrate with the hierarchical access control system.

All permission checks go through evaluate_permission() for comprehensive
audit logging and ACL bypass prevention (WP01-T008).

Usage Examples:

    Basic usage in a ViewSet:
        from rest_framework import viewsets
        from rest_framework.permissions import IsAuthenticated
        from permissions.api.permissions import HasPermission

        class ProjectViewSet(viewsets.ModelViewSet):
            permission_classes = [IsAuthenticated, HasPermission('projects.view')]

            def get_permissions(self):
                if self.action == 'create':
                    return [IsAuthenticated(), HasPermission('projects.create')()]
                elif self.action in ['update', 'partial_update']:
                    return [IsAuthenticated(), HasPermission('projects.modify')()]
                elif self.action == 'destroy':
                    return [IsAuthenticated(), HasPermission('projects.delete')()]
                return super().get_permissions()

    Multiple permissions (requires all):
        class SecureViewSet(viewsets.ModelViewSet):
            permission_classes = [
                IsAuthenticated,
                HasPermission('resource.view'),
                HasPermission('resource.access'),
            ]

    Per-action permissions:
        @action(detail=True, methods=['post'])
        def archive(self, request, pk=None):
            self.permission_classes = [IsAuthenticated, HasPermission('projects.archive')]
            self.check_permissions(request)
            # ... implementation
"""

from permissions.audit import evaluate_permission
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission


class HasPermission(BasePermission):
    """
    DRF permission class that checks if user has specific permission.

    Uses evaluate_permission() for comprehensive audit logging.

    Usage:
        class MyViewSet(viewsets.ModelViewSet):
            permission_classes = [IsAuthenticated, HasPermission('projects.delete')]

    Or dynamic per-action:
        def get_permissions(self):
            if self.action == 'destroy':
                return [IsAuthenticated(), HasPermission('projects.delete')()]
            return super().get_permissions()
    """

    def __init__(self, permission: str):
        """
        Initialize with required permission.

        Args:
            permission: Permission string (e.g., 'projects.delete')
        """
        self.permission = permission
        super().__init__()

    def has_permission(self, request, view):
        """
        Check if request user has permission.

        Args:
            request: DRF request object
            view: DRF view object

        Returns:
            True if user has permission, False otherwise
        """
        if not request.user or not request.user.is_authenticated:
            return False

        # Use centralized evaluator for audit logging (WP01-T008)
        try:
            has_perm = evaluate_permission(
                user=request.user,
                permission=self.permission,
                resource=None,
                context={
                    "scope": "GENERIC",
                    "request_id": request.META.get("HTTP_X_REQUEST_ID"),
                },
            )
        except Exception:
            # Fail closed on evaluation errors
            has_perm = False

        if not has_perm:
            # Raise structured 403 response (WP06-T035)
            raise PermissionDenied(
                {
                    "error": "forbidden",
                    "permission": self.permission,
                    "detail": f"Permission denied: '{self.permission}' required",
                    "scope": "GENERIC",
                }
            )

        return has_perm

    def has_object_permission(self, request, view, obj):
        """
        Check if request user has permission on the object.

        Args:
            request: DRF request object
            view: DRF view object
            obj: The object to check permission against

        Returns:
            True if user has permission, False otherwise
        """
        if not request.user or not request.user.is_authenticated:
            return False

        # Use centralized evaluator for audit logging (WP01-T008)
        try:
            has_perm = evaluate_permission(
                user=request.user,
                permission=self.permission,
                resource=obj,
                context={
                    "scope": "GENERIC",
                    "request_id": request.META.get("HTTP_X_REQUEST_ID"),
                },
            )
        except Exception:
            # Fail closed on evaluation errors
            has_perm = False

        if not has_perm:
            # Raise structured 403 response (WP06-T035)
            raise PermissionDenied(
                {
                    "error": "forbidden",
                    "permission": self.permission,
                    "detail": f"Permission denied: '{self.permission}' required",
                    "scope": "GENERIC",
                }
            )

        return has_perm


class HasOrganizationPermission(BasePermission):
    """
    DRF permission class for organization-scoped permission checks.

    Expects view to have 'required_permission' attribute and
    'organization_id' in URL kwargs or request data.

    Uses evaluate_permission() for comprehensive audit logging.

    Usage:
        class OrganizationBalanceView(APIView):
            permission_classes = [HasOrganizationPermission]
            required_permission = "organization.view_balance"

            def get(self, request, organization_id):
                # Permission already checked
                ...
    """

    def has_permission(self, request, view):
        """
        Check if user has organization-scoped permission.

        Args:
            request: DRF request object
            view: DRF view object (must have required_permission attribute)

        Returns:
            True if user has permission, False otherwise
        """
        if not request.user or not request.user.is_authenticated:
            return False

        # Get required permission from view
        permission = getattr(view, "required_permission", None)
        if not permission:
            raise AttributeError(
                f"{view.__class__.__name__} must define 'required_permission' attribute"
            )

        # Extract organization_id from URL kwargs or request data
        organization_id = view.kwargs.get("organization_id") or request.data.get("organization_id")
        if not organization_id:
            # Fail closed if organization context missing
            return False

        # Prepare context for evaluator
        context = {
            "scope": "ORGANIZATION",
            "organization_id": organization_id,
            "request_id": request.META.get("HTTP_X_REQUEST_ID"),
        }

        # Use centralized evaluator for audit logging
        try:
            has_perm = evaluate_permission(
                user=request.user,
                permission=permission,
                resource=None,
                context=context,
            )
        except Exception:
            # Fail closed on evaluation errors
            has_perm = False

        if not has_perm:
            # Raise structured 403 response (WP06-T035)
            detail = (
                f"Permission denied: '{permission}' required " f"for organization {organization_id}"
            )
            raise PermissionDenied(
                {
                    "error": "forbidden",
                    "permission": permission,
                    "detail": detail,
                    "scope": "ORGANIZATION",
                }
            )

        return has_perm


class HasProjectPermission(BasePermission):
    """
    DRF permission class for project-scoped permission checks.

    Expects view to have 'required_permission' attribute and
    'project_id' in URL kwargs or request data.

    Uses evaluate_permission() for comprehensive audit logging.

    Usage:
        class ProjectBalanceView(APIView):
            permission_classes = [HasProjectPermission]
            required_permission = "project.view_balance"

            def get(self, request, project_id):
                # Permission already checked
                ...
    """

    def has_permission(self, request, view):
        """
        Check if user has project-scoped permission.

        Args:
            request: DRF request object
            view: DRF view object (must have required_permission attribute)

        Returns:
            True if user has permission, False otherwise
        """
        if not request.user or not request.user.is_authenticated:
            return False

        # Get required permission from view
        permission = getattr(view, "required_permission", None)
        if not permission:
            raise AttributeError(
                f"{view.__class__.__name__} must define 'required_permission' attribute"
            )

        # Extract project_id from URL kwargs or request data
        project_id = view.kwargs.get("project_id") or request.data.get("project_id")
        if not project_id:
            # Fail closed if project context missing
            return False

        # Prepare context for evaluator
        context = {
            "scope": "PROJECT",
            "project_id": project_id,
            "request_id": request.META.get("HTTP_X_REQUEST_ID"),
        }

        # Use centralized evaluator for audit logging
        try:
            has_perm = evaluate_permission(
                user=request.user,
                permission=permission,
                resource=None,
                context=context,
            )
        except Exception:
            # Fail closed on evaluation errors
            has_perm = False

        if not has_perm:
            # Raise structured 403 response (WP06-T035)
            detail = f"Permission denied: '{permission}' required for project {project_id}"
            raise PermissionDenied(
                {
                    "error": "forbidden",
                    "permission": permission,
                    "detail": detail,
                    "scope": "PROJECT",
                }
            )

        return has_perm
