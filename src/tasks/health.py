"""Health check utilities for Celery infrastructure."""

import logging
from typing import Tuple

from celery import current_app
from celery.exceptions import TimeoutError as CeleryTimeout

logger = logging.getLogger(__name__)


def check_broker_connectivity(timeout: int = 5) -> Tuple[bool, str]:
    """
    Check if Celery broker is reachable.

    Args:
        timeout: Timeout in seconds for broker check

    Returns:
        Tuple of (is_healthy, message)

    Example:
        >>> check_broker_connectivity()
        (True, "Broker connected")
    """
    try:
        # Check if using in-memory broker (testing)
        broker_url = current_app.conf.broker_url
        if broker_url and broker_url.startswith("memory://"):
            return True, "Broker connected (memory)"

        # Try to inspect broker stats for real brokers
        inspect = current_app.control.inspect(timeout=timeout)
        stats = inspect.stats()

        if stats is None:
            return False, "Broker timeout - no response"

        return True, "Broker connected"

    except CeleryTimeout:
        return False, f"Broker timeout after {timeout}s"
    except Exception as exc:  # noqa: BLE001
        logger.exception("Broker health check failed")
        return False, f"Broker error: {str(exc)[:100]}"


def check_active_workers(timeout: int = 5) -> Tuple[bool, str]:
    """
    Check if any Celery workers are active.

    Args:
        timeout: Timeout in seconds for worker check

    Returns:
        Tuple of (is_healthy, message with worker count)

    Example:
        >>> check_active_workers()
        (True, "2 workers active")
    """
    try:
        # Check if using task_always_eager (testing/sync mode)
        if current_app.conf.task_always_eager:
            return True, "1 worker active (eager mode)"

        inspect = current_app.control.inspect(timeout=timeout)
        active = inspect.active()

        if active is None:
            return False, "No workers responding"

        worker_count = len(active)
        if worker_count == 0:
            return False, "No active workers"

        return True, f"{worker_count} worker{'s' if worker_count > 1 else ''} active"

    except CeleryTimeout:
        return False, f"Worker check timeout after {timeout}s"
    except Exception as exc:  # noqa: BLE001
        logger.exception("Worker health check failed")
        return False, f"Worker check error: {str(exc)[:100]}"


def get_celery_health_status(timeout: int = 5) -> dict:
    """
    Get comprehensive Celery health status.

    Args:
        timeout: Timeout in seconds for checks

    Returns:
        Dictionary with status, broker, and workers info

    Example:
        >>> get_celery_health_status()
        {
            'status': 'healthy',
            'broker': {'status': 'ok', 'message': 'Broker connected'},
            'workers': {'status': 'ok', 'message': '2 workers active'}
        }
    """
    broker_ok, broker_msg = check_broker_connectivity(timeout)
    workers_ok, workers_msg = check_active_workers(timeout)

    overall_healthy = broker_ok and workers_ok

    return {
        "status": "healthy" if overall_healthy else "unhealthy",
        "broker": {"status": "ok" if broker_ok else "error", "message": broker_msg},
        "workers": {"status": "ok" if workers_ok else "error", "message": workers_msg},
    }
