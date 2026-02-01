---
work_package_id: WP01
title: Django App Setup & Models
priority: P1
lane: "for_review"
subtasks:
  - T001
  - T002
  - T003
  - T004
  - T005
  - T006
  - T007
  - T008
estimated_hours: 4
dependencies: []
agent: "claude"
shell_pid: "18452"
history:
  - date: 2026-02-01
    action: created
    by: spec-kitty.tasks
---

# Work Package 01: Django App Setup & Models

## Objective

Create the `branding` Django app with complete data models for BrandProfile, DesignToken, and BrandAsset. This forms the foundation for the entire Brand Identity Manager feature.

## Context

**Feature**: B33 Brand Identity Manager
**Location**: `src/branding/`
**Dependencies**: B06 (organisations), B07 (projects), B22 (files)

The branding app implements a merge inheritance pattern where projects inherit organisation-level brand tokens and can override specific values. This requires careful model design with proper ForeignKey relationships and constraints.

## Detailed Guidance

### T001: Create Django App Structure

**Task**: Create Django app `src/branding/` with standard structure

**Steps**:
1. Navigate to `src/` directory
2. Run: `django-admin startapp branding`
3. Verify structure created:
   ```
   src/branding/
   ├── __init__.py
   ├── admin.py
   ├── apps.py
   ├── models.py
   ├── tests.py (delete this, we use tests/ directory)
   └── views.py
   ```
4. Delete `tests.py` (we use separate `tests/branding/` directory)
5. Create additional files:
   - `serializers.py`
   - `urls.py`
   - `permissions.py`
   - `services.py`
   - `README.md`

**Validation**: Directory exists with all required files

---

### T002: Implement BrandProfile Model

**Task**: Implement BrandProfile model with UUID PK, organisation/project FKs, timestamps

**Implementation** (`src/branding/models.py`):

```python
import uuid
from django.db import models
from django.conf import settings

# Well-known token keys that should always be present in API responses
WELL_KNOWN_TOKEN_KEYS = [
    'primary_color',
    'secondary_color',
    'accent_color',
    'font_heading',
    'font_body',
    'border_radius',
]


class BrandProfile(models.Model):
    """Brand identity configuration for organisation or project."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organisation = models.ForeignKey(
        'organisations.Organisation',
        on_delete=models.CASCADE,
        related_name='brand_profiles',
        null=True,
        blank=True,
        help_text="Organisation-level brand (null for project-specific brands)"
    )
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='brand_profiles',
        null=True,
        blank=True,
        help_text="Project-level brand (null for organisation-level brands)"
    )
    name = models.CharField(
        max_length=200,
        help_text="Display name for this brand profile"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Inactive profiles are preserved but not returned in API responses"
    )

    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_brand_profiles'
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_brand_profiles'
    )

    class Meta:
        ordering = ['-updated_at']
        verbose_name = 'Brand Profile'
        verbose_name_plural = 'Brand Profiles'
        # Constraint: exactly one of organisation or project must be set
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(organisation__isnull=False, project__isnull=True) |
                    models.Q(organisation__isnull=True, project__isnull=False)
                ),
                name='brand_profile_org_xor_project'
            ),
            # Unique brand per org/project scope
            models.UniqueConstraint(
                fields=['organisation'],
                condition=models.Q(organisation__isnull=False),
                name='unique_brand_per_organisation'
            ),
            models.UniqueConstraint(
                fields=['project'],
                condition=models.Q(project__isnull=False),
                name='unique_brand_per_project'
            ),
        ]
        indexes = [
            models.Index(fields=['organisation']),
            models.Index(fields=['project']),
        ]

    def __str__(self):
        return self.name
```

**Key Points**:
- UUID primary key for distributed systems
- Either org OR project FK (XOR constraint)
- Audit trail with created_by/updated_by
- Soft delete via is_active flag
- Unique constraints per scope

**Validation**: Model can be imported, constraints make sense

---

### T003: Implement DesignToken Model

**Task**: Implement DesignToken model with key-value storage, type choices

**Implementation** (add to `src/branding/models.py`):

```python
class DesignToken(models.Model):
    """Individual design token (color, font, spacing, etc)."""

    TYPE_CHOICES = [
        ('color', 'Color'),
        ('font', 'Font'),
        ('spacing', 'Spacing'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(
        BrandProfile,
        on_delete=models.CASCADE,
        related_name='design_tokens'
    )
    key = models.CharField(
        max_length=100,
        help_text="Token key (e.g., primary_color, font_heading)"
    )
    value = models.CharField(
        max_length=1000,
        help_text="Token value (e.g., #FF0000, Roboto, 16px)"
    )
    type = models.CharField(
        max_length=50,
        choices=TYPE_CHOICES,
        default='other'
    )
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Optional documentation for this token"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['type', 'key']
        verbose_name = 'Design Token'
        verbose_name_plural = 'Design Tokens'
        constraints = [
            models.UniqueConstraint(
                fields=['profile', 'key'],
                name='unique_token_key_per_profile'
            )
        ]
        indexes = [
            models.Index(fields=['profile', 'key']),
            models.Index(fields=['type']),
        ]

    def __str__(self):
        return f"{self.key}: {self.value}"
```

**Key Points**:
- Key-value pair structure
- Type classification for frontend filtering
- Unique key per profile (no duplicates)
- Max 1000 chars for value (supports long CSS values)

**Validation**: Can create tokens, unique constraint works

---

### T004: Implement BrandAsset Model

**Task**: Implement BrandAsset model with asset_type choices, File FK (B22)

**Implementation** (add to `src/branding/models.py`):

```python
class BrandAsset(models.Model):
    """Brand asset (logo, watermark, etc) linked to file storage."""

    ASSET_TYPE_CHOICES = [
        ('logo_light', 'Logo (Light Mode)'),
        ('logo_dark', 'Logo (Dark Mode)'),
        ('watermark', 'Watermark'),
        ('favicon', 'Favicon'),
        ('font_file', 'Font File'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(
        BrandProfile,
        on_delete=models.CASCADE,
        related_name='brand_assets'
    )
    file = models.ForeignKey(
        'files.File',
        on_delete=models.PROTECT,
        related_name='brand_assets',
        help_text="B22 File reference (PROTECT to prevent accidental deletion)"
    )
    asset_type = models.CharField(
        max_length=50,
        choices=ASSET_TYPE_CHOICES
    )
    alt_text = models.CharField(
        max_length=255,
        blank=True,
        help_text="Accessibility text for images"
    )
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['asset_type']
        verbose_name = 'Brand Asset'
        verbose_name_plural = 'Brand Assets'
        constraints = [
            models.UniqueConstraint(
                fields=['profile', 'asset_type'],
                name='unique_asset_type_per_profile'
            )
        ]
        indexes = [
            models.Index(fields=['profile', 'asset_type']),
        ]

    def get_url(self):
        """Return file URL via B22 File model."""
        return self.file.url if self.file else None

    def __str__(self):
        return f"{self.profile.name} - {self.get_asset_type_display()}"
```

**Key Points**:
- PROTECT on File FK (prevent accidental deletion)
- One asset per type per profile
- Alt text for accessibility
- `get_url()` helper method

**Validation**: Can link to File, unique constraint per type works

---

### T005: Add Model Constraints

**Task**: Add model constraints (unique, check, FK cascades)

**Already implemented in T002-T004**, verify:

1. **BrandProfile**:
   - CheckConstraint: organisation XOR project
   - UniqueConstraint: one brand per org/project
   - Indexes on org and project FKs

2. **DesignToken**:
   - UniqueConstraint: unique key per profile
   - Index on (profile, key)

3. **BrandAsset**:
   - UniqueConstraint: unique asset_type per profile
   - Index on (profile, asset_type)

4. **FK Cascades**:
   - BrandProfile → CASCADE from Organisation/Project
   - DesignToken → CASCADE from BrandProfile
   - BrandAsset → CASCADE from BrandProfile, PROTECT from File

**Validation**: Run `python manage.py check` - no constraint errors

---

### T006: Add Model Methods

**Task**: Add model methods: `get_tokens()`, `get_effective_brand()`, `__str__()`

**Implementation** (add to BrandProfile class):

```python
def get_tokens(self):
    """Return all tokens as dict {key: value}."""
    return {
        token.key: token.value
        for token in self.design_tokens.all()
    }

def get_merged_tokens(self):
    """Return merged tokens (org + project override)."""
    tokens = {}

    # Start with org tokens if this is a project brand
    if self.project and self.project.organisation:
        org_brand = BrandProfile.objects.filter(
            organisation=self.project.organisation,
            is_active=True
        ).first()
        if org_brand:
            tokens.update(org_brand.get_tokens())

    # Override with project tokens
    tokens.update(self.get_tokens())

    return tokens

@staticmethod
def get_effective_brand(organisation=None, project=None):
    """Get the effective brand for a given org/project context.

    Returns project brand if exists, else org brand, else None.
    """
    if project:
        project_brand = BrandProfile.objects.filter(
            project=project,
            is_active=True
        ).first()
        if project_brand:
            return project_brand

        organisation = project.organisation

    if organisation:
        return BrandProfile.objects.filter(
            organisation=organisation,
            is_active=True
        ).first()

    return None
```

**Key Points**:
- `get_tokens()`: Simple dict conversion
- `get_merged_tokens()`: Implements inheritance merge logic
- `get_effective_brand()`: Static method for finding applicable brand

**Validation**: Methods return expected values in Django shell

---

### T007: Create Initial Migration

**Task**: Create initial migration file

**Steps**:
1. Ensure models are complete and saved
2. Run: `python manage.py makemigrations branding`
3. Review migration file in `src/branding/migrations/0001_initial.py`
4. Verify:
   - All 3 models created
   - All constraints present
   - All indexes present
   - FK relationships correct

**Expected Output**:
```
Migrations for 'branding':
  src/branding/migrations/0001_initial.py
    - Create model BrandProfile
    - Create model DesignToken
    - Create model BrandAsset
    - Create constraint brand_profile_org_xor_project on model brandprofile
    - Create constraint unique_brand_per_organisation on model brandprofile
    - Create constraint unique_brand_per_project on model brandprofile
    - Create constraint unique_token_key_per_profile on model designtoken
    - Create constraint unique_asset_type_per_profile on model brandasset
```

**Validation**: Migration file created without errors

---

### T008: Run Migrations and Verify Tables

**Task**: Run migrations and verify tables created

**Steps**:
1. Run: `python manage.py migrate branding`
2. Connect to database and verify tables:
   ```sql
   \dt branding_*
   ```
3. Verify columns, constraints, indexes in database

**Expected Tables**:
- `branding_brandprofile`
- `branding_designtoken`
- `branding_brandasset`

**Validation**:
- All tables exist
- Can create records via Django shell:
  ```python
  from src.branding.models import BrandProfile
  from src.organisations.models import Organisation

  org = Organisation.objects.first()
  brand = BrandProfile.objects.create(
      organisation=org,
      name="Test Brand"
  )
  print(brand.id)  # Should print UUID
  ```

---

## Definition of Done

- [ ] Django app `src/branding/` created with all files
- [ ] BrandProfile model implemented with all fields and constraints
- [ ] DesignToken model implemented with all fields and constraints
- [ ] BrandAsset model implemented with all fields and constraints
- [ ] Model methods implemented: `get_tokens()`, `get_merged_tokens()`, `get_effective_brand()`
- [ ] Initial migration created
- [ ] Migrations applied successfully
- [ ] Tables verified in database
- [ ] Can create test records via Django shell without errors
- [ ] `python manage.py check` passes with no warnings
- [ ] Code formatted with black
- [ ] Code passes ruff linting

---

## Testing Strategy

Manual verification via Django shell:

```python
# Test BrandProfile creation
from src.branding.models import BrandProfile, DesignToken, BrandAsset
from src.organisations.models import Organisation
from src.projects.models import Project

# Test org brand
org = Organisation.objects.first()
org_brand = BrandProfile.objects.create(organisation=org, name="Org Brand")
DesignToken.objects.create(profile=org_brand, key="primary_color", value="#FF0000", type="color")

# Test project brand with override
project = Project.objects.first()
proj_brand = BrandProfile.objects.create(project=project, name="Project Brand")
DesignToken.objects.create(profile=proj_brand, key="primary_color", value="#0000FF", type="color")

# Test merge
merged = proj_brand.get_merged_tokens()
print(merged)  # Should show blue color overriding org red

# Test constraint: cannot set both org and project
try:
    BrandProfile.objects.create(organisation=org, project=project, name="Invalid")
except Exception as e:
    print("Constraint working:", e)
```

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Migration conflicts with other features | High | Coordinate with team on migration timing |
| FK constraint errors if B06/B07/B22 not ready | High | Verify dependencies exist before starting |
| Constraint logic errors | Medium | Thorough manual testing before next WP |
| Performance issues with get_merged_tokens() | Medium | Optimize in WP03 with select_related |

---

## Reviewer Guidance

**Focus Areas**:
1. Model field types and constraints (especially XOR constraint)
2. FK cascade behavior (CASCADE vs PROTECT)
3. Migration file correctness
4. Method logic in `get_merged_tokens()`

**Acceptance Criteria**:
- Models match data-model.md specification exactly
- Constraints prevent invalid data (test with invalid inputs)
- Migrations apply cleanly
- Can perform basic CRUD via Django shell

## Activity Log

- 2026-02-01T15:28:28Z – claude – shell_pid=18452 – lane=doing – Started implementation of Django app and models
- 2026-02-01T15:31:47Z – claude – shell_pid=18452 – lane=for_review – Completed implementation: All 8 subtasks done, models ready for review
