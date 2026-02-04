# API Foundation & Standards (B13)

**Feature**: B13 API Foundation & Standards
**Version**: 1.0.0
**Status**: Production Ready

## Overview

This module provides the foundational infrastructure for all REST APIs in the Django Core application. It implements:

- **JWT Authentication** with token blacklisting
- **Consistent Response Envelopes** for success and error responses
- **Rate Limiting** (100/min authenticated, 10/min anonymous)
- **Pagination** with metadata
- **OpenAPI Documentation** via drf-spectacular
- **URL-based Versioning** (all APIs under `/api/v1/`)

## Architecture

### Response Envelope Pattern

All API responses use a consistent envelope format:

**Success Response**:
```json
{
  "status": "success",
  "data": { /* your data */ },
  "meta": {
    "timestamp": "2025-11-29T18:00:00Z",
    "pagination": {
      "count": 100,
      "next": "http://localhost:8000/api/v1/users/?page=2",
      "previous": null,
      "page_size": 20
    }
  }
}
```

**Error Response**:
```json
{
  "status": "error",
  "error": {
    "code": "validation_error",
    "message": "Invalid input data",
    "details": { /* field-level errors */ },
    "id": "uuid-for-500-errors"
  },
  "meta": {
    "timestamp": "2025-11-29T18:00:00Z"
  }
}
```

### Authentication Flow

The API supports dual authentication:

1. **JWT Authentication** (Primary):
   - Obtain token: `POST /api/v1/auth/token/` with `{username, password}`
   - Refresh token: `POST /api/v1/auth/token/refresh/` with `{refresh}`
   - Logout: `POST /api/v1/auth/logout/` with `{refresh}` (blacklists token)
   - Access tokens expire after 15 minutes
   - Refresh tokens expire after 7 days

2. **Session Authentication** (Fallback):
   - Used for browser-based clients
   - JWT takes precedence when both are present

**Using JWT Tokens**:
```bash
# Obtain tokens
curl -X POST http://localhost:8000/api/v1/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username": "user@example.com", "password": "password"}'

# Response
{
  "access": "eyJ...",
  "refresh": "eyJ..."
}

# Use access token
curl http://localhost:8000/api/v1/users/ \
  -H "Authorization: Bearer eyJ..."

# Refresh when expired
curl -X POST http://localhost:8000/api/v1/auth/token/refresh/ \
  -H "Content-Type: application/json" \
  -d '{"refresh": "eyJ..."}'

# Logout (blacklist refresh token)
curl -X POST http://localhost:8000/api/v1/auth/logout/ \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{"refresh": "eyJ..."}'
```

### Rate Limiting

Rate limits are enforced per user (authenticated) or per IP (anonymous):

- **Authenticated Users**: 100 requests/minute per user ID
- **Anonymous Users**: 10 requests/minute per IP address

Rate limit information is included in response headers:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Timestamp when limit resets

When rate limit is exceeded, the API returns HTTP 429 with:
```json
{
  "status": "error",
  "error": {
    "code": "throttled",
    "message": "Request was throttled. Expected available in 45 seconds."
  }
}
```

### Pagination

All list endpoints use offset-based pagination with metadata:

- Default page size: 20 items
- Maximum page size: 100 items
- Query parameters:
  - `page`: Page number (1-indexed)
  - `page_size`: Items per page (1-100)

Pagination metadata is included in the `meta.pagination` field:
```json
{
  "status": "success",
  "data": [ /* items */ ],
  "meta": {
    "pagination": {
      "count": 100,
      "next": "http://localhost:8000/api/v1/users/?page=3",
      "previous": "http://localhost:8000/api/v1/users/?page=1",
      "page_size": 20
    }
  }
}
```

### API Versioning

All APIs are versioned under the `/api/v1/` prefix:

- **API Discovery**: `GET /api/v1/` - Lists all available endpoints
- **Users**: `/api/v1/users/`
- **Organisations**: `/api/v1/organisations/`
- **Projects**: `/api/v1/projects/`
- **Permissions**: `/api/v1/permissions/`

Version is included in the API discovery response:
```json
{
  "version": "1.0.0",
  "endpoints": { /* map of available APIs */ }
}
```

## Frontend Performance Guardrails (B40)

The API includes guardrails to prevent frontend over-fetching and enable efficient client-side caching.

### Pagination Guardrails

Pagination limits prevent frontend clients from accidentally fetching too many pages:

**Configuration** (in `settings.py`):
```python
# Enable/disable guardrails (default: True)
FETCH_GUARDRAIL_ENABLED = True

# Maximum pages per request (default: 5)
FETCH_GUARDRAIL_MAX_PAGES = 5

# Maximum total items per request (default: 500)
FETCH_GUARDRAIL_MAX_ITEMS = 500

# Per-endpoint overrides
FETCH_GUARDRAIL_OVERRIDES = {
    '/api/v1/activities/activities/': {'max_pages': 10},
}
```

**Response Headers**:

All paginated list responses include `X-Fetch-Budget` header with pagination metadata:

```json
{
  "max_pages": 5,
  "max_items": 500,
  "current_page": 1,
  "is_limited": true
}
```

**Error Handling**:

Requests exceeding limits return HTTP 400:
```json
{
  "status": "error",
  "error": {
    "code": "pagination_limit_exceeded",
    "message": "Page 6 exceeds maximum allowed pages (5)",
    "details": {
      "requested_page": 6,
      "max_pages": 5,
      "limit_type": "max_pages"
    }
  }
}
```

### Cache Headers Mixin

Enable ETag and Last-Modified headers for efficient client-side caching:

**Usage**:
```python
from api import CacheHeadersMixin
from rest_framework import viewsets

class MyViewSet(CacheHeadersMixin, viewsets.ModelViewSet):
    cache_timestamp_field = 'updated_at'  # Field to compute ETag
    queryset = MyModel.objects.all()
    serializer_class = MySerializer
```

**Supported Headers**:
- `ETag`: Hash of model max `updated_at` timestamp for list responses
- `Last-Modified`: Model's `updated_at` in RFC 7231 format
- `If-None-Match`: Request header to check ETag match (returns 304 Not Modified)
- `If-Modified-Since`: Request header to check Last-Modified (returns 304 Not Modified)

**Example**:
```bash
# First request
curl -i http://localhost:8000/api/v1/items/
# Response includes: ETag: "abc123", Last-Modified: "Mon, 03 Feb 2025 21:00:00 GMT"

# Subsequent request with cache validation
curl -i http://localhost:8000/api/v1/items/ \
  -H "If-None-Match: abc123"
# Returns: HTTP 304 Not Modified
```

### Optimistic Create Mixin

Support optimistic UI patterns with request ID echo:

**Usage**:
```python
from api import OptimisticCreateMixin
from rest_framework import viewsets

class MyViewSet(OptimisticCreateMixin, viewsets.ModelViewSet):
    queryset = MyModel.objects.all()
    serializer_class = MySerializer
```

**Frontend Integration**:

Send unique request ID header:
```bash
curl -X POST http://localhost:8000/api/v1/items/ \
  -H "Content-Type: application/json" \
  -H "X-Client-Request-ID: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{"name": "New Item"}'
```

Response echoes the request ID for reconciliation:
```json
{
  "status": "success",
  "data": {
    "id": "actual-server-id-123",
    "name": "New Item",
    "created_at": "2025-02-03T21:45:00.123Z"
  }
}
```

Response headers include:
```
X-Client-Request-ID: 550e8400-e29b-41d4-a716-446655440000
```

This enables frontends to reconcile optimistic UI updates with server responses.

### Feature Flag Control (B10 Integration)

All guardrail features can be toggled via B10 feature flags:

```python
# Master switch for pagination guardrails
frontend_fetch_guardrails_enabled = True

# Override default max pages
frontend_fetch_max_pages_default = 5

# Toggle optimistic create support
frontend_optimistic_create_enabled = True
```

See [quickstart.md](../../kitty-specs/046-frontend-performance-guardrails/quickstart.md) for integration examples.

## Base Classes

### BaseAPIViewSet

Base viewset for all API endpoints. Provides:
- Default authentication (JWT + Session)
- Performance optimization hooks
- Consistent error handling

**Usage**:
```python
from api.views import BaseAPIViewSet
from rest_framework.permissions import IsAuthenticated

class UserViewSet(BaseAPIViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset_optimizations(self):
        """Prevent N+1 queries."""
        return {
            "select_related": ["organisation"],
            "prefetch_related": ["projects"],
        }
```

### BaseSerializer

Base serializer with timestamp and metadata field patterns.

**Usage**:
```python
from api.serializers import BaseSerializer

class UserSerializer(BaseSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "name", "created_at", "updated_at"]
```

### BaseAPIPagination

Pagination class with metadata. Configured globally, no action required in viewsets.

## Creating New APIs

### 1. Create Serializers

```python
# myapp/api/serializers.py
from api.serializers import BaseSerializer
from myapp.models import MyModel

class MyModelSerializer(BaseSerializer):
    class Meta:
        model = MyModel
        fields = ["id", "name", "created_at"]
```

### 2. Create ViewSets

```python
# myapp/api/views.py
from api.views import BaseAPIViewSet
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, extend_schema_view

from myapp.models import MyModel
from .serializers import MyModelSerializer

@extend_schema_view(
    list=extend_schema(
        summary="List items",
        description="Returns paginated list of items user has access to",
    ),
    retrieve=extend_schema(
        summary="Get item details",
        description="Returns detailed information about a specific item",
    ),
)
class MyModelViewSet(BaseAPIViewSet):
    """
    ViewSet for MyModel operations.

    Provides standard CRUD operations with pagination and rate limiting.
    """
    queryset = MyModel.objects.all()
    serializer_class = MyModelSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset_optimizations(self):
        """Optimize queries to prevent N+1 issues."""
        return {
            "select_related": ["owner"],
            "prefetch_related": ["tags"],
        }
```

### 3. Configure URLs

```python
# myapp/api/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MyModelViewSet

router = DefaultRouter()
router.register(r"items", MyModelViewSet, basename="item")

urlpatterns = [
    path("", include(router.urls)),
]
```

### 4. Register in v1 URLs

```python
# api/v1/urls.py
from django.urls import path, include

urlpatterns = [
    # ... existing routes
    path("myapp/", include("myapp.api.urls")),  # /api/v1/myapp/items/
]
```

## OpenAPI Documentation

Interactive API documentation is available via Swagger UI:

- **Schema**: `GET /api/schema/` - OpenAPI 3.0 schema (YAML)
- **Swagger UI**: `GET /api/docs/` - Interactive documentation

### Using Swagger UI

1. Navigate to `http://localhost:8000/api/docs/`
2. Click "Authorize" button
3. Obtain a JWT token from `/api/v1/auth/token/`
4. Enter `Bearer <access_token>` in the authorization dialog
5. Test endpoints directly from the UI

### Documenting Endpoints

Use `@extend_schema` decorator for detailed documentation:

```python
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample

@extend_schema(
    operation_id="list_users",
    summary="List users",
    description="Returns paginated list of users with optional filtering",
    parameters=[
        OpenApiParameter(
            name="is_active",
            type=bool,
            description="Filter by active status",
            required=False,
        ),
    ],
    responses={
        200: UserSerializer(many=True),
        401: OpenApiExample(
            "Unauthorized",
            value={"status": "error", "error": {"code": "not_authenticated"}},
        ),
    },
    tags=["Users"],
)
def list(self, request):
    # ...
```

## Performance Optimization

### Query Optimization

Always define `get_queryset_optimizations()` to prevent N+1 queries:

```python
def get_queryset_optimizations(self):
    return {
        "select_related": ["related_model"],  # ForeignKey, OneToOne
        "prefetch_related": ["many_to_many"],  # ManyToMany, Reverse FK
    }
```

### Caching

Rate limit data is cached in Redis (configured in B06). No action required for basic APIs.

For custom caching:

```python
from django.core.cache import cache

def get_expensive_data(self):
    cache_key = f"expensive_data:{self.request.user.id}"
    data = cache.get(cache_key)
    if data is None:
        data = perform_expensive_operation()
        cache.set(cache_key, data, timeout=300)  # 5 minutes
    return data
```

## Error Handling

The global exception handler (`api.exceptions.envelope_exception_handler`) maps common errors:

| Exception | Error Code | HTTP Status |
|-----------|------------|-------------|
| ValidationError | `validation_error` | 400 |
| NotAuthenticated | `not_authenticated` | 401 |
| PermissionDenied | `permission_denied` | 403 |
| NotFound | `not_found` | 404 |
| MethodNotAllowed | `method_not_allowed` | 405 |
| Throttled | `throttled` | 429 |
| Unhandled | `internal_error` | 500 |

Custom error codes can be raised using DRF exceptions:

```python
from rest_framework.exceptions import ValidationError

raise ValidationError({
    "field_name": ["Error message for this field"]
})
```

## Security Considerations

### Inactive User Enforcement

JWT authentication automatically checks `user.is_active`. Inactive users receive HTTP 403:

```json
{
  "status": "error",
  "error": {
    "code": "permission_denied",
    "message": "Account has been deactivated"
  }
}
```

### Token Blacklisting

Refresh tokens are blacklisted on logout or refresh. Blacklisted tokens cannot be used.

### Error Sanitization

Database and SQL errors are sanitized in production to prevent information leakage:
- Original: `DatabaseError: relation "users" does not exist`
- Sanitized: `Internal server error (ID: uuid)`

### Rate Limit Bypass Prevention

Rate limits are enforced at the middleware level and cannot be bypassed through authentication.

## Testing APIs

### Type Checking (mypy)

For API modules, use the dedicated config to keep checks focused on API code while
the broader project typing is improved:

```bash
mypy --config-file mypy.api.ini
```
The config scopes checks to `src/api` and skips import following to avoid
project-wide strict typing failures.

### Unit Tests

```python
from rest_framework.test import APITestCase
from rest_framework import status

class MyAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass"
        )
        self.client.force_authenticate(user=self.user)

    def test_list_items(self):
        response = self.client.get("/api/v1/items/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "success")
        self.assertIn("data", response.data)
        self.assertIn("meta", response.data)
```

### Integration Tests

```python
def test_jwt_authentication_flow(self):
    # Obtain token
    response = self.client.post("/api/v1/auth/token/", {
        "username": "test@example.com",
        "password": "testpass"
    })
    access_token = response.data["access"]

    # Use token
    self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
    response = self.client.get("/api/v1/users/")
    self.assertEqual(response.status_code, 200)

    # Logout
    refresh_token = response.data["refresh"]
    response = self.client.post("/api/v1/auth/logout/", {
        "refresh": refresh_token
    })
    self.assertEqual(response.status_code, 200)
```

## Configuration Reference

### REST_FRAMEWORK Settings

```python
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "api.authentication.CustomJWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "api.renderers.EnvelopeJSONRenderer",
    ],
    "EXCEPTION_HANDLER": "api.exceptions.envelope_exception_handler",
    "DEFAULT_PAGINATION_CLASS": "api.pagination.BaseAPIPagination",
    "DEFAULT_THROTTLE_CLASSES": [
        "api.throttling.AuthenticatedUserThrottle",
        "api.throttling.AnonymousUserThrottle",
    ],
    "PAGE_SIZE": 50,
}
```

### SIMPLE_JWT Settings

```python
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
}
```

### SPECTACULAR_SETTINGS

```python
SPECTACULAR_SETTINGS = {
    "TITLE": "Django Core API",
    "DESCRIPTION": "Product-agnostic Django core application API",
    "VERSION": "1.0.0",
    "SCHEMA_PATH_PREFIX": r"/api/v1",
    "COMPONENT_SPLIT_REQUEST": True,
    "SWAGGER_UI_SETTINGS": {
        "deepLinking": True,
        "persistAuthorization": True,
    },
    "SECURITY": [{"BearerAuth": []}],
}
```

## Troubleshooting

### Token Errors

**Problem**: `{"error": {"code": "invalid_token"}}`

**Solutions**:
- Check token hasn't expired (15 min for access, 7 days for refresh)
- Verify `Bearer ` prefix in Authorization header
- Ensure token wasn't blacklisted (check `token_blacklist_blacklistedtoken` table)

### Rate Limit Exceeded

**Problem**: HTTP 429 "Request was throttled"

**Solutions**:
- Wait for rate limit window to reset (check `X-RateLimit-Reset` header)
- Authenticate if making requests as anonymous user (100/min vs 10/min)
- Check Redis is running (`REDIS_URL` environment variable)

### Pagination Issues

**Problem**: `page_size` parameter ignored

**Solutions**:
- Check value is between 1 and 100
- Verify `DEFAULT_PAGINATION_CLASS` is configured
- Ensure viewset doesn't override `pagination_class`

### OpenAPI Schema Errors

**Problem**: Schema generation fails or endpoints missing

**Solutions**:
- Run `python manage.py spectacular --validate` to check for errors
- Verify `drf_spectacular` in `INSTALLED_APPS`
- Check viewsets extend `BaseAPIViewSet` or `ModelViewSet`
- Add `@extend_schema` decorators for custom actions

## Related Documentation

- [B05: Core Accounts & Authentication](../../accounts/README.md)
- [B06: Organisation Management](../../organisations/README.md)
- [B08: Hierarchical Access Control](../../permissions/README.md)
- [ADR-013: JWT Authentication Strategy](../../docs/adr/013-jwt-authentication-strategy.md)
- [ADR-014: URL-based API Versioning](../../docs/adr/014-url-based-api-versioning.md)

## Support

For questions or issues:
1. Check this README and related documentation
2. Review OpenAPI schema at `/api/schema/`
3. Test endpoints in Swagger UI at `/api/docs/`
4. Check application logs for detailed error information
