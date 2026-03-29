"""
Audit logging API.

Provides the primary interface for recording audit events throughout
the application. All audit recording should go through this module.
"""

import json
import logging
from typing import TYPE_CHECKING, Any, Dict, Optional
from uuid import UUID

from django.contrib.auth import get_user_model
from django.db import transaction

from .metrics import audit_events_recorded_total, audit_failures_total
from .models import AuditEvent
from .registry import is_event_type_registered
from .signals import audit_record_failed

if TYPE_CHECKING:
    from accounts.models import User as UserType
else:
    User = get_user_model()
    UserType = User  # type: ignore[misc,assignment]

logger = logging.getLogger(__name__)


class UUIDEncoder(json.JSONEncoder):
    """JSON encoder that handles UUID objects."""

    def default(self, obj: Any) -> Any:
        if isinstance(obj, UUID):
            return str(obj)
        return super().default(obj)


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
        user: Optional[UserType] = None,
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
        metadata_json = json.dumps(metadata, cls=UUIDEncoder)
        metadata_size_kb = len(metadata_json.encode("utf-8")) / 1024
        if metadata_size_kb > 10:
            raise ValueError(
                f"Metadata size {metadata_size_kb:.2f}KB exceeds 10KB limit. "
                f"Reduce metadata or store large data elsewhere."
            )

        # Sanitize metadata for Django JSONField (convert UUIDs to strings)
        sanitized_metadata = json.loads(metadata_json)

        # Auto-capture IP and user agent from request
        if request:
            sanitized_metadata.setdefault("ip", request.META.get("REMOTE_ADDR"))
            sanitized_metadata.setdefault("user_agent", request.META.get("HTTP_USER_AGENT"))

        # Graceful failure: Never break application flow
        try:
            with transaction.atomic():
                event = AuditEvent.objects.create(
                    event_type=event_type,
                    user=user,
                    organization=organization,
                    project=project,
                    metadata=sanitized_metadata,
                )

            # Metrics: Increment success counter
            audit_events_recorded_total.labels(event_type=event_type).inc()

            # Broadcast via WebSockets (best effort)
            try:
                from rtc_websockets.services import NotificationService

                from .serializers import AuditEventSerializer

                service = NotificationService()
                payload = AuditEventSerializer(event).data

                # Always broadcast to system admins
                service.send_system_notification("audit.created", payload)

                # Broadcast to organization if present
                if organization:
                    service.send_org_notification(organization.id, "audit.created", payload)
                # Broadcast to project if present
                elif project:
                    service.send_project_notification(project.id, "audit.created", payload)
                # Fallback: Broadcast to user if present (and no org/project context)
                elif user:
                    service.send_user_notification(user.id, "audit.created", payload)

                    # Also broadcast to all organizations the user belongs to (for Org Admins)
                    # This ensures Org Admins see logins/logouts of their members
                    if not organization and not project:
                        try:
                            memberships = user.organisation_memberships.filter(
                                is_active=True
                            ).select_related("organisation")

                            # Log count for debugging
                            logger.info(
                                f"Broadcasting global event {event_type}"
                                f" to user {user.id}'s organisations"
                            )

                            for membership in memberships:
                                service.send_org_notification(
                                    membership.organisation.id, "audit.created", payload
                                )
                        except Exception as e:
                            logger.warning(f"Failed to broadcast to user orgs: {e}")

            except Exception as ws_error:
                # Do not fail audit recording if WebSocket fails
                logger.warning(f"Failed to broadcast audit event: {ws_error}")

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
