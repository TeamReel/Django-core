"""
Audit logging integration for permissions system.

Provides adapters for B09-audit-logging with graceful fallback to Django
structured logging when B09 is unavailable.
"""

import importlib.util
import json
import logging
from datetime import datetime
from typing import Any, Dict, Optional, Protocol

from django.conf import settings

logger = logging.getLogger("permissions.audit")


class AuditBackend(Protocol):
    """Protocol defining audit backend interface."""

    def emit(
        self,
        user_id: str,
        permission: str,
        resource_type: str,
        resource_id: Optional[str],
        decision: str,
        context: Dict[str, Any],
    ) -> None:
        """
        Emit audit event with evaluation details.

        Args:
            user_id: UUID of user making permission check
            permission: Permission string (e.g., 'projects.delete')
            resource_type: Resource category
            resource_id: Specific resource UUID (optional)
            decision: 'grant' or 'deny'
            context: Additional metadata (evaluated_roles, timestamp, etc.)
        """
        ...


class B09Backend:
    """
    Adapter for B09-audit-logging integration.

    Falls back to silent operation if B09 not available.
    """

    def __init__(self):
        self.b09_available = self._check_b09_available()
        self.emit_event = None
        if self.b09_available:
            try:
                from audit_logging import emit_event  # type: ignore

                self.emit_event = emit_event
            except ImportError:
                logger.warning("B09 audit_logging found but emit_event not importable")
                self.b09_available = False

    def _check_b09_available(self) -> bool:
        """Check if B09-audit-logging package is installed."""
        return importlib.util.find_spec("audit_logging") is not None

    def emit(
        self,
        user_id: str,
        permission: str,
        resource_type: str,
        resource_id: Optional[str],
        decision: str,
        context: Dict[str, Any],
    ) -> None:
        """
        Emit audit event to B09 if available, otherwise no-op.

        Args:
            user_id: UUID of user making permission check
            permission: Permission string (e.g., 'projects.delete')
            resource_type: Resource category
            resource_id: Specific resource UUID (optional)
            decision: 'grant' or 'deny'
            context: Additional metadata (evaluated_roles, timestamp, etc.)
        """
        if not self.b09_available or not self.emit_event:
            return  # Silently skip if B09 not available

        try:
            self.emit_event(
                event_type="permission_check",
                user_id=user_id,
                data={
                    "permission": permission,
                    "resource_type": resource_type,
                    "resource_id": resource_id,
                    "decision": decision,
                    **context,
                },
            )
        except Exception as e:
            logger.error(f"Failed to emit B09 audit event: {e}", exc_info=True)


class DjangoLoggingBackend:
    """
    Fallback audit backend using Django structured logging.

    Logs audit events as JSON to 'permissions.audit' logger.
    """

    def emit(
        self,
        user_id: str,
        permission: str,
        resource_type: str,
        resource_id: Optional[str],
        decision: str,
        context: Dict[str, Any],
    ) -> None:
        """Log audit event as structured JSON."""
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": "permission_check",
            "user_id": user_id,
            "permission": permission,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "decision": decision,
            **context,
        }

        logger.info(json.dumps(event))


def get_audit_backend() -> AuditBackend:
    """
    Get configured audit backend from settings.

    Falls back to DjangoLoggingBackend if setting not configured or import fails.

    Returns:
        AuditBackend: Configured audit backend instance
    """
    backend_path = getattr(
        settings, "PERMISSIONS_AUDIT_BACKEND", "permissions.audit.DjangoLoggingBackend"
    )

    if backend_path == "permissions.audit.B09Backend":
        return B09Backend()
    else:
        return DjangoLoggingBackend()


def emit_role_assignment_audit(
    user_id: str,
    assigned_to_user_id: str,
    role_id: str,
    role_name: str,
    scope: str,
    target_org_id: Optional[str] = None,
    target_project_id: Optional[str] = None,
) -> None:
    """
    Emit audit event for role assignment.

    Args:
        user_id: UUID of user performing the assignment
        assigned_to_user_id: UUID of user receiving the role
        role_id: UUID of role being assigned
        role_name: Name of role for readability
        scope: Role scope (global/organization/project)
        target_org_id: Target organization UUID if applicable
        target_project_id: Target project UUID if applicable
    """
    backend = get_audit_backend()
    backend.emit(
        user_id=user_id,
        permission="permissions.assign_role",
        resource_type="role_assignment",
        resource_id=assigned_to_user_id,
        decision="grant",
        context={
            "action": "assign_role",
            "role_id": role_id,
            "role_name": role_name,
            "scope": scope,
            "target_org_id": target_org_id,
            "target_project_id": target_project_id,
        },
    )


def emit_role_modification_audit(
    user_id: str,
    role_id: str,
    role_name: str,
    changes: Dict[str, Any],
) -> None:
    """
    Emit audit event for role modification.

    Args:
        user_id: UUID of user modifying the role
        role_id: UUID of role being modified
        role_name: Name of role for readability
        changes: Dict describing what changed (permissions added/removed, etc.)
    """
    backend = get_audit_backend()
    backend.emit(
        user_id=user_id,
        permission="permissions.modify_role",
        resource_type="role",
        resource_id=role_id,
        decision="grant",
        context={
            "action": "modify_role",
            "role_name": role_name,
            "changes": changes,
        },
    )
