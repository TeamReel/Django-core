---
work_package_id: WP03
title: Response Envelope System
lane: planned
subtasks: [T018, T019, T020, T021, T022, T023, T024, T025]
history:
  - date: 2025-11-29
    action: created
    author: spec-kitty
---

# WP03: Response Envelope System

## Objective
Implement global response envelope with consistent success/error formatting and sanitized error handling.

## Context
**Priority**: P1 (User Story 2)
**Dependencies**: WP01 (base infrastructure)

## Subtasks

### T018-T019: Create EnvelopeJSONRenderer
Create `api/renderers.py`:
```python
from rest_framework.renderers import JSONRenderer

class EnvelopeJSONRenderer(JSONRenderer):
    def render(self, data, accepted_media_type=None, renderer_context=None):
        response = renderer_context.get("response") if renderer_context else None

        if response and response.status_code >= 400:
            # Errors handled by exception handler
            return super().render(data, accepted_media_type, renderer_context)

        # Success envelope
        envelope = {"status": "success", "data": data}

        # Add metadata if present
        if isinstance(data, dict) and "meta" in data:
            envelope["meta"] = data.pop("meta")

        return super().render(envelope, accepted_media_type, renderer_context)
```

### T020-T023: Create Exception Handler
Create `api/exceptions.py`:
```python
from rest_framework.views import exception_handler
from rest_framework.exceptions import ValidationError, NotAuthenticated, PermissionDenied

def envelope_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        error_code = {
            ValidationError: "validation_error",
            NotAuthenticated: "not_authenticated",
            PermissionDenied: "permission_denied",
        }.get(type(exc), "server_error")

        response.data = {
            "status": "error",
            "error": {
                "code": error_code,
                "message": str(exc),
                "details": response.data if isinstance(response.data, dict) else None,
            }
        }

    return response
```

### T024: Configure in Settings
```python
REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": ["api.renderers.EnvelopeJSONRenderer"],
    "EXCEPTION_HANDLER": "api.exceptions.envelope_exception_handler",
}
```

## Definition of Done
- [ ] All success responses: {"status": "success", "data": ...}
- [ ] All error responses: {"status": "error", "error": {...}}
- [ ] No stack traces in error responses
- [ ] Validation errors include field-level details

**Estimated Effort**: 4-6 hours
