---
work_package_id: "WP01"
subtasks:
  - "T001"
  - "T002"
  - "T003"
title: "Settings & Configuration"
phase: "Phase 2 - Core Implementation"
lane: "doing"
assignee: ""
agent: "claude"
shell_pid: "7"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2026-02-03T20:21:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP01 – Settings & Configuration

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: When you begin addressing feedback, update `review_status: acknowledged`.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

- Add all `FETCH_GUARDRAIL_*` settings to Django configuration
- Define feature flag defaults for B10 integration
- Create per-endpoint override structure
- **Success**: `from django.conf import settings; settings.FETCH_GUARDRAIL_ENABLED` works

## Context & Constraints

- **Spec Reference**: `kitty-specs/046-frontend-performance-guardrails/spec.md` (FR-012 through FR-016)
- **Data Model Reference**: `kitty-specs/046-frontend-performance-guardrails/data-model.md`
- **Target File**: `src/config/settings/base.py`
- **Constraint**: Settings must be backward-compatible (existing apps unaffected)

## Subtasks & Detailed Guidance

### Subtask T001 – Add guardrail settings to `base.py`

- **Purpose**: Provide static defaults for pagination guardrails
- **Steps**:
  1. Open `src/config/settings/base.py`
  2. Find an appropriate location (near REST_FRAMEWORK settings)
  3. Add the following settings block:
     ```python
     # =============================================================================
     # FETCH GUARDRAILS (B40)
     # =============================================================================
     # Pagination guardrails to prevent frontend over-fetching

     # Master switch (can be overridden by feature flag)
     FETCH_GUARDRAIL_ENABLED = True

     # Default limits
     FETCH_GUARDRAIL_MAX_PAGES = 5
     FETCH_GUARDRAIL_MAX_ITEMS = 500

     # Warning threshold (log warning when usage exceeds this percentage)
     FETCH_GUARDRAIL_WARNING_THRESHOLD = 0.8

     # Optimistic create support
     OPTIMISTIC_CREATE_ENABLED = True

     # Observability logging
     FETCH_GUARDRAIL_OBSERVABILITY_ENABLED = True
     ```
- **Files**: `src/config/settings/base.py`
- **Parallel?**: No (must complete before T002, T003)
- **Notes**: Use type hints in comments if helpful for IDE support

### Subtask T002 – Define feature flag defaults

- **Purpose**: Document the feature flags that will be used by B10 integration
- **Steps**:
  1. Add a comment block above or below the guardrail settings documenting the feature flag keys:
     ```python
     # Feature Flag Keys (B10 Integration)
     # These flags can override the settings above at runtime:
     # - frontend_fetch_guardrails_enabled (bool): Master switch
     # - frontend_fetch_max_pages_default (int): Override FETCH_GUARDRAIL_MAX_PAGES
     # - frontend_fetch_max_items_default (int): Override FETCH_GUARDRAIL_MAX_ITEMS
     # - frontend_optimistic_create_enabled (bool): Override OPTIMISTIC_CREATE_ENABLED
     # - frontend_fetch_observability_enabled (bool): Override FETCH_GUARDRAIL_OBSERVABILITY_ENABLED
     ```
  2. Ensure the comment clearly states that feature flags take precedence over settings
- **Files**: `src/config/settings/base.py`
- **Parallel?**: No (requires T001 context)
- **Notes**: Feature flags are NOT created here—they're created via B10 admin or API

### Subtask T003 – Add per-endpoint overrides dictionary

- **Purpose**: Allow ops to configure different limits for specific endpoints
- **Steps**:
  1. Add the override dictionary to settings:
     ```python
     # Per-endpoint overrides (optional)
     # Keys are URL path patterns, values are dicts with 'max_pages' and/or 'max_items'
     # Example:
     # FETCH_GUARDRAIL_OVERRIDES = {
     #     '/api/v1/activities/': {'max_pages': 10, 'max_items': 1000},
     #     '/api/v1/audit-logs/': {'max_pages': 20},
     # }
     FETCH_GUARDRAIL_OVERRIDES: dict[str, dict[str, int]] = {}
     ```
  2. Include type hint for IDE support
  3. Document the matching behavior (exact match vs prefix)
- **Files**: `src/config/settings/base.py`
- **Parallel?**: Yes (after T001)
- **Notes**: Override resolution logic is in WP02

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Settings not imported | Test in Django shell immediately |
| Type errors in dict | Use explicit type hints |
| Conflicts with existing settings | Search for `GUARDRAIL` before adding |

## Definition of Done Checklist

- [ ] T001: All guardrail settings added to `base.py`
- [ ] T002: Feature flag documentation comments added
- [ ] T003: Per-endpoint overrides dict added with type hint
- [ ] Settings importable: `from django.conf import settings; settings.FETCH_GUARDRAIL_ENABLED`
- [ ] No linting errors: `ruff check src/config/settings/base.py`
- [ ] `tasks.md` updated with subtask checkboxes

## Review Guidance

- Verify settings are in a logical location (near REST_FRAMEWORK)
- Check that defaults match spec (max_pages=5, max_items=500)
- Ensure type hints are correct
- Confirm no duplicate settings exist

## Activity Log

> Append entries when the work package changes lanes.

- 2026-02-03T20:21:00Z – system – lane=planned – Prompt created.
- 2026-02-03T19:33:32Z – claude – shell_pid=7 – lane=doing – Started implementation
