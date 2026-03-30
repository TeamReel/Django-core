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
- T012
- T013
- T014
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
---

# Work Package Prompt: WP04 – Tests + Documentation

## Objective

Write comprehensive test suite covering all functional requirements and create documentation for the prompt template library feature.

## Requirements Covered

All FRs (FR-001 through FR-009) — this WP provides test coverage + verification for the entire feature.

## Tasks

### T012: Model + Migration tests
- Test `GenerationTemplate` with prompt fields (create, read, update, validate)
- Test `clean()` validates parameters_schema structure
- Test `clean()` warns on prompt_text placeholder / parameters_schema mismatch
- Test data migration: verify all 10 templates seeded correctly
- Test seed data matches original `teamreel_prompts.py` exactly (compare prompt_text, params)
- Test version field defaults to "1.0.0"
- Test unique_together constraint on (organisation, slug, version)
- Test organisation FK is now nullable (global templates with org=None)

### T013: Pipeline + API tests
- Test `get_prompt_template()` returns correct template by slug
- Test `get_prompt_template()` falls back to global when org-specific not found
- Test `get_prompt_template()` raises `GenerationTemplateNotFound` for unknown slug
- Test `resolve_prompt()` substitutes variables correctly
- Test `resolve_prompt()` leaves unknown placeholders as-is (SafeDict)
- Test cache integration: second call hits cache, not DB
- Test cache invalidation: saving template clears cache
- Test `list_asset_templates_view` returns DB templates (not importlib)
- Test `generate_asset()` uses DB prompt text
- Test serializer validation for parameters_schema
- Test API endpoint returns prompt fields for authenticated user
- Test API endpoint enforces org-scoping

### T014: Documentation
- Update `src/generative/README.md` with prompt template section
- Create manual test script in `documents/08-testing/manual-tests/`
- Fill `kitty-specs/001-prompt-template-library/research.md` with research findings
- Fill `kitty-specs/001-prompt-template-library/data-model.md` with final model schema
- Update spec.md status to reflect completion

## Done Criteria

- [ ] `pytest tests/generative/` passes with 0 failures
- [ ] Test coverage on new code ≥ 90%
- [ ] All 9 FRs have at least 1 test verifying them
- [ ] All 5 Success Criteria (SC-001 through SC-005) verified by tests
- [ ] Manual test script exists and documents testing steps
- [ ] `python manage.py check` passes
- [ ] `ruff check src/generative/` passes
