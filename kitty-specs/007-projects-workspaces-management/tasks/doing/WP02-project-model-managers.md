---
lane: "doing"
agent: "copilot"
shell_pid: "11524"
---
# WP02: Project Model & Managers

**Work Package ID**: WP02
**Status**: Planned
**Priority**: Critical (required for all user stories)
**Assigned**: Unassigned
**Estimated Effort**: 6-8 hours

## History

| Date | Author | Change | Lane |
|------|--------|--------|------|
| 2025-11-25 | spec-kitty | Initial creation | planned |

---

## Objective

Implement Project model with soft deletion, custom managers, slug generation algorithm, and database migrations.

---

## Context

**Dependencies**: WP01 (app structure must exist)

**Data Model Reference**: See `data-model.md` for complete field specifications, constraints, and relationships.

**Key Decisions** (from `research.md`):
- Slug generation: Sequential suffix on collisions (project-alpha, project-alpha-2)
- Soft deletion: is_active flag + archived_at timestamp
- Case-insensitive name uniqueness per organisation
- No project hierarchy (flat structure)

---

## Subtasks

### T006: Define Project model with all fields

Create the complete Project model in `projects/models.py`:

```python
from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone
from django.utils.text import slugify

class Project(models.Model):
    """Project/workspace container within an organisation."""

    organisation = models.ForeignKey(
        'organisations.Organisation',
        on_delete=models.CASCADE,
        related_name='projects',
        help_text="Organisation that owns this project"
    )

    creator = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='created_projects',
        help_text="User who created this project"
    )

    name = models.CharField(
        max_length=200,
        help_text="Human-readable project name"
    )

    slug = models.SlugField(
        max_length=200,
        help_text="URL-safe identifier (auto-generated from name if not provided)"
    )

    description = models.TextField(
        max_length=2000,
        blank=True,
        help_text="Optional project description (up to 2000 characters)"
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="False when project is archived (soft deletion)"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    archived_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when project was archived (NULL if active)"
    )

    class Meta:
        db_table = 'projects_project'
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"{self.organisation.name}/{self.name}"
```

**Acceptance**: Model compiles, `makemigrations` detects new model.

---

### T007: Add unique constraints (slug, case-insensitive name)

Add constraints to Meta class:

```python
class Meta:
    db_table = 'projects_project'
    ordering = ['-created_at']
    constraints = [
        models.UniqueConstraint(
            fields=['organisation', 'slug'],
            name='unique_project_slug_per_org'
        ),
        models.UniqueConstraint(
            Lower('name'),
            'organisation',
            name='unique_project_name_per_org_case_insensitive'
        ),
    ]
```

**Acceptance**: Constraints visible in migration SQL.

---

### T008: Create database indexes

Add indexes to Meta class:

```python
class Meta:
    # ... existing ...
    indexes = [
        models.Index(fields=['organisation', 'is_active']),
        models.Index(fields=['slug']),
    ]
```

**Acceptance**: Indexes created in migration.

---

### T009: Implement custom managers

Create `projects/managers.py`:

```python
from django.db import models

class ActiveProjectManager(models.Manager):
    """Manager that returns only active (non-archived) projects."""

    def get_queryset(self):
        return super().get_queryset().filter(is_active=True)


class AllProjectManager(models.Manager):
    """Manager that returns all projects including archived ones."""

    def get_queryset(self):
        return super().get_queryset()
```

Add to Project model:
```python
from .managers import ActiveProjectManager, AllProjectManager

class Project(models.Model):
    # ... fields ...

    objects = ActiveProjectManager()
    all_objects = AllProjectManager()
```

**Acceptance**: `Project.objects.all()` returns only active, `Project.all_objects.all()` returns all.

---

### T010: Implement slug generation algorithm

Add method to Project model:

```python
def _generate_unique_slug(self) -> str:
    """Generate unique slug with sequential suffix for collisions."""
    base_slug = slugify(self.name)
    slug = base_slug
    counter = 2
    max_attempts = 100

    while counter <= max_attempts:
        exists = Project.all_objects.filter(
            organisation_id=self.organisation_id,
            slug=slug
        ).exclude(pk=self.pk).exists()

        if not exists:
            return slug

        slug = f"{base_slug}-{counter}"
        counter += 1

    raise ValueError(
        f"Could not generate unique slug after {max_attempts} attempts"
    )
```

**Test Cases**:
- "Project Alpha" → "project-alpha"
- Second "Project Alpha" → "project-alpha-2"
- Third → "project-alpha-3"

**Acceptance**: Slug generation handles collisions correctly.

---

### T011: Override save() method

```python
def save(self, *args, **kwargs):
    """Auto-generate slug if not provided."""
    if not self.slug:
        self.slug = self._generate_unique_slug()

    self.full_clean()
    super().save(*args, **kwargs)
```

**Acceptance**: Projects save with auto-generated slugs.

---

### T012: Implement clean() validation

```python
def clean(self):
    """Validate model constraints."""
    super().clean()

    # Archived projects must have archived_at timestamp
    if not self.is_active and self.archived_at is None:
        self.archived_at = timezone.now()

    # Active projects must NOT have archived_at
    if self.is_active and self.archived_at is not None:
        self.archived_at = None
```

**Acceptance**: Validation enforces is_active/archived_at consistency.

---

### T013: Add archive() and restore() methods

```python
def archive(self) -> None:
    """Archive this project (soft deletion)."""
    self.is_active = False
    self.archived_at = timezone.now()
    self.save()

def restore(self) -> None:
    """Restore this archived project."""
    self.is_active = True
    self.archived_at = None
    self.save()
```

**Acceptance**: Methods work correctly, trigger save().

---

### T014: Generate and apply migration

```bash
cd src
python manage.py makemigrations projects
python manage.py migrate projects
```

Review migration SQL:
```bash
python manage.py sqlmigrate projects 0001
```

**Acceptance**: Migration applies cleanly, tables created in database.

---

## Success Criteria

- [ ] Project model defined with all fields
- [ ] Unique constraints on (organisation, slug) and case-insensitive (name, organisation)
- [ ] Indexes on organisation_id, slug, is_active, (organisation_id, is_active)
- [ ] Custom managers filter active/all projects correctly
- [ ] Slug generation handles collisions with sequential suffix
- [ ] save() auto-generates slug if empty
- [ ] clean() validates is_active/archived_at consistency
- [ ] archive() and restore() methods work correctly
- [ ] Migration generated and applied successfully

---

## Definition of Done

- Model can be instantiated and saved in Django shell
- Slug collisions handled correctly (test with duplicate names)
- Soft delete works (is_active=False, archived_at set)
- Managers return correct querysets
- Database constraints enforced (try creating duplicate slugs)

---

## Reviewer Guidance

**Test in Django Shell**:
```python
from organisations.models import Organisation
from projects.models import Project
from django.contrib.auth import get_user_model

User = get_user_model()
org = Organisation.objects.first()
user = User.objects.first()

# Test creation
p1 = Project.objects.create(organisation=org, creator=user, name="Test Project")
print(p1.slug)  # Should be "test-project"

# Test collision
p2 = Project.objects.create(organisation=org, creator=user, name="Test Project")
print(p2.slug)  # Should be "test-project-2"

# Test soft delete
p1.archive()
print(p1.is_active)  # False
print(p1.archived_at)  # timestamp

# Test manager
Project.objects.all()  # Only p2
Project.all_objects.all()  # Both p1 and p2
```

## Activity Log

- 2025-11-25T12:58:43Z – copilot – shell_pid=11524 – lane=doing – Started WP02: Project Model & Managers implementation
