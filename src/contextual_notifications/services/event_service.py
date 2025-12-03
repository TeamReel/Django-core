"""Event service for emitting domain events to notification system."""

import logging
import re
from typing import Any

from prometheus_client import Counter

from ..exceptions import ValidationError
from ..tasks.routing_tasks import route_event_task

logger = logging.getLogger(__name__)

# Prometheus metrics
events_emitted_total = Counter(
    "contextual_notifications_events_emitted_total",
    "Total number of events emitted",
    ["event_type"],
)

events_validation_failed_total = Counter(
    "contextual_notifications_events_validation_failed_total",
    "Total number of events that failed validation",
    ["error_type"],
)


class EventService:
    """
    Service for emitting domain events to the contextual notification system.

    This service provides a fire-and-forget API for domain code to emit events
    without coupling to notification implementation details. Events are validated
    and queued to Celery for asynchronous routing.
    """

    # Event type pattern: lowercase alphanumeric, dots, underscores
    EVENT_TYPE_PATTERN = re.compile(r"^[a-z0-9._]+$")

    @staticmethod
    def emit_event(event_type: str, context: dict[str, Any], payload: dict[str, Any]) -> None:
        """
        Emit a domain event for notification routing.

        This is a fire-and-forget operation that completes in <5ms. The event is
        validated synchronously, then queued to Celery for asynchronous routing.

        Args:
            event_type: Event type identifier (e.g., 'project.updated', 'task.assigned')
            context: Event context with org_id (required), project_id/user_id/resource_id (optional)
            payload: Event payload with title/body (required), url/metadata (optional)

        Raises:
            ValidationError: If event validation fails (with field-specific errors)

        Example:
            >>> EventService.emit_event(
            ...     event_type="project.updated",
            ...     context={"org_id": 42, "project_id": 123, "user_id": 7},
            ...     payload={"title": "Project updated", "body": "John Doe updated Alpha"}
            ... )
        """
        # Validate event structure
        validation_errors = EventService._validate_event(event_type, context, payload)
        if validation_errors:
            # Log validation failure
            logger.warning(
                "Event validation failed",
                extra={
                    "event_type": event_type,
                    "errors": validation_errors,
                },
            )
            # Increment validation failure metric
            error_type = list(validation_errors.keys())[0]  # Use first error for metric
            events_validation_failed_total.labels(error_type=error_type).inc()
            # Raise validation error
            raise ValidationError("Event validation failed", errors=validation_errors)

        # Build event dict
        event_dict = {
            "type": event_type,
            "context": context,
            "payload": payload,
        }

        # Queue event to Celery for async routing
        try:
            route_event_task.delay(event_dict)
        except Exception as e:
            # Log Celery error but don't raise to caller (fire-and-forget)
            logger.warning(
                "Failed to queue event to Celery",
                extra={
                    "event_type": event_type,
                    "org_id": context.get("org_id"),
                    "error": str(e),
                },
            )
            # Still increment success metric (validation succeeded)
            events_emitted_total.labels(event_type=event_type).inc()
            return

        # Log successful emission
        logger.info(
            "Event emitted",
            extra={
                "event_type": event_type,
                "org_id": context.get("org_id"),
                "project_id": context.get("project_id"),
            },
        )

        # Increment success metric
        events_emitted_total.labels(event_type=event_type).inc()

    @staticmethod
    def _validate_event(
        event_type: str, context: dict[str, Any], payload: dict[str, Any]
    ) -> dict[str, str]:
        """
        Validate event structure and return field-specific errors.

        Args:
            event_type: Event type identifier
            context: Event context dict
            payload: Event payload dict

        Returns:
            Dictionary of field-specific validation errors (empty if valid)
        """
        errors: dict[str, str] = {}

        # Validate event_type format
        if not event_type:
            errors["event_type"] = "Event type is required"
        elif not EventService.EVENT_TYPE_PATTERN.match(event_type):
            errors["event_type"] = (
                "Event type must match pattern ^[a-z0-9._]+$ "
                "(lowercase alphanumeric, dots, underscores)"
            )

        # Validate context structure
        if not isinstance(context, dict):
            errors["context"] = "Context must be a dictionary"
        else:
            # Validate org_id (required)
            org_id = context.get("org_id")
            if org_id is None:
                errors["context.org_id"] = "Organisation ID is required in context"
            elif not isinstance(org_id, int):
                errors["context.org_id"] = "Organisation ID must be an integer"

            # Validate optional context fields
            project_id = context.get("project_id")
            if project_id is not None and not isinstance(project_id, int):
                errors["context.project_id"] = "Project ID must be an integer"

            user_id = context.get("user_id")
            if user_id is not None and not isinstance(user_id, int):
                errors["context.user_id"] = "User ID must be an integer"

            resource_id = context.get("resource_id")
            if resource_id is not None and not isinstance(resource_id, str):
                errors["context.resource_id"] = "Resource ID must be a string"

        # Validate payload structure
        if not isinstance(payload, dict):
            errors["payload"] = "Payload must be a dictionary"
        else:
            # Validate title (required)
            title = payload.get("title")
            if not title:
                errors["payload.title"] = "Title is required in payload"
            elif not isinstance(title, str):
                errors["payload.title"] = "Title must be a string"
            elif not title.strip():
                errors["payload.title"] = "Title cannot be empty or whitespace"

            # Validate body (required)
            body = payload.get("body")
            if not body:
                errors["payload.body"] = "Body is required in payload"
            elif not isinstance(body, str):
                errors["payload.body"] = "Body must be a string"
            elif not body.strip():
                errors["payload.body"] = "Body cannot be empty or whitespace"

            # Validate url (optional)
            url = payload.get("url")
            if url is not None and not isinstance(url, str):
                errors["payload.url"] = "URL must be a string"

        return errors
