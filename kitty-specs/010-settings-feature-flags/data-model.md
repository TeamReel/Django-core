# Data Model: Settings & Feature Flags System
*Phase 1 Output - Database Schema Design*

**Feature**: B10 Settings & Feature Flags
**Date**: 2025-01-27
**Status**: In Progress

## Overview

This feature introduces two primary models (`FeatureFlag` and `Setting`) with scope support (global, organisation, project). Both models use nullable foreign keys to represent global scope (scope_id=NULL) and support hierarchical inheritance for configuration resolution.

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FeatureFlag                              │
├─────────────────────────────────────────────────────────────────┤
│ id (PK)                  : UUID                                  │
│ key                      : VARCHAR(255) NOT NULL                 │
│ enabled                  : BOOLEAN NOT NULL DEFAULT FALSE        │
│ description              : TEXT                                  │
│ scope_type               : VARCHAR(20) NOT NULL                  │
│   [GLOBAL, ORGANISATION, PROJECT]                                │
│ organisation_id (FK)     : UUID NULL → organisations.id          │
│ project_id (FK)          : UUID NULL → projects.id               │
│ created_at               : TIMESTAMP NOT NULL                    │
│ updated_at               : TIMESTAMP NOT NULL                    │
│ created_by_id (FK)       : UUID NULL → users.id                  │
│ updated_by_id (FK)       : UUID NULL → users.id                  │
├─────────────────────────────────────────────────────────────────┤
│ UNIQUE: (key, scope_type, organisation_id, project_id)          │
│ INDEX: (key, scope_type) PARTIAL WHERE org/proj NOT NULL        │
│ INDEX: (organisation_id) WHERE organisation_id NOT NULL          │
│ INDEX: (project_id) WHERE project_id NOT NULL                    │
└─────────────────────────────────────────────────────────────────┘
                          │                │
                          │ (0..1)         │ (0..1)
                          ▼                ▼
           ┌─────────────────────┐  ┌─────────────────────┐
           │   Organisation      │  │      Project        │
           │   (from B06)        │  │      (from B07)     │
           └─────────────────────┘  └─────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                            Setting                               │
├─────────────────────────────────────────────────────────────────┤
│ id (PK)                  : UUID                                  │
│ key                      : VARCHAR(255) NOT NULL                 │
│ value                    : JSONB NOT NULL                        │
│ value_type               : VARCHAR(20) NOT NULL                  │
│   [STRING, INTEGER, BOOLEAN, JSON]                               │
│ default_value            : JSONB NOT NULL                        │
│ description              : TEXT                                  │
│ scope_type               : VARCHAR(20) NOT NULL                  │
│   [GLOBAL, ORGANISATION, PROJECT]                                │
│ organisation_id (FK)     : UUID NULL → organisations.id          │
│ project_id (FK)          : UUID NULL → projects.id               │
│ created_at               : TIMESTAMP NOT NULL                    │
│ updated_at               : TIMESTAMP NOT NULL                    │
│ created_by_id (FK)       : UUID NULL → users.id                  │
│ updated_by_id (FK)       : UUID NULL → users.id                  │
├─────────────────────────────────────────────────────────────────┤
│ UNIQUE: (key, scope_type, organisation_id, project_id)          │
│ INDEX: (key, scope_type) PARTIAL WHERE org/proj NOT NULL        │
│ INDEX: (organisation_id) WHERE organisation_id NOT NULL          │
│ INDEX: (project_id) WHERE project_id NOT NULL                    │
│ INDEX: GIN(value) for JSONB queries                              │
└─────────────────────────────────────────────────────────────────┘
```

## Model Definitions

### FeatureFlag Model

**Purpose**: Boolean toggles for enabling/disabling features at different scopes.

**Fields**:
- `id` (UUIDField, PK): Primary identifier
- `key` (CharField, max_length=255): Feature flag key (e.g., "maintenance_mode", "beta_features")
- `enabled` (BooleanField, default=False): Flag state (deny-by-default principle)
- `description` (TextField, blank=True): Human-readable description of flag purpose
- `scope_type` (CharField, choices=ScopeType): GLOBAL, ORGANISATION, PROJECT
- `organisation_id` (ForeignKey, nullable): Link to Organisation (NULL for global scope)
- `project_id` (ForeignKey, nullable): Link to Project (NULL for global/org scope)
- `created_at` (DateTimeField, auto_now_add): Creation timestamp
- `updated_at` (DateTimeField, auto_now): Last modification timestamp
- `created_by_id` (ForeignKey to User, nullable): User who created the flag
- `updated_by_id` (ForeignKey to User, nullable): User who last updated the flag

**Constraints**:
- `UniqueConstraint(fields=['key', 'scope_type', 'organisation_id', 'project_id'], name='unique_flag_scope')`
- `CheckConstraint`: Enforce scope_type → FK relationship (e.g., GLOBAL requires both FKs NULL)
- `CheckConstraint`: Ensure project_id implies organisation_id (project scope requires org context)

**Indexes**:
- Composite: `(key, scope_type)` for fast scope hierarchy resolution
- Partial: `(organisation_id)` WHERE `organisation_id IS NOT NULL` for org-scoped queries
- Partial: `(project_id)` WHERE `project_id IS NOT NULL` for project-scoped queries

**Meta**:
```python
class Meta:
    db_table = 'settings_feature_flag'
    verbose_name = 'Feature Flag'
    verbose_name_plural = 'Feature Flags'
    ordering = ['key']
```

---

### Setting Model

**Purpose**: Typed configuration values (string, int, bool, JSON) with scope support.

**Fields**:
- `id` (UUIDField, PK): Primary identifier
- `key` (CharField, max_length=255): Setting key (e.g., "max_upload_size", "api_timeout")
- `value` (JSONField): Current setting value (type determined by value_type)
- `value_type` (CharField, choices=SettingType): STRING, INTEGER, BOOLEAN, JSON
- `default_value` (JSONField): Default value (required, explicit defaults principle)
- `description` (TextField, blank=True): Human-readable description of setting purpose
- `scope_type` (CharField, choices=ScopeType): GLOBAL, ORGANISATION, PROJECT
- `organisation_id` (ForeignKey, nullable): Link to Organisation (NULL for global scope)
- `project_id` (ForeignKey, nullable): Link to Project (NULL for global/org scope)
- `created_at` (DateTimeField, auto_now_add): Creation timestamp
- `updated_at` (DateTimeField, auto_now): Last modification timestamp
- `created_by_id` (ForeignKey to User, nullable): User who created the setting
- `updated_by_id` (ForeignKey to User, nullable): User who last updated the setting

**Constraints**:
- `UniqueConstraint(fields=['key', 'scope_type', 'organisation_id', 'project_id'], name='unique_setting_scope')`
- `CheckConstraint`: Enforce scope_type → FK relationship (same as FeatureFlag)
- `CheckConstraint`: Validate value matches value_type (e.g., INTEGER type requires numeric value)
- `CheckConstraint`: Ensure project_id implies organisation_id

**Indexes**:
- Composite: `(key, scope_type)` for fast scope hierarchy resolution
- Partial: `(organisation_id)` WHERE `organisation_id IS NOT NULL` for org-scoped queries
- Partial: `(project_id)` WHERE `project_id IS NOT NULL` for project-scoped queries
- GIN: `(value)` for efficient JSONB queries (optional, for complex JSON settings)

**Meta**:
```python
class Meta:
    db_table = 'settings_setting'
    verbose_name = 'Setting'
    verbose_name_plural = 'Settings'
    ordering = ['key']
```

---

## Enumerations

### ScopeType (TextChoices)

```python
class ScopeType(models.TextChoices):
    GLOBAL = 'GLOBAL', 'Global'
    ORGANISATION = 'ORGANISATION', 'Organisation'
    PROJECT = 'PROJECT', 'Project'
```

### SettingType (TextChoices)

```python
class SettingType(models.TextChoices):
    STRING = 'STRING', 'String'
    INTEGER = 'INTEGER', 'Integer'
    BOOLEAN = 'BOOLEAN', 'Boolean'
    JSON = 'JSON', 'JSON'
```

---

## Scope Resolution Logic

**Query Order for Hierarchy Traversal**:
1. Check project scope (if project_id provided)
2. Check organisation scope (if organisation_id provided)
3. Check global scope (fallback)

**Example Query Pattern** (for `get_flag('maintenance_mode', project_id=123)`):
```python
# Step 1: Try project scope
qs = FeatureFlag.objects.filter(key='maintenance_mode', scope_type=ScopeType.PROJECT, project_id=123)

# Step 2: If not found, try org scope (project.organisation_id)
if not qs.exists():
    qs = FeatureFlag.objects.filter(key='maintenance_mode', scope_type=ScopeType.ORGANISATION, organisation_id=456)

# Step 3: If not found, try global scope
if not qs.exists():
    qs = FeatureFlag.objects.filter(key='maintenance_mode', scope_type=ScopeType.GLOBAL, organisation_id__isnull=True, project_id__isnull=True)

# Return first result or default (False for flags)
```

---

## Cache Layer Schema

**Cache Key Format**:
```
settings:flag:{scope_type}:{scope_id}:{key}
settings:setting:{scope_type}:{scope_id}:{key}
```

**Examples**:
- Global flag: `settings:flag:GLOBAL:none:maintenance_mode`
- Org setting: `settings:setting:ORGANISATION:uuid-456:max_upload_size`
- Project flag: `settings:flag:PROJECT:uuid-123:beta_features`

**Cache Value Format** (JSON):
```json
{
  "value": true,  // or setting value for Settings
  "cached_at": "2025-01-27T10:30:00Z",
  "version": 1  // for cache versioning
}
```

**TTL**: 5 minutes (300 seconds)

**Invalidation Channel Format**:
```
settings:invalidate:{scope_type}:{scope_id}:{key}
```

---

## Migration Strategy

**Migration Order**:
1. Create `FeatureFlag` model (0001_initial.py)
2. Create `Setting` model (0002_add_setting_model.py)
3. Add partial indexes (0003_add_partial_indexes.py)
4. Add GIN index for Setting.value (0004_add_gin_index.py)
5. Seed initial global settings (0005_seed_initial_settings.py - data migration)

**Foreign Key Constraints**:
- `ON DELETE CASCADE` for organisation_id and project_id (if scope deleted, configs deleted)
- `ON DELETE SET NULL` for created_by_id and updated_by_id (preserve audit trail)

---

## Performance Considerations

### Query Optimization
- Use `select_related('organisation', 'project')` for API list views to avoid N+1
- Use `prefetch_related('created_by', 'updated_by')` for admin views
- Partial indexes reduce index size for scope-specific queries (30-50% size reduction)

### Expected Query Patterns
1. **Single Key Lookup** (most common): `O(log n)` with composite index on (key, scope_type)
2. **List All for Scope**: `O(log n)` with partial index on organisation_id/project_id
3. **Hierarchy Resolution**: 3 queries max (project → org → global) with cache layer reducing to 1 query

### Storage Estimates
- FeatureFlag row: ~200 bytes (UUID + metadata)
- Setting row: ~300 bytes (UUID + metadata + JSONB value)
- Expected total: 100-500 rows = 50-150 KB total (negligible storage overhead)

---

## Security Considerations

### Access Control
- Flags/Settings enforce scope-aware permissions via B08 RBAC integration
- Org admins cannot modify global flags (requires superuser)
- Project admins cannot modify org-level flags (requires org admin)

### Audit Trail
- All CRUD operations logged via B09 audit system (post_save/post_delete signals)
- Metadata fields (created_by, updated_by) capture user context
- Audit events include old/new values for change tracking

### Default Value Safety
- Flags default to `False` (deny-by-default principle)
- Settings require explicit `default_value` (validation enforced in serializer)
- No implicit coercion of setting types (type mismatch raises validation error)

---

## Open Questions

1. **Bulk Operations**: Should bulk_create/bulk_update be supported? (Signals don't fire for bulk ops)
2. **Setting Schema Validation**: Should complex JSON settings support JSONSchema validation?
3. **Flag Rollout**: Future support for percentage-based rollouts (stored in metadata field)?
4. **Archive Strategy**: Soft delete vs hard delete for deprecated flags/settings?

---

## Next Steps (Phase 1 Design)

- [ ] Define DRF serializer schemas in contracts/
- [ ] Document Python query API in quickstart.md
- [ ] Specify REST API endpoints with examples
- [ ] Design Django admin customizations (inline forms, filters)
- [ ] Document cache invalidation implementation details
