# Tasks: Prompt Template Library (D13)
*Path: kitty-specs/001-prompt-template-library/tasks.md*

**Feature**: 001-prompt-template-library
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)
**Total subtasks**: 18 (5 done, 13 remaining)
**Estimated effort**: ~10 uur

## Overview

| WP | Title | Subtasks | Phase | Status | Dependencies |
|----|-------|----------|-------|--------|--------------|
| WP01 | Schema Migration + Seed Data | T001–T005 | H0 | ✅ done | — |
| WP02 | Pipeline Refactor + Caching | T006–T009 | H1 | planned | WP01 |
| WP03 | API + Admin Polish | T010–T014 | H2 | planned | WP01 |
| WP04 | Tests + Documentation | T015–T018 | H3 | planned | WP01, WP02, WP03 |

## Requirement Coverage

| Requirement | Description | WP(s) | Subtask(s) |
|-------------|-------------|-------|------------|
| FR-001 | Store prompt templates in DB | WP01 | T001, T002, T003 |
| FR-002 | Load prompts from DB in pipelines | WP02 | T008 |
| FR-003 | Variable substitution in prompt text | WP02 | T009 |
| FR-004 | Migrate 10 existing templates | WP01 | T003 |
| FR-005 | Django Admin CRUD interface | WP01, WP03 | T004, T014 |
| FR-006 | Extend GenerationTemplate model | WP01 | T001, T002 |
| FR-007 | Read-only API endpoint for frontend | WP03 | T011, T012 |
| FR-008 | Cache prompt template lookups | WP02 | T006 |
| FR-009 | Invalidate cache on template update | WP02 | T007 |

## Success Criteria Mapping

| Criteria | Description | Verified by |
|----------|-------------|-------------|
| SC-001 | 10 templates queryable after migration | WP01 ✅, WP04 T015 |
| SC-002 | Zero importlib/teamreel_prompts references | WP02 T008 |
| SC-003 | Admin edit takes effect without deploy | WP02 T007, WP03 T014 |
| SC-004 | pytest passes with 0 failures | WP04 T015–T017 |
| SC-005 | API endpoint < 50ms (cached) | WP02 T006, WP04 T016 |

---

## WP01 — Schema Migration + Seed Data ✅

**Phase**: H0 | **Status**: done | **Commit**: `d5b1e9550`
**Dependencies**: none
**Requirement refs**: FR-001, FR-004, FR-006

- [x] T001: Make organisation FK nullable (`null=True, blank=True`)
- [x] T002: Add `prompt_text`, `parameters_schema`, `preprocessing_config` fields
- [x] T003: Data migration seeding 10 templates from `teamreel_prompts.py`
- [x] T004: Update admin fieldsets (Prompt fieldset + template_type/subtype bug fix)
- [x] T005: Add `parameters_schema` validation in `clean()`

**Files created/modified**:
- `src/generative/models.py` — 3 new fields, org FK nullable, clean() validation
- `src/generative/admin.py` — Prompt fieldset, template_type in list_display/filter
- `src/generative/serializers.py` — 3 new fields in fields list
- `src/generative/migrations/0009_add_prompt_template_fields.py` — Schema migration
- `src/generative/migrations/0010_seed_prompt_templates.py` — Data migration (10 templates)
- `tests/generative/test_wp01_schema_seed.py` — 21 tests

---

## WP02 — Pipeline Refactor + Caching

**Phase**: H1 | **Status**: planned | **Dependencies**: WP01
**Requirement refs**: FR-002, FR-003, FR-008, FR-009
**Prompt file**: [tasks/WP02-pipeline-refactor.md](tasks/WP02-pipeline-refactor.md)

- [ ] T006: Create prompt loading service (`prompt_service.py`)
- [ ] T007: Create cache invalidation signal
- [ ] T008: Replace 4 importlib call sites with DB lookups
- [ ] T009: Implement variable substitution (`resolve_prompt`)

**Parallel opportunities**: T006 + T007 can be implemented in parallel. T008 and T009 depend on T006.

**Key files affected**:
- NEW: `src/generative/services/prompt_service.py`
- `src/generative/views_generate.py` (lines 870–920)
- `src/generative/services/asset_pipeline.py` (lines 53–100, 100–170, 375–395)
- `src/generative/apps.py` (signal registration)
- `src/generative/_asset_helpers.py` (help_text reference)

---

## WP03 — API + Admin Polish

**Phase**: H2 | **Status**: planned | **Dependencies**: WP01
**Requirement refs**: FR-005, FR-007
**Prompt file**: [tasks/WP03-api-and-admin.md](tasks/WP03-api-and-admin.md)

- [ ] T010: Add serializer validations (`validate_parameters_schema`, `validate_preprocessing_config`)
- [ ] T011: Add lightweight list serializer (exclude `prompt_text` for list views)
- [ ] T012: Update ViewSet queryset to include global templates (`organisation=None`)
- [ ] T013: Add `has_prompt` computed field and filter
- [ ] T014: Polish admin (textarea widget, JSON widget, preview section)

**Parallel opportunities**: T010, T011, T012 are independent. T013 depends on T011. T014 is independent.

**Key files affected**:
- `src/generative/serializers.py`
- `src/generative/views.py`
- `src/generative/admin.py`

---

## WP04 — Tests + Documentation

**Phase**: H3 | **Status**: planned | **Dependencies**: WP01, WP02, WP03
**Requirement refs**: All (FR-001 through FR-009)
**Prompt file**: [tasks/WP04-tests-and-docs.md](tasks/WP04-tests-and-docs.md)

- [ ] T015: Pipeline & service tests (prompt_service, cache, resolve_prompt)
- [ ] T016: API endpoint tests (serializer validation, queryset scoping, filters)
- [ ] T017: Integration tests (end-to-end generation with DB prompts)
- [ ] T018: Documentation (README, manual test script, spec status update)

**Parallel opportunities**: T015, T016, T017 can be written in parallel. T018 after code is final.

**Key files created**:
- `tests/generative/test_wp02_prompt_service.py`
- `tests/generative/test_wp03_api_admin.py`
- `tests/generative/test_wp04_integration.py`
- `documents/08-testing/manual-tests/prompt-template-library.md`
