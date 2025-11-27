"""
Audit logging API.

Provides the primary interface for recording audit events throughout
the application. All audit recording should go through this module.
"""

import json
import logging
from typing import Any, Dict, Optional

from django.contrib.auth import get_user_model
from django.db import transaction

from audit.metrics import audit_events_recorded_total, audit_failures_total
from audit.models import AuditEvent
from audit.registry import is_event_type_registered
from audit.signals import audit_record_failed

User = get_user_model()
logger = logging.getLogger(__name__)


class AuditLog:
    """
    Audit logging interface.

    Usage:
        from audit.api import audit_log

        audit_log.record(
            'auth.login',
            user=request.user,
            metadata={'ip': request.META['REMOTE_ADDR']}
        )
    """

    def record(
        self,
        event_type: str,
        user: Optional[User] = None,
        organization: Optional[Any] = None,
        project: Optional[Any] = None,
        metadata: Optional[Dict[str, Any]] = None,
        request: Optional[Any] = None,
    ) -> Optional[AuditEvent]:
        """
        Record an audit event.

        Args:
            event_type: Registered event type (e.g., 'auth.login')
            user: User who triggered the event (optional)
            organization: Organization context (optional)
            project: Project context (optional)
            metadata: Event-specific details (optional, max 10KB)
            request: HttpRequest for automatic IP/user agent capture (optional)

        Returns:
            AuditEvent instance if successful, None if graceful failure

        Raises:
            ValueError: If event_type not registered or metadata too large

        Failure handling order:
        1. Validate inputs (raise ValueError immediately)
        2. Try database write
        3. On exception: log error, increment audit_failures_total, emit signal
        4. Return None (never raise)
        """
        metadata = metadata or {}

        # Validation: Event type must be registered
        if not is_event_type_registered(event_type):
            raise ValueError(
                f"Event type '{event_type}' not registered. "
                f"Register with register_event_type() before use."
            )

        # Validation: Metadata size limit (10KB)
        metadata_json = json.dumps(metadata)
        metadata_size_kb = len(metadata_json.encode("utf-8")) / 1024
        if metadata_size_kb > 10:
            raise ValueError(
                f"Metadata size {metadata_size_kb:.2f}KB exceeds 10KB limit. "
                f"Reduce metadata or store large data elsewhere."
            )

        # Auto-capture IP and user agent from request
        if request:
            metadata.setdefault("ip", request.META.get("REMOTE_ADDR"))
            metadata.setdefault("user_agent", request.META.get("HTTP_USER_AGENT"))

        # Graceful failure: Never break application flow
        try:
            with transaction.atomic():
                event = AuditEvent.objects.create(
                    event_type=event_type,
                    user=user,
                    organization=organization,
                    project=project,
                    metadata=metadata,
                )

            # Metrics: Increment success counter
            audit_events_recorded_total.labels(event_type=event_type).inc()

            return event

        except Exception as e:
            # Log error (ops team visibility)
            logger.exception(
                f"Failed to record audit event: {event_type}",
                extra={
                    "event_type": event_type,
                    "user_id": user.id if user else None,
                    "error": str(e),
                },
            )

            # Emit signal (application-level observability)
            audit_record_failed.send(
                sender=self.__class__,
                event_type=event_type,
                exception=e,
                event_data={
                    "user": user,
                    "organization": organization,
                    "project": project,
                    "metadata": metadata,
                },
            )

            # Metrics: Increment failure counter
            audit_failures_total.labels(
                event_type=event_type, error_type=e.__class__.__name__
            ).inc()

            # Graceful degradation: Return None, don't re-raise
            return None


# Global singleton instance
audit_log = AuditLog()
