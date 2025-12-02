"""Health check views for notification system."""

import logging
import smtplib
from typing import Any, Dict

from celery.app.control import Inspect
from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)


class HealthCheckView(APIView):
    """Health check endpoint for notification system.

    Returns system health status including:
    - SMTP connectivity
    - Celery queue depth
    - Overall system status

    Example response:
        {
            "status": "ok",
            "checks": {
                "smtp": {"status": "ok", "details": "Connected to localhost:25"},
                "celery_queue": {"status": "ok", "details": "0 tasks pending"}
            }
        }
    """

    permission_classes = []  # Public endpoint
    authentication_classes = []
    throttle_classes = []  # No throttling for health checks

    def get(self, request, *args, **kwargs):
        """Perform health checks and return status."""
        checks = {
            "smtp": self._check_smtp(),
            "celery_queue": self._check_celery_queue(),
        }

        # Determine overall status
        check_statuses = [check["status"] for check in checks.values()]
        if all(s == "ok" for s in check_statuses):
            overall_status = "ok"
        elif any(s == "down" for s in check_statuses):
            overall_status = "down"
        else:
            overall_status = "degraded"

        response_data = {"status": overall_status, "checks": checks}

        # Return appropriate HTTP status code
        http_status = status.HTTP_200_OK
        if overall_status == "down":
            http_status = status.HTTP_503_SERVICE_UNAVAILABLE
        elif overall_status == "degraded":
            http_status = status.HTTP_200_OK  # Still return 200 for degraded

        return Response(response_data, status=http_status)

    def _check_smtp(self) -> Dict[str, Any]:
        """Check SMTP server connectivity (T091).

        Returns:
            Dict with status and details about SMTP connectivity
        """
        try:
            # Get SMTP settings from Django configuration
            smtp_host = getattr(settings, "EMAIL_HOST", "localhost")
            smtp_port = getattr(settings, "EMAIL_PORT", 25)
            smtp_use_tls = getattr(settings, "EMAIL_USE_TLS", False)
            smtp_use_ssl = getattr(settings, "EMAIL_USE_SSL", False)
            smtp_timeout = 5  # 5 second timeout for health check

            # Attempt SMTP connection
            if smtp_use_ssl:
                smtp = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=smtp_timeout)
            else:
                smtp = smtplib.SMTP(smtp_host, smtp_port, timeout=smtp_timeout)
                if smtp_use_tls:
                    smtp.starttls()

            # Test connection
            smtp.noop()  # Send NOOP command
            smtp.quit()

            return {
                "status": "ok",
                "details": f"Connected to {smtp_host}:{smtp_port}",
            }

        except smtplib.SMTPException as e:
            logger.warning(
                f"SMTP health check failed: {str(e)}",
                extra={"error": str(e), "host": smtp_host, "port": smtp_port},
            )
            return {
                "status": "degraded",
                "details": f"SMTP error: {str(e)}",
            }

        except Exception as e:
            logger.error(
                f"SMTP health check error: {str(e)}",
                extra={"error": str(e)},
                exc_info=True,
            )
            return {
                "status": "down",
                "details": f"Connection failed: {str(e)}",
            }

    def _check_celery_queue(self) -> Dict[str, Any]:
        """Check Celery queue depth (T092).

        Returns:
            Dict with status and details about pending tasks
        """
        try:
            from config.celery import app

            # Get Celery inspector
            inspector = Inspect(app=app)

            # Get active tasks across all workers
            active_tasks = inspector.active()
            if active_tasks is None:
                # No workers available
                return {
                    "status": "down",
                    "details": "No Celery workers available",
                }

            # Get reserved (scheduled) tasks
            reserved_tasks = inspector.reserved()
            if reserved_tasks is None:
                reserved_tasks = {}

            # Count total pending tasks
            total_active = sum(len(tasks) for tasks in active_tasks.values())
            total_reserved = sum(len(tasks) for tasks in reserved_tasks.values())
            total_pending = total_active + total_reserved

            # Determine status based on queue depth
            if total_pending > 1000:
                queue_status = "degraded"
            else:
                queue_status = "ok"

            return {
                "status": queue_status,
                "details": (
                    f"{total_pending} tasks pending "
                    f"({total_active} active, {total_reserved} reserved)"
                ),
                "metrics": {
                    "active": total_active,
                    "reserved": total_reserved,
                    "total": total_pending,
                },
            }

        except Exception as e:
            logger.error(
                f"Celery queue health check error: {str(e)}",
                extra={"error": str(e)},
                exc_info=True,
            )
            return {
                "status": "down",
                "details": f"Celery check failed: {str(e)}",
            }
