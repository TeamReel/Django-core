---
lane: "doing"
agent: "copilot"
shell_pid: "17932"
---
# Work Package 06: Migration & Documentation

**Status**: 📋 Planned
**Priority**: P2 (Medium)
**Owner**: Feature developer
**Dependencies**: WP02, WP04 (requires core functionality + API)
**Location**: `src/i18n_preferences/management/commands/`, `docs/`

---

## Metadata

```yaml
work_package_id: WP06
feature: 012-user-organisation-i18n
subtasks: [T036, T037, T038, T039, T040, T041]
lane: planned
estimated_effort: 4-5 days
risk_level: medium
parallel_safe: true
blocks: []
```

## Objective

Provide data migration command for existing User model fields, comprehensive documentation, and Django admin integration to support smooth adoption and knowledge transfer.

---

## Subtask Breakdown

### T036: Create Management Command `migrate_user_i18n_preferences`

**File**: `src/i18n_preferences/management/commands/migrate_user_i18n_preferences.py`

**Implementation**:
```python
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from settings.models import Setting, ScopeType
from i18n_preferences.validators import (
    validate_language_code,
    validate_timezone,
)

User = get_user_model()


class Command(BaseCommand):
    help = "Migrate user language/timezone from User model fields to B10 settings"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be migrated without making changes",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=1000,
            help="Number of users to process per batch",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        batch_size = options["batch_size"]

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN MODE - no changes will be made"))

        # Query users with legacy fields (adapt to your User model)
        users = User.objects.exclude(language__isnull=True).exclude(language="")
        total = users.count()

        self.stdout.write(f"Found {total} users with language/timezone to migrate")

        migrated = 0
        errors = 0

        for user in users.iterator(chunk_size=batch_size):
            try:
                # Validate before migration
                language = getattr(user, "language", None)
                timezone = getattr(user, "timezone", None) or "UTC"

                prefs = {}
                if language:
                    validate_language_code(language)
                    prefs["language"] = language
                if timezone:
                    validate_timezone(timezone)
                    prefs["timezone"] = timezone

                # Create B10 setting
                if not dry_run:
                    Setting.objects.update_or_create(
                        key="i18n.preferences",
                        scope_type=ScopeType.USER,
                        user=user,
                        defaults={"value": prefs, "value_type": "JSON"},
                    )

                migrated += 1

                if migrated % 100 == 0:
                    self.stdout.write(f"Migrated {migrated}/{total} users...")

            except Exception as e:
                errors += 1
                self.stdout.write(
                    self.style.ERROR(f"Error migrating user {user.id}: {e}")
                )

        self.stdout.write(
            self.style.SUCCESS(f"Migration complete: {migrated} migrated, {errors} errors")
        )
```

**Acceptance**:
- Command reads User model fields (`user.language`, `user.timezone`)
- Creates B10 settings with USER scope
- Dry-run mode shows what would be migrated
- Progress reporting for large datasets
- Validation errors logged, don't stop migration

---

### T037: Add Dry-Run Mode + Progress Reporting

**Already covered in T036** - the command includes:
- `--dry-run` flag for safe preview
- Progress updates every 100 users
- Error logging with user ID
- Final summary: migrated count + error count

**Test**:
```bash
# Preview migration
python manage.py migrate_user_i18n_preferences --dry-run

# Run migration
python manage.py migrate_user_i18n_preferences

# Run in batches
python manage.py migrate_user_i18n_preferences --batch-size=500
```

---

### T038: Create Django Admin Integration

**File**: `src/i18n_preferences/admin.py`

**Implementation**:
```python
from django.contrib import admin
from django.utils.html import format_html
from settings.models import Setting, ScopeType
from .services import PreferenceResolutionService


@admin.register(Setting)
class PreferenceSettingAdmin(admin.ModelAdmin):
    """Enhanced admin for i18n preferences with effective view."""

    list_display = ["key", "scope_type", "user", "organisation", "value_preview"]
    list_filter = ["scope_type", "key"]
    search_fields = ["user__username", "organisation__name"]

    def value_preview(self, obj):
        """Show JSON value in readable format."""
        if obj.key == "i18n.preferences":
            return format_html(
                "<code>{}</code>",
                str(obj.value)
            )
        return obj.value

    value_preview.short_description = "Preferences"


# Add inline to User admin
class UserPreferenceInline(admin.StackedInline):
    """Show user's stored + effective preferences in User admin."""
    model = Setting
    extra = 0
    can_delete = True
    verbose_name = "i18n Preferences"
    verbose_name_plural = "i18n Preferences"

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.filter(key="i18n.preferences", scope_type=ScopeType.USER)

    readonly_fields = ["effective_preferences"]

    def effective_preferences(self, obj):
        """Show computed effective preferences for debugging."""
        if obj.user:
            prefs = PreferenceResolutionService.get_effective_preferences(
                user=obj.user,
                organisation=getattr(obj.user, 'organisation', None)
            )
            return format_html(
                "<strong>Effective:</strong><br>"
                "Language: {} ({})<br>"
                "Locale: {} ({})<br>"
                "Timezone: {} ({})",
                prefs.language, prefs.language_source,
                prefs.locale, prefs.locale_source,
                prefs.timezone, prefs.timezone_source,
            )
        return "N/A"

    effective_preferences.short_description = "Effective Preferences"
```

**Acceptance**:
- Django admin shows user preferences in User detail view
- Inline displays both stored + effective preferences
- Source attribution visible for debugging

---

### T039: Write User Guide

**File**: `docs/i18n-preferences.md`

**Sections**:
1. **Overview**: What are i18n preferences, why they matter
2. **Setting User Preferences**:
   - Via profile page (if UI exists)
   - Via API: `PATCH /api/v1/preferences/me/`
3. **Organisation Defaults**:
   - Setting org-wide defaults
   - Who can manage (org admins)
4. **Understanding Precedence**:
   - User > Organisation > Global
   - Independent fallback per field
   - Examples with diagrams
5. **Viewing Effective Preferences**:
   - API endpoint: `GET /api/v1/preferences/effective/`
   - Django admin inspection
6. **Troubleshooting**:
   - "My preference isn't applying" → Check middleware ordering
   - "Wrong timezone" → Verify time zone string format
   - "Validation error" → Check supported languages/locales

**Length**: ~1000-1500 words with code examples

---

### T040: Write Developer Guide

**File**: `docs/i18n-integration.md`

**Sections**:
1. **Architecture Overview**: B10 integration, middleware, API
2. **Using the API**:
   - User preference endpoints
   - Org preference endpoints
   - Effective preference endpoint
   - Request/response examples
3. **Background Jobs**:
   - Using `user_locale_context()` in Celery tasks
   - Example: Email generation with user's locale
4. **Management Commands**:
   - Activating user locale for batch operations
   - Example: Data export command
5. **Extending Preferences**:
   - Adding new preference types (e.g., date format)
   - How to use B10's settings schema
6. **Testing**:
   - Testing with different locales
   - Mocking preference resolution
7. **Performance Considerations**:
   - Caching behavior
   - Cache invalidation
   - Graceful degradation

**Length**: ~2000-2500 words with code examples

---

### T041: Write ADR

**File**: `docs/adr/012-b10-preference-storage.md`

**Template**:
```markdown
# ADR 012: Store i18n Preferences in B10 Settings System

## Status
Accepted

## Context
B12 (User & Organisation i18n Preferences) requires storing user and organisation-level language, locale, and timezone preferences with precedence resolution. Three storage options were considered:

1. Separate UserPreference model (dedicated table)
2. Composite keys in B10 at ORGANISATION scope (e.g., `i18n.user.{user_id}.preferences`)
3. Extend B10 with USER scope (add user ForeignKey to Setting model)

## Decision
Extend B10 with USER scope support.

## Rationale
- **Consistency**: All settings (user, org, project, global) use same infrastructure
- **Caching**: Leverages B10's Redis cache layer (no duplicate cache logic)
- **Validation**: Reuses B10's validation framework
- **Signals**: B10's cache invalidation signals work automatically
- **Future-proof**: Other features may need user-scoped settings (notifications, UI themes)
- **Single query path**: Preference resolution uses B10's existing API

**Rejected Alternatives**:
- Separate model: Duplicates caching/validation infrastructure
- Composite keys: Complex queries, doesn't follow B10's scope pattern

## Consequences
- **Positive**: Clean architecture, minimal code, reuses battle-tested B10 infrastructure
- **Negative**: Requires B10 migration (adding USER scope is breaking change for B10 API)
- **Mitigation**: B10 migration is backwards compatible (user field is nullable)

## References
- B10 (Settings & Feature Flags): `src/settings/`
- B12 Spec: `kitty-specs/012-user-organisation-i18n/spec.md`
- Planning Decision: `kitty-specs/012-user-organisation-i18n/research.md` (Decision 2)
```

**Acceptance**:
- ADR follows standard format (Status, Context, Decision, Rationale, Consequences)
- Explains why B10 extension was chosen over alternatives
- Documents trade-offs clearly

---

## Implementation Sequence

**Day 1-2: Migration Command**
1. T036 (implement command)
2. T037 (test dry-run mode, progress reporting)

**Day 2-3: Admin Integration**
3. T038 (create admin inline, effective preference display)

**Day 3-5: Documentation**
4. T039 (user guide)
5. T040 (developer guide)
6. T041 (ADR)

---

## Definition of Done

- [ ] Management command `migrate_user_i18n_preferences` implemented
- [ ] Dry-run mode works, progress reporting included
- [ ] Django admin shows user/org preferences with effective view
- [ ] User guide written (`docs/i18n-preferences.md`)
- [ ] Developer guide written (`docs/i18n-integration.md`)
- [ ] ADR written (`docs/adr/012-b10-preference-storage.md`)
- [ ] All documentation reviewed for clarity and accuracy

---

## Reviewer Guidance

**Critical Checks**:
1. **Migration Safety**: Dry-run mode works, validation prevents bad data
2. **Admin UX**: Effective preferences visible for debugging
3. **Documentation Completeness**: All user stories from spec covered
4. **Code Examples**: Documentation includes working code snippets

**Test Scenarios**:
- Run migration on test dataset with 1000+ users
- Verify admin displays effective preferences correctly
- Follow developer guide to implement background job
- Verify ADR explains trade-offs clearly

## Activity Log

- 2025-11-29T11:58:59Z – copilot – shell_pid=17932 – lane=doing – Started implementation: Final work package - migration and documentation
