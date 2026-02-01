---
work_package_id: WP06
title: Documentation & Integration
priority: P3
lane: doing
agent: claude
shell_pid: "1476"
assignee: claude
subtasks:
  - T039
  - T040
  - T041
  - T042
estimated_hours: 2
dependencies:
  - WP01
  - WP02
  - WP03
  - WP04
  - WP05
history:
  - date: 2026-02-01
    action: created
    by: spec-kitty.tasks
  - date: 2026-02-02T11:00:00Z
    action: started_implementation
    by: claude
    shell_pid: 1476
    lane: doing
    note: "Starting documentation and integration tasks after successful WP05 review"
---

# Work Package 06: Documentation & Integration

## Objective

Complete app README, integrate with Django settings, perform end-to-end integration testing, and update main documentation.

## Implementation Guide

### T039: Write App README

**`src/branding/README.md`**:

```markdown
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
```

---

### T040: Update Django Settings

**`src/config/settings/base.py`** (add):

```python
INSTALLED_APPS = [
    # ... existing apps
    'src.organisations',
    'src.projects',
    'src.files',
    'src.branding',  # <-- ADD THIS
]
```

**Verify**:

```bash
python manage.py check
# Should show no errors
```

---

### T041: Integration Testing

Manual end-to-end test:

```python
# 1. Create test data
from src.accounts.models import User
from src.organisations.models import Organisation
from src.projects.models import Project
from src.branding.models import BrandProfile, DesignToken
from src.files.models import File

# Create users
org_admin = User.objects.create_user('org_admin', 'admin@org.com', 'pass')
project_admin = User.objects.create_user('proj_admin', 'admin@proj.com', 'pass')

# Create org and project
org = Organisation.objects.create(name="Test Org")
project = Project.objects.create(name="Test Project", organisation=org)

# Add memberships
org_admin.memberships.create(organisation=org, role='admin')
project_admin.memberships.create(project=project, role='admin')

# Create org brand
org_brand = BrandProfile.objects.create(
    organisation=org,
    name="Org Brand",
    created_by=org_admin
)
DesignToken.objects.create(
    profile=org_brand,
    key="primary_color",
    value="#FF6600",
    type="color"
)
DesignToken.objects.create(
    profile=org_brand,
    key="font_heading",
    value="Roboto",
    type="font"
)

# Create project brand with override
project_brand = BrandProfile.objects.create(
    project=project,
    name="Project Brand",
    created_by=project_admin
)
DesignToken.objects.create(
    profile=project_brand,
    key="primary_color",
    value="#D2122E",  # Override
    type="color"
)

# 2. Test token resolution
from rest_framework.test import APIClient
client = APIClient()
client.force_authenticate(project_admin)

response = client.get(f'/api/branding/tokens/resolve/?project={project.id}')
print(response.json())
# Expected:
# {
#   "tokens": {
#     "primary_color": "#D2122E",  # Project override
#     "font_heading": "Roboto"     # Org fallback
#   },
#   "source": "merged",
#   ...
# }

# 3. Test permissions (org admin can edit project brand)
client.force_authenticate(org_admin)
response = client.patch(
    f'/api/branding/profiles/{project_brand.id}/',
    {'name': 'Updated by Org Admin'}
)
assert response.status_code == 200

# 4. Test asset upload (requires B22 File)
logo_file = File.objects.create(
    name="logo.png",
    size=12345,
    content_type="image/png",
    url="https://storage.example.com/logo.png"
)
response = client.post(
    f'/api/branding/profiles/{org_brand.id}/assets/',
    {
        'file': str(logo_file.id),
        'asset_type': 'logo_light',
        'alt_text': 'Organisation Logo'
    }
)
assert response.status_code == 201

# 5. Test token resolution with assets
response = client.get(
    f'/api/branding/tokens/resolve/?project={project.id}&include_assets=true'
)
data = response.json()
assert 'assets' in data
assert 'logo_light' in data['assets']
```

**Success Criteria**:
- All operations succeed without errors
- Token merge logic works correctly
- Permissions enforce cascade control
- Assets link correctly to B22 Files

---

### T042: Update Main README

**`README.md`** (add to features list):

```markdown
## Features

### Core Platform

- **B06**: Organisations - Multi-tenant architecture
- **B07**: Projects - Project/team management
- **B22**: Files - File storage with S3/local support
- **B33**: Brand Identity Manager - Centralized brand tokens and assets ✨ NEW
  - Merge inheritance: projects inherit org brand, override specific tokens
  - Design tokens: colors, fonts, spacing as data
  - Brand assets: logos, watermarks via B22 integration
  - REST API for consuming branded content

### Content & Generation

- **B34**: AI Content Generation - Uses B33 brand tokens for consistent output
```

---

## Definition of Done

- [ ] `src/branding/README.md` complete with examples
- [ ] `branding` added to INSTALLED_APPS
- [ ] `python manage.py check` passes
- [ ] Manual integration test completed successfully
- [ ] Main README updated with B33 feature entry
- [ ] All documentation cross-references correct

---

## Validation Checklist

```bash
# 1. Settings check
python manage.py check

# 2. Migration check
python manage.py showmigrations branding

# 3. Admin check
python manage.py runserver
# Visit: http://localhost:8000/admin/branding/

# 4. API check
curl http://localhost:8000/api/branding/profiles/

# 5. Integration test
python manage.py shell < integration_test.py
```

---

## Risks

- Integration issues if B06/B07/B22 not fully functional
- Documentation drift if API changes later

## Reviewer Focus

- README accuracy and clarity
- Integration test coverage
- Cross-references to other documentation
