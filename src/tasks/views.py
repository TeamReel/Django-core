"""Task infrastructure health check and monitoring views."""

from datetime import datetime
from urllib.parse import urlsplit

from rest_framework import status
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .health import get_celery_health_status
from .inspector import get_task_summary


def _redact_url(value: str | None) -> str | None:
    if not value:
        return value
    try:
        parts = urlsplit(value)
        # Keep scheme + host + port only; strip user/pass + path + query.
        host = parts.hostname or ""
        port = f":{parts.port}" if parts.port else ""
        scheme = parts.scheme or ""
        if scheme:
            return f"{scheme}://{host}{port}"
        # Some celery transports may not be parseable URLs; fall back to prefix.
        return value.split(":", 1)[0] + ":…"
    except Exception:  # noqa: BLE001
        return "<unparseable>"


class TasksHealthView(APIView):
    """
    Health check endpoint for Celery task infrastructure.

    Returns 200 OK if broker and workers are healthy.
    Returns 503 Service Unavailable if broker or workers are down.

    No authentication required (infrastructure health check).
    """

    permission_classes = []  # Public endpoint
    authentication_classes = []  # No auth required
    throttle_classes = []  # No throttling on health checks

    def get(self, request):  # noqa: ARG002
        """
        GET /health/tasks/

        Returns:
            200 OK: System healthy (broker connected, workers active)
            503 Service Unavailable: System unhealthy

        Response body:
            {
                "status": "healthy" | "unhealthy",
                "broker": {"status": "ok" | "error", "message": "..."},
                "workers": {"status": "ok" | "error", "message": "..."}
            }
        """
        try:
            health_status = get_celery_health_status(timeout=5)

            http_status = (
                status.HTTP_200_OK
                if health_status["status"] == "healthy"
                else status.HTTP_503_SERVICE_UNAVAILABLE
            )

            return Response(health_status, status=http_status)
        except Exception:
            # Log the exception for debugging
            import logging

            logger = logging.getLogger(__name__)
            logger.exception("Health check failed with exception")
            # Re-raise to let Django's exception handling deal with it
            raise


class TasksListView(APIView):
    """
    API endpoint for listing and monitoring Celery tasks.

    GET /tasks/
    Returns:
        - registered: All registered task names
        - active: Currently executing tasks
        - scheduled: Tasks scheduled for future execution (ETA)
        - reserved: Tasks queued/pending execution
        - beat_schedule: Periodic tasks from Celery Beat
        - counts: Summary counts by status
    """

    permission_classes = [IsAuthenticated]  # Protected endpoint
    authentication_classes = []  # Use default authentication classes

    def get(self, request):  # noqa: ARG002
        """
        GET /tasks/

        Returns comprehensive task monitoring data.

        Query Parameters:
            timeout (int): Timeout in seconds for Celery inspection (default: 2)

        Response:
            200 OK with task data
        """
        timeout = int(request.query_params.get("timeout", 2))  # Lower default timeout

        try:
            task_data = get_task_summary(timeout=timeout)
            return Response(task_data, status=status.HTTP_200_OK)

        except Exception:  # noqa: BLE001
            # Log the exception for debugging
            import logging

            logger = logging.getLogger(__name__)
            logger.exception("Task listing failed with exception")

            # Return empty but valid response on error
            return Response(
                {
                    "error": "Failed to retrieve task data",
                    "registered": [],
                    "active": [],
                    "scheduled": [],
                    "reserved": [],
                    "beat_schedule": [],
                    "counts": {
                        "running": 0,
                        "scheduled": 0,
                        "pending": 0,
                        "total": 0,
                    },
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                },
                status=status.HTTP_200_OK,  # Return 200 even on error, with empty data
            )


class TasksDebugView(APIView):
    """Admin-only diagnostics for Celery connectivity and worker visibility.

    GET /api/v1/tasks/debug/

    This endpoint is intentionally more verbose than the public health check.
    It helps diagnose issues like:
    - Web app pointing at the wrong broker
    - No workers deployed / workers not connected
    - Task not registered on workers
    """

    permission_classes = [IsAuthenticated, IsAdminUser]
    authentication_classes = []  # Use default authentication

    def get(self, request):  # noqa: ARG002
        import os

        from celery import current_app
        from celery.exceptions import TimeoutError as CeleryTimeout

        timeout = int(request.query_params.get("timeout", 2))

        app = current_app
        inspect = app.control.inspect(timeout=timeout)

        broker_url = getattr(app.conf, "broker_url", None)
        result_backend = getattr(app.conf, "result_backend", None)

        debug: dict = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "django_settings_module": os.environ.get("DJANGO_SETTINGS_MODULE"),
            "celery": {
                "main": getattr(app, "main", None),
                "task_always_eager": bool(getattr(app.conf, "task_always_eager", False)),
                "broker_url": _redact_url(broker_url),
                "result_backend": _redact_url(result_backend),
                "default_queue": getattr(app.conf, "task_default_queue", None),
            },
            "workers": {
                "ping": None,
                "active_queues": None,
                "stats": None,
            },
            "tasks": {
                "registered_sample": [],
                "has_lineup_task": None,
            },
        }

        try:
            # Most reliable quick check: do any workers respond at all?
            debug["workers"]["ping"] = inspect.ping()
        except CeleryTimeout:
            debug["workers"]["ping"] = {"error": f"timeout after {timeout}s"}
        except Exception as exc:  # noqa: BLE001
            debug["workers"]["ping"] = {"error": str(exc)[:200]}

        try:
            debug["workers"]["active_queues"] = inspect.active_queues()
        except CeleryTimeout:
            debug["workers"]["active_queues"] = {"error": f"timeout after {timeout}s"}
        except Exception as exc:  # noqa: BLE001
            debug["workers"]["active_queues"] = {"error": str(exc)[:200]}

        try:
            # stats() also proves broker + workers are aligned
            debug["workers"]["stats"] = inspect.stats()
        except CeleryTimeout:
            debug["workers"]["stats"] = {"error": f"timeout after {timeout}s"}
        except Exception as exc:  # noqa: BLE001
            debug["workers"]["stats"] = {"error": str(exc)[:200]}

        try:
            registered = inspect.registered() or {}
            all_tasks: set[str] = set()
            for task_list in registered.values():
                all_tasks.update(task_list)
            filtered = sorted([t for t in all_tasks if not t.startswith("celery.")])
            debug["tasks"]["registered_sample"] = filtered[:50]
            debug["tasks"]["has_lineup_task"] = (
                "src.video.tasks.lineup.process_lineup_video" in all_tasks
            )
        except CeleryTimeout:
            debug["tasks"]["registered_sample"] = [f"<timeout after {timeout}s>"]
            debug["tasks"]["has_lineup_task"] = None
        except Exception as exc:  # noqa: BLE001
            debug["tasks"]["registered_sample"] = [f"<error: {str(exc)[:200]}>"]
            debug["tasks"]["has_lineup_task"] = None

        return Response(debug, status=status.HTTP_200_OK)
