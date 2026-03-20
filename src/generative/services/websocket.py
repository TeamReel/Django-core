"""WebSocket integration for B34 Generative Pipelines.

WP06 T050: WebSocket Event Service

Sends real-time status updates to users via B23 WebSocket module.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from django.conf import settings

if TYPE_CHECKING:
    from src.generative.models import GenerationRequest

logger = logging.getLogger("generative.services.websocket")


class GenerationWebSocketService:
    """WebSocket events for generation requests."""

    @staticmethod
    def send_status_update(request: GenerationRequest) -> None:
        """Send status update to requester via WebSocket.

        Args:
            request: GenerationRequest instance

        Notes:
            - Feature flag GENERATIVE_WEBSOCKET_ENABLED controls whether events are sent
            - Failures are logged but don't raise exceptions (best-effort delivery)
        """
        # Check feature flag
        if not getattr(settings, "GENERATIVE_WEBSOCKET_ENABLED", True):
            logger.debug("WebSocket events disabled via feature flag")
            return

        # Lazy import to avoid circular dependencies
        try:
            from rtc_websockets.services import NotificationService
        except ImportError:
            logger.warning("B23 WebSocket module not available, skipping event")
            return

        try:
            payload = {
                "request_id": request.id,
                "status": request.status,
                "retry_count": request.retry_count,
                "error_message": request.error_message,
                "error_category": request.error_category,
                "created_at": request.created_at.isoformat() if request.created_at else None,
                "started_at": request.started_at.isoformat() if request.started_at else None,
                "completed_at": (
                    request.completed_at.isoformat() if request.completed_at else None
                ),
            }

            service = NotificationService()
            service.send_user_notification(
                user_id=request.requester_id, message_type="generation_status", payload=payload
            )

            logger.debug(
                "Sent WebSocket status update",
                extra={
                    "request_id": request.id,
                    "status": request.status,
                    "user_id": request.requester_id,
                },
            )

        except Exception as e:
            # Best-effort delivery: log error but don't fail the task
            logger.error(
                f"Failed to send WebSocket status update: {e}",
                extra={"request_id": request.id, "status": request.status},
                exc_info=True,
            )

        # ── B64: Publish typed realtime event ──
        try:
            from rtc_websockets.events import (
                EventType,
                GenerationStatusPayload,
                build_event,
            )
            from rtc_websockets.services import RealtimeEventPublisher

            gen_payload = GenerationStatusPayload(
                request_id=request.id,
                status=request.status,
                project_id=request.project_id or "",
                retry_count=request.retry_count,
                error_message=request.error_message,
                error_category=request.error_category,
            )
            event = build_event(
                EventType.GENERATION_STATUS_CHANGED,
                gen_payload,
                actor_id=request.requester_id,
            )

            publisher = RealtimeEventPublisher()
            # Publish to user channel; also to project if available
            publisher.publish_to_user(request.requester_id, event)
            if request.project_id:
                publisher.publish_to_project(request.project_id, event)

        except Exception as e:
            logger.warning(
                f"Failed to publish B64 generation event: {e}",
                extra={"request_id": request.id},
            )
