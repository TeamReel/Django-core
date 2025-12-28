# API Module

REST API foundation and standards for Django Core-App.

## Overview

The `api` module provides the API infrastructure using Django REST Framework. It defines standards for versioning, authentication, pagination, error handling, and response formats.

**App location**: `src/api/`
**Feature spec**: `kitty-specs/013-api-foundation-standards/`
**ADR**: [ADR-014: URL-Based API Versioning](../architecture/adr/index.md#api--routing)

## Configuration

### Required Settings

```python
INSTALLED_APPS = [
    'rest_framework',
    'api.apps.ApiConfig',
    ...
]

REST_FRAMEWORK = {
    # Authentication
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],

    # Permissions
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],

    # Pagination
    'DEFAULT_PAGINATION_CLASS': 'api.pagination.CursorPagination',
    'PAGE_SIZE': 50,

    # Filtering
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],

    # Error handling
    'EXCEPTION_HANDLER': 'api.exceptions.custom_exception_handler',

    # Versioning
    'DEFAULT_VERSIONING_CLASS': 'rest_framework.versioning.URLPathVersioning',
    'DEFAULT_VERSION': 'v1',
    'ALLOWED_VERSIONS': ['v1'],
}
```

## URL Versioning

API versions are in the URL path:

```
/api/v1/users/
/api/v1/organisations/
/api/v2/users/  (future)
```

### Version Router

```python
# config/urls.py
urlpatterns = [
    path('api/v1/', include('api.v1.urls')),
    # path('api/v2/', include('api.v2.urls')),  # Future
]

# api/v1/urls.py
urlpatterns = [
    path('users/', include('accounts.api.urls')),
    path('organisations/', include('organisations.api.urls')),
    path('projects/', include('projects.api.urls')),
]
```

## Authentication

### JWT Authentication

```http
# Login to get tokens
POST /api/v1/auth/login
Content-Type: application/json

{"email": "user@example.com", "password": "password"}

# Response
{
  "access": "eyJ...",
  "refresh": "eyJ..."
}

# Use access token
GET /api/v1/users/me
Authorization: Bearer eyJ...
```

### Token Refresh

```http
POST /api/v1/auth/token/refresh
Content-Type: application/json

{"refresh": "eyJ..."}
```

## Pagination

### Cursor Pagination

```http
GET /api/v1/organisations/?cursor=cD0xMjM
```

**Response**:
```json
{
  "next": "http://api/v1/organisations/?cursor=cD0xMjQ",
  "previous": "http://api/v1/organisations/?cursor=cD0xMjI",
  "results": [...]
}
```

### Page Size

```http
GET /api/v1/organisations/?page_size=25
```

## Filtering

### Django Filter Backend

```python
class OrganisationViewSet(viewsets.ModelViewSet):
    filterset_fields = ['name', 'is_active', 'created_at']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
```

```http
# Filter
GET /api/v1/organisations/?is_active=true

# Search
GET /api/v1/organisations/?search=acme

# Order
GET /api/v1/organisations/?ordering=-created_at
```

## Error Handling

### Standard Error Response

```json
{
  "type": "validation_error",
  "code": "invalid_input",
  "message": "Validation failed",
  "details": [
    {
      "field": "email",
      "code": "invalid",
      "message": "Enter a valid email address"
    }
  ],
  "request_id": "req_abc123"
}
```

### HTTP Status Codes

| Status | Usage |
|--------|-------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (DELETE) |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Rate Limited |
| 500 | Server Error |

### Custom Exception Handler

```python
# api/exceptions.py
def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        response.data = {
            'type': get_error_type(exc),
            'code': getattr(exc, 'code', 'error'),
            'message': str(exc.detail),
            'details': getattr(exc, 'details', []),
            'request_id': context['request'].META.get('X-Request-ID'),
        }

    return response
```

## Rate Limiting

### Configuration

```python
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
    }
}
```

### Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1699999999
```

## Serializers

### Standard Patterns

```python
from rest_framework import serializers

class OrganisationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organisation
        fields = ['id', 'name', 'slug', 'created_at']
        read_only_fields = ['id', 'slug', 'created_at']

class OrganisationDetailSerializer(OrganisationSerializer):
    """Extended serializer for detail views."""
    members_count = serializers.IntegerField(read_only=True)

    class Meta(OrganisationSerializer.Meta):
        fields = OrganisationSerializer.Meta.fields + ['members_count', 'description']
```

### Nested Serializers

```python
class ProjectSerializer(serializers.ModelSerializer):
    organisation = OrganisationSerializer(read_only=True)
    organisation_id = serializers.UUIDField(write_only=True)
```

## ViewSets

### Standard ViewSet

```python
from rest_framework import viewsets
from api.permissions import HasPermission

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated, HasPermission]
    required_permission = 'projects.view'

    def get_queryset(self):
        """Filter to user's organizations."""
        return self.queryset.filter(
            organisation__memberships__user=self.request.user
        )

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)
```

### Action Decorators

```python
from rest_framework.decorators import action

class ProjectViewSet(viewsets.ModelViewSet):

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        project = self.get_object()
        project.archive()
        return Response({'status': 'archived'})
```

## Request Context

### Request ID Tracking

```python
# All requests get a unique ID
class RequestIDMiddleware:
    def __call__(self, request):
        request.id = request.META.get(
            'HTTP_X_REQUEST_ID',
            str(uuid.uuid4())
        )
        response = self.get_response(request)
        response['X-Request-ID'] = request.id
        return response
```

## Related Features

- [Accounts](./accounts.md) - Authentication endpoints
- [Request Flow](../architecture/request-flow.md) - Request lifecycle
- [Security Model](../architecture/security-model.md) - API security
