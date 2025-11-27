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

import inspect
import logging
import re
import threading
from typing import Dict

from django.core.exceptions import ImproperlyConfigured

logger = logging.getLogger(__name__)


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
        # Validate format: must not contain digits
        if not re.match(r"^[a-z_]+\.[a-z_]+$", permission):
            raise ImproperlyConfigured(
                f"Permission '{permission}' must match format 'resource.action' "
                f"(lowercase letters and underscores only)"
            )

        with self._lock:
            if permission in self._permissions:
                raise ImproperlyConfigured(f"Permission '{permission}' is already registered")

            # Track which app registered this permission
            caller_frame = inspect.currentframe()
            caller_module = "unknown"
            if caller_frame and caller_frame.f_back and caller_frame.f_back.f_back:
                caller_module = caller_frame.f_back.f_back.f_globals.get("__name__", "unknown")

            self._permissions[permission] = {
                "permission": permission,
                "resource_type": resource_type,
                "description": description,
                "is_sensitive": is_sensitive,
                "registered_by": caller_module,
            }

            logger.info("Registered permission: %s (from %s)", permission, caller_module)

    def get(self, permission: str) -> dict | None:
        """Get metadata for a registered permission."""
        return self._permissions.get(permission)

    def is_registered(self, permission: str) -> bool:
        """Check if permission is registered."""
        return permission in self._permissions

    def get_by_resource_type(self, resource_type: str) -> list[str]:
        """Get all permissions for a resource type."""
        return [
            perm_str
            for perm_str, perm in self._permissions.items()
            if perm["resource_type"] == resource_type
        ]

    def all(self) -> list[str]:
        """Get all registered permissions (read-only)."""
        return list(self._permissions.keys())

    def clear(self) -> None:
        """Clear all registered permissions (for testing)."""
        with self._lock:
            self._permissions.clear()


# Global singleton instance
permission_registry = PermissionRegistry()
