"""Audit service for logging routing decisions."""

import logging
from datetime import datetime
from typing import Any

from audit.models import AuditEvent
from django.db import transaction
from prometheus_client import Counter, Histogram

logger = logging.getLogger(__name__)

# Prometheus metrics
audit_logs_total = Counter(
    "contextual_notifications_audit_logs_total",
    "Total number of audit logs created",
    ["event_type", "status"],
)

audit_log_time_seconds = Histogram(
    "contextual_notifications_audit_log_time_seconds",
    "Time to create audit log entry",
    ["event_type"],
)


class AuditService:
    """
    Service for logging routing decisions to B09 audit system.

    Logs all routing decisions (success and failure) for debugging and compliance.
    Failures to log audits are captured but don't block routing operations.
    """

    @staticmethod
    def log_routing_decision(
        event_type: str,
        event_context: dict[str, Any],
        matched_rules: list[int],
        target_users: list[tuple[int, str]],
        preference_filtered_users: list[int],
        suppressed_users: list[int],
        routing_time_ms: float,
        success: bool = True,
        error_message: str | None = None,
    ) -> bool:
        """
        Log routing decision to B09 audit system.

        Args:
            event_type: Domain event type (e.g., "project.updated")
            event_context: Event context dict (org_id, project_id, etc.)
            matched_rules: List of matched RoutingRule IDs
            target_users: List of (user_id, channel) tuples that were targeted
            preference_filtered_users: List of user IDs filtered out by preferences
            suppressed_users: List of user IDs suppressed due to duplicates
            routing_time_ms: Time taken to route event (milliseconds)
            success: Whether routing was successful
            error_message: Error message if routing failed

        Returns:
            True if audit log created successfully, False otherwise

        Example:
            >>> AuditService.log_routing_decision(
            ...     event_type="project.updated",
            ...     event_context={"org_id": 42, "project_id": 123},
            ...     matched_rules=[1, 2],
            ...     target_users=[(7, "in_app"), (7, "email"), (8, "in_app")],
            ...     preference_filtered_users=[9],
            ...     suppressed_users=[10],
            ...     routing_time_ms=45.2,
            ...     success=True
            ... )
            True
        """
        # Measure audit log time
        with audit_log_time_seconds.labels(event_type=event_type).time():
            try:
                # Extract user IDs and channels from target_users
                target_user_ids = list({user_id for user_id, _ in target_users})
                selected_channels: dict[int, list[str]] = {}
                for user_id, channel in target_users:
                    if user_id not in selected_channels:
                        selected_channels[user_id] = []
                    if channel not in selected_channels[user_id]:
                        selected_channels[user_id].append(channel)

                # Build audit metadata per data-model.md specification
                metadata = {
                    "domain_event_type": event_type,
                    "domain_event_context": event_context,
                    "matched_rules": matched_rules,
                    "target_users": target_user_ids,
                    "selected_channels": selected_channels,
                    "preference_filtered_users": preference_filtered_users,
                    "suppressed_users": suppressed_users,
                    "routing_time_ms": round(routing_time_ms, 2),
                    "timestamp": datetime.utcnow().isoformat(),
                    "success": success,
                }

                if error_message:
                    metadata["error_message"] = error_message

                # Create AuditEvent via B09 model
                with transaction.atomic():
                    AuditEvent.objects.create(
                        event_type="notification_routing_decision",
                        organization_id=event_context.get("org_id"),
                        project_id=event_context.get("project_id"),
                        user_id=event_context.get("actor_user_id"),  # Actor who triggered event
                        metadata=metadata,
                    )

                logger.debug(
                    "Routing decision logged to audit",
                    extra={
                        "event_type": event_type,
                        "org_id": event_context.get("org_id"),
                        "matched_rules": len(matched_rules),
                        "target_users": len(target_user_ids),
                        "routing_time_ms": routing_time_ms,
                    },
                )

                audit_logs_total.labels(event_type=event_type, status="success").inc()
                return True

            except Exception as exc:
                # Don't block routing on audit failures
                logger.error(
                    "Failed to log routing decision to audit",
                    extra={
                        "event_type": event_type,
                        "org_id": event_context.get("org_id"),
                        "error": str(exc),
                    },
                    exc_info=True,
                )
                audit_logs_total.labels(event_type=event_type, status="error").inc()
                return False

    @staticmethod
    def log_routing_error(
        event_type: str,
        event_context: dict[str, Any],
        error_message: str,
        routing_time_ms: float = 0.0,
    ) -> bool:
        """
        Log routing error to audit system.

        Convenience method for logging routing failures with minimal context.

        Args:
            event_type: Domain event type
            event_context: Event context dict
            error_message: Error description
            routing_time_ms: Time taken before error occurred

        Returns:
            True if audit log created successfully, False otherwise

        Example:
            >>> AuditService.log_routing_error(
            ...     event_type="project.updated",
            ...     event_context={"org_id": 42},
            ...     error_message="No routing rules found",
            ...     routing_time_ms=12.5
            ... )
            True
        """
        return AuditService.log_routing_decision(
            event_type=event_type,
            event_context=event_context,
            matched_rules=[],
            target_users=[],
            preference_filtered_users=[],
            suppressed_users=[],
            routing_time_ms=routing_time_ms,
            success=False,
            error_message=error_message,
        )
