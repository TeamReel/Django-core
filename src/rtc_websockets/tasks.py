"""B64 H4 — Celery tasks for WebSocket connection management.

Tasks:
- cleanup_stale_connections: Remove connections with no heartbeat for > 1 hour.
"""

from __future__ import annotations

import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)

STALE_TIMEOUT_SECONDS = 3600  # 1 hour


@shared_task(
    name="rtc_websockets.cleanup_stale_connections",
    bind=True,
    max_retries=1,
    default_retry_delay=60,
    acks_late=True,
)
def cleanup_stale_connections(self, *, timeout_seconds: int = STALE_TIMEOUT_SECONDS) -> dict:
    """Remove WebSocket connection records with no heartbeat for > timeout.

    Runs via Celery Beat every 30 minutes. Stale connections occur when
    the server/worker restarts or the client disconnects without a clean
    close handshake.

    Returns:
        dict with ``deleted`` count and ``remaining`` count.
    """
    from .models import WebSocketConnection

    cutoff = timezone.now() - timezone.timedelta(seconds=timeout_seconds)
    stale_qs = WebSocketConnection.objects.filter(last_heartbeat__lt=cutoff)
    count = stale_qs.count()

    if count:
        stale_qs.delete()
        logger.info(
            "Cleaned up %d stale WebSocket connections (heartbeat before %s)",
            count,
            cutoff.isoformat(),
        )
    else:
        logger.debug("No stale WebSocket connections to clean up")

    remaining = WebSocketConnection.objects.count()

    # Emit metric
    try:
        from observability.metrics import emit_metric

        emit_metric("gauge", "websocket_connections_active_db", remaining, {})
        emit_metric("counter", "websocket_stale_connections_cleaned", count, {})
    except Exception:
        logger.debug("Failed to emit WebSocket cleanup metrics", exc_info=True)

    return {"deleted": count, "remaining": remaining}
