# Data Model: User & Organisation i18n Preferences

**Feature**: B12 - User & Organisation i18n Preferences
**Date**: 2025-11-29

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    B10 Settings System (Extended)                │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  │ extends
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│  Setting (B10 model - MODIFIED)                                   │
├──────────────────────────────────────────────────────────────────┤
│  id: UUID (PK)                                                    │
│  key: CharField(255)                                              │
│  value: JSONField          ← stores {language, locale, timezone}  │
│  value_type: CharField     ← "JSON" for i18n preferences          │
│  scope_type: CharField     ← NEW: supports "USER" scope           │
│  user: FK(User) [NEW]      ← NULL for non-USER scopes             │
│  organisation: FK(Org)     ← NULL for USER/GLOBAL scopes          │
│  project: FK(Project)      ← NULL for USER/ORG/GLOBAL scopes      │
│  created_at, updated_at    │
│  created_by, updated_by    │
├──────────────────────────────────────────────────────────────────┤
│  Unique: (key, scope_type, user, organisation, project)          │
│  Index: key, scope_type                                           │
└──────────────────────────────────────────────────────────────────┘
         │                          │                         │
         │                          │                         │
         │ FK                       │ FK                      │ FK
         ▼                          ▼                         ▼
┌────────────────┐      ┌─────────────────────┐    ┌─────────────────┐
│  User (B05)    │      │ Organisation (B06)  │    │ Project (B07)   │
├────────────────┤      ├─────────────────────┤    ├─────────────────┤
│  id: UUID      │      │  id: UUID           │    │  id: UUID       │
│  username      │      │  name               │    │  name           │
│  email         │      │  slug               │    │  slug           │
│  ...           │      │  ...                │    │  ...            │
└────────────────┘      └─────────────────────┘    └─────────────────┘
```

---

## Core Entities

### 1. Setting (Extended B10 Model)

**Purpose**: Store user and organisation i18n preferences using B10's existing infrastructure

**Modifications to B10**:
```python
class ScopeType(models.TextChoices):
    """Scope levels for settings and feature flags."""
    GLOBAL = "GLOBAL", "Global"
    ORGANISATION = "ORGANISATION", "Organisation"
    PROJECT = "PROJECT", "Project"
    USER = "USER", "User"  # NEW

class Setting(models.Model):
    """Configuration setting model with typed values."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key = models.CharField(max_length=255, db_index=True)
    value = models.JSONField(default=dict)
    value_type = models.CharField(max_length=20, choices=SettingType.choices)
    default_value = models.JSONField()
    description = models.TextField(blank=True)
    scope_type = models.CharField(max_length=20, choices=ScopeType.choices)

    # NEW: User scope support
    user = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="settings",
    )

    organisation = models.ForeignKey(
        "organisations.Organisation",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="settings",
    )
    project = models.ForeignKey(
        "projects.Project",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="settings",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )

    class Meta:
        db_table = "settings_setting"
        constraints = [
            models.UniqueConstraint(
                fields=["key", "scope_type", "user", "organisation", "project"],
                name="unique_setting_scope_with_user",  # UPDATED
            ),
        ]
```

**Example Records**:

User preference (scope=USER):
```json
{
  "key": "i18n.preferences",
  "value": {"language": "nl", "locale": "nl-NL", "timezone": "Europe/Amsterdam"},
  "value_type": "JSON",
  "scope_type": "USER",
  "user_id": "uuid-of-user-123",
  "organisation": null,
  "project": null
}
```

Organisation default (scope=ORGANISATION):
```json
{
  "key": "i18n.preferences",
  "value": {"language": "de", "locale": "de-DE", "timezone": "Europe/Berlin"},
  "value_type": "JSON",
  "scope_type": "ORGANISATION",
  "user": null,
  "organisation_id": "uuid-of-org-456",
  "project": null
}
```

Global default (scope=GLOBAL):
```json
{
  "key": "i18n.preferences",
  "value": {"language": "en", "locale": "en-US", "timezone": "UTC"},
  "value_type": "JSON",
  "scope_type": "GLOBAL",
  "user": null,
  "organisation": null,
  "project": null
}
```

---

### 2. EffectivePreferences (Computed, Not Stored)

**Purpose**: Result of precedence resolution algorithm

**Structure**:
```python
from dataclasses import dataclass
from typing import Literal

@dataclass
class EffectivePreferences:
    """Resolved preferences with source attribution."""
    language: str  # ISO 639-1 code
    locale: str    # BCP 47 locale code
    timezone: str  # IANA time zone name

    # Source attribution for debugging
    language_source: Literal["user", "organisation", "global"]
    locale_source: Literal["user", "organisation", "global"]
    timezone_source: Literal["user", "organisation", "global"]
```

**Example**:
```python
EffectivePreferences(
    language="nl",           # from user
    locale="nl-NL",          # from user
    timezone="Europe/Berlin", # from organisation (user didn't set)
    language_source="user",
    locale_source="user",
    timezone_source="organisation"
)
```

---

## Validation Rules

### Language Field

- **Type**: String (ISO 639-1 code)
- **Validation**: Must exist in `settings.LANGUAGES`
- **Examples**: `"en"`, `"nl"`, `"de"`, `"fr"`
- **Error**: HTTP 400 if invalid
- **Nullability**: Optional (can be omitted for partial preferences)

### Locale Field

- **Type**: String (BCP 47 locale code)
- **Validation**: Must exist in available Django locales
- **Examples**: `"en-US"`, `"nl-NL"`, `"de-DE"`, `"en-GB"`
- **Error**: HTTP 400 if invalid
- **Nullability**: Optional (can be omitted for partial preferences)

### Timezone Field

- **Type**: String (IANA time zone database name)
- **Validation**: Must exist in `pytz.all_timezones`
- **Examples**: `"UTC"`, `"Europe/Amsterdam"`, `"America/New_York"`, `"Asia/Tokyo"`
- **Error**: HTTP 400 if invalid
- **Nullability**: Optional (can be omitted for partial preferences)

---

## State Transitions

### User Preference Lifecycle

```
┌─────────────────┐
│  Not Set        │  Initial state
│  (use org/global│
│   defaults)     │
└────────┬────────┘
         │ User sets preference via API/UI
         ▼
┌─────────────────┐
│  Preference Set │  Stored in B10 with scope=USER
│  (cached in     │
│   Redis)        │
└────────┬────────┘
         │
         ├─► Update: User modifies preference
         │   → Cache invalidated via B10 signal
         │   → New value cached on next request
         │
         ├─► Partial Update: User sets only language
         │   → Timezone/locale fall back to org/global
         │   → Independent resolution per field
         │
         └─► Delete: User resets to defaults
             → Setting record deleted
             → Cache cleared
             → Falls back to org/global
```

### Organisation Default Lifecycle

```
┌─────────────────┐
│  Not Set        │  Initial state
│  (use global    │
│   defaults)     │
└────────┬────────┘
         │ Org admin sets defaults via API/admin
         ▼
┌─────────────────┐
│  Default Set    │  Stored in B10 with scope=ORGANISATION
│  (cached)       │
└────────┬────────┘
         │
         ├─► Update: Admin modifies defaults
         │   → Cache invalidated
         │   → Affects users without custom preferences
         │   → Users with custom preferences unchanged
         │
         └─► Organisation Deleted
             → Cascade delete (on_delete=CASCADE)
             → Users fall back to global defaults
```

---

## Query Patterns

### Resolution Algorithm (Precedence: user > org > global)

```python
def get_effective_preferences(user, organisation):
    """
    Resolve effective preferences following precedence rules.

    Returns EffectivePreferences with source attribution.
    """
    # Fetch user preference (if exists)
    user_pref = get_setting(
        key="i18n.preferences",
        scope_type=ScopeType.USER,
        user=user
    )

    # Fetch org default (if exists)
    org_pref = get_setting(
        key="i18n.preferences",
        scope_type=ScopeType.ORGANISATION,
        organisation=organisation
    )

    # Fetch global default (always exists)
    global_pref = get_setting(
        key="i18n.preferences",
        scope_type=ScopeType.GLOBAL
    )

    # Resolve each field independently
    return EffectivePreferences(
        language=user_pref.get("language") or org_pref.get("language") or global_pref["language"],
        locale=user_pref.get("locale") or org_pref.get("locale") or global_pref["locale"],
        timezone=user_pref.get("timezone") or org_pref.get("timezone") or global_pref["timezone"],
        language_source=_get_source(user_pref, org_pref, "language"),
        locale_source=_get_source(user_pref, org_pref, "locale"),
        timezone_source=_get_source(user_pref, org_pref, "timezone"),
    )
```

### Cache Strategy

**Cache Keys**:
- User preference: `i18n:user:{user_id}`
- Org default: `i18n:org:{org_id}`
- Global default: `i18n:global` (rarely changes)

**Cache Population**:
1. Check cache for user preference
2. If miss, query B10's Setting table
3. Store in cache (indefinite TTL)
4. Return value

**Cache Invalidation** (via B10 signals):
```python
@receiver(post_save, sender=Setting)
def invalidate_preference_cache(sender, instance, **kwargs):
    if instance.key == "i18n.preferences":
        if instance.scope_type == ScopeType.USER:
            cache.delete(f"i18n:user:{instance.user_id}")
        elif instance.scope_type == ScopeType.ORGANISATION:
            cache.delete(f"i18n:org:{instance.organisation_id}")
```

---

## Database Indexes

### Existing B10 Indexes (Maintained)

```sql
CREATE INDEX idx_settings_key ON settings_setting(key);
CREATE INDEX idx_settings_scope_type ON settings_setting(scope_type);
```

### New Composite Indexes (Recommended)

```sql
-- Fast user preference lookup
CREATE INDEX idx_settings_user_scope
ON settings_setting(key, scope_type, user_id)
WHERE scope_type = 'USER';

-- Fast org default lookup
CREATE INDEX idx_settings_org_scope
ON settings_setting(key, scope_type, organisation_id)
WHERE scope_type = 'ORGANISATION';
```

**Query Performance**:
- User lookup: O(1) with index on (key, scope_type, user_id)
- Org lookup: O(1) with index on (key, scope_type, organisation_id)
- Cache hit: O(1) from Redis
- Cold cache: 2-3 DB queries (user, org, global) parallelizable

---

## Data Integrity Constraints

### Database-Level Constraints

1. **Unique Constraint**: Prevents duplicate settings per scope
   ```sql
   UNIQUE (key, scope_type, user, organisation, project)
   ```

2. **Foreign Key Constraints**:
   - `user` → `accounts_user(id)` ON DELETE CASCADE
   - `organisation` → `organisations_organisation(id)` ON DELETE CASCADE
   - `project` → `projects_project(id)` ON DELETE CASCADE

3. **Check Constraints** (via Django model validation):
   - `scope_type=USER` → `user` must be NOT NULL
   - `scope_type=ORGANISATION` → `organisation` must be NOT NULL
   - `scope_type=GLOBAL` → `user`, `organisation`, `project` must be NULL

### Application-Level Validation

```python
class PreferenceValidator:
    """Validates i18n preference values."""

    @staticmethod
    def validate_language(language: str) -> None:
        allowed = dict(settings.LANGUAGES).keys()
        if language not in allowed:
            raise ValidationError(
                f"Unsupported language: {language}. Allowed: {list(allowed)}"
            )

    @staticmethod
    def validate_locale(locale: str) -> None:
        # Check against Django's available locales
        from django.conf.locale import LANG_INFO
        if locale not in LANG_INFO:
            raise ValidationError(
                f"Unsupported locale: {locale}"
            )

    @staticmethod
    def validate_timezone(timezone: str) -> None:
        import pytz
        if timezone not in pytz.all_timezones:
            raise ValidationError(
                f"Unsupported timezone: {timezone}"
            )
```

---

## Migration Strategy

### Phase 1: Extend B10 (Backwards Compatible)

**Migration**: `settings/migrations/0005_add_user_scope.py`

```python
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('settings', '0004_previous_migration'),
        ('accounts', '0001_initial'),  # Ensure User model exists
    ]

    operations = [
        # Add USER to ScopeType choices
        migrations.AlterField(
            model_name='setting',
            name='scope_type',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('GLOBAL', 'Global'),
                    ('ORGANISATION', 'Organisation'),
                    ('PROJECT', 'Project'),
                    ('USER', 'User'),  # NEW
                ]
            ),
        ),
        # Add user ForeignKey
        migrations.AddField(
            model_name='setting',
            name='user',
            field=models.ForeignKey(
                to='accounts.User',
                null=True,
                blank=True,
                on_delete=models.CASCADE,
                related_name='settings',
            ),
        ),
        # Update unique constraint
        migrations.RemoveConstraint(
            model_name='setting',
            name='unique_setting_scope',
        ),
        migrations.AddConstraint(
            model_name='setting',
            constraint=models.UniqueConstraint(
                fields=['key', 'scope_type', 'user', 'organisation', 'project'],
                name='unique_setting_scope_with_user',
            ),
        ),
        # Add composite indexes for performance
        migrations.AddIndex(
            model_name='setting',
            index=models.Index(
                fields=['key', 'scope_type', 'user'],
                name='idx_settings_user_scope',
                condition=models.Q(scope_type='USER'),
            ),
        ),
    ]
```

### Phase 2: Populate Global Default

**Data Migration**: `i18n_preferences/migrations/0001_initial_global_default.py`

```python
def populate_global_default(apps, schema_editor):
    Setting = apps.get_model('settings', 'Setting')
    Setting.objects.get_or_create(
        key='i18n.preferences',
        scope_type='GLOBAL',
        defaults={
            'value': {
                'language': settings.LANGUAGE_CODE,  # e.g., 'en'
                'locale': 'en-US',
                'timezone': settings.TIME_ZONE,  # e.g., 'UTC'
            },
            'value_type': 'JSON',
            'description': 'Global default i18n preferences',
        }
    )

class Migration(migrations.Migration):
    dependencies = [
        ('settings', '0005_add_user_scope'),
    ]

    operations = [
        migrations.RunPython(populate_global_default),
    ]
```

### Phase 3: Migrate Existing User Data (If Applicable)

**Management Command**: `python manage.py migrate_user_i18n_preferences`

```python
# Handles migration from User model fields (language, timezone) to B10
# See research.md Decision 4 for details
```

---

**Data Model Complete**: Ready for API contract design and implementation
