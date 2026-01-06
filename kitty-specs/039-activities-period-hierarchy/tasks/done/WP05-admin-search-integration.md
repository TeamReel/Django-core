---
lane: "done"
agent: "system"
assignee: "claude"
shell_pid: "36572"
---
# Work Package 05: Admin & Search Integration

---
**work_package_id**: WP05
**lane**: done
**agent**: claude-reviewer
**shell_pid**: 36572
**review_status**: approved without changes
**reviewed_by**: claude-reviewer
**priority**: P2
**estimated_effort**: 2 hours
**dependencies**: WP01
**blocks**: None
**subtasks**: T007, T019
**history**:
  - 2026-01-05: Created during /spec-kitty.tasks generation
---

## Review Feedback

**Status**: ✅ **APPROVED WITHOUT CHANGES**

**Summary**: All Definition of Done criteria satisfied. Django admin interfaces and B14 search integration implemented correctly with proper error handling and optimization.

**Key Strengths**:
1. Admin configuration exceeds spec by adding autocomplete_fields for parent_period FK
2. Search indexes correctly follow existing B14 pattern (SearchIndex base class)
3. Proper error handling with try/except ImportError and warning log
4. Comprehensive docstrings on all classes and methods
5. ParticipationAdmin includes select_related optimization to prevent N+1 queries
6. Visibility filtering correctly handles superusers and organisation membership
7. URLs appropriately point to admin change views (no frontend detail views exist yet)

**Verification Performed**:
- [x] Django system check: 0 issues
- [x] B03 Constitution Engine: 0 violations
- [x] B08 Permissions: 18 permissions registered
- [x] Security validation: PASS
- [x] Code formatting: Black/Ruff passed
- [x] Admin classes registered with @admin.register decorators
- [x] Search indexes inherit from SearchIndex base class
- [x] AppConfig.ready() properly imports search module with fallback

---

## Objective

Configure Django admin interface for Period, Activity, Participation models with inline editing and filtering. Register models with B14 Full-Text Search for search functionality.

## Context

Admin interface provides fallback UI for staff users. Search enables finding periods and activities by text query. Both are operational enhancements that don't block core API functionality.

## Detailed Guidance

### T007: Configure Django Admin

```python
# src/activities/admin.py

from django.contrib import admin
from .models import Period, Activity, Participation

class ChildPeriodInline(admin.TabularInline):
    model = Period
    fk_name = 'parent_period'
    extra = 0
    fields = ['name', 'start_date', 'end_date']
    show_change_link = True

@admin.register(Period)
class PeriodAdmin(admin.ModelAdmin):
    list_display = ['name', 'organisation', 'project', 'parent_period', 'start_date', 'end_date', 'children_count']
    list_filter = ['organisation', 'project', 'start_date']
    search_fields = ['name', 'description']
    date_hierarchy = 'start_date'
    inlines = [ChildPeriodInline]
    readonly_fields = ['created_at', 'updated_at', 'created_by']

    def children_count(self, obj):
        return obj.children.count()
    children_count.short_description = 'Children'

class ParticipationInline(admin.TabularInline):
    model = Participation
    fk_name = 'activity'
    extra = 0
    fields = ['member', 'role', 'status', 'notes']
    autocomplete_fields = ['member']

@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ['title', 'project', 'period', 'activity_type', 'start_time', 'location']
    list_filter = ['project', 'activity_type', 'start_time']
    search_fields = ['title', 'description', 'location']
    date_hierarchy = 'start_time'
    inlines = [ParticipationInline]
    readonly_fields = ['created_at', 'updated_at', 'created_by']
    autocomplete_fields = ['project', 'period']

@admin.register(Participation)
class ParticipationAdmin(admin.ModelAdmin):
    list_display = ['member', 'activity', 'period', 'role', 'status', 'created_at']
    list_filter = ['role', 'status', 'created_at']
    search_fields = ['member__user__username', 'member__user__email', 'notes']
    readonly_fields = ['created_at', 'updated_at', 'created_by']
    autocomplete_fields = ['member', 'activity', 'period']

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('member', 'activity', 'period')
```

### T019: Register with B14 Search

**Step 1**: Identify B14 API pattern by checking existing registrations in Core

Example patterns:
```python
# Pattern A: Function-based registration
from search.registry import register_search
register_search(Period, fields=['name', 'description'])

# Pattern B: Decorator-based
from search.decorators import searchable
@searchable(fields=['name', 'description'])
class Period(models.Model): ...

# Pattern C: Signal-based (AppConfig)
from search.signals import register_model
register_model.send(sender=Period, fields=['name', 'description'])
```

**Step 2**: Create `src/activities/search.py`

```python
# Assuming Pattern A (adjust based on actual B14 API)

from search.registry import register_search
from .models import Period, Activity

# Register Period for search
register_search(
    Period,
    fields=['name', 'description'],
    boost={'name': 2.0}  # Name matches rank higher
)

# Register Activity for search
register_search(
    Activity,
    fields=['title', 'description', 'location', 'activity_type'],
    boost={'title': 2.0}
)
```

**Step 3**: Import in AppConfig

```python
# src/activities/apps.py

class ActivitiesConfig(AppConfig):
    ...

    def ready(self):
        import activities.signals
        import activities.search  # Register search models
```

**Fallback if B14 not available**: Skip search registration, log warning:
```python
try:
    import activities.search
except ImportError:
    import logging
    logging.getLogger(__name__).warning("B14 search module not available, skipping search registration")
```

## Test Strategy

### Admin Interface Tests

Manual testing checklist:
1. Access /admin/activities/period/ as staff user
2. Create root period via admin
3. Create child period via admin (select parent from dropdown)
4. Verify inline children display on parent period detail page
5. Access /admin/activities/activity/ as staff user
6. Create activity via admin (use autocomplete for period)
7. Add participants via inline on activity detail page
8. Search for "match" in admin search bar → activities appear

### Search Integration Tests

```python
# src/activities/tests/test_search.py

@pytest.mark.django_db
def test_period_search_registration():
    """Test Period registered with B14 search"""
    try:
        from search.registry import get_searchable_models

        searchable_models = get_searchable_models()
        assert Period in searchable_models
    except ImportError:
        pytest.skip("B14 search module not available")

@pytest.mark.django_db
def test_search_periods_by_name(organisation):
    """Test full-text search for periods"""
    Period.objects.create(
        organisation=organisation,
        name="Football Season 2023",
        description="Main competition",
        start_date=date(2023, 9, 1),
        end_date=date(2024, 6, 30)
    )

    try:
        from search.api import search

        results = search(query="football")
        period_results = [r for r in results if r.model == Period]

        assert len(period_results) > 0
        assert "Football Season 2023" in [r.name for r in period_results]
    except ImportError:
        pytest.skip("B14 search API not available")
```

## Definition of Done

- [x] PeriodAdmin configured with list_display, filters, search, inlines
- [x] ActivityAdmin configured with inlines for participants
- [x] ParticipationAdmin configured with autocomplete
- [x] Admin interface accessible at /admin/activities/
- [x] Period and Activity registered with B14 search
- [x] Search query returns periods/activities (manual test or unit test)

## Risks & Reviewer Guidance

**Risk**: B14 search API signature unknown
**Mitigation**: Check existing B14 registrations in Core, adjust pattern accordingly

**Risk**: Admin autocomplete may be slow for large datasets
**Mitigation**: Add autocomplete_fields only for FK with <10k records

**Reviewer Checklist**:
- [ ] Admin list_display fields match spec (no sensitive data exposed)
- [ ] Search fields include all user-visible text fields
- [ ] Inlines use TabularInline for compact display
- [ ] Autocomplete fields set for FKs to prevent dropdown overload

## Activity Log

- 2026-01-06T08:37:04Z – system – shell_pid= – lane=doing – Moved to doing
- 2026-01-06T08:39:05Z – system – shell_pid= – lane=for_review – Moved to for_review
- 2026-01-06T08:41:19Z – system – shell_pid= – lane=done – Moved to done
