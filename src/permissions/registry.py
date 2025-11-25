"""
Permission registry for registering custom permissions from Django apps.

Usage:
    from permissions.registry import permission_registry

    permission_registry.register(
        'reports.generate',
        resource_type='report',
        description='Generate custom reports',
        is_sensitive=False
    )
"""

import re
import threading
from typing import Dict

from django.core.exceptions import ImproperlyConfigured


class PermissionRegistry:
    """
    Thread-safe registry for permission metadata.

    Attributes:
        _permissions: Dict mapping permission strings to metadata
        _lock: Thread lock for registration operations
    """

    def __init__(self) -> None:
        self._permissions: Dict[str, dict] = {}
        self._lock = threading.Lock()

    def register(
        self,
        permission: str,
        resource_type: str,
        description: str = "",
        is_sensitive: bool = False,
    ) -> None:
        """
        Register a permission with metadata.

        Args:
            permission: Permission string (format: resource.action, e.g.,
                'projects.delete')
            resource_type: Resource category (e.g., 'project', 'organisation')
            description: Human-readable explanation
            is_sensitive: Whether this permission triggers audit logging

        Raises:
            ImproperlyConfigured: If permission already registered or format
                invalid

        Example:
            registry.register(
                'reports.generate', 'report', 'Generate reports', False
            )
        """
        # Validate format
        if not re.match(r"^[a-z_]+\.[a-z_]+$", permission):
            raise ImproperlyConfigured(
                f"Permission '{permission}' must match format 'resource.action' "
                f"(lowercase letters and underscores only)"
            )

        with self._lock:
            if permission in self._permissions:
                raise ImproperlyConfigured(f"Permission '{permission}' is already registered")

            self._permissions[permission] = {
                "permission": permission,
                "resource_type": resource_type,
                "description": description,
                "is_sensitive": is_sensitive,
            }

    def get(self, permission: str) -> dict | None:
        """Get metadata for a registered permission."""
        return self._permissions.get(permission)

    def is_registered(self, permission: str) -> bool:
        """Check if permission is registered."""
        return permission in self._permissions

    def get_by_resource_type(self, resource_type: str) -> list[dict]:
        """Get all permissions for a resource type."""
        return [
            perm for perm in self._permissions.values() if perm["resource_type"] == resource_type
        ]

    def all(self) -> Dict[str, dict]:
        """Get all registered permissions (read-only)."""
        return self._permissions.copy()

    def clear(self) -> None:
        """Clear all registered permissions (for testing)."""
        with self._lock:
            self._permissions.clear()


# Global singleton instance
permission_registry = PermissionRegistry()
