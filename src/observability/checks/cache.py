"""Cache health check implementation."""

import time

from django.core.cache import cache
from observability.health import HealthCheckResult


class CacheHealthCheck:
    """
    Redis cache connection health check (FR-003).

    Tests cache connectivity by performing a set/get operation.
    Marked as NON-CRITICAL per Clarification #4 - reported but doesn't affect readiness.
    """

    def check(self) -> HealthCheckResult:
        """
        Execute cache health check.

        Returns:
            HealthCheckResult with status=True if cache is reachable
        """
        start_time = time.time()
        test_key = "observability:health_check"
        test_value = "ok"

        try:
            # Test cache set/get operations
            cache.set(test_key, test_value, timeout=1)
            result = cache.get(test_key)
            cache.delete(test_key)

            if result == test_value:
                latency_ms = (time.time() - start_time) * 1000
                return HealthCheckResult(
                    name="cache",
                    status=True,
                    latency_ms=latency_ms,
                    details={"backend": cache.__class__.__name__},
                )
            else:
                latency_ms = (time.time() - start_time) * 1000
                return HealthCheckResult(
                    name="cache",
                    status=False,
                    latency_ms=latency_ms,
                    details={"error": "Cache get/set mismatch"},
                )

        except Exception as e:
            latency_ms = (time.time() - start_time) * 1000
            return HealthCheckResult(
                name="cache", status=False, latency_ms=latency_ms, details={"error": str(e)}
            )
