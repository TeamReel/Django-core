---
work_package_id: WP01
title: Schema Migration + Seed Data
lane: planned
dependencies: []
requirement_refs:
- FR-001
- FR-004
- FR-006
planning_base_branch: main
merge_target_branch: main
branch_strategy: Planning artifacts for this feature were generated on main. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into main unless the human explicitly redirects the landing branch.
subtasks:
- T001
- T002
- T003
- T004
- T005
phase: H0 - Schema + Seed
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

# Work Package Prompt: WP01 – Schema Migration + Seed Data

## Objective

Add prompt template fields to the existing `GenerationTemplate` model and seed 10 existing templates from the archived `teamreel_prompts.py` file via data migration.

## Requirements Covered

- **FR-001**: System MUST store prompt templates in the database with full prompt text, parameters schema, and preprocessing config
- **FR-004**: System MUST migrate all 10 existing templates from `teamreel_prompts.py` via data migration
- **FR-006**: System MUST extend the existing GenerationTemplate model with prompt_text, parameters_schema, and preprocessing_config fields (achieved by extending the model directly)

## Context

### Existing Model: `src/generative/models.py`
- `GenerationTemplate` already has: name, slug, description, input_schema, pipeline_config, template_type, template_subtype, version, organisation FK
- Missing: `prompt_text`, `parameters_schema`, `preprocessing_config`

### Source Data: `archive/legacy-root-cleanup/scripts/teamreel_prompts.py`
- 10 templates: logo_standardize, sponsor_standardize, tenue_generate, keeper_tenue, tracksuit_generate, coach_outfit, fullbody_in_tenue, closeup_in_tenue, member_intro, member_goal_celebration
- Each template has: id, name, category, description, input_requirements, parameters (dict), preprocessing (dict), prompt_template (string with `{placeholder}` vars)

## Tasks

### T001: Make organisation FK nullable
- The `organisation` FK on `GenerationTemplate` is currently `NOT NULL`
- Add `null=True, blank=True` to the `organisation` field to support global/default templates
- This is safe: existing rows keep their FK, new seed templates can use `organisation=None`
- Include this change in the same schema migration as T002

### T002: Add fields to GenerationTemplate model
- Add `prompt_text = models.TextField(blank=True, default="")` — stores the actual prompt with `{placeholder}` variables
- Add `parameters_schema = models.JSONField(default=dict, blank=True)` — stores parameter definitions (label, type, options, default)
- Add `preprocessing_config = models.JSONField(default=dict, blank=True)` — stores preprocessing pipeline config per input type
- Run `python manage.py makemigrations generative`

### T003: Create data migration to seed templates
- Create data migration that reads each template from `teamreel_prompts.py` TEMPLATES dict
- For each template, create/update a `GenerationTemplate` with:
  - `slug` = template id (e.g., "logo_standardize")
  - `name` = template name
  - `description` = template description
  - `prompt_text` = template prompt_template string
  - `parameters_schema` = template parameters dict
  - `preprocessing_config` = template preprocessing dict
  - `template_type` = mapped from category
  - `is_active` = True
  - `is_latest` = True
  - `version` = "1.0.0"
- Use `organisation=None` for seed templates (global/default templates)

### T004: Update admin fieldsets
- Add "Prompt" fieldset to `GenerationTemplateAdmin` with: prompt_text, parameters_schema, preprocessing_config
- Fix missing `template_type` and `template_subtype` in existing fieldsets (bug: they exist on model but not shown in admin)

### T005: Add model validation
- Validate `parameters_schema` structure in `clean()`: each key must have at minimum `label` and `type`
- Validate `prompt_text` placeholders match parameters_schema keys (warning, not error)

## Done Criteria

- [ ] `organisation` FK is nullable (supports global templates with `organisation=None`)
- [ ] `GenerationTemplate` has 3 new fields: prompt_text, parameters_schema, preprocessing_config
- [ ] Migration runs without errors on fresh and existing databases
- [ ] `GenerationTemplate.objects.filter(prompt_text__gt="").count()` returns 10 after migration
- [ ] Django Admin shows all fields including prompt text editor
- [ ] `template_type` and `template_subtype` visible in admin (bug fix)
- [ ] `python manage.py check` passes
- [ ] `pytest tests/generative/` passes
