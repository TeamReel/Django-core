"""Middleware for correlation ID propagation and HTTP metrics."""

import time
import uuid

from django.utils.deprecation import MiddlewareMixin

from .logging import set_correlation_id


# T021: CorrelationIDMiddleware
class CorrelationIDMiddleware(MiddlewareMixin):
    """
    Middleware to extract or generate correlation IDs (FR-008).

    Extracts X-Correlation-ID header or generates UUID.
    Stores in contextvar for async-safe access.
    """

    def process_request(self, request):
        """Extract X-Correlation-ID header or generate UUID."""
        correlation_id = request.META.get("HTTP_X_CORRELATION_ID")

        if not correlation_id:
            correlation_id = str(uuid.uuid4())

        set_correlation_id(correlation_id)
        request.correlation_id = correlation_id


# T038: HTTPMetricsMiddleware
class HTTPMetricsMiddleware(MiddlewareMixin):
    """
    Middleware to collect HTTP request metrics (FR-012).

    Emits:
    - http_requests_total{method, status}
    - http_request_duration_seconds{method, status}
    """

    def process_request(self, request):
        """Record request start time."""
        request._metrics_start_time = time.time()

    def process_response(self, request, response):
        """Emit HTTP metrics."""
        if hasattr(request, "_metrics_start_time"):
            try:
                from .metrics import emit_metric

                duration = time.time() - request._metrics_start_time

                labels = {"method": request.method, "status": str(response.status_code)}

                emit_metric("counter", "http_requests_total", 1, labels)
                emit_metric("histogram", "http_request_duration_seconds", duration, labels)

            except Exception as e:
                # FR-011a: Never propagate exceptions from observability hooks
                import logging

                logger = logging.getLogger(__name__)
                logger.error(f"HTTP metrics emission failed: {e}")

        return response
