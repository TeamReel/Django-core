# Phase 1: Data Model — B33 Brand Identity Manager

**Feature**: B33 Brand Identity Manager
**Date**: 2026-02-01
**Status**: ✅ Complete

## Entity-Relationship Diagram

```
Organisation (B06)
    ↓ 1:N
BrandProfile
    ↓ 1:N
DesignToken

Project (B07)
    ↓ 0:1
BrandProfile (optional)
    ↓ 1:N
DesignToken

BrandProfile
    ↓ 1:N
BrandAsset
    ↓ N:1
File (B22)
```

## Model Definitions

### BrandProfile

**Purpose**: Represents a brand identity configuration for an organisation or project.

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, auto | Primary key |
| `organisation` | ForeignKey | nullable, Organisation | Org-level brand |
| `project` | ForeignKey | nullable, Project | Project-level brand (optional) |
| `name` | CharField(200) | not null | Display name |
| `is_active` | BooleanField | default=True | Active status |
| `created_at` | DateTimeField | auto_now_add | Creation timestamp |
| `updated_at` | DateTimeField | auto_now | Last update timestamp |
| `created_by` | ForeignKey | User, nullable | Creator |
| `updated_by` | ForeignKey | User, nullable | Last editor |

**Constraints**:
- At least one of `organisation` or `project` must be set
- If `project` is set, `organisation` must be null (project-level brand)
- Unique constraint: (`organisation`, `project`) — only one active brand per scope

**Methods**:
- `get_tokens() -> dict`: Returns merged token dict (org + project override)
- `get_effective_brand() -> BrandProfile`: Returns project brand if exists, else org brand
- `__str__()`: Returns name

**Meta**:
- `ordering = ['-updated_at']`
- `verbose_name = 'Brand Profile'`
- `verbose_name_plural = 'Brand Profiles'`

### DesignToken

**Purpose**: Stores individual design token key-value pairs.

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, auto | Primary key |
| `profile` | ForeignKey | not null, BrandProfile, CASCADE | Parent brand |
| `key` | CharField(100) | not null | Token key (e.g., `primary_color`) |
| `value` | CharField(1000) | not null | Token value (e.g., `#FF0000`) |
| `type` | CharField(50) | not null, choices | Token type (color, font, spacing, other) |
| `description` | TextField | nullable | Optional documentation |
| `created_at` | DateTimeField | auto_now_add | Creation timestamp |
| `updated_at` | DateTimeField | auto_now | Last update timestamp |

**Choices**:
```python
TOKEN_TYPES = [
    ('color', 'Color'),
    ('font', 'Font'),
    ('spacing', 'Spacing'),
    ('other', 'Other'),
]
```

**Constraints**:
- Unique constraint: (`profile`, `key`) — no duplicate keys per brand
- Max length validation: `value` max 1000 chars

**Methods**:
- `__str__()`: Returns `{key}: {value}`

**Meta**:
- `ordering = ['type', 'key']`
- `verbose_name = 'Design Token'`
- `verbose_name_plural = 'Design Tokens'`

### BrandAsset

**Purpose**: Links brand assets (logos, watermarks) to brand profiles.

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, auto | Primary key |
| `profile` | ForeignKey | not null, BrandProfile, CASCADE | Parent brand |
| `file` | ForeignKey | not null, File (B22), PROTECT | Asset file |
| `asset_type` | CharField(50) | not null, choices | Asset category |
| `is_active` | BooleanField | default=True | Active status |
| `created_at` | DateTimeField | auto_now_add | Creation timestamp |
| `updated_at` | DateTimeField | auto_now | Last update timestamp |

**Choices**:
```python
ASSET_TYPES = [
    ('logo_light', 'Logo (Light Mode)'),
    ('logo_dark', 'Logo (Dark Mode)'),
    ('watermark', 'Watermark'),
    ('favicon', 'Favicon'),
    ('other', 'Other'),
]
```

**Constraints**:
- Unique constraint: (`profile`, `asset_type`) — one asset per type per brand
- File type validation: images only (handled by B22)

**Methods**:
- `get_url() -> str`: Returns file URL via `self.file.url`
- `__str__()`: Returns `{profile.name} - {asset_type}`

**Meta**:
- `ordering = ['asset_type']`
- `verbose_name = 'Brand Asset'`
- `verbose_name_plural = 'Brand Assets'`

## Database Indexes

| Model | Field(s) | Type | Justification |
|-------|----------|------|---------------|
| BrandProfile | `organisation` | Index | Lookup org brands |
| BrandProfile | `project` | Index | Lookup project brands |
| BrandProfile | (`organisation`, `project`) | Unique | Prevent duplicates |
| DesignToken | `profile` | Index (FK default) | List tokens per brand |
| DesignToken | (`profile`, `key`) | Unique | Prevent duplicate keys |
| DesignToken | `type` | Index | Filter by token type |
| BrandAsset | `profile` | Index (FK default) | List assets per brand |
| BrandAsset | (`profile`, `asset_type`) | Unique | One asset per type |

## Data Migration Strategy

### Initial Migration (0001_initial.py)
- Create BrandProfile table
- Create DesignToken table
- Create BrandAsset table
- Add ForeignKey constraints to B06, B07, B22

### Future Migrations
- Token type expansion (add new choices)
- Asset type expansion (add new choices)
- Performance indexes (if needed based on usage)

### Rollback Plan
- Drop tables in reverse order (BrandAsset → DesignToken → BrandProfile)
- No cascade delete to B06/B07/B22 (PROTECT on File FK)

## Sample Data

### Organisation Brand (Demo Org)
```python
BrandProfile(
    organisation=demo_org,
    project=None,
    name="Demo Organisation Brand",
    is_active=True
)

DesignToken(
    profile=org_brand,
    key="primary_color",
    value="#1E3A8A",
    type="color"
)

BrandAsset(
    profile=org_brand,
    file=logo_file,
    asset_type="logo_light"
)
```

### Project Brand (Overrides Org)
```python
BrandProfile(
    organisation=None,
    project=team_project,
    name="Team X Brand",
    is_active=True
)

DesignToken(
    profile=team_brand,
    key="primary_color",
    value="#DC2626",  # Overrides org color
    type="color"
)
```

## Query Optimization

### Token Retrieval (Most Common)
```python
# Efficient: Single query with select_related
brand = BrandProfile.objects.select_related('organisation', 'project').get(id=brand_id)
tokens = brand.designtoken_set.all()  # Prefetch if needed
```

### Merge Inheritance Resolution
```python
# Get project brand, fallback to org brand
project_brand = BrandProfile.objects.filter(project=project).first()
org_brand = BrandProfile.objects.filter(organisation=project.organisation).first()

# Merge tokens (project overrides org)
org_tokens = {t.key: t.value for t in org_brand.designtoken_set.all()}
project_tokens = {t.key: t.value for t in project_brand.designtoken_set.all()}
merged = {**org_tokens, **project_tokens}
```

### Asset Lookup
```python
# Efficient: Single query with select_related
assets = BrandAsset.objects.select_related('file', 'profile').filter(
    profile=brand,
    is_active=True
)
```

## Validation Rules

### BrandProfile
- At least one of `organisation` or `project` must be set
- If `project` is set, `organisation` must be None
- `name` max length 200 chars

### DesignToken
- `key` max length 100 chars, alphanumeric + underscore
- `value` max length 1000 chars
- `type` must be in TOKEN_TYPES choices

### BrandAsset
- `asset_type` must be in ASSET_TYPES choices
- `file` must reference valid File object (enforced by FK)

## API Exposure

All models exposed via Django REST Framework ViewSets (see [contracts/api.md](contracts/api.md)).

## Next Phase

Phase 2: API Contracts & Quickstart Guide
