import uuid
from datetime import datetime, timezone

from rest_framework import status
from rest_framework.exceptions import (
    APIException,
    AuthenticationFailed,
    NotAuthenticated,
    NotFound,
    PermissionDenied,
    ValidationError,
)
from rest_framework.views import exception_handler as drf_exception_handler


def envelope_exception_handler(exc, context):
    """
    Custom exception handler that wraps all errors in consistent envelope format.

    Error envelope: {"status": "error", "error": {"code": "...", "message": "...", "details": {...}}}

    Features:
    - Maps exception types to error codes
    - Sanitizes error messages (no stack traces, database errors per FR-010)
    - Includes field-level validation details
    - Adds error ID for 500 errors (support correlation)
    - Adds timestamp to all errors

    Usage:
        Configure in REST_FRAMEWORK settings:
        "EXCEPTION_HANDLER": "api.exceptions.envelope_exception_handler"
    """
    # Call DRF's default handler first to get standard response
    response = drf_exception_handler(exc, context)

    if response is None:
        # Unhandled exception (500 server error)
        # Don't expose internal errors - sanitize completely
        error_id = str(uuid.uuid4())
        response_data = {
            "status": "error",
            "error": {
                "code": "server_error",
                "message": "An internal server error occurred. Please contact support with error ID.",
                "id": error_id,
            },
            "meta": {"timestamp": datetime.now(timezone.utc).isoformat()},
        }

        # Log the actual error for debugging (would be picked up by B09 audit logging)
        # logger.error(f"Unhandled exception {error_id}: {exc}", exc_info=True)

        from rest_framework.response import Response

        return Response(response_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Map exception types to error codes
    error_code_map = {
        ValidationError: "validation_error",
        AuthenticationFailed: "authentication_failed",
        NotAuthenticated: "not_authenticated",
        PermissionDenied: "permission_denied",
        NotFound: "not_found",
    }

    error_code = error_code_map.get(type(exc), "api_error")

    # Sanitize message - remove sensitive details
    error_message = str(exc)
    if "database" in error_message.lower() or "sql" in error_message.lower():
        error_message = "A data access error occurred. Please try again."

    # Build error envelope
    error_envelope = {
        "status": "error",
        "error": {
            "code": error_code,
            "message": error_message,
        },
        "meta": {"timestamp": datetime.now(timezone.utc).isoformat()},
    }

    # Add validation details if present
    if isinstance(exc, ValidationError) and isinstance(response.data, dict):
        error_envelope["error"]["details"] = response.data

    # Add error ID for server errors (500-level)
    if response.status_code >= 500:
        error_envelope["error"]["id"] = str(uuid.uuid4())

    response.data = error_envelope
    return response
