"""Task infrastructure health check views."""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .health import get_celery_health_status


class TasksHealthView(APIView):
    """
    Health check endpoint for Celery task infrastructure.

    Returns 200 OK if broker and workers are healthy.
    Returns 503 Service Unavailable if broker or workers are down.

    No authentication required (infrastructure health check).
    """

    permission_classes = []  # Public endpoint
    authentication_classes = []  # No auth required

    def get(self, request):
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
        health_status = get_celery_health_status(timeout=5)

        http_status = (
            status.HTTP_200_OK
            if health_status["status"] == "healthy"
            else status.HTTP_503_SERVICE_UNAVAILABLE
        )

        return Response(health_status, status=http_status)
