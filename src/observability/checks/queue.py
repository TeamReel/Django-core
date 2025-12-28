"""Queue/Celery broker health check implementation."""

import time

from observability.health import HealthCheckResult


class QueueHealthCheck:
    """
    Redis queue (Celery broker) connection health check (FR-003).

    Tests Celery broker connectivity via Redis connection.
    Marked as CRITICAL - affects readiness probe.

    Note: Separate from CacheHealthCheck per Clarification #4.
    """

    def check(self) -> HealthCheckResult:
        """
        Execute queue health check.

        Returns:
            HealthCheckResult with status=True if broker is reachable
        """
        start_time = time.time()

        try:
            # Import here to avoid circular dependencies
            from celery import current_app

            # Get broker connection and ping
            connection = current_app.connection()
            connection.ensure_connection(max_retries=1)
            connection.release()

            latency_ms = (time.time() - start_time) * 1000
            return HealthCheckResult(
                name="queue",
                status=True,
                latency_ms=latency_ms,
                details={
                    "broker": current_app.conf.broker_url.split("://")[0]
                    if current_app.conf.broker_url
                    else "unknown"
                },
            )

        except ImportError:
            # Celery not installed - treat as unhealthy
            latency_ms = (time.time() - start_time) * 1000
            return HealthCheckResult(
                name="queue",
                status=False,
                latency_ms=latency_ms,
                details={"error": "Celery not installed"},
            )

        except Exception as e:
            latency_ms = (time.time() - start_time) * 1000
            return HealthCheckResult(
                name="queue", status=False, latency_ms=latency_ms, details={"error": str(e)}
            )
