"""
DRF permission classes for permissions API.

This module provides custom Django REST Framework permission classes
that integrate with the hierarchical access control system.

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

from rest_framework.permissions import BasePermission

from permissions.evaluator import check_permission


class HasPermission(BasePermission):
    """
    DRF permission class that checks if user has specific permission.

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

        # Check permission using evaluator
        has_perm = check_permission(
            request.user.id,
            self.permission,
            None,
            "generic",  # Generic permission check (not resource-specific)
        )

        if not has_perm:
            # Set custom error message
            self.message = f"Permission denied: '{self.permission}' required"

        return has_perm

    def has_object_permission(self, request, view, obj):
        """
        Check if request user has permission on specific object.

        Args:
            request: DRF request object
            view: DRF view object
            obj: Object being accessed

        Returns:
            True if user has permission on object, False otherwise
        """
        if not request.user or not request.user.is_authenticated:
            return False

        # Determine resource type from object
        resource_type = obj.__class__.__name__.lower()
        resource_id = obj.id if hasattr(obj, "id") else None

        has_perm = check_permission(request.user.id, self.permission, resource_id, resource_type)

        if not has_perm:
            self.message = (
                f"Permission denied: '{self.permission}' required for this {resource_type}"
            )

        return has_perm
