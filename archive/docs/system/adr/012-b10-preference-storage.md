# ADR 012: Store i18n Preferences in B10 Settings System

**Status**: Accepted

**Date**: 2025-11-29

**Decision Makers**: Platform Architecture Team

---

## Context

Feature B12 (User & Organisation i18n Preferences) requires storing user and organisation-level language, locale, and timezone preferences with precedence resolution (user > org > global). The system must support:

1. **Per-user preferences**: Each user can set personal language, locale, and timezone
2. **Organisation defaults**: Organisations can set default preferences for all members
3. **Global fallbacks**: Platform-wide defaults when no user/org preferences exist
4. **Precedence resolution**: User preferences override organisation defaults override global defaults
5. **Independent field fallback**: Each field (language, locale, timezone) falls back independently
6. **Efficient queries**: Sub-10ms resolution time for preference lookups
7. **Cache invalidation**: Automatic cache clearing when preferences change

### Options Considered

#### Option 1: Dedicated UserPreference Model

Create a new `UserPreference` model with direct relationships:

```python
class UserPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    language = models.CharField(max_length=10)
    locale = models.CharField(max_length=20)
    timezone = models.CharField(max_length=100)

class OrganisationPreference(models.Model):
    organisation = models.OneToOneField(Organisation, on_delete=models.CASCADE)
    language = models.CharField(max_length=10)
    locale = models.CharField(max_length=20)
    timezone = models.CharField(max_length=100)
```

**Pros**:
- Simple schema (one table per scope)
- Direct foreign keys (clear relationships)
- Type safety (individual columns per preference)

**Cons**:
- Duplicate infrastructure (need separate caching layer)
- Duplicate validation logic (language codes, timezones)
- Duplicate signal handlers (cache invalidation)
- No reuse of B10's battle-tested features
- More code to maintain
- Harder to extend (new preference types require schema changes)

#### Option 2: Composite Keys in B10 (ORGANISATION Scope)

Store user preferences in B10 using composite keys at ORGANISATION scope:

```python
# User 123's preferences in Org 456
Setting(
    key="i18n.user.123.preferences",
    scope_type=ScopeType.ORGANISATION,
    organisation_id=456,
    value={"language": "nl", "timezone": "Europe/Amsterdam"}
)

# Org 456's defaults
Setting(
    key="i18n.preferences",
    scope_type=ScopeType.ORGANISATION,
    organisation_id=456,
    value={"language": "en", "timezone": "UTC"}
)
```

**Pros**:
- Uses existing B10 infrastructure
- No schema changes required
- Leverages B10's caching

**Cons**:
- Composite keys are anti-pattern in B10's design
- Complex queries (`key LIKE 'i18n.user.%'`)
- Doesn't follow B10's scope hierarchy
- User preferences tied to organisation (what if user changes orgs?)
- Hard to query "all user preferences"
- Non-standard key format (inconsistent with B10 conventions)

#### Option 3: Extend B10 with USER Scope (CHOSEN)

Add `USER` as a new scope type in B10's `Setting` model:

```python
class ScopeType(models.TextChoices):
    GLOBAL = "GLOBAL"
    ORGANISATION = "ORGANISATION"
    PROJECT = "PROJECT"
    USER = "USER"  # NEW

class Setting(models.Model):
    key = models.CharField(max_length=255)
    scope_type = models.CharField(max_length=50, choices=ScopeType.choices)
    organisation = models.ForeignKey(..., null=True)  # Existing
    project = models.ForeignKey(..., null=True)       # Existing
    user = models.ForeignKey(User, null=True)         # NEW
    value = models.JSONField()
    # ... other fields
```

**Pros**:
- **Consistent architecture**: All settings use same infrastructure
- **Reuses B10's features**: Caching, validation, signals all work automatically
- **Follows scope pattern**: USER joins GLOBAL/ORGANISATION/PROJECT as a first-class scope
- **Easy queries**: `Setting.objects.filter(scope_type=ScopeType.USER, user=user)`
- **Future-proof**: Other features may need user-scoped settings (notifications, UI themes, etc.)
- **Single code path**: One resolution logic for all scopes
- **Type-safe**: JSON field allows flexible preference schema
- **Cache reuse**: B10's Redis cache layer handles user preferences automatically

**Cons**:
- **Schema migration**: Adds nullable `user` ForeignKey to `Setting` model
- **Backwards compatibility**: Requires careful migration to avoid breaking existing B10 API
- **Index overhead**: New database index on `(scope_type, user_id, key)`

---

## Decision

**We will extend B10 with USER scope support** (Option 3).

### Rationale

1. **Architectural Consistency**
   - All Django-core settings (global, org, project, user) managed through one system
   - Reduces cognitive load: Developers learn one settings API, not multiple systems
   - Simplifies debugging: One admin interface shows all settings across all scopes

2. **Code Reuse**
   - B10's caching layer (Redis) handles user preferences automatically
   - B10's validation framework validates user preference values
   - B10's signal handlers invalidate cache when preferences change
   - No duplicate code for caching, validation, or signals

3. **Query Efficiency**
   - Simple queries: `Setting.objects.filter(scope_type='USER', user=user, key='i18n.preferences')`
   - Composite index on `(scope_type, user_id, key)` ensures fast lookups
   - Same query pattern as other scopes (organisation, project, global)

4. **Extensibility**
   - Adding new preference fields requires no schema changes (JSON field)
   - Other features can use USER scope for their own settings:
     - Notification preferences (`notification.preferences`)
     - UI theme preferences (`ui.theme`)
     - Dashboard layout preferences (`dashboard.layout`)
   - Future-proof: USER scope becomes a platform capability, not a one-off feature

5. **Battle-Tested Infrastructure**
   - B10 has been in production since 2023
   - Cache invalidation logic is proven reliable
   - Validation framework handles edge cases (null values, type mismatches)
   - Signal handlers are thoroughly tested

### Implementation Strategy

**Phase 1: B10 Migration (WP01)**
- Add `ScopeType.USER` enum value
- Add `user` ForeignKey to `Setting` model (nullable)
- Add composite index: `(scope_type, user_id, key)`
- Add unique constraint: `(scope_type, user_id, organisation_id, project_id, key)`
- Update B10 API to accept `user` parameter in `get_setting()`
- Add tests for USER scope CRUD operations

**Phase 2: i18n Integration (WP02-WP05)**
- Create `PreferenceResolutionService` using B10's API
- Implement middleware using Django's i18n/timezone activation
- Create DRF API endpoints for preference management
- Add explicit activation helpers for background jobs

**Phase 3: Migration & Documentation (WP06)**
- Create management command to migrate existing User model fields
- Write developer and user documentation
- Add Django admin integration for debugging

---

## Consequences

### Positive

1. **Clean Architecture**: Single source of truth for all settings across all scopes
2. **Reduced Maintenance**: No separate caching/validation/signal logic to maintain
3. **Performance**: B10's Redis cache layer ensures sub-10ms resolution time
4. **Extensibility**: USER scope unlocks future features (notifications, themes, layouts)
5. **Developer Experience**: One API to learn (`Setting.objects.filter(...)`)
6. **Debugging**: Django admin shows all settings (user, org, project, global) in one place

### Negative

1. **Breaking Change for B10**: Adding USER scope is a minor API breaking change
   - **Mitigation**: `user` field is nullable; existing code continues to work
   - **Migration**: Data migration script provided to migrate existing preferences
   - **Versioning**: B10 version bumped to indicate new scope support

2. **Database Index Overhead**: New composite index on `(scope_type, user_id, key)`
   - **Mitigation**: Index only added for USER scope; existing queries unaffected
   - **Performance**: Composite index is narrow (3 columns); overhead is minimal

3. **Query Complexity**: Preference resolution requires up to 3 queries (user, org, global)
   - **Mitigation**: Redis cache eliminates most queries (cache hit rate > 95%)
   - **Performance**: Even with cache miss, 3 queries complete in < 5ms

### Neutral

1. **Learning Curve**: Developers must understand B10's scope concept
   - **Mitigation**: Comprehensive documentation and examples provided
   - **Trade-off**: Learning one system (B10) vs. learning multiple custom systems

2. **JSON Field Flexibility**: Preferences stored as JSON (not individual columns)
   - **Trade-off**: Schema flexibility vs. database-level type constraints
   - **Mitigation**: Application-level validation (serializers) enforces schema

---

## Related Decisions

- **B10 (Settings & Feature Flags)**: Established in 2023, proven production system
- **B04 (Multi-Tenancy)**: Organisation scope already exists in B10
- **B05 (Hierarchical Permissions)**: Precedence concept aligns with permission inheritance
- **B08 (Projects/Workspaces)**: Project scope already exists in B10

---

## Alternatives Considered (Detailed Analysis)

### Why Not Separate Model?

A dedicated `UserPreference` model seems simpler initially:

```python
class UserPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    language = models.CharField(max_length=10)
    locale = models.CharField(max_length=20)
    timezone = models.CharField(max_length=100)
```

**Problems**:
1. **Caching**: Need to implement Redis caching from scratch
   - Cache key generation
   - Cache invalidation on updates
   - Cache warming strategies
   - All already solved in B10

2. **Validation**: Need to validate language codes, timezones
   - Django's `LANGUAGES` setting integration
   - pytz timezone validation
   - Custom ValidationError messages
   - All already solved in B10

3. **Signal Handlers**: Need to trigger cache invalidation
   - `post_save` signal to clear cache
   - `post_delete` signal to clear cache
   - All already solved in B10

4. **Extensibility**: Adding new preference types requires schema changes
   - New column: `ALTER TABLE` migration
   - New validation logic
   - JSON field (B10's approach) avoids this

5. **Code Duplication**: ~300 lines of code duplicating B10 functionality

**Verdict**: Separate model trades short-term simplicity for long-term maintenance burden.

### Why Not Composite Keys?

Storing user preferences as `i18n.user.123.preferences` seems clever:

```python
Setting(
    key="i18n.user.123.preferences",  # User ID in key
    scope_type=ScopeType.ORGANISATION,
    organisation_id=456,
    value={"language": "nl"}
)
```

**Problems**:
1. **Query Complexity**: Finding user's preferences requires string manipulation
   ```python
   Setting.objects.filter(key=f"i18n.user.{user_id}.preferences", scope_type="ORGANISATION")
   ```

2. **Cross-Organisation**: User changes organisations → need to migrate preferences
   - Old: `i18n.user.123.preferences` in org 456
   - New: `i18n.user.123.preferences` in org 789
   - Requires custom migration logic

3. **List All Users**: "Show all users with custom preferences"
   ```python
   # Ugly query
   Setting.objects.filter(key__startswith="i18n.user.", scope_type="ORGANISATION")
   ```

4. **Inconsistent Pattern**: Other scopes use foreign keys, not composite keys
   - PROJECT scope: Has `project_id` foreign key
   - ORGANISATION scope: Has `organisation_id` foreign key
   - USER scope: Why not `user_id` foreign key?

5. **Cache Key Ambiguity**: B10's cache key format doesn't support composite keys
   ```python
   # Current: cache:setting:{scope}:{scope_id}:{key}
   # Composite: cache:setting:ORGANISATION:456:i18n.user.123.preferences (confusing)
   ```

**Verdict**: Composite keys violate B10's design principles and create maintenance complexity.

---

## Implementation Notes

### B10 API Changes

**Before** (existing API):
```python
Setting.get_setting(
    key="feature.flag",
    scope_type=ScopeType.ORGANISATION,
    organisation=org,
)
```

**After** (with USER scope):
```python
Setting.get_setting(
    key="i18n.preferences",
    scope_type=ScopeType.USER,
    user=user,  # NEW PARAMETER
)
```

**Backwards Compatibility**: Existing calls work unchanged (user parameter is optional).

### Cache Key Format

```python
# USER scope
cache:setting:USER:123:i18n.preferences

# ORGANISATION scope (unchanged)
cache:setting:ORGANISATION:456:i18n.preferences

# GLOBAL scope (unchanged)
cache:setting:GLOBAL:None:i18n.preferences
```

### Database Schema

```sql
-- Before (existing columns)
CREATE TABLE settings_setting (
    id BIGSERIAL PRIMARY KEY,
    key VARCHAR(255) NOT NULL,
    scope_type VARCHAR(50) NOT NULL,
    organisation_id BIGINT NULL REFERENCES organisations(id),
    project_id BIGINT NULL REFERENCES projects(id),
    value JSONB NOT NULL,
    -- ... other columns
);

-- After (added user column)
ALTER TABLE settings_setting
ADD COLUMN user_id BIGINT NULL REFERENCES accounts_user(id) ON DELETE CASCADE;

-- New composite index for USER scope
CREATE INDEX idx_setting_user_lookup
ON settings_setting(scope_type, user_id, key)
WHERE scope_type = 'USER';

-- Updated unique constraint (includes user_id)
ALTER TABLE settings_setting
DROP CONSTRAINT IF EXISTS unique_setting_scope;

ALTER TABLE settings_setting
ADD CONSTRAINT unique_setting_scope
UNIQUE (scope_type, organisation_id, project_id, user_id, key);
```

---

## References

- **B10 Documentation**: `src/settings/README.md`
- **Feature Specification**: `kitty-specs/012-user-organisation-i18n/spec.md`
- **Research Notes**: `kitty-specs/012-user-organisation-i18n/research.md` (Decision 2: Storage Strategy)
- **Django i18n Documentation**: https://docs.djangoproject.com/en/5.1/topics/i18n/
- **Django Timezone Documentation**: https://docs.djangoproject.com/en/5.1/topics/i18n/timezones/

---

## Review History

- **2025-11-29**: Initial decision documented
- **Reviewed by**: Platform Architecture Team
- **Status**: Accepted
