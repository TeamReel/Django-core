# Quickstart: Organisation Management & Multi-Tenancy

**Feature**: 006-organisation-management-multi
**Status**: Development

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Usage Examples](#usage-examples)
- [Testing](#testing)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before getting started, ensure you have:

- **Python**: 3.12 or higher
- **Django**: 5.1 or higher
- **PostgreSQL**: 12 or higher (for production)
- **Redis**: 6.0 or higher (for rate limiting)
- **Development Tools**:
  - pip
  - virtualenv or venv
  - git

---

## Installation

### 1. Clone and Setup

```powershell
# Clone the repository
git clone <repository-url>
cd django-core

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements/local.txt
```

### 2. Install Required Packages

The organisations module requires the following additional packages:

```powershell
pip install django-redis==5.4.0
pip install django-prometheus==2.3.1
pip install prometheus-client==0.19.0
```

Or add to `requirements/base.txt`:

```txt
django-redis==5.4.0
django-prometheus==2.3.1
prometheus-client==0.19.0
```

### 3. Start Redis

**Using Docker (recommended)**:
```powershell
docker run -d -p 6379:6379 --name redis-dev redis:7-alpine
```

**Or install Redis natively on Windows**:
- Download from: https://github.com/microsoftarchive/redis/releases
- Run `redis-server.exe`

Verify Redis is running:
```powershell
redis-cli ping
# Should return: PONG
```

---

## Configuration

### 1. Update Django Settings

Add the organisations app to `INSTALLED_APPS` in `src/config/settings/base.py`:

```python
INSTALLED_APPS = [
    # ... existing apps
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'rest_framework',

    # Add organisations app
    'organisations',

    # Add monitoring
    'django_prometheus',
]
```

### 2. Configure Redis Cache

Add Redis cache configuration to `src/config/settings/base.py`:

```python
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'django_core',
        'TIMEOUT': 300,  # 5 minutes default
    }
}
```

### 3. Configure Django REST Framework

Add DRF settings to `src/config/settings/base.py`:

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
}
```

### 4. Configure Rate Limiting

Add rate limit settings to `src/config/settings/base.py`:

```python
# Organisation rate limits
ORGANISATION_RATE_LIMITS = {
    'create_org_per_user_per_day': 5,
    'invite_member_per_org_per_hour': 20,
}
```

### 5. Update URLs

Add organisations routes to `src/config/urls.py`:

```python
from django.urls import path, include

urlpatterns = [
    # ... existing patterns
    path('api/organisations/', include('organisations.api.urls')),
    path('', include('django_prometheus.urls')),  # Metrics endpoint
]
```

---

## Database Setup

### 1. Run Migrations

```powershell
cd src
python manage.py makemigrations organisations
python manage.py migrate
```

Expected output:
```
Operations to perform:
  Apply all migrations: organisations
Running migrations:
  Applying organisations.0001_initial... OK
```

### 2. Create Superuser (Optional)

For testing admin functionality:

```powershell
python manage.py createsuperuser
```

### 3. Verify Database Tables

```powershell
python manage.py dbshell
```

In PostgreSQL:
```sql
\dt organisations*
-- Should show:
-- organisations_organisation
-- organisations_membership
```

---

## Usage Examples

### Python Shell Examples

```powershell
cd src
python manage.py shell
```

#### Create an Organisation

```python
from django.contrib.auth import get_user_model
from organisations.models import Organisation

User = get_user_model()

# Get or create a user
user = User.objects.first()

# Create an organisation
org = Organisation.objects.create(
    name="Engineering Team",
    description="Core engineering team",
    creator=user
)

print(f"Created organisation: {org.name} (slug: {org.slug})")
# Output: Created organisation: Engineering Team (slug: engineering-team)
```

#### Add Members

```python
from organisations.models import Membership

# Get another user
member_user = User.objects.exclude(id=user.id).first()

# Invite as member
membership = Membership.objects.create(
    user=member_user,
    organisation=org,
    role='member',
    invited_by=user
)

print(f"Added {member_user.username} as {membership.role}")
```

#### Check Permissions

```python
# Check if user is admin
is_admin = org.memberships.filter(
    user=user,
    role='admin',
    is_active=True
).exists()

print(f"User is admin: {is_admin}")
# Output: User is admin: True (creator is auto-admin)
```

#### List User's Organisations

```python
user_orgs = Organisation.objects.filter(
    memberships__user=user,
    memberships__is_active=True,
    is_active=True
)

for org in user_orgs:
    role = org.memberships.get(user=user).role
    print(f"- {org.name} ({role})")
```

### API Examples (curl)

#### 1. Create Organisation

```powershell
curl -X POST http://localhost:8000/api/organisations/ `
  -H "Authorization: Token YOUR_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{\"name\": \"Sales Team\", \"description\": \"Sales department\"}'
```

Expected response (201 Created):
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Sales Team",
  "slug": "sales-team",
  "description": "Sales department",
  "created_at": "2025-11-24T10:30:00Z",
  "updated_at": "2025-11-24T10:30:00Z",
  "creator": {
    "id": "987fcdeb-51a2-43f1-9876-543210fedcba",
    "username": "john.doe",
    "email": "john.doe@example.com"
  },
  "member_count": 1,
  "admin_count": 1,
  "user_role": "admin"
}
```

#### 2. List Organisations

```powershell
curl -X GET http://localhost:8000/api/organisations/ `
  -H "Authorization: Token YOUR_TOKEN"
```

Expected response (200 OK):
```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Engineering Team",
      "slug": "engineering-team",
      "description": "Core engineering team",
      "created_at": "2025-11-23T09:00:00Z"
    },
    {
      "id": "456e7890-e12b-34c5-a678-901234567890",
      "name": "Sales Team",
      "slug": "sales-team",
      "description": "Sales department",
      "created_at": "2025-11-24T10:30:00Z"
    }
  ]
}
```

#### 3. Invite Member

```powershell
curl -X POST http://localhost:8000/api/organisations/123e4567-e89b-12d3-a456-426614174000/members/ `
  -H "Authorization: Token YOUR_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{\"user_id\": \"user-uuid-here\", \"role\": \"member\"}'
```

#### 4. Update Member Role

```powershell
curl -X PATCH http://localhost:8000/api/organisations/123e4567-e89b-12d3-a456-426614174000/members/user-uuid-here/ `
  -H "Authorization: Token YOUR_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{\"role\": \"admin\"}'
```

#### 5. Remove Member

```powershell
curl -X DELETE http://localhost:8000/api/organisations/123e4567-e89b-12d3-a456-426614174000/members/user-uuid-here/ `
  -H "Authorization: Token YOUR_TOKEN"
```

#### 6. Soft-Delete Organisation

```powershell
curl -X DELETE http://localhost:8000/api/organisations/123e4567-e89b-12d3-a456-426614174000/ `
  -H "Authorization: Token YOUR_TOKEN"
```

#### 7. Restore Organisation (Superadmin Only)

```powershell
curl -X POST http://localhost:8000/api/organisations/123e4567-e89b-12d3-a456-426614174000/restore/ `
  -H "Authorization: Token YOUR_SUPERADMIN_TOKEN"
```

---

## Testing

### Run All Tests

```powershell
cd src
pytest tests/organisations/
```

### Run Specific Test Files

```powershell
# Test models
pytest tests/organisations/test_models.py

# Test API
pytest tests/organisations/api/test_views.py

# Test permissions
pytest tests/organisations/test_permissions.py
```

### Run with Coverage

```powershell
pytest --cov=organisations --cov-report=html tests/organisations/
# Open htmlcov/index.html in browser
```

### Test Data Factory Examples

```python
# tests/factories.py
import factory
from organisations.models import Organisation, Membership

class OrganisationFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Organisation

    name = factory.Sequence(lambda n: f"Organisation {n}")
    description = "Test organisation"
    creator = factory.SubFactory('tests.factories.UserFactory')

class MembershipFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Membership

    user = factory.SubFactory('tests.factories.UserFactory')
    organisation = factory.SubFactory(OrganisationFactory)
    role = 'member'
```

---

## API Reference

### Endpoints Summary

| Method | Endpoint | Description | Auth | Admin Only |
|--------|----------|-------------|------|------------|
| GET | `/api/organisations/` | List user's organisations | ✓ | ✗ |
| POST | `/api/organisations/` | Create organisation | ✓ | ✗ |
| GET | `/api/organisations/{id}/` | Get organisation details | ✓ | ✗ |
| PATCH | `/api/organisations/{id}/` | Update organisation | ✓ | ✓ |
| DELETE | `/api/organisations/{id}/` | Soft-delete organisation | ✓ | ✓ |
| POST | `/api/organisations/{id}/restore/` | Restore deleted org | ✓ | Superadmin |
| GET | `/api/organisations/{id}/members/` | List members | ✓ | ✗ |
| POST | `/api/organisations/{id}/members/` | Invite member | ✓ | ✓ |
| GET | `/api/organisations/{id}/members/{user_id}/` | Get membership | ✓ | ✗ |
| PATCH | `/api/organisations/{id}/members/{user_id}/` | Update role | ✓ | ✓ |
| DELETE | `/api/organisations/{id}/members/{user_id}/` | Remove member | ✓ | ✓ |

### Rate Limits

- **Organisation creation**: 5 per user per 24 hours
- **Member invitations**: 20 per organisation per hour

Rate limit headers:
- `X-RateLimit-Limit`: Maximum allowed
- `X-RateLimit-Remaining`: Remaining in window
- `X-RateLimit-Reset`: Unix timestamp when resets

### Error Responses

| Status | Meaning |
|--------|---------|
| 400 | Bad Request - Invalid data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Business rule violation |
| 429 | Too Many Requests - Rate limit exceeded |

---

## Troubleshooting

### Redis Connection Error

**Error**: `ConnectionError: Error connecting to Redis`

**Solution**:
1. Verify Redis is running: `redis-cli ping`
2. Check Redis configuration in settings
3. Ensure correct port (default 6379)

### Rate Limit Not Working

**Error**: Rate limits not enforced

**Solution**:
1. Verify Redis cache is configured
2. Check `ORGANISATION_RATE_LIMITS` in settings
3. Ensure cache backend is `django_redis.cache.RedisCache`

### Last Admin Cannot Be Removed

**Error**: `Cannot remove the last admin`

**Solution**: This is expected behavior. Promote another member to admin first:

```python
# Promote member to admin
membership = Membership.objects.get(
    organisation=org,
    user=new_admin_user
)
membership.role = 'admin'
membership.save()

# Now you can remove/demote the old admin
```

### Organisation Name Already Exists

**Error**: `Organisation with this name already exists`

**Solution**: Organisation names must be globally unique. Choose a different name or append a suffix.

### Soft-Deleted Organisation Not Visible

**Error**: Cannot find recently deleted organisation

**Solution**: Soft-deleted organisations are hidden from normal queries. Superadmins can restore within 30 days:

```python
org = Organisation.objects.filter(
    id=org_id,
    is_active=False
).first()

if org:
    org.is_active = True
    org.deleted_at = None
    org.save()
```

### Metrics Endpoint Not Working

**Error**: `/metrics` endpoint returns 404

**Solution**:
1. Ensure `django_prometheus` is in `INSTALLED_APPS`
2. Add `path('', include('django_prometheus.urls'))` to URLs
3. Apply middleware in settings:

```python
MIDDLEWARE = [
    'django_prometheus.middleware.PrometheusBeforeMiddleware',
    # ... other middleware
    'django_prometheus.middleware.PrometheusAfterMiddleware',
]
```

---

## Next Steps

1. **Review API Documentation**: See `contracts/organisations-api.yaml` for full OpenAPI spec
2. **Explore Data Model**: See `data-model.md` for detailed entity schemas
3. **Read Implementation Plan**: See `plan.md` for architecture details
4. **Run Tests**: Ensure everything works: `pytest tests/organisations/`
5. **Check Metrics**: Visit `http://localhost:8000/metrics` for Prometheus metrics

---

## Support

For issues or questions:
- Review the [full specification](spec.md)
- Check the [data model documentation](data-model.md)
- Consult the [OpenAPI contract](contracts/organisations-api.yaml)
