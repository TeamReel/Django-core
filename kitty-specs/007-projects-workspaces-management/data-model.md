# Data Model: Projects & Workspaces Management

**Feature**: 007-projects-workspaces-management
**Created**: 2025-11-25
**Status**: Design Complete

## Entity Relationship Diagram

```
┌─────────────────────┐
│   Organisation      │
│  (Feature 006)      │
│─────────────────────│
│ id (PK)            │
│ name               │
│ slug               │
│ ...                │
└──────────┬──────────┘
           │
           │ 1:N
           │
           ▼
┌─────────────────────┐         ┌─────────────────────┐
│      Project        │         │        User         │
│                     │         │   (Feature 005)     │
│─────────────────────│         │─────────────────────│
│ id (PK)            │◄────────┤ id (PK)            │
│ organisation_id FK │         │ email              │
│ creator_id FK      │         │ ...                │
│ name               │         └─────────────────────┘
│ slug               │
│ description        │
│ is_active          │
│ created_at         │
│ updated_at         │
│ archived_at        │
└─────────────────────┘
```

## Core Entities

### Project

**Purpose**: Represents a workspace/project container for scoping resources within an organisation.

**Table**: `projects_project`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | BigAutoField | PRIMARY KEY | Auto-incrementing primary key |
| `organisation_id` | ForeignKey | NOT NULL, FK(organisations_organisation), ON_DELETE=CASCADE | Organisation owner |
| `creator_id` | ForeignKey | NOT NULL, FK(accounts_user), ON_DELETE=PROTECT | User who created the project |
| `name` | CharField(200) | NOT NULL | Human-readable project name |
| `slug` | SlugField(200) | NOT NULL | URL-safe identifier |
| `description` | TextField | NULL, max_length=2000 | Optional project description |
| `is_active` | BooleanField | NOT NULL, DEFAULT=True | Soft deletion flag |
| `created_at` | DateTimeField | NOT NULL, auto_now_add=True | Creation timestamp |
| `updated_at` | DateTimeField | NOT NULL, auto_now=True | Last update timestamp |
| `archived_at` | DateTimeField | NULL | Archive timestamp (NULL if active) |

**Constraints**:
- `UNIQUE(organisation_id, slug)` - Slug must be unique per organisation
- `UNIQUE(LOWER(name), organisation_id)` - Case-insensitive name uniqueness per organisation
- Index on `organisation_id` (foreign key index)
- Index on `slug` (query optimization)
- Index on `is_active` (soft deletion filtering)

**Validation Rules**:
- `name`: Required, 1-200 characters
- `slug`: Auto-generated if empty, matches pattern `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- `description`: Optional, max 2000 characters
- `archived_at`: Must be NULL when `is_active=True`, NOT NULL when `is_active=False`

**Model Code**:
```python
from django.db import models
from django.db.models import Q
from django.db.models.functions import Lower
from django.utils import timezone
from django.utils.text import slugify

class Project(models.Model):
    """
    Project/workspace container within an organisation.

    Projects provide scoping context for resources and are owned by organisations.
    Access is controlled at the organisation level (no project-specific memberships).
    """

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

    # Default manager returns only active projects
    objects = ActiveProjectManager()
    all_objects = AllProjectManager()

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
        indexes = [
            models.Index(fields=['organisation', 'is_active']),
            models.Index(fields=['slug']),
        ]

    def __str__(self) -> str:
        return f"{self.organisation.name}/{self.name}"

    def clean(self):
        """Validate model constraints."""
        super().clean()

        # Archived projects must have archived_at timestamp
        if not self.is_active and self.archived_at is None:
            self.archived_at = timezone.now()

        # Active projects must NOT have archived_at
        if self.is_active and self.archived_at is not None:
            self.archived_at = None

    def save(self, *args, **kwargs):
        """Auto-generate slug if not provided."""
        if not self.slug:
            self.slug = self._generate_unique_slug()

        self.full_clean()
        super().save(*args, **kwargs)

    def _generate_unique_slug(self) -> str:
        """
        Generate unique slug with sequential suffix for collisions.

        Examples:
        - "Project Alpha" -> "project-alpha"
        - Second with same name -> "project-alpha-2"
        - Third -> "project-alpha-3"
        """
        base_slug = slugify(self.name)
        slug = base_slug
        counter = 2
        max_attempts = 100

        while counter <= max_attempts:
            # Check if slug exists in same organisation
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

## Custom Managers

### ActiveProjectManager

**Purpose**: Default manager that filters out archived projects.

```python
class ActiveProjectManager(models.Manager):
    """Manager that returns only active (non-archived) projects."""

    def get_queryset(self):
        return super().get_queryset().filter(is_active=True)
```

### AllProjectManager

**Purpose**: Manager that returns all projects including archived ones.

```python
class AllProjectManager(models.Manager):
    """Manager that returns all projects including archived ones."""

    def get_queryset(self):
        return super().get_queryset()
```

## Relationships

### Organisation → Project (1:N)

- **Type**: One-to-Many
- **Cardinality**: An organisation can have 0 to N projects
- **Cascade**: `ON_DELETE=CASCADE` - Deleting organisation deletes all its projects
- **Related Name**: `organisation.projects.all()`

**Business Rules**:
- Organisation must exist before creating projects
- Projects cannot be transferred between organisations
- When organisation is deleted, all projects are deleted (cascade)

### User → Project (1:N as Creator)

- **Type**: One-to-Many
- **Cardinality**: A user can create 0 to N projects
- **Cascade**: `ON_DELETE=PROTECT` - Cannot delete user who created projects
- **Related Name**: `user.created_projects.all()`

**Business Rules**:
- Creator is set at creation time and cannot be changed
- Creator must be a member of the organisation
- Deleting a user who created projects is prevented (PROTECT)

## Migration Strategy

### Initial Migration: `0001_initial.py`

**Dependencies**:
- `organisations.0001_initial` (Feature 006)
- `accounts.0001_initial` (Feature 005)

**Operations**:
1. Create `projects_project` table with all fields
2. Add `UNIQUE(organisation_id, slug)` constraint
3. Add case-insensitive `UNIQUE(LOWER(name), organisation_id)` constraint
4. Create index on `organisation_id`
5. Create index on `slug`
6. Create index on `is_active`
7. Create composite index on `(organisation_id, is_active)`

```python
# migrations/0001_initial.py
from django.db import migrations, models
import django.db.models.deletion
from django.db.models.functions import Lower

class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ('organisations', '0001_initial'),
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Project',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Human-readable project name', max_length=200)),
                ('slug', models.SlugField(help_text='URL-safe identifier (auto-generated from name if not provided)', max_length=200)),
                ('description', models.TextField(blank=True, help_text='Optional project description (up to 2000 characters)', max_length=2000)),
                ('is_active', models.BooleanField(db_index=True, default=True, help_text='False when project is archived (soft deletion)')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('archived_at', models.DateTimeField(blank=True, help_text='Timestamp when project was archived (NULL if active)', null=True)),
                ('creator', models.ForeignKey(help_text='User who created this project', on_delete=django.db.models.deletion.PROTECT, related_name='created_projects', to='accounts.user')),
                ('organisation', models.ForeignKey(help_text='Organisation that owns this project', on_delete=django.db.models.deletion.CASCADE, related_name='projects', to='organisations.organisation')),
            ],
            options={
                'db_table': 'projects_project',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='project',
            constraint=models.UniqueConstraint(fields=('organisation', 'slug'), name='unique_project_slug_per_org'),
        ),
        migrations.AddConstraint(
            model_name='project',
            constraint=models.UniqueConstraint(Lower('name'), 'organisation', name='unique_project_name_per_org_case_insensitive'),
        ),
        migrations.AddIndex(
            model_name='project',
            index=models.Index(fields=['organisation', 'is_active'], name='projects_pr_organis_idx'),
        ),
        migrations.AddIndex(
            model_name='project',
            index=models.Index(fields=['slug'], name='projects_pr_slug_idx'),
        ),
    ]
```

## Data Volume Estimates

| Organisation Size | Expected Projects | Query Performance Target |
|-------------------|-------------------|-------------------------|
| Small (1-10 users) | 5-20 projects | <50ms list query |
| Medium (10-100 users) | 20-100 projects | <200ms list query |
| Large (100-1000 users) | 100-1000 projects | <1s list query (paginated) |
| Enterprise (1000+ users) | 1000+ projects | <1s per page (cursor pagination) |

**Indexing Strategy**: All foreign keys and frequently queried fields (slug, is_active) are indexed to ensure sub-second query performance up to 1000+ projects per organisation.

## Extension Points

### For Product-Specific Features

Projects are designed to be extended via foreign keys from other models:

```python
# Example: Task management feature
class Task(models.Model):
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    # ... other fields

# Example: Document management feature
class Document(models.Model):
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=200)
    # ... other fields
```

### For Audit Logging (Feature 009 Integration)

Signal handlers in `projects/signals.py` provide integration points:

```python
# projects/signals.py
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from .models import Project

@receiver(post_save, sender=Project)
def log_project_change(sender, instance, created, **kwargs):
    """
    Stub for audit logging integration.
    Replace with Feature 009 audit service when available.
    """
    if created:
        # Log project creation
        pass
    else:
        # Log project update
        pass

@receiver(pre_delete, sender=Project)
def log_project_deletion(sender, instance, **kwargs):
    """
    Stub for audit logging integration.
    Note: Projects use soft deletion, so this should rarely fire.
    """
    # Log project deletion
    pass
```

## Design Completion Checklist

- [x] Core entity (Project) fully specified with all fields
- [x] Relationships defined with cascade behavior
- [x] Constraints documented (UNIQUE, indexes)
- [x] Validation rules specified
- [x] Custom managers designed (ActiveProjectManager, AllProjectManager)
- [x] Slug generation algorithm documented
- [x] Soft deletion pattern implemented
- [x] Migration strategy defined
- [x] Extension points identified
- [x] Performance targets set per data volume

**Data Model Status**: ✅ Complete - Ready for implementation
