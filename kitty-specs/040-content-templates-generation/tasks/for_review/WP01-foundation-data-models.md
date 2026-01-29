---
work_package_id: WP01
title: Foundation & Data Models
lane: for_review
subtasks:
  - T001
  - T002
  - T003
  - T004
  - T005
  - T006
priority: P0
estimated_effort: 1-2 days
dependencies: []
assignee: copilot
agent: copilot
shell_pid: "13668"
history:
  - date: 2026-01-29
    action: created
    author: spec-kitty
  - date: 2026-01-29T15:30:00Z
    action: moved_to_doing
    author: copilot
    shell_pid: "13668"
    note: "Started WP01: Foundation & Data Models implementation"
  - date: 2026-01-29T20:30:00Z
    action: completed
    author: copilot
    shell_pid: "13668"
    note: "Completed all 6 subtasks: Django app created, 3 models implemented, migration created, admin configured. Commit: 4223bb07"
  - date: 2026-01-29T20:31:00Z
    action: moved_to_for_review
    author: copilot
    shell_pid: "13668"
    note: "Ready for review"
---

# WP01: Foundation & Data Models

## Objective

Establish the Django app structure for B31 Content Templates & Generation and implement the 3 core models (ContentTemplate, ContentItem, ContentApproval) with complete field definitions, enums, validators, custom managers, and database migrations.

## Context

**Feature**: B31 Content Templates & Generation
**User Story**: Foundation (prerequisite for all features)
**Dependencies**: Django 5.0+, PostgreSQL, B08 Hierarchical Access, B22 Files, B30 Activities

This work package provides the data layer foundation for the entire B31 module. All subsequent features (generation, approval, templates, library) depend on these models being correctly implemented.

**Key Architecture Decisions**:
- Single Django app: `src/content_generation/`
- 3 models with clear relationships: ContentTemplate → ContentItem → ContentApproval
- Soft-delete pattern via `deleted_at` timestamp on ContentItem
- State machine pattern for ContentItem.status transitions
- Enums as `models.TextChoices` for type safety

---

## Detailed Guidance

### T001: Create Django App Structure

**Goal**: Initialize `src/content_generation/` with standard Django app structure

**Files to create**:
```
src/content_generation/
├── __init__.py
├── models.py
├── serializers.py
├── views.py
├── tasks.py
├── permissions.py
├── admin.py
├── apps.py
├── urls.py
└── migrations/
    └── __init__.py
```

**Implementation**:
1. Run: `python manage.py startapp content_generation` in `src/` directory
2. Update `apps.py`:
   ```python
   from django.apps import AppConfig

   class ContentGenerationConfig(AppConfig):
       default_auto_field = 'django.db.models.BigAutoField'
       name = 'src.content_generation'
       verbose_name = 'Content Generation'
   ```
3. Add to `INSTALLED_APPS` in `settings.py`:
   ```python
   INSTALLED_APPS = [
       ...
       'src.content_generation',
   ]
   ```

**Acceptance**:
- [ ] App importable: `from src.content_generation import models`
- [ ] App visible in Django Admin sidebar

---

### T002: Implement ContentTemplate Model

**Goal**: Create ContentTemplate model with all fields, validators, and enums

**Reference**: [data-model.md](../data-model.md#1-contenttemplate)

**Implementation** (`models.py`):

```python
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth import get_user_model

User = get_user_model()


class TemplateType(models.TextChoices):
    PRE_MATCH = 'pre_match', 'Pre-Match'
    DURING_MATCH = 'during_match', 'During Match'
    POST_MATCH = 'post_match', 'Post-Match'
    SEASON = 'season', 'Season Summary'
    CUSTOM = 'custom', 'Custom'


class ContentTemplate(models.Model):
    """Reusable template definition for AI content generation"""

    name = models.CharField(
        max_length=200,
        help_text="Template display name (e.g., 'Line-up Video')"
    )
    description = models.TextField(
        null=True,
        blank=True,
        help_text="Template purpose and usage notes"
    )
    template_type = models.CharField(
        max_length=50,
        choices=TemplateType.choices,
        db_index=True,
        help_text="Template category"
    )
    sport_type = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        db_index=True,
        help_text="Sport identifier (links to B32, e.g., 'football')"
    )
    ai_workflow_id = models.CharField(
        max_length=200,
        help_text="External AI system workflow/pipeline identifier"
    )
    template_settings = models.JSONField(
        default=dict,
        help_text="AI-specific configuration (schema varies by workflow)"
    )
    timeout_minutes = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(1440)],
        help_text="Generation timeout in minutes (NULL uses system default of 30)"
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Template availability flag"
    )

    # Foreign Keys
    organisation = models.ForeignKey(
        'organisations.Organisation',
        on_delete=models.CASCADE,
        related_name='content_templates',
        help_text="Owning organization"
    )
    project = models.ForeignKey(
        'projects.Project',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='content_templates',
        help_text="Optional project scope (NULL = org-wide)"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='created_templates',
        help_text="Template creator"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'content_generation_template'
        verbose_name = 'Content Template'
        verbose_name_plural = 'Content Templates'
        indexes = [
            models.Index(fields=['is_active', 'sport_type'], name='idx_template_active_sport'),
            models.Index(fields=['organisation', 'is_active'], name='idx_template_org_active'),
            models.Index(fields=['name'], name='idx_template_name'),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['organisation', 'name'],
                name='unique_template_name_per_org'
            )
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.template_type})"
```

**Validation Rules**:
- `name` unique per organisation (enforced by UniqueConstraint)
- `timeout_minutes` between 1-1440 if set (enforced by validators)
- `ai_workflow_id` must not be empty (enforced by blank=False default)

**Acceptance**:
- [ ] Model creates without errors: `ContentTemplate.objects.create(...)`
- [ ] Unique constraint raises IntegrityError for duplicate name in same org
- [ ] Timeout validator raises ValidationError for invalid values

---

### T003: Implement ContentItem Model

**Goal**: Create ContentItem model with status enum, soft-delete manager, state transitions

**Reference**: [data-model.md](../data-model.md#2-contentitem)

**Implementation** (`models.py`):

```python
class ContentStatus(models.TextChoices):
    QUEUED = 'queued', 'Queued'
    GENERATING = 'generating', 'Generating'
    COMPLETED = 'completed', 'Completed'
    FAILED = 'failed', 'Failed'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'
    REVISION_REQUESTED = 'revision_requested', 'Revision Requested'


class ContentItemManager(models.Manager):
    """Custom manager for ContentItem with soft-delete support"""

    def active(self):
        """Exclude soft-deleted items"""
        return self.filter(deleted_at__isnull=True)

    def for_project(self, project_id):
        """Project-scoped active items"""
        return self.active().filter(project_id=project_id)


class ContentItem(models.Model):
    """Generated content instance with status tracking"""

    # Foreign Keys
    template = models.ForeignKey(
        ContentTemplate,
        on_delete=models.PROTECT,
        related_name='contentitem_set',
        help_text="Source template"
    )
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='content_items',
        help_text="Project scope"
    )
    activity = models.ForeignKey(
        'activities.Activity',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='content_items',
        help_text="Optional linked activity (match/event via B30)"
    )
    output_file = models.ForeignKey(
        'files.FileAsset',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='content_items',
        help_text="Generated file (via B22)"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='created_content_items',
        help_text="Content creator"
    )

    # Status and Data
    status = models.CharField(
        max_length=30,
        choices=ContentStatus.choices,
        default=ContentStatus.QUEUED,
        db_index=True,
        help_text="Generation status"
    )
    input_data = models.JSONField(
        default=dict,
        help_text="User-provided generation inputs"
    )
    error_message = models.TextField(
        null=True,
        blank=True,
        help_text="Failure details (populated when status='failed')"
    )
    metadata = models.JSONField(
        default=dict,
        help_text="Additional tracking data (duration, retries, etc.)"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Soft-delete timestamp"
    )

    objects = ContentItemManager()

    class Meta:
        db_table = 'content_generation_item'
        verbose_name = 'Content Item'
        verbose_name_plural = 'Content Items'
        indexes = [
            models.Index(fields=['project', 'status', 'deleted_at'], name='idx_item_project_status'),
            models.Index(fields=['template', 'activity', 'status'], name='idx_item_duplicate'),
            models.Index(fields=['status', 'created_at'], name='idx_item_status_created'),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"Content #{self.id} - {self.template.name} ({self.status})"

    def clean(self):
        """Validate state transitions and field requirements"""
        super().clean()

        # Validation: output_file required when status='completed'
        if self.status == ContentStatus.COMPLETED and not self.output_file:
            raise models.ValidationError({
                'output_file': 'Output file is required when status is completed'
            })

        # Validation: error_message required when status='failed'
        if self.status == ContentStatus.FAILED and not self.error_message:
            raise models.ValidationError({
                'error_message': 'Error message is required when status is failed'
            })

    @property
    def is_in_progress(self):
        """Check if generation is currently running"""
        return self.status in [ContentStatus.QUEUED, ContentStatus.GENERATING]
```

**State Transition Diagram**:
```
QUEUED ──> GENERATING ──> COMPLETED ──┬──> APPROVED
             │                        ├──> REJECTED
             └──> FAILED               └──> REVISION_REQUESTED ──> QUEUED (re-queue)
```

**Acceptance**:
- [ ] Custom manager works: `ContentItem.objects.active().count()`
- [ ] Soft-delete works: `item.deleted_at = now(); item.save()`
- [ ] Validation raises error for completed item without output_file
- [ ] `is_in_progress` property returns correct boolean

---

### T004: Implement ContentApproval Model

**Goal**: Create ContentApproval model with status enum and FK constraints

**Reference**: [data-model.md](../data-model.md#3-contentapproval)

**Implementation** (`models.py`):

```python
class ApprovalStatus(models.TextChoices):
    PENDING = 'pending', 'Pending Review'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'
    REVISION_REQUESTED = 'revision_requested', 'Revision Requested'


class ContentApproval(models.Model):
    """Review and approval workflow tracking"""

    content_item = models.ForeignKey(
        ContentItem,
        on_delete=models.CASCADE,
        related_name='contentapproval_set',
        help_text="Related content item"
    )
    reviewer = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='content_approvals',
        help_text="Approving/rejecting user"
    )
    status = models.CharField(
        max_length=30,
        choices=ApprovalStatus.choices,
        db_index=True,
        help_text="Approval decision"
    )
    feedback_text = models.TextField(
        null=True,
        blank=True,
        help_text="Reviewer comments/notes"
    )
    reviewed_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'content_generation_approval'
        verbose_name = 'Content Approval'
        verbose_name_plural = 'Content Approvals'
        indexes = [
            models.Index(fields=['content_item', 'reviewed_at'], name='idx_approval_item'),
            models.Index(fields=['status', 'reviewed_at'], name='idx_approval_status'),
        ]
        ordering = ['-reviewed_at']

    def __str__(self):
        return f"Approval for Content #{self.content_item_id} - {self.status}"

    def clean(self):
        """Validate feedback requirements"""
        super().clean()

        # Validation: feedback required for rejected/revision_requested
        if self.status in [ApprovalStatus.REJECTED, ApprovalStatus.REVISION_REQUESTED]:
            if not self.feedback_text or not self.feedback_text.strip():
                raise models.ValidationError({
                    'feedback_text': f'Feedback is required for {self.get_status_display()}'
                })
```

**Acceptance**:
- [ ] Model creates: `ContentApproval.objects.create(...)`
- [ ] Validation raises error for rejected approval without feedback
- [ ] Cascade delete works: deleting ContentItem deletes approvals

---

### T005: Create Initial Migration

**Goal**: Generate Django migration for all 3 models with indexes and constraints

**Implementation**:

1. Ensure all 3 models are defined in `models.py`
2. Run: `python manage.py makemigrations content_generation`
3. Review generated migration file in `src/content_generation/migrations/0001_initial.py`
4. Verify it includes:
   - All 3 model tables
   - All indexes (check `Meta.indexes`)
   - UniqueConstraint for ContentTemplate name per org
   - Foreign key constraints with correct ON DELETE behavior
5. Run: `python manage.py migrate content_generation`

**Verification**:
```bash
# Check migration status
python manage.py showmigrations content_generation

# Inspect database schema
python manage.py dbshell
\d content_generation_template
\d content_generation_item
\d content_generation_approval
```

**Acceptance**:
- [ ] Migration file created: `0001_initial.py`
- [ ] Migration applies cleanly: `python manage.py migrate`
- [ ] All tables exist in PostgreSQL
- [ ] All indexes created (check with `\d table_name` in psql)

---

### T006: Register Models in Django Admin

**Goal**: Configure Django Admin for all 3 models with appropriate list views, filters, and permissions

**Implementation** (`admin.py`):

```python
from django.contrib import admin
from .models import ContentTemplate, ContentItem, ContentApproval


@admin.register(ContentTemplate)
class ContentTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'template_type', 'sport_type', 'is_active', 'organisation', 'created_at']
    list_filter = ['template_type', 'sport_type', 'is_active', 'organisation']
    search_fields = ['name', 'description', 'ai_workflow_id']
    readonly_fields = ['created_at', 'updated_at', 'created_by']
    fieldsets = (
        ('Basic Info', {
            'fields': ('name', 'description', 'template_type', 'sport_type', 'is_active')
        }),
        ('Configuration', {
            'fields': ('ai_workflow_id', 'template_settings', 'timeout_minutes')
        }),
        ('Relationships', {
            'fields': ('organisation', 'project', 'created_by')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:  # Creating new object
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(ContentItem)
class ContentItemAdmin(admin.ModelAdmin):
    list_display = ['id', 'template', 'status', 'project', 'created_by', 'created_at', 'deleted_at']
    list_filter = ['status', 'template', 'project', 'deleted_at']
    search_fields = ['id', 'template__name', 'error_message']
    readonly_fields = ['created_at', 'updated_at', 'created_by']
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Content Info', {
            'fields': ('template', 'project', 'activity', 'status')
        }),
        ('Data', {
            'fields': ('input_data', 'output_file', 'error_message', 'metadata')
        }),
        ('Soft Delete', {
            'fields': ('deleted_at',)
        }),
        ('Audit', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(ContentApproval)
class ContentApprovalAdmin(admin.ModelAdmin):
    list_display = ['id', 'content_item', 'reviewer', 'status', 'reviewed_at']
    list_filter = ['status', 'reviewed_at']
    search_fields = ['content_item__id', 'reviewer__username', 'feedback_text']
    readonly_fields = ['reviewed_at', 'reviewer']
    date_hierarchy = 'reviewed_at'

    fieldsets = (
        ('Approval Info', {
            'fields': ('content_item', 'status', 'feedback_text')
        }),
        ('Audit', {
            'fields': ('reviewer', 'reviewed_at'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.reviewer = request.user
        super().save_model(request, obj, form, change)
```

**Acceptance**:
- [ ] All 3 models visible in Django Admin sidebar
- [ ] List views show configured columns
- [ ] Filters work correctly
- [ ] Search functionality works
- [ ] Creating new records sets `created_by`/`reviewer` automatically

---

## Definition of Done

- [ ] All 6 subtasks (T001-T006) completed and checked off
- [ ] Models importable: `from src.content_generation.models import ContentTemplate, ContentItem, ContentApproval`
- [ ] Migration applied: `python manage.py showmigrations content_generation` shows `[X] 0001_initial`
- [ ] Django Admin functional: all 3 models visible and editable
- [ ] Model tests pass (create, retrieve, soft-delete, validation):
  ```bash
  pytest tests/content_generation/test_models.py -v
  ```
- [ ] Code formatted with Black: `black src/content_generation/`
- [ ] No linting errors: `ruff src/content_generation/`
- [ ] Type hints added: `mypy src/content_generation/models.py`

---

## Risks & Mitigations

**Risk 1**: Foreign key references to B22/B30 don't exist yet
- **Mitigation**: Verify B22 Files and B30 Activities modules are installed before running migration
- **Check**: `python manage.py showmigrations files activities`

**Risk 2**: PostgreSQL-specific features (JSONField, indexes)
- **Mitigation**: Ensure `DATABASES` uses `django.db.backends.postgresql` backend
- **Fallback**: SQLite development OK (indexes still created, JSONField supported in Django 5.0+)

**Risk 3**: Unique constraint on template name per org
- **Test**: Attempt to create duplicate template in same org → should raise IntegrityError

---

## Reviewer Guidance

**What to verify**:
1. **Models structure**: Check field types, constraints, indexes match [data-model.md](../data-model.md)
2. **Enums**: Verify TextChoices match spec (TemplateType, ContentStatus, ApprovalStatus)
3. **Custom manager**: Test `ContentItem.objects.active()` excludes soft-deleted items
4. **Validation**: Test `clean()` methods raise ValidationError for invalid states
5. **Admin**: Browse all 3 models in Django Admin, create test records
6. **Migration**: Check migration file for completeness (indexes, constraints)

**Quick verification script**:
```python
# Django shell: python manage.py shell
from src.content_generation.models import ContentTemplate, ContentItem, ContentApproval
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.first()

# Test ContentTemplate creation
template = ContentTemplate.objects.create(
    name="Test Template",
    template_type="pre_match",
    ai_workflow_id="test_workflow",
    organisation_id=1,
    created_by=user
)
print(f"Created template: {template}")

# Test ContentItem with soft-delete
item = ContentItem.objects.create(
    template=template,
    project_id=1,
    status="queued",
    created_by=user
)
print(f"Created item: {item}, Active count: {ContentItem.objects.active().count()}")

# Test soft-delete
from django.utils import timezone
item.deleted_at = timezone.now()
item.save()
print(f"After soft-delete, Active count: {ContentItem.objects.active().count()}")
```

---

## Next Work Package

After WP01 completion, proceed to **WP02: User Story 1 - Content Generation** which implements the API endpoints and Celery tasks for generating content from templates.
