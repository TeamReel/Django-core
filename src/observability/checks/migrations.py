"""Migration state health check implementation."""

import time

from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from observability.health import HealthCheckResult


class MigrationHealthCheck:
    """
    Django migration state health check (FR-003, Clarification #1).

    Detects:
    - Pending migrations (unapplied)
    - Running migrations (actively executing in another process)

    Marked as CRITICAL - affects readiness probe.
    """

    def check(self) -> HealthCheckResult:
        """
        Execute migration health check.

        Returns:
            HealthCheckResult with status=False if migrations are pending or running
        """
        start_time = time.time()

        try:
            executor = MigrationExecutor(connection)
            plan = executor.migration_plan(executor.loader.graph.leaf_nodes())

            # Check for pending migrations
            if plan:
                latency_ms = (time.time() - start_time) * 1000
                return HealthCheckResult(
                    name="migrations",
                    status=False,
                    latency_ms=latency_ms,
                    details={"error": "Pending migrations detected", "pending_count": len(plan)},
                )

            # Check for running migrations (PostgreSQL only)
            # SQLite and other databases don't support pg_locks query
            if connection.vendor == "postgresql":
                with connection.cursor() as cursor:
                    # Query for any exclusive locks on django_migrations table
                    cursor.execute(
                        """
                        SELECT COUNT(*)
                        FROM pg_locks
                        WHERE relation = 'django_migrations'::regclass
                        AND mode = 'AccessExclusiveLock'
                    """
                    )
                    lock_count = cursor.fetchone()[0]

                    if lock_count > 0:
                        latency_ms = (time.time() - start_time) * 1000
                        return HealthCheckResult(
                            name="migrations",
                            status=False,
                            latency_ms=latency_ms,
                            details={
                                "error": "Migrations are currently running",
                                "lock_count": lock_count,
                            },
                        )

            # All checks passed
            latency_ms = (time.time() - start_time) * 1000
            return HealthCheckResult(
                name="migrations", status=True, latency_ms=latency_ms, details={"pending_count": 0}
            )

        except Exception as e:
            latency_ms = (time.time() - start_time) * 1000
            return HealthCheckResult(
                name="migrations", status=False, latency_ms=latency_ms, details={"error": str(e)}
            )
