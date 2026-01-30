# Data Model: Content Templates & Generation (B31)

**Feature**: B31 Content Templates & Generation
**Branch**: `040-content-templates-generation`
**Date**: 2026-01-29

## Entity Overview

This module introduces 3 new Django models with clear relationships and state management:

```
ContentTemplate (1) ──< (N) ContentItem (1) ──< (N) ContentApproval
        │                      │
        ├─ (FK) Organisation   ├─ (FK) Project
        ├─ (FK) Project        ├─ (FK) Activity (optional)
        └─ (FK) Sport          ├─ (FK) FileAsset (output)
                               ├─ (FK) User (created_by)
                               └─ deleted_at (soft delete)
```

---

## Entity Definitions

### 1. ContentTemplate

**Purpose**: Reusable template definition for AI content generation

**Table Name**: `content_generation_contenttemplate`

*Note: Follows Django default naming convention (app_label + model_name lowercase). Previous version used custom `db_table='content_generation_template'` but Django defaults are preferred for consistency with ORM introspection and migration tooling.*

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | BigAutoField | PK, Auto-increment | Primary key |
| `name` | CharField(200) | NOT NULL, Indexed | Template display name (e.g., "Line-up Video") |
| `description` | TextField | NULL, Blank | Template purpose and usage notes |
| `template_type` | CharField(50) | NOT NULL, Choices, Indexed | Template category (see enum below) |
| `sport_type` | CharField(50) | NULL, Blank, Indexed | Sport identifier (links to B32, e.g., "football") |
| `ai_workflow_id` | CharField(200) | NOT NULL | External AI system workflow/pipeline identifier |
| `template_settings` | JSONField | NOT NULL, Default={} | AI-specific configuration (schema varies by workflow) |
| `timeout_minutes` | IntegerField | NULL, Blank | Generation timeout in minutes (NULL uses system default of 30) |
| `is_active` | BooleanField | NOT NULL, Default=True, Indexed | Template availability flag |
| `organisation` | ForeignKey | NOT NULL, ON DELETE CASCADE | Owning organization (via B08) |
| `project` | ForeignKey | NULL, Blank, ON DELETE SET NULL | Optional project scope (NULL = org-wide) |
| `created_by` | ForeignKey(User) | NOT NULL, ON DELETE PROTECT | Template creator |
| `created_at` | DateTimeField | NOT NULL, Auto-now-add | Creation timestamp |
| `updated_at` | DateTimeField | NOT NULL, Auto-now | Last modification timestamp |

**Enums**:

```python
class TemplateType(models.TextChoices):
    PRE_MATCH = 'pre_match', 'Pre-Match'
    DURING_MATCH = 'during_match', 'During Match'
    POST_MATCH = 'post_match', 'Post-Match'
    SEASON = 'season', 'Season Summary'
    CUSTOM = 'custom', 'Custom'
```

**Indexes**:
- `(is_active, sport_type)` - For filtered template lists
- `(organisation, is_active)` - For org-scoped queries
- `name` - For search

**Validation Rules**:
- `name` must be unique per organization
- `timeout_minutes` if set must be between 1 and 1440 (24 hours)
- `template_settings` must be valid JSON (validated by serializer)
- `ai_workflow_id` must not be empty

**State Transitions**: None (no state machine)

**Business Logic**:
- Deactivating template does not cancel in-progress generations
- Templates can be soft-archived (is_active=False) but never deleted if used by ContentItems
- Sport-agnostic templates have `sport_type=NULL`

---

### 2. ContentItem

**Purpose**: Generated content instance with status tracking

**Table Name**: `content_generation_contentitem`

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | BigAutoField | PK, Auto-increment | Primary key |
| `template` | ForeignKey | NOT NULL, ON DELETE PROTECT | Source template |
| `project` | ForeignKey | NOT NULL, ON DELETE CASCADE | Project scope |
| `activity` | ForeignKey | NULL, Blank, ON DELETE SET NULL | Optional linked activity (match/event via B30) |
| `status` | CharField(30) | NOT NULL, Choices, Indexed | Generation status (see enum below) |
| `input_data` | JSONField | NOT NULL, Default={} | User-provided generation inputs |
| `output_file` | ForeignKey(FileAsset) | NULL, Blank, ON DELETE SET NULL | Generated file (via B22) |
| `error_message` | TextField | NULL, Blank | Failure details (populated when status='failed') |
| `metadata` | JSONField | NOT NULL, Default={} | Additional tracking data (duration, retries, etc.) |
| `created_by` | ForeignKey(User) | NOT NULL, ON DELETE PROTECT | Content creator |
| `created_at` | DateTimeField | NOT NULL, Auto-now-add, Indexed | Queue timestamp |
| `updated_at` | DateTimeField | NOT NULL, Auto-now | Last status change |
| `deleted_at` | DateTimeField | NULL, Blank, Indexed | Soft-delete timestamp |

**Enums**:

```python
class ContentStatus(models.TextChoices):
    QUEUED = 'queued', 'Queued'
    GENERATING = 'generating', 'Generating'
    COMPLETED = 'completed', 'Completed'
    FAILED = 'failed', 'Failed'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'
    REVISION_REQUESTED = 'revision_requested', 'Revision Requested'
```

**Indexes**:
- `(project, status, deleted_at)` - For library filtering
- `(template, activity, status)` - For duplicate detection
- `(status, created_at)` - For task processing
- `deleted_at` - For cleanup queries

**Validation Rules**:
- `output_file` required when status='completed'
- `error_message` required when status='failed'
- `status` transitions must follow state machine (see below)
- `input_data` schema validated against template requirements (serializer-level)

**State Transitions**:

```
QUEUED ──> GENERATING ──> COMPLETED ──┬──> APPROVED
                 │                     ├──> REJECTED
                 └──> FAILED           └──> REVISION_REQUESTED ──> QUEUED (re-queue)
```

**Allowed Transitions**:
- `queued` → `generating`, `failed`
- `generating` → `completed`, `failed`
- `completed` → `approved`, `rejected`, `revision_requested`
- `revision_requested` → `queued` (re-generation)
- `failed` → `queued` (retry)

**Business Logic**:
- Soft-delete sets `deleted_at` timestamp (record preserved for audit)
- Cleanup task soft-deletes based on org retention policy:
  - `failed`: 30 days default
  - `rejected`: 90 days default
  - `approved`: indefinite
- Re-queueing from `revision_requested` creates new task with same input_data

**Custom Managers**:

```python
class ContentItemManager(models.Manager):
    def active(self):
        """Exclude soft-deleted items"""
        return self.filter(deleted_at__isnull=True)

    def for_project(self, project_id):
        """Project-scoped active items"""
        return self.active().filter(project_id=project_id)
```

---

### 3. ContentApproval

**Purpose**: Review and approval workflow tracking

**Table Name**: `content_generation_contentapproval`

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | BigAutoField | PK, Auto-increment | Primary key |
| `content_item` | ForeignKey | NOT NULL, ON DELETE CASCADE | Related content item |
| `reviewer` | ForeignKey(User) | NOT NULL, ON DELETE PROTECT | Approving/rejecting user |
| `status` | CharField(30) | NOT NULL, Choices, Indexed | Approval decision (see enum below) |
| `feedback_text` | TextField | NULL, Blank | Reviewer comments/notes |
| `reviewed_at` | DateTimeField | NOT NULL, Auto-now-add, Indexed | Decision timestamp |

**Enums**:

```python
class ApprovalStatus(models.TextChoices):
    PENDING = 'pending', 'Pending Review'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'
    REVISION_REQUESTED = 'revision_requested', 'Revision Requested'
```

**Indexes**:
- `(content_item, reviewed_at)` - For approval history
- `(status, reviewed_at)` - For approval queue

**Validation Rules**:
- Only one active approval per ContentItem (latest by `reviewed_at`)
- `feedback_text` recommended but not required for approved status
- `feedback_text` required for rejected/revision_requested status
- Reviewer cannot be same as creator (validated at serializer level if self-approval disabled)

**State Transitions**: None (single decision record; new approvals create new records)

**Business Logic**:
- Each approval decision creates new ContentApproval record (audit trail)
- ContentItem.status updated to match latest approval
- Approval creates notification via B17 to content creator

---

## Relationships

### Foreign Keys

| Source | Target | Relationship | Cascade Behavior |
|--------|--------|--------------|------------------|
| ContentTemplate.organisation | Organisation | Many-to-One | CASCADE (deleting org deletes templates) |
| ContentTemplate.project | Project | Many-to-One | SET NULL (project deletion orphans template) |
| ContentTemplate.created_by | User | Many-to-One | PROTECT (user deletion blocked if templates exist) |
| ContentItem.template | ContentTemplate | Many-to-One | PROTECT (template deletion blocked if items exist) |
| ContentItem.project | Project | Many-to-One | CASCADE (deleting project deletes items) |
| ContentItem.activity | Activity | Many-to-One | SET NULL (activity deletion preserves item) |
| ContentItem.output_file | FileAsset | Many-to-One | SET NULL (file deletion clears reference) |
| ContentItem.created_by | User | Many-to-One | PROTECT (user deletion blocked if items exist) |
| ContentApproval.content_item | ContentItem | Many-to-One | CASCADE (deleting item deletes approvals) |
| ContentApproval.reviewer | User | Many-to-One | PROTECT (user deletion blocked if approvals exist) |

### Reverse Relations

| Model | Reverse Name | Description |
|-------|--------------|-------------|
| ContentTemplate | `contentitem_set` | All content items from this template |
| ContentItem | `contentapproval_set` | All approval records for this item |
| Project | `content_templates` | All templates scoped to project |
| Project | `content_items` | All content generated in project |
| Activity | `content_items` | All content linked to activity |
| FileAsset | `content_items` | All content using this file |

---

## Database Schema (DDL Preview)

```sql
-- ContentTemplate table
CREATE TABLE content_generation_template (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    template_type VARCHAR(50) NOT NULL,
    sport_type VARCHAR(50),
    ai_workflow_id VARCHAR(200) NOT NULL,
    template_settings JSONB NOT NULL DEFAULT '{}',
    timeout_minutes INTEGER CHECK (timeout_minutes >= 1 AND timeout_minutes <= 1440),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    organisation_id BIGINT NOT NULL REFERENCES organisations_organisation(id) ON DELETE CASCADE,
    project_id BIGINT REFERENCES projects_project(id) ON DELETE SET NULL,
    created_by_id BIGINT NOT NULL REFERENCES users_user(id) ON DELETE PROTECT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(organisation_id, name)
);
CREATE INDEX idx_template_active_sport ON content_generation_template(is_active, sport_type);
CREATE INDEX idx_template_org_active ON content_generation_template(organisation_id, is_active);
CREATE INDEX idx_template_name ON content_generation_template(name);

-- ContentItem table
CREATE TABLE content_generation_item (
    id BIGSERIAL PRIMARY KEY,
    template_id BIGINT NOT NULL REFERENCES content_generation_template(id) ON DELETE PROTECT,
    project_id BIGINT NOT NULL REFERENCES projects_project(id) ON DELETE CASCADE,
    activity_id BIGINT REFERENCES activities_activity(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL,
    input_data JSONB NOT NULL DEFAULT '{}',
    output_file_id BIGINT REFERENCES files_fileasset(id) ON DELETE SET NULL,
    error_message TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_by_id BIGINT NOT NULL REFERENCES users_user(id) ON DELETE PROTECT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_item_project_status ON content_generation_item(project_id, status, deleted_at);
CREATE INDEX idx_item_duplicate ON content_generation_item(template_id, activity_id, status);
CREATE INDEX idx_item_status_created ON content_generation_item(status, created_at);
CREATE INDEX idx_item_deleted ON content_generation_item(deleted_at);

-- ContentApproval table
CREATE TABLE content_generation_approval (
    id BIGSERIAL PRIMARY KEY,
    content_item_id BIGINT NOT NULL REFERENCES content_generation_item(id) ON DELETE CASCADE,
    reviewer_id BIGINT NOT NULL REFERENCES users_user(id) ON DELETE PROTECT,
    status VARCHAR(30) NOT NULL,
    feedback_text TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_approval_item ON content_generation_approval(content_item_id, reviewed_at);
CREATE INDEX idx_approval_status ON content_generation_approval(status, reviewed_at);
```

---

## Query Patterns

### Common Queries

**1. Get active templates for organization:**
```python
ContentTemplate.objects.filter(
    organisation_id=org_id,
    is_active=True
).select_related('organisation', 'project')
```

**2. Get content library for project:**
```python
ContentItem.objects.active().filter(
    project_id=project_id,
    status__in=['completed', 'approved']
).select_related('template', 'output_file', 'activity').order_by('-created_at')
```

**3. Check for duplicate in-progress generation:**
```python
ContentItem.objects.filter(
    template_id=template_id,
    activity_id=activity_id,
    status__in=['queued', 'generating']
).exists()
```

**4. Get approval history for item:**
```python
ContentApproval.objects.filter(
    content_item_id=item_id
).select_related('reviewer').order_by('-reviewed_at')
```

**5. Find expired content for cleanup:**
```python
from django.utils import timezone
from datetime import timedelta

now = timezone.now()
cutoff_failed = now - timedelta(days=30)
cutoff_rejected = now - timedelta(days=90)

# Failed content to soft-delete
ContentItem.objects.filter(
    status='failed',
    deleted_at__isnull=True,
    created_at__lt=cutoff_failed
)

# Rejected content to soft-delete
ContentItem.objects.filter(
    status='rejected',
    deleted_at__isnull=True,
    updated_at__lt=cutoff_rejected
)
```

---

## Migrations Strategy

**Migration Order**:
1. Create `ContentTemplate` model
2. Create `ContentItem` model (depends on ContentTemplate)
3. Create `ContentApproval` model (depends on ContentItem)
4. Add indexes
5. Seed initial templates (optional data migration)

**Backward Compatibility**:
- New module, no existing data to migrate
- B08/B09/B15/B17/B22/B23/B30/B32 modules already exist (no schema changes)
- Add 5 new permissions to B08 permission registry (data migration)

---

## Performance Considerations

**Index Strategy**:
- Composite indexes for filtered lists (project + status, template + activity)
- Single column indexes for soft-delete and status queries
- Avoid over-indexing JSONField columns (use GIN indexes sparingly)

**Query Optimization**:
- Always use `select_related()` for FK joins (template, project, activity, user)
- Use `prefetch_related()` for reverse relations (approval history)
- Paginate Content Library (50 items per page default)
- Cache active template list (5 min TTL)

**Scaling Limits**:
- Estimated 10K templates per large organization
- Estimated 100K content items per year per large project
- Cleanup task reduces database bloat (soft-delete after retention period)

---

## Next Steps

1. Create API contracts in `/contracts/` folder
2. Create `quickstart.md` with usage examples
3. Implement models in `src/content_generation/models.py`
4. Write model tests in `tests/content_generation/test_models.py`
