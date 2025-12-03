"""Middleware for correlation ID propagation."""

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
        correlation_id = request.META.get('HTTP_X_CORRELATION_ID')
        
        if not correlation_id:
            correlation_id = str(uuid.uuid4())
        
        set_correlation_id(correlation_id)
        request.correlation_id = correlation_id
