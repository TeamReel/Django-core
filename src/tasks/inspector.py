"""
Task inspection utilities for monitoring Celery tasks.

Provides functions to inspect active, scheduled, reserved, and registered tasks.
"""

import logging
from datetime import datetime
from typing import Any, Dict, List

from celery import current_app
from celery.exceptions import TimeoutError as CeleryTimeout

logger = logging.getLogger(__name__)


def get_registered_tasks(timeout: int = 5) -> List[str]:
    """
    Get list of all registered Celery tasks.

    Args:
        timeout: Timeout in seconds for inspection

    Returns:
        List of task names (e.g., ['tasks.examples.hello_world', ...])
    """
    try:
        inspect = current_app.control.inspect(timeout=timeout)
        registered = inspect.registered()

        if registered is None:
            return []

        # Flatten tasks from all workers (remove duplicates)
        all_tasks = set()
        for tasks in registered.values():
            all_tasks.update(tasks)

        # Filter out built-in Celery tasks
        filtered_tasks = [task for task in all_tasks if not task.startswith("celery.")]

        return sorted(filtered_tasks)

    except CeleryTimeout:
        logger.warning("Timeout getting registered tasks after %ss", timeout)
        return []
    except Exception:  # noqa: BLE001
        logger.exception("Failed to get registered tasks")
        return []


def get_active_tasks(timeout: int = 5) -> List[Dict[str, Any]]:
    """
    Get currently executing tasks across all workers.

    Args:
        timeout: Timeout in seconds for inspection

    Returns:
        List of task info dicts with keys:
        - id: Task ID
        - name: Task name
        - worker: Worker hostname
        - args: Task arguments
        - kwargs: Task keyword arguments
        - time_start: Start timestamp
    """
    try:
        inspect = current_app.control.inspect(timeout=timeout)
        active = inspect.active()

        if active is None:
            return []

        # Flatten tasks from all workers
        tasks = []
        for worker_name, worker_tasks in active.items():
            for task in worker_tasks:
                tasks.append(
                    {
                        "id": task.get("id"),
                        "name": task.get("name"),
                        "worker": worker_name,
                        "args": task.get("args", []),
                        "kwargs": task.get("kwargs", {}),
                        "time_start": task.get("time_start"),
                        "status": "running",
                    }
                )

        return tasks

    except CeleryTimeout:
        logger.warning("Timeout getting active tasks after %ss", timeout)
        return []
    except Exception:  # noqa: BLE001
        logger.exception("Failed to get active tasks")
        return []


def get_scheduled_tasks(timeout: int = 5) -> List[Dict[str, Any]]:
    """
    Get tasks scheduled by Celery Beat (ETA/countdown tasks).

    Args:
        timeout: Timeout in seconds for inspection

    Returns:
        List of scheduled task dicts
    """
    try:
        inspect = current_app.control.inspect(timeout=timeout)
        scheduled = inspect.scheduled()

        if scheduled is None:
            return []

        # Flatten tasks from all workers
        tasks = []
        for worker_name, worker_tasks in scheduled.items():
            for task in worker_tasks:
                # scheduled() returns tasks with 'eta' and 'priority'
                request = task.get("request", {})
                tasks.append(
                    {
                        "id": request.get("id"),
                        "name": request.get("name"),
                        "worker": worker_name,
                        "eta": task.get("eta"),
                        "priority": task.get("priority"),
                        "status": "scheduled",
                    }
                )

        return tasks

    except CeleryTimeout:
        logger.warning("Timeout getting scheduled tasks after %ss", timeout)
        return []
    except Exception:  # noqa: BLE001
        logger.exception("Failed to get scheduled tasks")
        return []


def get_reserved_tasks(timeout: int = 5) -> List[Dict[str, Any]]:
    """
    Get tasks reserved (queued) by workers (prefetched but not executing).

    Args:
        timeout: Timeout in seconds for inspection

    Returns:
        List of reserved task dicts
    """
    try:
        inspect = current_app.control.inspect(timeout=timeout)
        reserved = inspect.reserved()

        if reserved is None:
            return []

        # Flatten tasks from all workers
        tasks = []
        for worker_name, worker_tasks in reserved.items():
            for task in worker_tasks:
                tasks.append(
                    {
                        "id": task.get("id"),
                        "name": task.get("name"),
                        "worker": worker_name,
                        "args": task.get("args", []),
                        "kwargs": task.get("kwargs", {}),
                        "status": "pending",
                    }
                )

        return tasks

    except CeleryTimeout:
        logger.warning("Timeout getting reserved tasks after %ss", timeout)
        return []
    except Exception:  # noqa: BLE001
        logger.exception("Failed to get reserved tasks")
        return []


def get_beat_schedule() -> List[Dict[str, Any]]:
    """
    Get periodic tasks scheduled by Celery Beat.

    Returns:
        List of scheduled task configs from CELERY_BEAT_SCHEDULE
    """
    beat_schedule = current_app.conf.beat_schedule or {}

    tasks = []
    for task_name, config in beat_schedule.items():
        # Format schedule for display
        schedule = config.get("schedule")
        if hasattr(schedule, "__str__"):
            schedule_str = str(schedule)
        else:
            schedule_str = repr(schedule)

        tasks.append(
            {
                "name": config.get("task"),
                "schedule": schedule_str,
                "args": config.get("args", []),
                "kwargs": config.get("kwargs", {}),
                "enabled": config.get("enabled", True),
                "config_name": task_name,
            }
        )

    return tasks


def get_task_summary(timeout: int = 5) -> Dict[str, Any]:
    """
    Get comprehensive task summary for monitoring dashboard.

    Args:
        timeout: Timeout in seconds for inspection

    Returns:
        Dict with keys:
        - registered: List of all registered task names
        - active: List of currently executing tasks
        - scheduled: List of scheduled tasks (ETA)
        - reserved: List of queued/pending tasks
        - beat_schedule: List of periodic tasks from Beat
        - counts: Summary counts by status
        - timestamp: ISO timestamp of the query
    """
    registered = get_registered_tasks(timeout)
    active = get_active_tasks(timeout)
    scheduled = get_scheduled_tasks(timeout)
    reserved = get_reserved_tasks(timeout)
    beat_schedule = get_beat_schedule()

    # Combine all tasks for unified view
    all_tasks = active + scheduled + reserved

    # Count by status
    status_counts = {
        "running": len(active),
        "scheduled": len(scheduled),
        "pending": len(reserved),
        "total": len(all_tasks),
    }

    return {
        "registered": registered,
        "active": active,
        "scheduled": scheduled,
        "reserved": reserved,
        "beat_schedule": beat_schedule,
        "counts": status_counts,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }
