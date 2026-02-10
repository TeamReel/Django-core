from datetime import datetime, timezone

from rest_framework.renderers import JSONRenderer


class EnvelopeJSONRenderer(JSONRenderer):
    """
    Global JSON renderer that wraps all responses in a consistent envelope.

    Success responses: {"status": "success", "data": {...}, "meta": {...}}
    Error responses: Handled by envelope_exception_handler (api.exceptions)

    Usage:
        Configure in REST_FRAMEWORK settings:
        "DEFAULT_RENDERER_CLASSES": ["api.renderers.EnvelopeJSONRenderer"]
    """

    def render(self, data, accepted_media_type=None, renderer_context=None):
        """
        Wrap successful responses in envelope format.
        Error responses (status >= 400) are handled by exception handler.
        """
        response = renderer_context.get("response") if renderer_context else None

        # Let errors pass through - exception handler adds envelope
        if response and response.status_code >= 400:
            return super().render(data, accepted_media_type, renderer_context)

        # Do not envelope 204 No Content responses
        if response and response.status_code == 204:
            return super().render(data, accepted_media_type, renderer_context)

        # Extract meta field if present in data dict
        meta = None
        if isinstance(data, dict) and "meta" in data:
            meta = data.pop("meta")

            # Unwrap 'data' key if it was nested by BaseAPIPagination
            if isinstance(data, dict) and "data" in data and len(data) == 1:
                data = data["data"]

        # Build success envelope
        envelope = {
            "status": "success",
            "data": data,
        }

        # Add metadata (pagination, timestamps, etc.)
        if meta:
            envelope["meta"] = meta
        else:
            # Default: add timestamp if no meta provided
            envelope["meta"] = {"timestamp": datetime.now(timezone.utc).isoformat()}

        return super().render(envelope, accepted_media_type, renderer_context)
