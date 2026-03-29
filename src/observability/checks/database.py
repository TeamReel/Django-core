"""Database health check implementation."""

import time

from django.db import connection
from observability.health import HealthCheckResult


class DatabaseHealthCheck:
    """
    PostgreSQL database connection health check (FR-003).

    Tests database connectivity by executing a simple query.
    Marked as CRITICAL - affects readiness probe.
    """

    def check(self) -> HealthCheckResult:
        """
        Execute database health check.

        Returns:
            HealthCheckResult with status=True if database is reachable
        """
        start_time = time.time()

        try:
            # Execute simple query to verify connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()

            latency_ms = (time.time() - start_time) * 1000
            return HealthCheckResult(
                name="database",
                status=True,
                latency_ms=latency_ms,
                details={"engine": connection.vendor},
            )

        except Exception as e:
            latency_ms = (time.time() - start_time) * 1000
            return HealthCheckResult(
                name="database", status=False, latency_ms=latency_ms, details={"error": str(e)}
            )
