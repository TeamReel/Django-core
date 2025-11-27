---
work_package_id: "WP02"
subtasks:
  - "T008"
  - "T009"
  - "T010"
  - "T011"
  - "T012"
  - "T013"
  - "T014"
  - "T015"
title: "Database Models & Migrations"
phase: "Phase 0 - Foundation"
lane: "done"
assignee: ""
agent: "copilot-reviewer"
shell_pid: "17920"
review_status: "approved without changes"
reviewed_by: "copilot-reviewer"
history:
  - timestamp: "2025-11-27T21:45:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP02 – Database Models & Migrations

## Objectives & Success Criteria

Implement FeatureFlag and Setting models with scope support, nullable FKs for global scope, unique constraints, indexes, and check constraints. Generate and test migrations.

**Success Criteria**:
- Migrations apply cleanly in both directions
- Unique constraint enforced on (key, scope_type, organisation_id, project_id)
- Check constraints prevent invalid scope combinations
- Indexes created successfully (verify with `\d settings_feature_flag` in psql)

## Context & Constraints

**References**:
- Data Model: `kitty-specs/010-settings-feature-flags/data-model.md` (complete schema definitions)
- Spec: `kitty-specs/010-settings-feature-flags/spec.md` (FR-001, FR-003, FR-011)
- Plan: `kitty-specs/010-settings-feature-flags/plan.md` (Technical Context)

**Key Design Decisions**:
- NULL scope_id for global scope (nullable FKs)
- Separate FeatureFlag and Setting tables (not polymorphic)
- Deny-by-default: FeatureFlag.enabled defaults to False
- Explicit defaults: Setting.default_value is required (NOT NULL)

## Subtasks & Detailed Guidance

### T008 – Define Enums
Create `ScopeType` and `SettingType` enumerations using Django's TextChoices.

**File**: `src/settings/models.py`
```python
from django.db import models

class ScopeType(models.TextChoices):
    GLOBAL = 'GLOBAL', 'Global'
    ORGANISATION = 'ORGANISATION', 'Organisation'
    PROJECT = 'PROJECT', 'Project'

class SettingType(models.TextChoices):
    STRING = 'STRING', 'String'
    INTEGER = 'INTEGER', 'Integer'
    BOOLEAN = 'BOOLEAN', 'Boolean'
    JSON = 'JSON', 'JSON'
```

### T009 – Implement FeatureFlag Model
Full model definition with UUID primary key, scope relationships, and metadata.

**Fields**:
- `id` (UUIDField, PK, default=uuid.uuid4)
- `key` (CharField, max_length=255, db_index=True)
- `enabled` (BooleanField, default=False) # Deny-by-default
- `description` (TextField, blank=True)
- `scope_type` (CharField, max_length=20, choices=ScopeType.choices)
- `organisation` (ForeignKey to Organisation, null=True, blank=True, on_delete=CASCADE)
- `project` (ForeignKey to Project, null=True, blank=True, on_delete=CASCADE)
- `created_at` (DateTimeField, auto_now_add=True)
- `updated_at` (DateTimeField, auto_now=True)
- `created_by` (ForeignKey to User, null=True, blank=True, on_delete=SET_NULL, related_name='+')
- `updated_by` (ForeignKey to User, null=True, blank=True, on_delete=SET_NULL, related_name='+')

**Meta Options**:
```python
class Meta:
    db_table = 'settings_feature_flag'
    verbose_name = 'Feature Flag'
    verbose_name_plural = 'Feature Flags'
    ordering = ['key']
    constraints = [
        models.UniqueConstraint(
            fields=['key', 'scope_type', 'organisation', 'project'],
            name='unique_flag_scope'
        ),
    ]
```

**Parallel**: Can develop simultaneously with T010

### T010 – Implement Setting Model
Similar to FeatureFlag but with value/value_type/default_value fields.

**Additional Fields** (beyond FeatureFlag):
- `value` (JSONField, default=dict) # Stores all types as JSON
- `value_type` (CharField, max_length=20, choices=SettingType.choices)
- `default_value` (JSONField) # Required, no default

**Meta**: Same pattern as FeatureFlag, db_table='settings_setting'

**Parallel**: Can develop simultaneously with T009

### T011 – Generate Initial Migration
Run `python manage.py makemigrations settings` to create `0001_initial.py`.

**Validation**: Review migration file, ensure all fields and constraints present

### T012 – Add Indexes Migration
Create `0002_add_indexes.py` with partial indexes and GIN index.

**Indexes**:
```python
migrations.AddIndex(
    model_name='featureflag',
    index=models.Index(
        fields=['organisation'],
        condition=models.Q(organisation__isnull=False),
        name='flag_org_idx'
    ),
),
migrations.AddIndex(
    model_name='featureflag',
    index=models.Index(
        fields=['project'],
        condition=models.Q(project__isnull=False),
        name='flag_project_idx'
    ),
),
migrations.AddIndex(
    model_name='setting',
    index=GinIndex(fields=['value'], name='setting_value_gin_idx'),
),
```

### T013 – Add Check Constraints Migration
Create `0003_add_check_constraints.py`.

**Constraints**:
1. Global scope requires both FKs NULL
2. Organisation scope requires organisation FK, project FK NULL
3. Project scope requires both organisation and project FKs NOT NULL

```python
migrations.AddConstraint(
    model_name='featureflag',
    constraint=models.CheckConstraint(
        check=(
            (models.Q(scope_type='GLOBAL') & models.Q(organisation__isnull=True) & models.Q(project__isnull=True)) |
            (models.Q(scope_type='ORGANISATION') & models.Q(organisation__isnull=False) & models.Q(project__isnull=True)) |
            (models.Q(scope_type='PROJECT') & models.Q(organisation__isnull=False) & models.Q(project__isnull=False))
        ),
        name='flag_scope_consistency'
    ),
),
```

### T014 – Test Migration Forward/Backward
```bash
cd src
python manage.py migrate settings
python manage.py migrate settings zero
python manage.py migrate settings
```

**Validation**: All migrations apply and rollback cleanly

### T015 – Test Unique Constraints
Use Django shell to test constraint enforcement:
```python
from src.settings.models import FeatureFlag, ScopeType
# Should succeed
f1 = FeatureFlag.objects.create(key='test', scope_type=ScopeType.GLOBAL)
# Should raise IntegrityError (duplicate)
f2 = FeatureFlag.objects.create(key='test', scope_type=ScopeType.GLOBAL)
```

## Definition of Done Checklist

- [x] Enums defined
- [x] FeatureFlag model complete
- [x] Setting model complete
- [x] Initial migration generated
- [x] Index migration created
- [x] Check constraint migration created
- [x] Migrations tested forward/backward
- [x] Unique constraints validated
- [x] Database schema matches data-model.md

## Activity Log

- 2025-11-27T21:45:00Z – system – lane=planned – Prompt created.
- 2025-11-27T20:59:01Z – copilot – shell_pid=45896 – lane=doing – Started WP02: Database Models & Migrations
- 2025-11-27T21:05:22Z – copilot – shell_pid=45896 – lane=for_review – All 8 subtasks complete. Models implemented, migrations tested, Django check passes.
- 2025-11-27T21:07:30Z – copilot-reviewer – shell_pid=17920 – lane=done – Code review complete: Approved without changes. All models match specifications, migrations well-structured, constraints properly enforced.
