---
work_package_id: "WP07"
subtasks:
  - "T027"
  - "T028"
  - "T029"
  - "T030"
title: "Documentation & Polish"
phase: "Phase 2 - Core Implementation"
lane: "doing"
assignee: "claude"
agent: "claude"
shell_pid: "42868"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2026-02-03T20:21:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2026-02-03T21:50:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "42868"
    action: "Started WP07 implementation"
---

# Work Package Prompt: WP07 – Documentation & Polish

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

- Export new mixins from `src/api/__init__.py`
- Update API module README with guardrail documentation
- Pass all code quality checks (Black, Ruff, mypy)
- Generate final coverage report confirming >85%

**Success**: `black --check src/api/` and `ruff check src/api/` pass with no errors

## Context & Constraints

- **Spec Reference**: `kitty-specs/046-frontend-performance-guardrails/spec.md`
- **Quickstart Reference**: `kitty-specs/046-frontend-performance-guardrails/quickstart.md`
- **Target Files**:
  - `src/api/__init__.py` (modify)
  - `src/api/README.md` (create or update)
- **Constraint**: All code quality gates must pass before merge

## Subtasks & Detailed Guidance

### Subtask T027 – Update `src/api/__init__.py` exports

- **Purpose**: Make new mixins importable from the api package
- **Steps**:
  1. Open `src/api/__init__.py`
  2. Add imports for new modules:
     ```python
     from .guardrails import (
         FetchBudget,
         PaginationLimitExceeded,
         get_guardrail_config,
         log_budget_event,
     )
     from .mixins import (
         CacheHeadersMixin,
         OptimisticCreateMixin,
     )
     from .pagination import BaseAPIPagination

     __all__ = [
         # Pagination
         'BaseAPIPagination',
         # Guardrails
         'FetchBudget',
         'PaginationLimitExceeded',
         'get_guardrail_config',
         'log_budget_event',
         # Mixins
         'CacheHeadersMixin',
         'OptimisticCreateMixin',
     ]
     ```
  3. Verify import works: `from api import CacheHeadersMixin`
- **Files**: `src/api/__init__.py`
- **Parallel?**: No (must complete implementation first)
- **Notes**: Use explicit `__all__` for clean public API

### Subtask T028 – Update api module README

- **Purpose**: Document guardrail feature for developers
- **Steps**:
  1. Create or update `src/api/README.md`:
     ```markdown
     # API Module

     Core API utilities for Django REST Framework integration.

     ## Pagination Guardrails

     The `BaseAPIPagination` class includes built-in guardrails to prevent frontend over-fetching.

     ### Configuration

     ```python
     # settings.py
     FETCH_GUARDRAIL_ENABLED = True
     FETCH_GUARDRAIL_MAX_PAGES = 5
     FETCH_GUARDRAIL_MAX_ITEMS = 500

     # Per-endpoint overrides
     FETCH_GUARDRAIL_OVERRIDES = {
         '/api/v1/activities/': {'max_pages': 10},
     }
     ```

     ### Response Headers

     All paginated responses include `X-Fetch-Budget`:

     ```json
     {
       "max_pages": 5,
       "max_items": 500,
       "current_page": 1,
       "is_limited": true
     }
     ```

     ## Cache Headers Mixin

     Add ETag/Last-Modified support to ViewSets:

     ```python
     from api import CacheHeadersMixin

     class MyViewSet(CacheHeadersMixin, viewsets.ModelViewSet):
         cache_timestamp_field = 'updated_at'
     ```

     ## Optimistic Create Mixin

     Support optimistic UI patterns:

     ```python
     from api import OptimisticCreateMixin

     class MyViewSet(OptimisticCreateMixin, viewsets.ModelViewSet):
         pass
     ```

     Frontend sends `X-Client-Request-ID` header, which is echoed in response.

     ## Feature Flags

     Runtime control via B10 feature flags:

     - `frontend_fetch_guardrails_enabled`: Master switch
     - `frontend_fetch_max_pages_default`: Override max pages
     - `frontend_optimistic_create_enabled`: Toggle optimistic creates

     See `kitty-specs/046-frontend-performance-guardrails/quickstart.md` for full documentation.
     ```
- **Files**: `src/api/README.md`
- **Parallel?**: Yes (independent of T027)
- **Notes**: Keep it concise; link to quickstart for details

### Subtask T029 – Run Black/Ruff/mypy checks

- **Purpose**: Ensure code quality gates pass
- **Steps**:
  1. Run Black formatter:
     ```bash
     black src/api/ tests/api/ tests/integration/
     ```
  2. Run Ruff linter:
     ```bash
     ruff check src/api/ tests/api/ tests/integration/ --fix
     ```
  3. Run mypy type checker:
     ```bash
     mypy src/api/
     ```
  4. Fix any issues found
  5. Run check mode to verify:
     ```bash
     black --check src/api/
     ruff check src/api/
     ```
- **Files**: All files in `src/api/`, `tests/api/`, `tests/integration/`
- **Parallel?**: Yes (can run while T028 in progress)
- **Notes**: Fix errors before committing

### Subtask T030 – Final coverage report

- **Purpose**: Confirm >85% coverage target met
- **Steps**:
  1. Run coverage report:
     ```bash
     pytest --cov=api --cov=api.guardrails --cov=api.mixins \
            tests/api/ tests/integration/ \
            --cov-report=term-missing \
            --cov-report=html:htmlcov/guardrails
     ```
  2. Check coverage meets target:
     - `src/api/guardrails.py`: >90%
     - `src/api/mixins.py`: >85%
     - `src/api/pagination.py`: >85%
  3. If coverage is below target, identify gaps and add tests
  4. Document final coverage in PR description
- **Files**: Coverage reports in `htmlcov/`
- **Parallel?**: No (requires all tests to be complete)
- **Notes**: HTML report useful for identifying uncovered lines

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Missing exports cause import errors | Test imports in Python shell |
| Coverage below target | Add targeted tests for uncovered branches |
| Type errors from mypy | Add type hints or `# type: ignore` with reason |

## Definition of Done Checklist

- [ ] T027: `src/api/__init__.py` exports all new symbols
- [ ] T028: `src/api/README.md` documents guardrail features
- [ ] T029: Black/Ruff/mypy pass with no errors
- [ ] T030: Coverage report shows >85% for guardrail code
- [ ] Import test: `from api import CacheHeadersMixin, FetchBudget` works
- [ ] All CI checks would pass
- [ ] `tasks.md` updated with all subtask checkboxes checked
- [ ] Ready for PR review

## Review Guidance

- Verify all new public symbols are exported
- Check README is accurate and matches implementation
- Ensure no linting/formatting issues remain
- Confirm coverage report is attached to PR

## Activity Log

> Append entries when the work package changes lanes.

- 2026-02-03T20:21:00Z – system – lane=planned – Prompt created.
