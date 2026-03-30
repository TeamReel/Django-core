---
work_package_id: WP03
title: API Serializer + Admin Polish
lane: planned
dependencies:
- WP01
requirement_refs:
- FR-005
- FR-007
planning_base_branch: main
merge_target_branch: main
branch_strategy: Planning artifacts for this feature were generated on main. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into main unless the human explicitly redirects the landing branch.
subtasks:
- T010
- T011
phase: H2 - API + Serializer
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

# Work Package Prompt: WP03 – API Serializer + Admin Polish

## Objective

Expose prompt template fields via the existing DRF API and polish the Django Admin experience for prompt editing.

## Requirements Covered

- **FR-005**: System MUST provide Django Admin interface for CRUD on prompt templates
- **FR-007**: System MUST provide read-only API endpoint for frontend to list available templates

## Context

### Existing Serializer: `src/generative/serializers.py`
- `GenerationTemplateSerializer` is a full `ModelSerializer` exposing all fields
- Extra read-only fields: `created_by_username`, `organisation_name`, `parent_template_name`, `provider`, `estimated_cost`
- Validations: `validate_input_schema` (JSON Schema Draft 7), `validate_pipeline_config`, `validate_version` (semver)

### Existing ViewSet: `src/generative/views.py`
- `GenerationTemplateViewSet` — full CRUD + `clone` action
- Permissions: Admin-only for CUD, member for read
- Queryset: Org-scoped, `select_related("organisation", "created_by", "parent_template")`
- Filters: `DjangoFilterBackend`, `SearchFilter`, `OrderingFilter`
- `perform_destroy`: soft delete (`is_active=False`)

### Existing Admin: `src/generative/admin.py`
- `GenerationTemplateAdmin` with fieldsets (Basic Info, Versioning, Configuration, Metadata)
- BUG: Missing `template_type` and `template_subtype` in fieldsets (fixed in WP01)

## Tasks

### T010: Update serializer for prompt fields
- Add `prompt_text`, `parameters_schema`, `preprocessing_config` to `GenerationTemplateSerializer`
- Add `validate_parameters_schema()`: validate structure (each param needs label + type)
- Add `validate_preprocessing_config()`: validate preprocessing keys are known types
- Add `has_prompt` computed read-only field (boolean, True if prompt_text is non-empty)
- Consider: separate `GenerationTemplateListSerializer` (lightweight, no prompt_text) vs. `GenerationTemplateDetailSerializer` (full) for list/detail views

### T011: Polish admin for prompt editing
- Add textarea widget for `prompt_text` field (with larger rows)
- Add JSON pretty-print widget for `parameters_schema` and `preprocessing_config`
- Add "Preview" section showing rendered prompt with default parameter values
- Add `list_filter` entries for templates with/without prompts
- Add `has_prompt` boolean column to list display

## Done Criteria

- [ ] `GET /api/v1/generative/templates/` includes prompt fields for authenticated users
- [ ] `GET /api/v1/generative/templates/?has_prompt=true` filters correctly
- [ ] Serializer validates parameters_schema structure
- [ ] Admin shows prompt_text in a large textarea
- [ ] Admin list shows which templates have prompts
- [ ] Org-scoping enforced on all endpoints (existing behavior preserved)
