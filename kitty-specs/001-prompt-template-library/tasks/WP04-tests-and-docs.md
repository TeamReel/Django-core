---
work_package_id: WP04
title: Tests + Documentation
lane: planned
dependencies:
- WP01
- WP02
- WP03
requirement_refs:
- FR-001
- FR-002
- FR-003
- FR-004
- FR-005
- FR-006
- FR-007
- FR-008
- FR-009
planning_base_branch: main
merge_target_branch: main
branch_strategy: Planning artifacts for this feature were generated on main. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into main unless the human explicitly redirects the landing branch.
subtasks:
- T015
- T016
- T017
- T018
phase: H3 - Tests + Docs
assignee: ''
agent: ''
shell_pid: ''
review_status: ''
reviewed_by: ''
review_feedback: ''
history:
- timestamp: '2026-03-30T00:00:00Z'
  lane: planned
  agent: planner
  action: Prompt generated via plan.md phasing
- timestamp: '2026-03-31T00:00:00Z'
  lane: planned
  agent: planner
  action: WP prompt regenerated via /spec-kitty.tasks — renumbered T012-T014 to T015-T018, expanded with implementation detail
---

# Work Package Prompt: WP04 – Tests + Documentation

## Objective

Write comprehensive test suite covering all functional requirements for the prompt template library feature. Create documentation including a manual test script and spec status updates. Verify all 5 success criteria.

## Requirements Covered

All FRs (FR-001 through FR-009) — this WP provides test coverage + verification for the entire feature.

## Context

### Pre-WP04 State (after WP01–WP03)

After WP01–WP03, the feature is functionally complete:
- **Model**: GenerationTemplate extended with prompt_text, parameters_schema, preprocessing_config (WP01)
- **Seed**: 10 templates seeded via data migration (WP01)
- **Pipeline**: All importlib calls replaced with DB lookups + caching (WP02)
- **API**: Full + list serializers, global template support, has_prompt filter (WP03)
- **Admin**: Prompt fieldset, monospace textarea, has_prompt column (WP01 + WP03)

### Existing Tests (from WP01)

`tests/generative/test_wp01_schema_seed.py` — 21 tests covering:
- `TestOrganisationFKNullable` (3 tests)
- `TestNewFields` (6 tests)
- `TestSeedData` (7 tests)
- `TestParametersSchemaValidation` (5 tests)

### Test Infrastructure

- Framework: pytest + pytest-django
- Fixtures: `tests/generative/conftest.py` — `org`, `user`, `template` fixtures
- DB: PostgreSQL on Railway (test uses `--reuse-db` or creates temp DB)
- Coverage target: 90%+ on new code

---

## Tasks

### T015: Pipeline & service tests

**Purpose**: Test the new `prompt_service.py` module — get_prompt_template (with caching), resolve_prompt (with variable substitution), and cache invalidation signal.

**File**: `tests/generative/test_wp02_prompt_service.py` (NEW)

**Steps**:
1. Create test file with fixtures:
   ```python
   import pytest
   from django.core.cache import cache
   from generative.models import GenerationTemplate
   from generative.services.prompt_service import (
       GenerationTemplateNotFound,
       get_prompt_template,
       resolve_prompt,
   )

   @pytest.fixture(autouse=True)
   def clear_cache():
       cache.clear()
       yield
       cache.clear()
   ```

2. Write tests for `get_prompt_template()`:
   - `test_get_by_slug` — returns template by slug
   - `test_get_global_template` — returns template with org=None
   - `test_org_specific_overrides_global` — org template preferred over global with same slug
   - `test_fallback_to_global` — returns global when org-specific not found
   - `test_not_found_raises` — raises `GenerationTemplateNotFound` for unknown slug
   - `test_inactive_template_not_returned` — `is_active=False` template excluded
   - `test_cache_hit` — second call does not query DB (use `django.test.utils.override_settings` or `assertNumQueries`)
   - `test_cache_key_format` — verify cache key matches `prompt_template:{org_id}:{slug}`

3. Write tests for `resolve_prompt()`:
   - `test_basic_substitution` — `{placeholder}` replaced with context value
   - `test_default_values` — defaults from parameters_schema used when context omits key
   - `test_context_overrides_defaults` — user context takes priority
   - `test_missing_placeholder_preserved` — `{unknown}` stays as-is (SafeDict)
   - `test_no_placeholders` — template without placeholders returns as-is
   - `test_empty_prompt` — empty prompt_text returns empty string

4. Write tests for cache invalidation signal:
   - `test_save_invalidates_cache` — saving template clears cached entry
   - `test_delete_invalidates_cache` — deleting template clears cached entry

**Validation**:
- All tests pass with `pytest tests/generative/test_wp02_prompt_service.py -v`
- No N+1 queries in `get_prompt_template` (1 query max, then cache)

**Estimated tests**: 16

---

### T016: API endpoint tests

**Purpose**: Test serializer validations, ViewSet queryset (org-scoping + global templates), list vs. detail serializers, and the has_prompt filter.

**File**: `tests/generative/test_wp03_api_admin.py` (NEW)

**Steps**:
1. Create test file with API client fixtures:
   ```python
   import pytest
   from rest_framework.test import APIClient
   from generative.models import GenerationTemplate
   from organisations.models import Organisation, Membership

   @pytest.fixture
   def api_client(user, org):
       client = APIClient()
       client.force_authenticate(user=user)
       Membership.objects.get_or_create(user=user, organisation=org, defaults={"is_active": True})
       return client
   ```

2. Write serializer validation tests:
   - `test_valid_parameters_schema` — accepted
   - `test_invalid_parameters_schema_missing_label` — rejected with error
   - `test_invalid_parameters_schema_missing_type` — rejected with error
   - `test_invalid_parameters_schema_not_dict` — rejected
   - `test_valid_preprocessing_config` — accepted
   - `test_invalid_preprocessing_config_not_dict` — rejected
   - `test_empty_schema_valid` — empty dict `{}` is valid

3. Write ViewSet queryset tests:
   - `test_list_includes_org_templates` — org's templates returned
   - `test_list_includes_global_templates` — org=None templates returned
   - `test_list_excludes_other_org_templates` — other org's templates NOT returned
   - `test_unauthenticated_returns_401` — no auth → 401

4. Write list vs. detail serializer tests:
   - `test_list_omits_prompt_text` — `prompt_text` NOT in list response
   - `test_list_includes_has_prompt` — `has_prompt` field in list response
   - `test_detail_includes_prompt_text` — `prompt_text` in detail response
   - `test_detail_includes_all_fields` — all 29+ fields present

5. Write filter tests:
   - `test_has_prompt_true_filter` — only templates with prompt_text
   - `test_has_prompt_false_filter` — only templates without prompt_text
   - `test_no_filter_returns_all` — no filter returns all templates

**Validation**:
- All tests pass with `pytest tests/generative/test_wp03_api_admin.py -v`
- Response times for list endpoint < 100ms (cached DB)

**Estimated tests**: 17

---

### T017: Integration tests

**Purpose**: End-to-end tests that verify the full generation pipeline uses DB-backed prompts. These tests prove SC-002 (zero importlib references) and SC-003 (admin edit takes effect).

**File**: `tests/generative/test_wp04_integration.py` (NEW)

**Steps**:
1. Write pipeline integration tests:
   - `test_generate_asset_uses_db_prompt` — mock the Gemini/OpenAI call, verify the prompt passed matches the DB template's prompt_text (not a hardcoded string)
   - `test_list_templates_from_db` — call `list_asset_templates_view`, verify response contains seeded templates with correct metadata
   - `test_admin_edit_takes_effect` — change prompt_text in DB, call `get_prompt_template`, verify new text returned (tests cache invalidation end-to-end)

2. Write regression tests:
   - `test_no_importlib_in_generative` — scan `src/generative/` Python files for `importlib.util.spec_from_file_location`, assert count == 0 (excluding migrations)
   - `test_no_teamreel_prompts_reference` — scan `src/generative/` Python files for `teamreel_prompts` string, assert count == 0 (excluding migrations)
   - `test_pillow_only_templates_unaffected` — verify PILLOW_ONLY_TEMPLATES still bypass prompt loading

3. Write success criteria verification tests:
   - `test_sc001_ten_templates_with_prompt` — `GenerationTemplate.objects.filter(is_active=True, prompt_text__gt="").count() == 10`
   - `test_sc004_all_tests_pass` — meta-test: this test suite existing and passing verifies SC-004
   - `test_sc005_cached_lookup_fast` — time `get_prompt_template()` call, assert < 50ms (cached path)

**Validation**:
- All tests pass with `pytest tests/generative/test_wp04_integration.py -v`
- These tests can run independently (no dependency on external APIs)

**Edge cases**:
- Tests should use `@pytest.mark.django_db` for DB access
- Mock external API calls (Gemini, OpenAI) — don't make real API calls in tests
- Use `django.test.utils.CaptureQueriesContext` for query count assertions

**Estimated tests**: 9

---

### T018: Documentation

**Purpose**: Create documentation for the prompt template library feature, including a manual test script, README update, and spec status updates.

**Files**:
- `documents/08-testing/manual-tests/prompt-template-library.md` (NEW)
- `src/generative/README.md` (update or create)
- `kitty-specs/001-prompt-template-library/spec.md` (status update)

**Steps**:
1. Create manual test script (`documents/08-testing/manual-tests/prompt-template-library.md`):
   - Test 1: Verify templates in Django Admin
     - Navigate to Admin → Generative → Generation Templates
     - Verify 10 templates visible with "Has Prompt" column
     - Filter by "With prompt" → all 10 shown
   - Test 2: Edit a prompt
     - Click "Logo Standaardiseren"
     - Modify prompt_text
     - Save → verify change appears in next API call
   - Test 3: API endpoint
     - `GET /api/v1/generative/templates/` → verify list response
     - `GET /api/v1/generative/templates/?has_prompt=true` → verify filter
     - `GET /api/v1/generative/templates/{id}/` → verify detail includes prompt_text
   - Test 4: Generation pipeline
     - Trigger asset generation for "logo_standardize"
     - Verify prompt used matches DB template (check logs)

2. Update/create `src/generative/README.md`:
   - Add "Prompt Template Library" section
   - Document the `prompt_service.py` API: `get_prompt_template()`, `resolve_prompt()`
   - Document cache strategy: key format, TTL, invalidation
   - Document the 10 seeded templates with slugs

3. Update spec status:
   - Set `spec.md` status from "Draft" to "Implemented"
   - Add implementation notes referencing WP commits

**Validation**:
- Manual test script exists and is coherent
- README documents the prompt service API
- spec.md reflects completed status
- `python manage.py check` passes (no doc issues)

---

## Done Criteria

- [ ] `pytest tests/generative/` passes with 0 failures (existing + new tests)
- [ ] Test coverage on new code ≥ 90% (WP02 + WP03 code paths)
- [ ] All 9 FRs have at least 1 test verifying them
- [ ] All 5 Success Criteria (SC-001 through SC-005) verified by tests
- [ ] No `importlib` or `teamreel_prompts` references in src/generative/ (verified by test)
- [ ] Manual test script exists at `documents/08-testing/manual-tests/prompt-template-library.md`
- [ ] README documents the prompt service API
- [ ] `spec.md` status updated to "Implemented"
- [ ] `python manage.py check` passes
- [ ] `ruff check src/generative/` passes
