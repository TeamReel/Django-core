# API Contracts — B33 Brand Identity Manager

**Base URL**: `/api/branding/`
**Authentication**: Required (DRF TokenAuthentication + SessionAuthentication)
**Content-Type**: `application/json`

## Endpoints

### 1. Brand Profiles

#### List Brand Profiles
```http
GET /api/branding/profiles/
```

**Query Parameters**:
- `organisation` (UUID): Filter by organisation
- `project` (UUID): Filter by project
- `is_active` (boolean): Filter by active status
- `page` (int): Page number
- `page_size` (int): Results per page

**Response** (200 OK):
```json
{
  "count": 10,
  "next": "http://api.example.com/api/branding/profiles/?page=2",
  "previous": null,
  "results": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "organisation": "org-uuid",
      "project": null,
      "name": "Demo Organisation Brand",
      "is_active": true,
      "token_count": 15,
      "asset_count": 3,
      "created_at": "2026-01-15T10:30:00Z",
      "updated_at": "2026-01-20T14:45:00Z",
      "created_by": "user-uuid",
      "updated_by": "user-uuid"
    }
  ]
}
```

#### Retrieve Brand Profile
```http
GET /api/branding/profiles/{id}/
```

**Response** (200 OK):
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "organisation": "org-uuid",
  "project": null,
  "name": "Demo Organisation Brand",
  "is_active": true,
  "tokens": [
    {
      "id": "token-uuid-1",
      "key": "primary_color",
      "value": "#1E3A8A",
      "type": "color",
      "description": "Primary brand color"
    }
  ],
  "assets": [
    {
      "id": "asset-uuid-1",
      "asset_type": "logo_light",
      "file": {
        "id": "file-uuid-1",
        "url": "https://storage.example.com/logos/demo-light.png",
        "name": "demo-logo-light.png",
        "size": 45678
      },
      "is_active": true
    }
  ],
  "created_at": "2026-01-15T10:30:00Z",
  "updated_at": "2026-01-20T14:45:00Z"
}
```

#### Create Brand Profile
```http
POST /api/branding/profiles/
```

**Request Body**:
```json
{
  "organisation": "org-uuid",
  "project": null,
  "name": "New Brand",
  "is_active": true
}
```

**Validation Rules**:
- Either `organisation` or `project` required (not both)
- `name` max 200 chars
- User must have permission on org/project

**Response** (201 Created):
```json
{
  "id": "new-uuid",
  "organisation": "org-uuid",
  "project": null,
  "name": "New Brand",
  "is_active": true,
  "token_count": 0,
  "asset_count": 0,
  "created_at": "2026-02-01T12:00:00Z",
  "updated_at": "2026-02-01T12:00:00Z"
}
```

#### Update Brand Profile
```http
PATCH /api/branding/profiles/{id}/
```

**Request Body** (partial update):
```json
{
  "name": "Updated Brand Name",
  "is_active": false
}
```

**Response** (200 OK): Full profile object

#### Delete Brand Profile
```http
DELETE /api/branding/profiles/{id}/
```

**Response** (204 No Content)

**Cascade Behavior**: Also deletes related DesignTokens and BrandAssets (Django CASCADE)

---

### 2. Design Tokens

#### List Tokens (per profile)
```http
GET /api/branding/profiles/{profile_id}/tokens/
```

**Query Parameters**:
- `type` (string): Filter by token type (color, font, spacing, other)
- `key` (string): Search by key (contains)

**Response** (200 OK):
```json
{
  "count": 15,
  "results": [
    {
      "id": "token-uuid-1",
      "profile": "profile-uuid",
      "key": "primary_color",
      "value": "#1E3A8A",
      "type": "color",
      "description": "Primary brand color",
      "created_at": "2026-01-15T10:30:00Z",
      "updated_at": "2026-01-20T14:45:00Z"
    }
  ]
}
```

#### Create Token
```http
POST /api/branding/profiles/{profile_id}/tokens/
```

**Request Body**:
```json
{
  "key": "secondary_color",
  "value": "#FBBF24",
  "type": "color",
  "description": "Secondary accent color"
}
```

**Validation Rules**:
- `key` max 100 chars, unique per profile
- `value` max 1000 chars
- `type` must be in: color, font, spacing, other

**Response** (201 Created): Full token object

#### Update Token
```http
PATCH /api/branding/tokens/{id}/
```

**Request Body**:
```json
{
  "value": "#F59E0B"
}
```

**Response** (200 OK): Full token object

#### Delete Token
```http
DELETE /api/branding/tokens/{id}/
```

**Purpose**: Remove a token from a brand profile (enables "remove override" pattern)

**Response** (204 No Content)

**Effect**: Removes token from profile. For project-level tokens, if the organisation has a token with the same key, subsequent token resolution API calls will return the organisation value (inheritance fallback). This implements the "remove override" pattern from User Story 3.

**Example Workflow** (Override Removal):
1. Organisation has token: `primary_color: #FF6600`
2. Project creates override: `primary_color: #D2122E`
3. Token resolution returns: `#D2122E` (project override)
4. Project admin DELETEs the project token
5. Token resolution returns: `#FF6600` (organisation fallback)

---

### 3. Brand Assets

#### List Assets (per profile)
```http
GET /api/branding/profiles/{profile_id}/assets/
```

**Query Parameters**:
- `asset_type` (string): Filter by type (logo_light, logo_dark, watermark, favicon, other)
- `is_active` (boolean): Filter by active status

**Response** (200 OK):
```json
{
  "count": 3,
  "results": [
    {
      "id": "asset-uuid-1",
      "profile": "profile-uuid",
      "asset_type": "logo_light",
      "file": {
        "id": "file-uuid-1",
        "url": "https://storage.example.com/logos/demo-light.png",
        "name": "demo-logo-light.png",
        "size": 45678,
        "content_type": "image/png"
      },
      "is_active": true,
      "created_at": "2026-01-15T10:30:00Z",
      "updated_at": "2026-01-20T14:45:00Z"
    }
  ]
}
```

#### Create Asset
```http
POST /api/branding/profiles/{profile_id}/assets/
```

**Request Body**:
```json
{
  "file": "file-uuid",
  "asset_type": "logo_light",
  "is_active": true
}
```

**Validation Rules**:
- `file` must reference existing File object (B22)
- `asset_type` must be in choices
- Unique: only one asset per type per profile

**Response** (201 Created): Full asset object

#### Update Asset
```http
PATCH /api/branding/assets/{id}/
```

**Request Body**:
```json
{
  "is_active": false
}
```

**Response** (200 OK): Full asset object

#### Delete Asset
```http
DELETE /api/branding/assets/{id}/
```

**Response** (204 No Content)

**Note**: Does NOT delete the File object (PROTECT constraint). Manual cleanup required via B22 API.

---

### 4. Token Resolution API (Special Endpoint)

#### Get Merged Tokens
```http
GET /api/branding/tokens/resolve/
```

**Query Parameters**:
- `project` (UUID, required): Project to resolve tokens for
- `organisation` (UUID, optional): Explicit org fallback

**Response** (200 OK):
```json
{
  "project": "project-uuid",
  "organisation": "org-uuid",
  "tokens": {
    "primary_color": "#DC2626",
    "secondary_color": "#FBBF24",
    "font_heading": "Inter",
    "font_body": "Roboto",
    "spacing_base": "16px"
  },
  "source": "merged",
  "project_brand_id": "project-brand-uuid",
  "org_brand_id": "org-brand-uuid"
}
```

**Logic**:
1. Fetch project brand (if exists)
2. Fetch org brand (if exists)
3. Merge tokens: project overrides org
4. Return flat key-value dict

**Use Case**: Frontend loads tokens once per project context, applies CSS variables

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Validation error",
  "errors": {
    "key": ["This field may not be blank."],
    "value": ["Ensure this field has no more than 1000 characters."]
  }
}
```

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
  "detail": "You do not have permission to perform this action."
}
```

### 404 Not Found
```json
{
  "detail": "Not found."
}
```

### 500 Internal Server Error
```json
{
  "detail": "An error occurred processing your request."
}
```

---

## Permissions

| Endpoint | Required Permission |
|----------|---------------------|
| List Profiles | `view_brandprofile` or org/project membership |
| Retrieve Profile | `view_brandprofile` or org/project membership |
| Create Profile | `add_brandprofile` + org/project admin |
| Update Profile | `change_brandprofile` + org/project admin |
| Delete Profile | `delete_brandprofile` + org/project admin |
| Token CRUD | Inherits from BrandProfile permissions |
| Asset CRUD | Inherits from BrandProfile permissions |
| Token Resolution | Authenticated user with project access |

**Implementation**: Custom DRF permission class `BrandProfilePermission` checks org/project membership via B06/B07.

---

## Pagination

- Default page size: 20
- Max page size: 100
- Uses DRF `PageNumberPagination`

---

## Filtering & Search

- DRF `django-filter` for query params
- Search fields: `name` (BrandProfile)
- Ordering: `-updated_at` (default), `name`, `created_at`

---

## Rate Limiting

- Applied at reverse proxy level (Nginx)
- Per-user: 100 requests/minute (read), 20 requests/minute (write)

---

## Versioning

- URL versioning: `/api/v1/branding/` (future-proof)
- Current: `/api/branding/` (implicit v1)

---

## Deprecation Policy

- Breaking changes: 6 months notice
- Deprecation header: `Deprecation: true` + `Sunset: 2026-12-31`

---

## Testing API

Use `pytest` with `django-test-plus` and `rest_framework.test.APIClient`:

```python
from django.test import TestCase
from rest_framework.test import APIClient

class BrandProfileAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_create_brand_profile(self):
        response = self.client.post('/api/branding/profiles/', {
            'organisation': str(self.org.id),
            'name': 'Test Brand'
        })
        self.assertEqual(response.status_code, 201)
```

---

## OpenAPI Schema

Available at `/api/schema/` (via drf-spectacular)

```bash
# Generate schema
python manage.py spectacular --file schema.yml
```
