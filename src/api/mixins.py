"""
Reusable mixins for DRF ViewSets.

T011-T014: Cache Headers Mixin
- Provides ETag and Last-Modified support
- Enables HTTP 304 Not Modified responses
- Applicable to list and detail views

T015-T017: Optimistic Create Mixin
- Echoes X-Client-Request-ID for optimistic UI reconciliation
- Ensures created_at has millisecond precision
"""

import hashlib
import logging
import uuid
from datetime import datetime, timezone
from email.utils import format_datetime
from typing import Optional

from django.conf import settings
from django.db.models import Max
from django.http import HttpResponse
from rest_framework import status

logger = logging.getLogger(__name__)


class CacheHeadersMixin:
    """
    Mixin that adds ETag and Last-Modified headers to responses.

    For list views: ETag based on max(updated_at)
    For detail views: Last-Modified based on instance.updated_at

    Apply to ViewSets that benefit from client-side caching.

    **T011**: Base mixin class with cache header infrastructure
    **T012**: ETag generation from max(updated_at)
    **T013**: If-None-Match handling with 304 response
    **T014**: Last-Modified header for detail views
    """

    # Override in subclass to specify the timestamp field
    cache_timestamp_field: str = "updated_at"

    def finalize_response(self, request, response, *args, **kwargs):
        """
        Override response finalization to add cache headers.

        Only adds headers for successful GET requests.
        Skips cache headers for errors (status >= 400).
        """
        response = super().finalize_response(request, response, *args, **kwargs)

        # Only add cache headers for successful GET requests
        if request.method != "GET" or response.status_code >= 400:
            return response

        # Determine if list or detail view
        if hasattr(self, "action"):
            if self.action == "list":
                self._add_list_cache_headers(request, response)
            elif self.action == "retrieve":
                self._add_detail_cache_headers(request, response)

        return response

    # T012: ETag generation methods
    def _generate_etag(self, queryset) -> Optional[str]:
        """
        Generate ETag from max updated_at timestamp.

        Returns:
            MD5 hash of ISO timestamp, or None if queryset is empty or
            timestamp field doesn't exist.

        Note: MD5 is acceptable for ETags as they don't require cryptographic
        strength, only collision resistance within a small domain.
        """
        if not queryset.exists():
            return None

        max_updated = queryset.aggregate(max_updated=Max(self.cache_timestamp_field))["max_updated"]

        if max_updated is None:
            return None

        # MD5 hash of ISO timestamp (acceptable for ETags)
        timestamp_str = max_updated.isoformat()
        return hashlib.md5(timestamp_str.encode(), usedforsecurity=False).hexdigest()

    # T013: If-None-Match handling
    def list(self, request, *args, **kwargs):
        """
        Override list to support If-None-Match conditional request.

        Returns HTTP 304 Not Modified if ETag matches.
        """
        # Check for conditional request
        if_none_match = request.headers.get("If-None-Match")

        if if_none_match:
            # Generate current ETag
            queryset = self.filter_queryset(self.get_queryset())
            current_etag = self._generate_etag(queryset)

            if current_etag:
                # Compare (strip quotes from incoming header)
                incoming_etag = if_none_match.strip('"').strip("'")
                if incoming_etag == current_etag:
                    response = HttpResponse(status=status.HTTP_304_NOT_MODIFIED)
                    response["ETag"] = f'"{current_etag}"'

                    # Add Last-Modified for consistency
                    max_updated = queryset.aggregate(max_updated=Max(self.cache_timestamp_field))[
                        "max_updated"
                    ]
                    if max_updated:
                        response["Last-Modified"] = self._format_http_date(max_updated)

                    return response

        # Normal list processing
        return super().list(request, *args, **kwargs)

    def _add_list_cache_headers(self, request, response) -> None:
        """
        Add ETag and Last-Modified headers to list responses.

        Uses aggregate() for single DB query efficiency.
        """
        try:
            # Get the queryset from the view
            queryset = self.filter_queryset(self.get_queryset())

            etag = self._generate_etag(queryset)
            if etag:
                response["ETag"] = f'"{etag}"'

                # Also add Last-Modified from the same timestamp
                max_updated = queryset.aggregate(max_updated=Max(self.cache_timestamp_field))[
                    "max_updated"
                ]
                if max_updated:
                    response["Last-Modified"] = self._format_http_date(max_updated)
        except Exception as e:
            # Log error but don't break the response
            logger.debug(
                f"Failed to add cache headers to list response: {e}",
                exc_info=True,
            )

    # T014: Last-Modified for detail views
    @staticmethod
    def _format_http_date(dt: datetime) -> str:
        """
        Format datetime as RFC 7231 HTTP-date.

        Format: Mon, 03 Feb 2026 12:00:00 GMT
        """
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return format_datetime(dt, usegmt=True)

    def _add_detail_cache_headers(self, request, response) -> None:
        """
        Add Last-Modified and ETag headers to detail responses.

        These headers help clients validate cached resources with
        If-Modified-Since and If-None-Match conditional requests.
        """
        try:
            # Get the instance from response data or re-fetch
            instance = self.get_object()

            updated_at = getattr(instance, self.cache_timestamp_field, None)
            if updated_at:
                response["Last-Modified"] = self._format_http_date(updated_at)

                # Also add ETag for detail views (MD5 acceptable for ETags)
                timestamp_str = updated_at.isoformat()
                etag = hashlib.md5(timestamp_str.encode(), usedforsecurity=False).hexdigest()
                response["ETag"] = f'"{etag}"'
        except Exception as e:
            # Log error but don't break the response
            logger.debug(
                f"Failed to add cache headers to detail response: {e}",
                exc_info=True,
            )


class OptimisticCreateMixin:
    """
    Mixin that supports optimistic UI patterns for create operations.

    Features:
    - Echoes X-Client-Request-ID header for reconciliation
    - Ensures created_at has millisecond precision

    Apply to ViewSets where frontends use optimistic creates.

    **T015**: Create OptimisticCreateMixin base class
    **T016**: Implement X-Client-Request-ID echo
    **T017**: Ensure created_at millisecond precision (via serializers)
    """

    def create(self, request, *args, **kwargs):
        """
        Override create to capture client request ID.

        Stores the X-Client-Request-ID header for later echoing
        in the response (via finalize_response).
        """
        # Store the client request ID for later
        self._client_request_id = request.headers.get("X-Client-Request-ID")
        return super().create(request, *args, **kwargs)

    def finalize_response(self, request, response, *args, **kwargs):
        """
        Override response finalization to add optimistic headers.

        Echoes X-Client-Request-ID on POST responses (both success and errors).
        """
        response = super().finalize_response(request, response, *args, **kwargs)

        # Echo client request ID on create responses
        if request.method == "POST" and hasattr(self, "_client_request_id"):
            self._add_optimistic_headers(response)

        return response

    def _validate_client_request_id(self, value: str) -> bool:
        """
        Validate that the client request ID is a valid UUID.

        Returns:
            True if valid UUID, False otherwise. Always logs invalid values.

        Note: We still echo the header even if invalid (see T016).
        """
        try:
            uuid.UUID(value)
            return True
        except (ValueError, TypeError):
            logger.warning(
                "invalid_client_request_id",
                extra={"value": value[:50] if value else None},
            )
            return False

    def _add_optimistic_headers(self, response) -> None:
        """
        Add headers for optimistic create reconciliation.

        Echoes X-Client-Request-ID if present. Validates UUID format
        but still echoes even if invalid.
        """
        try:
            # Import get_flag here to avoid circular imports
            # Fall back to settings if B10 module not available
            try:
                from settings.api import get_flag

                enabled = get_flag(
                    "frontend_optimistic_create_enabled",
                    default=getattr(settings, "OPTIMISTIC_CREATE_ENABLED", True),
                )
            except ImportError:
                # B10 not available, use settings directly
                enabled = getattr(settings, "OPTIMISTIC_CREATE_ENABLED", True)

            if not enabled:
                return

            # Validate UUID format (logs warning but still echoes)
            if self._client_request_id:
                self._validate_client_request_id(self._client_request_id)
                response["X-Client-Request-ID"] = self._client_request_id
        except Exception as e:
            # Log error but don't break the response
            logger.debug(
                f"Failed to add optimistic headers: {e}",
                exc_info=True,
            )
