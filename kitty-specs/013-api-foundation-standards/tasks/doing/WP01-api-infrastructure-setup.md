---
work_package_id: WP01
title: API Infrastructure Setup
lane: "doing"
subtasks:
  - T001
  - T002
  - T003
  - T004
  - T005
  - T006
  - T007
  - T008
  - T009
agent: "copilot"
shell_pid: "11588"
history:
  - date: 2025-11-29
    action: created
    author: spec-kitty
---

# WP01: API Infrastructure Setup

## Objective

Create the foundational `src/api/` Django app with base classes, install required dependencies (simplejwt, drf-spectacular), and configure global DRF settings. This work package establishes the infrastructure that all subsequent API work packages depend on.

## Context

**Feature**: 013-api-foundation-standards
**Priority**: P1 (Critical Path - all other WPs depend on this)
**Dependencies**: None (foundational)

**Related Documents**:
- [spec.md](../spec.md) - User stories and functional requirements
- [plan.md](../plan.md) - Technical architecture and planning decisions
- [research.md](../research.md) - Library selection rationale
- [data-model.md](../data-model.md) - JWT token and rate limit structures

**Key Planning Decisions**:
- Q1: djangorestframework-simplejwt for JWT (no existing solution, industry standard)
- Q2: Global renderer/exception handler (no external consumers to break)
- Q5: DRF SimpleRateThrottle with Redis (leverages B06 infrastructure)

## Subtasks

### T001: Create src/api/ Django App Structure

**Goal**: Initialize Django app with proper structure

**Steps**:
1. Run `python manage.py startapp api src/api` from project root
2. Verify structure created:
   ```
   src/api/
   ├── __init__.py
   ├── apps.py
   ├── models.py
   ├── views.py
   ├── tests.py
   └── migrations/
   ```
3. Update `src/api/apps.py`:
   ```python
   from django.apps import AppConfig

   class ApiConfig(AppConfig):
       default_auto_field = "django.db.models.BigAutoField"
       name = "api"
       verbose_name = "API Foundation"
   ```

**Verification**: Directory exists, apps.py configured

---

### T002: Add djangorestframework-simplejwt to requirements

**Goal**: Install JWT authentication library

**Steps**:
1. Open `requirements/base.txt`
2. Add line: `djangorestframework-simplejwt==5.3.1`
3. Place after `djangorestframework==3.14.0` (logical grouping)
4. Run `pip install -r requirements/base.txt`

**Verification**: `pip show djangorestframework-simplejwt` shows version 5.3.1

---

### T003: Add drf-spectacular to requirements

**Goal**: Install OpenAPI documentation generator

**Steps**:
1. Open `requirements/base.txt`
2. Add line: `drf-spectacular==0.27.0`
3. Place after simplejwt (logical grouping)
4. Run `pip install -r requirements/base.txt`

**Verification**: `pip show drf-spectacular` shows version 0.27.0

---

### T004: Update INSTALLED_APPS

**Goal**: Register api app and dependencies in Django settings

**Steps**:
1. Open `src/config/settings/base.py`
2. Find `INSTALLED_APPS` list
3. Add after existing Django and third-party apps:
   ```python
   INSTALLED_APPS = [
       # ... existing apps ...
       "rest_framework",  # Should already exist from B05/B06/B07
       "rest_framework_simplejwt.token_blacklist",  # NEW: JWT token blacklist
       "drf_spectacular",  # NEW: OpenAPI documentation
       "api",  # NEW: API foundation app
       # ... other apps ...
   ]
   ```

**Verification**: `python manage.py check` passes

---

### T005: Configure SIMPLE_JWT Settings

**Goal**: Set JWT token lifetimes and blacklist behavior

**Steps**:
1. Open `src/config/settings/base.py`
2. Add SIMPLE_JWT configuration block (after REST_FRAMEWORK settings if exists):
   ```python
   from datetime import timedelta

   SIMPLE_JWT = {
       "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),  # Short-lived for security
       "REFRESH_TOKEN_LIFETIME": timedelta(days=7),  # Allow persistent sessions
       "ROTATE_REFRESH_TOKENS": True,  # Generate new refresh on each refresh
       "BLACKLIST_AFTER_ROTATION": True,  # Invalidate old refresh tokens
       "ALGORITHM": "HS256",  # Standard HMAC SHA-256
       "SIGNING_KEY": SECRET_KEY,  # Use Django's secret key
       "AUTH_HEADER_TYPES": ("Bearer",),  # Authorization: Bearer <token>
       "USER_ID_FIELD": "id",  # B05 User model uses 'id'
       "USER_ID_CLAIM": "user_id",  # JWT payload field name
   }
   ```

**Rationale**:
- 15min access tokens limit exposure window if stolen
- 7 day refresh tokens balance security with UX (no re-auth for a week)
- Rotation prevents refresh token reuse attacks

**Verification**: Settings defined, no import errors

---

### T006: Run Migrations for simplejwt Blacklist

**Goal**: Create database tables for token blacklist

**Steps**:
1. Generate migrations: `python manage.py makemigrations`
   - Should detect token_blacklist app migrations
2. Review migration files in venv/lib/python3.12/site-packages/rest_framework_simplejwt/token_blacklist/migrations/
3. Apply migrations: `python manage.py migrate`
4. Verify tables created:
   ```sql
   \dt token_blacklist*  # PostgreSQL
   ```
   - Should show: `token_blacklist_outstandingtoken`, `token_blacklist_blacklistedtoken`

**Verification**:
- Migrations applied successfully
- Tables exist in database
- `python manage.py showmigrations token_blacklist` shows [X] marks

---

### T007: Create BaseAPIViewSet

**Goal**: Provide base viewset class with permission and performance patterns

**Steps**:
1. Create `src/api/views.py`:
   ```python
   from rest_framework.viewsets import ModelViewSet
   from rest_framework.permissions import IsAuthenticated
   from typing import Any

   class BaseAPIViewSet(ModelViewSet):
       """
       Base viewset for all API endpoints.

       Provides:
       - Default authentication (JWT + Session)
       - Permission integration with B08
       - Performance optimization hooks (select_related, prefetch_related)
       - Consistent error handling (via global exception handler)

       Usage:
           class UserViewSet(BaseAPIViewSet):
               queryset = User.objects.all()
               serializer_class = UserSerializer
               permission_classes = [IsAuthenticated, CanViewUser]

               def get_queryset_optimizations(self):
                   return {
                       "select_related": ["organisation"],
                       "prefetch_related": ["projects"],
                   }
       """

       # Default to requiring authentication
       permission_classes = [IsAuthenticated]

       def get_queryset(self) -> Any:
           """
           Override to apply performance optimizations.
           Subclasses should implement get_queryset_optimizations().
           """
           queryset = super().get_queryset()

           # Apply optimizations if defined
           optimizations = self.get_queryset_optimizations()
           if select_related := optimizations.get("select_related"):
               queryset = queryset.select_related(*select_related)
           if prefetch_related := optimizations.get("prefetch_related"):
               queryset = queryset.prefetch_related(*prefetch_related)

           return queryset

       def get_queryset_optimizations(self) -> dict[str, list[str]]:
           """
           Return dict with 'select_related' and 'prefetch_related' lists.
           Override in subclasses to prevent N+1 queries.
           """
           return {}
   ```

**Verification**:
- File exists at `src/api/views.py`
- Class can be imported: `from api.views import BaseAPIViewSet`
- Docstrings explain usage

---

### T008: Create BaseSerializer

**Goal**: Provide base serializer with common timestamp/meta patterns

**Steps**:
1. Create `src/api/serializers.py`:
   ```python
   from rest_framework import serializers
   from typing import Any

   class BaseSerializer(serializers.ModelSerializer):
       """
       Base serializer for all API resources.

       Provides:
       - Consistent timestamp formatting (ISO 8601 with UTC)
       - Meta field conventions
       - Field-level validation patterns

       Usage:
           class UserSerializer(BaseSerializer):
               class Meta:
                   model = User
                   fields = ["id", "username", "email", "created_at"]
                   read_only_fields = ["id", "created_at"]
       """

       # Ensure timestamps are ISO 8601 with 'Z' suffix
       created_at = serializers.DateTimeField(
           format="%Y-%m-%dT%H:%M:%SZ",
           read_only=True,
           required=False,
       )
       updated_at = serializers.DateTimeField(
           format="%Y-%m-%dT%H:%M:%SZ",
           read_only=True,
           required=False,
       )

       def to_representation(self, instance: Any) -> dict[str, Any]:
           """
           Convert model instance to JSON-serializable dict.
           Override to add custom transformations.
           """
           data = super().to_representation(instance)

           # Remove null values by default (cleaner API responses)
           return {key: value for key, value in data.items() if value is not None}
   ```

**Verification**:
- File exists at `src/api/serializers.py`
- Class can be imported: `from api.serializers import BaseSerializer`

---

### T009: Create BaseAPIPagination

**Goal**: Implement offset-based pagination with consistent metadata

**Steps**:
1. Create `src/api/pagination.py`:
   ```python
   from rest_framework.pagination import PageNumberPagination
   from rest_framework.response import Response
   from typing import Any

   class BaseAPIPagination(PageNumberPagination):
       """
       Base pagination class for all list endpoints.

       Configuration:
       - Default: 20 items per page
       - Maximum: 100 items per page (prevents abuse)
       - Query params: ?page=2&page_size=50

       Response format:
       {
           "status": "success",
           "data": [...],
           "meta": {
               "pagination": {
                   "count": 42,
                   "next": "http://api/v1/users/?page=3",
                   "previous": "http://api/v1/users/?page=1",
                   "page_size": 20
               }
           }
       }
       """

       page_size = 20  # Default from FR-014
       page_size_query_param = "page_size"  # Allow client override
       max_page_size = 100  # Maximum from FR-014

       def get_paginated_response(self, data: list[dict]) -> Response:
           """
           Return paginated response with metadata.
           Envelope wrapping handled by EnvelopeJSONRenderer (WP03).
           """
           return Response({
               "data": data,
               "meta": {
                   "pagination": {
                       "count": self.page.paginator.count,
                       "next": self.get_next_link(),
                       "previous": self.get_previous_link(),
                       "page_size": self.page_size,
                   }
               }
           })
   ```

**Notes**:
- Envelope wrapping ({"status": "success", ...}) added by renderer in WP03
- This class only handles pagination metadata in meta.pagination

**Verification**:
- File exists at `src/api/pagination.py`
- Class can be imported: `from api.pagination import BaseAPIPagination`

---

## Implementation Sequence

Execute subtasks in order:
1. **T001**: App structure (foundation)
2. **T002-T003**: Install dependencies (parallel OK)
3. **T004**: Register apps in settings
4. **T005**: Configure JWT settings
5. **T006**: Run migrations (requires T004-T005)
6. **T007-T009**: Create base classes (parallel OK)

**Critical Path**: T001 → T004 → T005 → T006
**Parallelizable**: T002-T003, T007-T009

---

## Definition of Done

- [ ] `src/api/` Django app exists and is registered in INSTALLED_APPS
- [ ] simplejwt 5.3.1 and drf-spectacular 0.27.0 installed in requirements/base.txt
- [ ] SIMPLE_JWT settings configured with 15min/7day lifetimes
- [ ] Database migrations applied (token_blacklist_outstandingtoken, token_blacklist_blacklistedtoken tables exist)
- [ ] BaseAPIViewSet, BaseSerializer, BaseAPIPagination classes implemented with docstrings
- [ ] `python manage.py check` passes with no errors
- [ ] All classes importable: `from api.views import BaseAPIViewSet; from api.serializers import BaseSerializer; from api.pagination import BaseAPIPagination`

---

## Testing Guidance

### Smoke Tests

```bash
# Verify installation
pip show djangorestframework-simplejwt
pip show drf-spectacular

# Verify migrations
python manage.py showmigrations token_blacklist

# Verify imports
python manage.py shell
>>> from api.views import BaseAPIViewSet
>>> from api.serializers import BaseSerializer
>>> from api.pagination import BaseAPIPagination
>>> # No import errors = success
```

### Unit Tests (Optional for WP01)

Create `tests/api/test_base_classes.py`:
```python
import pytest
from api.views import BaseAPIViewSet
from api.serializers import BaseSerializer
from api.pagination import BaseAPIPagination

def test_base_viewset_exists():
    assert BaseAPIViewSet is not None
    assert hasattr(BaseAPIViewSet, "get_queryset_optimizations")

def test_base_serializer_exists():
    assert BaseSerializer is not None
    assert hasattr(BaseSerializer, "to_representation")

def test_base_pagination_exists():
    assert BaseAPIPagination is not None
    assert BaseAPIPagination.page_size == 20
    assert BaseAPIPagination.max_page_size == 100
```

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Migration conflicts with existing auth tables | High | Run migrations in test database first; review migration SQL before applying |
| simplejwt version incompatibility | Medium | Pinned version 5.3.1; test token generation immediately after install |
| Redis not configured for rate limiting | Medium | Redis configured in B06; verify CACHES["default"] uses django-redis backend |
| Base classes too opinionated | Low | Keep base classes minimal; provide override hooks for customization |

---

## Reviewer Guidance

**Code Review Checklist**:
- [ ] `src/api/` app structure follows Django conventions
- [ ] Dependencies pinned to exact versions in requirements/base.txt
- [ ] SIMPLE_JWT settings include all required keys (ACCESS_TOKEN_LIFETIME, etc.)
- [ ] Migrations applied successfully (check database for token_blacklist tables)
- [ ] Base classes have comprehensive docstrings explaining usage
- [ ] BaseAPIViewSet includes permission_classes and get_queryset_optimizations()
- [ ] BaseSerializer formats timestamps as ISO 8601 with 'Z' suffix
- [ ] BaseAPIPagination respects 20 default / 100 maximum constraints
- [ ] No hardcoded secrets (SECRET_KEY referenced from settings)

**Testing Verification**:
- [ ] `python manage.py check` passes
- [ ] All base classes importable without errors
- [ ] Database migrations show [X] for token_blacklist

**Common Issues**:
- Forgot to add `rest_framework_simplejwt.token_blacklist` to INSTALLED_APPS → migrations won't detect tables
- Wrong import path for BaseAPIViewSet → use `from api.views import BaseAPIViewSet`, not `from api import BaseAPIViewSet`
- Redis not configured → will manifest in WP04 throttling tests; verify CACHES["default"] now

---

## Next Steps

After WP01 completion:
1. **WP02 (JWT Auth)**: Can start immediately (depends on simplejwt installation and migrations)
2. **WP03 (Envelope)**: Can start immediately (depends on base classes)
3. **WP04 (Pagination/Rate Limiting)**: Wait for WP03 (needs envelope for metadata)

**Estimated Effort**: 4-6 hours (setup + migrations + base classes)


## Activity Log

- 2025-11-29T17:42:36Z – copilot – shell_pid=11588 – lane=doing – Started WP01 implementation
- 2025-11-29T18:57:00Z – copilot – shell_pid=11588 – lane=doing – Completed all 9 subtasks: created api app, installed dependencies (simplejwt 5.3.1, drf-spectacular 0.27.0), configured settings, ran migrations (JWT blacklist tables created), implemented all base classes (BaseAPIViewSet, BaseSerializer, BaseAPIPagination). Django check passes, all classes importable.
