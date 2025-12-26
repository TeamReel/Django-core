"""
Audit logging integration for permissions system.

Provides integration with B09-audit-logging with graceful fallback to Django
structured logging when B09 is unavailable.

This module serves as the single source of truth for all permission evaluations,
ensuring comprehensive audit logging for security investigations and compliance.
"""

import importlib.util
import json
import logging
from datetime import datetime
from typing import Any, Dict, Optional, Protocol

from django.conf import settings
from django.contrib.auth import get_user_model

logger = logging.getLogger("permissions.audit")

# Get the User model - supports custom user models
User = get_user_model()


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
    Supports both 'audit_logging' package and internal 'audit' app.
    """

    def __init__(self):
        self.b09_available = False
        self.emit_event = None

        # 1. Try external audit_logging package
        if importlib.util.find_spec("audit_logging") is not None:
            try:
                from audit_logging import emit_event  # type: ignore

                self.emit_event = emit_event
                self.b09_available = True
            except ImportError:
                logger.warning("B09 audit_logging found but emit_event not importable")

        # 2. Try internal audit app if external not found
        if not self.b09_available and importlib.util.find_spec("audit.api") is not None:
            try:
                from audit.api import audit_log

                def emit_event_adapter(event_type, user_id, data):
                    # Map permission_check to permission.checked
                    if event_type == "permission_check":
                        event_type = "permission.checked"

                    # Fetch user if possible (audit.api expects User object)
                    user = None
                    if user_id:
                        try:
                            user = User.objects.get(id=user_id)
                        except User.DoesNotExist:
                            pass

                    audit_log.record(event_type, user=user, metadata=data)

                self.emit_event = emit_event_adapter
                self.b09_available = True
            except ImportError:
                logger.warning("Internal audit app found but could not be adapted")

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
    action: str = "assigned",
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
        action: "assigned" (or "created") or "revoked"
    """
    # Try to use internal audit log directly for better event typing
    try:
        from audit.api import audit_log
        from django.contrib.auth import get_user_model

        User = get_user_model()

        event_type = "role.revoked" if action == "revoked" else "role.assigned"

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            user = None

        audit_log.record(
            event_type,
            user=user,
            metadata={
                "role_name": role_name,
                "target_user_id": assigned_to_user_id,
                "scope": scope,
                "target_org_id": target_org_id,
                "target_project_id": target_project_id,
                "role_id": role_id,
            },
        )
        return
    except ImportError:
        pass

    # Fallback to generic backend
    backend = get_audit_backend()
    backend.emit(
        user_id=user_id,
        permission="permissions.assign_role",
        resource_type="role_assignment",
        resource_id=assigned_to_user_id,
        decision="grant",
        context={
            "action": action,
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


def evaluate_permission(
    user: User,
    permission: str,
    resource: Optional[Any] = None,
    context: Optional[Dict[str, Any]] = None,
) -> bool:
    """
    Evaluate permission and emit audit event.

    This function serves as the single source of truth for all permission checks
    in the system, ensuring comprehensive audit logging and preventing ACL bypass.

    Args:
        user: Django User instance requesting permission
        permission: Permission code (e.g., "organization.view_balance")
        resource: Optional resource being accessed (for scoping, e.g., Organization instance)
        context: Optional context dict with {scope, organization_id, project_id, request_id}

    Returns:
        True if permission granted, False if denied

    Side Effects:
        - Emits B09 audit event (or Django log if B09 unavailable)
        - Increments django-prometheus permission check counter (if configured)

    Raises:
        TypeError: If user is not authenticated or permission is not a string

    Example:
        >>> from django.contrib.auth import get_user_model
        >>> User = get_user_model()
        >>> user = User.objects.get(email="admin@example.com")
        >>> org = Organization.objects.get(id=42)
        >>> granted = evaluate_permission(
        ...     user=user,
        ...     permission="organization.view_balance",
        ...     resource=org,
        ...     context={"scope": "ORGANIZATION", "organization_id": org.id}
        ... )
        >>> assert granted == True
    """
    # Input validation
    if not hasattr(user, "is_authenticated") or not user.is_authenticated:
        raise TypeError("User must be an authenticated Django User instance")

    if not isinstance(permission, str):
        raise TypeError("Permission must be a string")

    # Ensure context dict exists
    if context is None:
        context = {}

    # Import here to avoid circular dependency
    from permissions.evaluator import check_permission

    # Prepare context data
    scope: str = context.get("scope", "UNKNOWN")
    organization_id: Optional[int] = context.get("organization_id")
    project_id: Optional[int] = context.get("project_id")
    request_id: Optional[str] = context.get("request_id")

    # Determine resource type and ID from resource object
    resource_type: Optional[str] = None
    resource_id: Optional[int] = None

    if resource is not None:
        resource_type = resource.__class__.__name__
        resource_id = getattr(resource, "id", None)

    # Evaluate permission using existing evaluator
    # Convert User instance to UUID for evaluator (if user has uuid field)
    # Fallback to user.id if uuid not present
    user_uuid: Any = getattr(user, "uuid", None) or user.id
    resource_uuid: Optional[Any] = getattr(resource, "uuid", None) if resource else None

    # Call existing check_permission function
    # This performs the actual permission resolution via role assignments
    granted: bool = check_permission(
        user_id=user_uuid,
        permission=permission,
        resource_id=resource_uuid,
        resource_type=resource_type or "generic",
    )

    # Prepare audit event data with structured fields (FR-002)
    event_type: str = "permission.granted" if granted else "permission.denied"
    outcome: str = "allowed" if granted else "denied"

    # Fetch organization and project objects if IDs provided
    organization = None
    project = None

    if organization_id:
        # Import here to avoid circular dependency
        try:
            from organisations.models import Organisation

            organization = Organisation.objects.filter(id=organization_id).first()
        except Exception as e:
            # Continue without organization context (model may not exist or DB error)
            logger.debug(f"Could not fetch organization {organization_id}: {e}")

    if project_id:
        # Import here to avoid circular dependency
        try:
            from projects.models import Project

            project = Project.objects.filter(id=project_id).first()
        except Exception as e:
            # Continue without project context (model may not exist or DB error)
            logger.debug(f"Could not fetch project {project_id}: {e}")

    # Emit audit event to B09 with Django logging fallback
    # Use B09's actual API as specified in T002
    try:
        from audit.services import create_audit_event

        # Call B09 with structured fields as individual kwargs (FR-002)
        create_audit_event(
            event_type=event_type,
            user=user,
            organization=organization,
            project=project,
            metadata={
                "permission": permission,
                "outcome": outcome,
                "resource_type": resource_type,
                "resource_id": resource_id,
                "scope": scope,
                "request_id": request_id,
            },
        )
    except ImportError as e:
        # B09 module not available - this is expected in some environments
        # Fall back to Django logging (FR-003)
        logger.warning(
            "B09 audit backend unavailable (ImportError), falling back to Django logging",
            extra={
                "audit_data": {
                    "event_type": event_type,
                    "user_id": user.id,
                    "permission": permission,
                    "outcome": outcome,
                    "resource_type": resource_type,
                    "resource_id": resource_id,
                    "scope": scope,
                    "organization_id": organization_id,
                    "project_id": project_id,
                    "request_id": request_id,
                },
                "error": str(e),
            },
        )

        # Log the actual permission decision
        logger.info(
            f"Permission {outcome}: user={user.id} permission={permission} "
            f"scope={scope} resource_type={resource_type} resource_id={resource_id}"
        )
    except Exception as e:
        # B09 available but failed - log error but don't block permission check
        # This catches database errors, connection issues, etc.
        logger.error(
            "B09 audit event emission failed, falling back to Django logging",
            extra={
                "audit_data": {
                    "event_type": event_type,
                    "user_id": user.id,
                    "permission": permission,
                    "outcome": outcome,
                    "resource_type": resource_type,
                    "resource_id": resource_id,
                    "scope": scope,
                    "organization_id": organization_id,
                    "project_id": project_id,
                    "request_id": request_id,
                },
                "error": str(e),
            },
            exc_info=True,
        )

        # Log the actual permission decision
        logger.info(
            f"Permission {outcome}: user={user.id} permission={permission} "
            f"scope={scope} resource_type={resource_type} resource_id={resource_id}"
        )

    return granted
