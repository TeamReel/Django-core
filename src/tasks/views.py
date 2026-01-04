"""Task infrastructure health check and monitoring views."""

from datetime import datetime

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .health import get_celery_health_status
from .inspector import get_task_summary


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

    permission_classes = []  # Public for now (add auth if needed)
    authentication_classes = []

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
