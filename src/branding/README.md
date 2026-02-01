# Branding App (B33)

Centralized brand identity management for organisations and projects with merge inheritance.

## Features

- **BrandProfile**: Organisation and project-level brand configurations
- **DesignToken**: Key-value design tokens (colors, fonts, spacing)
- **BrandAsset**: Logos, watermarks, and visual assets
- **Merge Inheritance**: Projects inherit org tokens, can override specific values
- **REST API**: Full CRUD + token resolution endpoint

## Models

### BrandProfile

Container for brand identity linked to org or project.

**Fields**: organisation (FK), project (FK), name, is_active, audit fields

**Constraints**: Exactly one of organisation or project must be set (XOR)

### DesignToken

Individual style value.

**Fields**: profile (FK), key, value, type (color/font/spacing/other), description

**Constraints**: Unique key per profile

### BrandAsset

Visual asset linked to B22 File storage.

**Fields**: profile (FK), file (FK), asset_type, alt_text, is_active

**Constraints**: One asset per type per profile

## API Endpoints

Base URL: `/api/branding/`

### Profiles

- `GET /api/branding/profiles/` - List all profiles
- `POST /api/branding/profiles/` - Create profile
- `GET /api/branding/profiles/{id}/` - Get profile details
- `PATCH /api/branding/profiles/{id}/` - Update profile
- `DELETE /api/branding/profiles/{id}/` - Delete profile

### Tokens (Nested)

- `GET /api/branding/profiles/{id}/tokens/` - List tokens
- `POST /api/branding/profiles/{id}/tokens/` - Create token
- `PATCH /api/branding/tokens/{id}/` - Update token
- `DELETE /api/branding/tokens/{id}/` - Delete token

### Assets (Nested)

- `GET /api/branding/profiles/{id}/assets/` - List assets
- `POST /api/branding/profiles/{id}/assets/` - Create asset
- `PATCH /api/branding/assets/{id}/` - Update asset
- `DELETE /api/branding/assets/{id}/` - Delete asset

### Token Resolution (Primary Consumer Interface)

- `GET /api/branding/tokens/resolve/?project={uuid}` - Get merged tokens
- `GET /api/branding/tokens/resolve/?project={uuid}&include_assets=true` - Include assets

**Response Example**:
```json
{
  "project": "uuid",
  "organisation": "uuid",
  "tokens": {
    "primary_color": "#D2122E",
    "secondary_color": "#FBBF24",
    "font_heading": "Inter",
    "font_body": "Roboto"
  },
  "source": "merged",
  "project_brand_id": "uuid",
  "org_brand_id": "uuid"
}
```

## Usage Examples

### Create Organisation Brand

```python
from src.branding.models import BrandProfile, DesignToken
from src.organisations.models import Organisation

org = Organisation.objects.get(name="My Org")
brand = BrandProfile.objects.create(
    organisation=org,
    name="My Org Brand"
)

# Add tokens
DesignToken.objects.create(
    profile=brand,
    key="primary_color",
    value="#FF6600",
    type="color"
)
```

### Create Project Override

```python
from src.projects.models import Project

project = Project.objects.get(name="My Project")
project_brand = BrandProfile.objects.create(
    project=project,
    name="My Project Brand"
)

# Override specific token
DesignToken.objects.create(
    profile=project_brand,
    key="primary_color",
    value="#D2122E",  # Overrides org color
    type="color"
)
```

### Get Merged Tokens

```python
# Via API
GET /api/branding/tokens/resolve/?project={project_id}

# Via model method
merged = project_brand.get_merged_tokens()
# Returns: {'primary_color': '#D2122E', ...other org tokens...}
```

## Integration

**Dependencies**:
- B06 (organisations) - Organisation model
- B07 (projects) - Project model
- B22 (files) - File storage for assets

**Consumed By**:
- B34 (content_generation) - Uses token API for branded content

## Permissions

- **Organisation Admins**: Can edit org brand + all child project brands (cascade)
- **Project Admins**: Can edit only their own project brand
- **Members**: Read-only access to their org/project brands

## Django Admin

Access at: `/admin/branding/`

- Inline editing of tokens and assets within brand profile
- Search and filter by org/project
- Audit trail visible in collapsed sections

## Testing

```bash
pytest tests/branding/ --cov=src.branding
```

## Performance Notes

- Use `select_related('organisation', 'project')` when querying BrandProfile
- Use `prefetch_related('design_tokens', 'brand_assets')` for nested data
- Token resolution is optimized with single query + prefetch

## Extension Points

Products can extend:
- Add custom token types to `DesignToken.TYPE_CHOICES`
- Add custom asset types to `BrandAsset.ASSET_TYPE_CHOICES`
- Add type-specific validation in downstream serializers
- Build UI components for brand preview/editor

## Support

- Spec: `kitty-specs/042-brand-identity-manager/spec.md`
- API Contracts: `kitty-specs/042-brand-identity-manager/contracts/api.md`
- Data Model: `kitty-specs/042-brand-identity-manager/data-model.md`
