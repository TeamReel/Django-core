"""
Health check protocol, registry, and views.

Implements FR-001 to FR-005 for Kubernetes liveness/readiness probes.
"""

import time
from dataclasses import dataclass
from typing import Dict, Optional, Protocol

from django.conf import settings
from django.http import JsonResponse


@dataclass
class HealthCheckResult:
    """
    Result of a health check execution.

    Attributes:
        name: Health check identifier (e.g., "database", "cache")
        status: Boolean indicating healthy (True) or unhealthy (False)
        latency_ms: Time taken to execute check in milliseconds
        details: Optional dict with additional context (error messages, metadata)
    """
    name: str
    status: bool
    latency_ms: float
    details: Optional[Dict[str, any]] = None


class HealthCheck(Protocol):
    """
    Protocol for health check implementations.

    All health checks must implement the check() method returning HealthCheckResult.
    Enables downstream products to add custom health checks via register_health_check().
    """

    def check(self) -> HealthCheckResult:
        """
        Execute health check and return result.

        Returns:
            HealthCheckResult with status and timing information

        Raises:
            No exceptions should propagate; wrap in try-except and return status=False
        """
        ...


# Global registry for health checks
# Structure: {"check_name": (check_instance, is_critical)}
_HEALTH_CHECKS: Dict[str, tuple[HealthCheck, bool]] = {}


def register_health_check(
    name: str,
    check: HealthCheck,
    critical: bool = True
) -> None:
    """
    Register a health check in the global registry.

    Args:
        name: Unique identifier for the check
        check: HealthCheck implementation
        critical: If True, check affects readiness probe; if False, reported only

    Example:
        >>> register_health_check("external_api", ExternalAPIHealthCheck(), critical=False)
    """
    _HEALTH_CHECKS[name] = (check, critical)


def get_registered_checks() -> Dict[str, tuple[HealthCheck, bool]]:
    """Return copy of registered health checks."""
    return _HEALTH_CHECKS.copy()


def liveness_view(request):
    """
    Liveness probe endpoint (FR-001).

    Returns 200 OK if process is running, regardless of dependency state.
    Kubernetes uses this to determine if pod should be restarted.

    Path: /health/live
    """
    return JsonResponse({"status": "healthy"}, status=200)


def readiness_view(request):
    """
    Readiness probe endpoint (FR-002, FR-004).

    Returns:
        - 200 OK: All critical dependencies healthy
        - 503 Service Unavailable: One or more critical dependencies unhealthy

    Response includes all check results in `checks` object (FR-004).
    Non-critical checks are reported but don't affect HTTP status.

    Path: /health/ready
    """
    from observability.utils import timeout

    # Check if health checks are enabled
    if not getattr(settings, "OBSERVABILITY_HEALTH_CHECKS_ENABLED", True):
        return JsonResponse({"status": "healthy", "checks": {}}, status=200)

    results = {}
    all_critical_healthy = True

    for name, (check, is_critical) in _HEALTH_CHECKS.items():
        try:
            # Enforce 500ms timeout per check (FR-005)
            with timeout(0.5):
                start_time = time.time()
                result = check.check()
                (time.time() - start_time) * 1000

                results[name] = result.status

                # Track critical check failures
                if is_critical and not result.status:
                    all_critical_healthy = False

        except TimeoutError:
            # Timeout treated as unhealthy (FR-005)
            results[name] = False
            if is_critical:
                all_critical_healthy = False

        except Exception:
            # Any exception treated as unhealthy
            results[name] = False
            if is_critical:
                all_critical_healthy = False

    # Determine HTTP status based on critical checks only
    status_code = 200 if all_critical_healthy else 503
    response_status = "healthy" if all_critical_healthy else "unhealthy"

    return JsonResponse(
        {
            "status": response_status,
            "checks": results
        },
        status=status_code
    )
