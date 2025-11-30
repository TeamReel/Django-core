"""
Custom Celery task base classes for Django Core-App.

Provides AuditedTask for automatic audit logging integration with B09.
"""
import logging
from typing import Any, Optional

from celery import Task

logger = logging.getLogger(__name__)


class AuditedTask(Task):
    """
    Base class for tasks requiring audit trail integration with B09.

    Usage:
        @shared_task(base=AuditedTask)
        def sensitive_operation(user_id, org_id, **kwargs):
            # Task implementation
            pass

    Requirements:
        - Task kwargs MUST include 'user_id' for audit trail
        - Task kwargs SHOULD include 'org_id' for multi-tenancy
        - Task kwargs MAY include 'request_id' for request tracing

    Lifecycle Events:
        - task.started: Created when task begins execution
        - task.completed: Created when task succeeds
        - task.failed: Created when task fails after all retries
    """

    def before_start(self, task_id: str, args: tuple, kwargs: dict) -> None:
        """
        Log task start to B09 audit system.

        Creates 'task.started' audit event with:
        - Task name and ID
        - User/org context from kwargs
        - Truncated args for security (first 3 only)
        """
        try:
            from audit.models import AuditEvent

            user_id = kwargs.get("user_id")
            org_id = kwargs.get("org_id")
            request_id = kwargs.get("request_id")

            # Truncate args to prevent sensitive data leakage
            safe_args = list(args)[:3] if args else []

            # Create audit event
            AuditEvent.objects.create(
                event_type="task.started",
                user_id=user_id,
                organisation_id=org_id,
                metadata={
                    "task_id": task_id,
                    "task_name": self.name,
                    "request_id": request_id,
                    "args_count": len(args),
                    "args_preview": safe_args,
                },
            )
            logger.debug(
                f"Audit event 'task.started' created for task {self.name} "
                f"(task_id={task_id}, user_id={user_id})"
            )

        except Exception as exc:
            # Log error but don't block task execution
            logger.error(
                f"Failed to create audit event for task start: {exc}",
                exc_info=True,
                extra={"task_id": task_id, "task_name": self.name},
            )

    def on_success(self, retval: Any, task_id: str, args: tuple, kwargs: dict) -> None:
        """
        Log successful task completion to B09 audit system.

        Creates 'task.completed' audit event with:
        - Task name and ID
        - User/org context from kwargs
        - Execution duration (if available)
        """
        try:
            from audit.models import AuditEvent

            user_id = kwargs.get("user_id")
            org_id = kwargs.get("org_id")
            request_id = kwargs.get("request_id")

            # Create audit event
            AuditEvent.objects.create(
                event_type="task.completed",
                user_id=user_id,
                organisation_id=org_id,
                metadata={
                    "task_id": task_id,
                    "task_name": self.name,
                    "request_id": request_id,
                    "success": True,
                },
            )
            logger.debug(
                f"Audit event 'task.completed' created for task {self.name} "
                f"(task_id={task_id}, user_id={user_id})"
            )

        except Exception as exc:
            # Log error but don't block task
            logger.error(
                f"Failed to create audit event for task success: {exc}",
                exc_info=True,
                extra={"task_id": task_id, "task_name": self.name},
            )

    def on_failure(
        self, exc: Exception, task_id: str, args: tuple, kwargs: dict, einfo: Any
    ) -> None:
        """
        Log task failure to B09 audit system.

        Creates 'task.failed' audit event with:
        - Task name and ID
        - User/org context from kwargs
        - Error type and message (truncated for security)
        """
        try:
            from audit.models import AuditEvent

            user_id = kwargs.get("user_id")
            org_id = kwargs.get("org_id")
            request_id = kwargs.get("request_id")

            # Truncate error message to prevent sensitive data leakage
            error_msg = str(exc)[:200] if exc else "Unknown error"

            # Create audit event
            AuditEvent.objects.create(
                event_type="task.failed",
                user_id=user_id,
                organisation_id=org_id,
                metadata={
                    "task_id": task_id,
                    "task_name": self.name,
                    "request_id": request_id,
                    "error_type": exc.__class__.__name__,
                    "error_message": error_msg,
                    "success": False,
                },
            )
            logger.warning(
                f"Audit event 'task.failed' created for task {self.name} "
                f"(task_id={task_id}, user_id={user_id}, error={error_msg})"
            )

        except Exception as audit_exc:
            # Log error but don't interfere with task failure handling
            logger.error(
                f"Failed to create audit event for task failure: {audit_exc}",
                exc_info=True,
                extra={"task_id": task_id, "task_name": self.name},
            )


def extract_audit_context(kwargs: dict) -> dict:
    """
    Extract audit context fields from task kwargs.

    Args:
        kwargs: Task keyword arguments

    Returns:
        Dictionary with user_id, org_id, request_id (if present)

    Example:
        >>> extract_audit_context({'user_id': 123, 'org_id': 456, 'format': 'csv'})
        {'user_id': 123, 'org_id': 456, 'request_id': None}
    """
    return {
        "user_id": kwargs.get("user_id"),
        "org_id": kwargs.get("org_id"),
        "request_id": kwargs.get("request_id"),
    }


def validate_audit_context(kwargs: dict, require_user: bool = True) -> tuple[bool, Optional[str]]:
    """
    Validate that required audit context fields are present.

    Args:
        kwargs: Task keyword arguments
        require_user: Whether user_id is required (default True)

    Returns:
        Tuple of (is_valid, error_message)

    Example:
        >>> validate_audit_context({'user_id': 123})
        (True, None)
        >>> validate_audit_context({'org_id': 456})
        (False, 'Missing required context: user_id')
    """
    context = extract_audit_context(kwargs)

    if require_user and not context["user_id"]:
        return False, "Missing required context: user_id"

    return True, None
