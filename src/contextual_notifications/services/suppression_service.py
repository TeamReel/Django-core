"""Suppression service for preventing duplicate notifications."""

import logging
from datetime import datetime
from typing import Any

from django.core.cache import cache
from prometheus_client import Counter, Histogram

logger = logging.getLogger(__name__)

# Prometheus metrics
suppression_checks_total = Counter(
    "contextual_notifications_suppression_checks_total",
    "Total number of suppression checks performed",
    ["event_type", "result"],
)

suppression_check_time_seconds = Histogram(
    "contextual_notifications_suppression_check_time_seconds",
    "Time spent checking suppression",
    ["event_type"],
)

redis_failures_total = Counter(
    "contextual_notifications_redis_failures_total",
    "Total number of Redis operation failures",
    ["operation"],
)


class SuppressionService:
    """
    Service for preventing duplicate notifications using Redis cache.

    Suppresses repeated notifications for the same (user_id, event_type, resource_id)
    combination within a configurable time window (TTL).
    """

    DEFAULT_TTL = 300  # 5 minutes in seconds

    @staticmethod
    def check_suppression(
        user_id: int,
        event_type: str,
        resource_id: str | None = None,
        ttl: int | None = None,
    ) -> bool:
        """
        Check if notification should be suppressed (duplicate).

        Uses atomic Redis SETNX pattern with cache.add() to prevent race conditions.
        If Redis is unavailable, gracefully degrades (returns False = not suppressed).

        Args:
            user_id: Target user ID
            event_type: Event type identifier
            resource_id: Optional resource identifier for scoping (e.g., project_id:123)
            ttl: Time-to-live in seconds (default: 300)

        Returns:
            True if notification should be suppressed (duplicate within window)
            False if notification should proceed (first occurrence or cache failure)

        Example:
            >>> # First notification passes
            >>> SuppressionService.check_suppression(42, "project.updated", "project:123")
            False
            >>> # Second notification within 5 minutes is suppressed
            >>> SuppressionService.check_suppression(42, "project.updated", "project:123")
            True
        """
        if ttl is None:
            ttl = SuppressionService.DEFAULT_TTL

        # Build cache key
        cache_key = SuppressionService._build_cache_key(
            user_id, event_type, resource_id
        )

        # Measure check time
        with suppression_check_time_seconds.labels(event_type=event_type).time():
            try:
                # Atomic check-and-set with cache.add() (SETNX pattern)
                # Returns True if key was set (not suppressed), False if key exists (suppressed)
                timestamp = datetime.utcnow().isoformat()
                was_set = cache.add(cache_key, timestamp, timeout=ttl)

                if was_set:
                    # Key was set successfully - first occurrence (not suppressed)
                    suppression_checks_total.labels(
                        event_type=event_type, result="allowed"
                    ).inc()
                    logger.debug(
                        "Notification allowed (not suppressed)",
                        extra={
                            "user_id": user_id,
                            "event_type": event_type,
                            "resource_id": resource_id,
                            "cache_key": cache_key,
                            "ttl": ttl,
                        },
                    )
                    return False  # Not suppressed
                else:
                    # Key already exists - duplicate within window (suppressed)
                    suppression_checks_total.labels(
                        event_type=event_type, result="suppressed"
                    ).inc()
                    logger.info(
                        "Notification suppressed (duplicate within window)",
                        extra={
                            "user_id": user_id,
                            "event_type": event_type,
                            "resource_id": resource_id,
                            "cache_key": cache_key,
                            "ttl": ttl,
                        },
                    )
                    return True  # Suppressed

            except Exception as exc:
                # Redis failure - gracefully degrade (allow notification)
                redis_failures_total.labels(operation="check_suppression").inc()
                suppression_checks_total.labels(
                    event_type=event_type, result="redis_failure"
                ).inc()
                logger.warning(
                    "Redis failure during suppression check - allowing notification",
                    extra={
                        "user_id": user_id,
                        "event_type": event_type,
                        "resource_id": resource_id,
                        "cache_key": cache_key,
                        "error": str(exc),
                    },
                    exc_info=True,
                )
                return False  # Not suppressed (fail open)

    @staticmethod
    def record_suppression(
        user_id: int,
        event_type: str,
        resource_id: str | None = None,
        ttl: int | None = None,
    ) -> None:
        """
        Manually record suppression entry (for testing or pre-emptive blocking).

        This is an alternative to check_suppression() when you want to explicitly
        block future notifications without checking first.

        Args:
            user_id: Target user ID
            event_type: Event type identifier
            resource_id: Optional resource identifier
            ttl: Time-to-live in seconds (default: 300)

        Example:
            >>> # Pre-emptively block notifications for 10 minutes
            >>> SuppressionService.record_suppression(
            ...     user_id=42,
            ...     event_type="task.assigned",
            ...     resource_id="task:456",
            ...     ttl=600
            ... )
        """
        if ttl is None:
            ttl = SuppressionService.DEFAULT_TTL

        cache_key = SuppressionService._build_cache_key(
            user_id, event_type, resource_id
        )

        try:
            timestamp = datetime.utcnow().isoformat()
            cache.set(cache_key, timestamp, timeout=ttl)

            logger.info(
                "Suppression entry recorded",
                extra={
                    "user_id": user_id,
                    "event_type": event_type,
                    "resource_id": resource_id,
                    "cache_key": cache_key,
                    "ttl": ttl,
                },
            )

        except Exception as exc:
            redis_failures_total.labels(operation="record_suppression").inc()
            logger.warning(
                "Redis failure during suppression recording",
                extra={
                    "user_id": user_id,
                    "event_type": event_type,
                    "resource_id": resource_id,
                    "cache_key": cache_key,
                    "error": str(exc),
                },
                exc_info=True,
            )

    @staticmethod
    def clear_suppression(
        user_id: int, event_type: str, resource_id: str | None = None
    ) -> None:
        """
        Clear suppression entry (for testing or manual reset).

        Args:
            user_id: Target user ID
            event_type: Event type identifier
            resource_id: Optional resource identifier

        Example:
            >>> # Clear suppression to allow immediate re-notification
            >>> SuppressionService.clear_suppression(42, "project.updated", "project:123")
        """
        cache_key = SuppressionService._build_cache_key(
            user_id, event_type, resource_id
        )

        try:
            cache.delete(cache_key)

            logger.debug(
                "Suppression entry cleared",
                extra={
                    "user_id": user_id,
                    "event_type": event_type,
                    "resource_id": resource_id,
                    "cache_key": cache_key,
                },
            )

        except Exception as exc:
            redis_failures_total.labels(operation="clear_suppression").inc()
            logger.warning(
                "Redis failure during suppression clearing",
                extra={
                    "user_id": user_id,
                    "event_type": event_type,
                    "resource_id": resource_id,
                    "cache_key": cache_key,
                    "error": str(exc),
                },
                exc_info=True,
            )

    @staticmethod
    def _build_cache_key(
        user_id: int, event_type: str, resource_id: str | None
    ) -> str:
        """
        Build Redis cache key for suppression entry.

        Format: suppression:{user_id}:{event_type}:{resource_id}

        Args:
            user_id: Target user ID
            event_type: Event type identifier
            resource_id: Optional resource identifier (uses "global" if None)

        Returns:
            Cache key string

        Example:
            >>> SuppressionService._build_cache_key(42, "project.updated", "project:123")
            'suppression:42:project.updated:project:123'
            >>> SuppressionService._build_cache_key(42, "task.assigned", None)
            'suppression:42:task.assigned:global'
        """
        resource_part = resource_id if resource_id else "global"
        return f"suppression:{user_id}:{event_type}:{resource_part}"
