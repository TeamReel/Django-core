---
work_package_id: WP06
title: OpenAPI Documentation and Developer Guide
lane: planned
subtasks: [T043, T044, T045, T046, T047, T048, T049, T050, T051, T052]
history:
  - date: 2025-11-29
    action: created
    author: spec-kitty
---

# WP06: OpenAPI Documentation and Developer Guide

## Objective
Generate interactive API documentation with Swagger UI and create comprehensive developer guides for API extension.

## Context
**Priority**: P3 (User Story 6)
**Dependencies**: WP05 (all endpoints consolidated and working)

## Subtasks

### T043: Configure drf-spectacular
In `settings/base.py`:
```python
SPECTACULAR_SETTINGS = {
    "TITLE": "Django Core API",
    "DESCRIPTION": "Product-agnostic Django core application API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SCHEMA_PATH_PREFIX": r"/api/v1",
    "COMPONENT_SPLIT_REQUEST": True,
}
```

### T044-T045: Add Documentation URLs
In `config/urls.py`:
```python
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]
```

### T046-T048: Enhance Documentation
Add docstrings to viewsets and serializers. Use `@extend_schema` for complex operations.

Test Swagger UI with live authentication and requests.

### T049-T050: Create API README
Create `src/api/README.md` documenting:
- Architecture overview (envelope, auth, versioning)
- Base class usage (BaseAPIViewSet, BaseSerializer, BaseAPIPagination)
- Extension patterns for product-specific APIs
- Performance optimization guidelines

### T051-T052: Write ADRs
Create:
- `docs/adr/013-jwt-authentication-strategy.md`
- `docs/adr/014-url-based-api-versioning.md`

## Definition of Done
- [ ] GET /api/docs/ displays Swagger UI
- [ ] All v1 endpoints visible with schemas
- [ ] JWT authentication works in Swagger UI
- [ ] src/api/README.md comprehensive
- [ ] ADRs explain key decisions

**Estimated Effort**: 4-6 hours
