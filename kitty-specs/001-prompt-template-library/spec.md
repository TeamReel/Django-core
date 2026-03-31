# Feature Specification: Prompt Template Library
*Path: kitty-specs/001-prompt-template-library/spec.md*

**Feature Branch**: `001-prompt-template-library`
**Created**: 2026-03-30
**Status**: In Progress
**Module**: D13 (255-D13-prompt-template-library)
**Input**: Migrate hardcoded Python prompt templates to database-backed storage by extending the existing GenerationTemplate model with Django Admin UI, variable substitution, and seed migration from existing teamreel_prompts.py (940 lines, 10 templates).

## Current State Analysis

### Problem
- Prompts are hardcoded in `archive/legacy-root-cleanup/scripts/teamreel_prompts.py` (940 lines)
- Code references this file via `importlib.util.spec_from_file_location` in 4+ locations
- The file has been archived but code still references it — **generation is broken on fresh deploys**
- No way to edit prompts without code deployment
- No versioning, no A/B testing capability, no audit trail

### Existing Code References
- `src/generative/views_generate.py` (line 883): loads `teamreel_prompts.py` via importlib
- `src/generative/services/asset_pipeline.py` (lines 69, 132, 381): 3 separate loading functions
- `src/generative/_asset_helpers.py` (line 251): help_text references `teamreel_prompts.TEMPLATES`
- Existing `GenerationTemplate` model in `src/generative/models.py` — defines template metadata but NOT prompt text

### Existing Architecture
- `GenerationTemplate` model already has: name, slug, description, input_schema, provider, is_active, template_type, template_subtype
- `GenerationRequest` tracks jobs with template FK
- Templates are used to determine pipeline config (image vs video, provider, etc.)
- The *actual prompt text* is loaded separately from the Python file — this is the gap

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Prompt text in database instead of Python file (Priority: P1)

As a developer, I need prompt templates stored in the database so that the generation pipeline works without a hardcoded Python file.

**Why this priority**: Without this, the generation pipeline references a file that no longer exists in its expected location. This is the foundational fix.

**Independent Test**: Run `generate_asset(template_id="logo_standardize", ...)` and verify it loads the prompt from database instead of file.

**Acceptance Scenarios**:

1. **Given** a GenerationTemplate record exists for "logo_standardize" with prompt_text populated, **When** the asset pipeline generates an image, **Then** the prompt text is loaded from the database
2. **Given** the teamreel_prompts.py file does not exist, **When** any generation is triggered, **Then** it still works using database templates
3. **Given** a template with `{placeholder}` variables, **When** generation runs with params, **Then** variables are substituted correctly

---

### User Story 2 - Seed migration from existing templates (Priority: P1)

As a developer, I need all 10 existing prompt templates migrated from the Python file to the database via a data migration.

**Why this priority**: Existing templates represent months of prompt engineering — they must be preserved exactly.

**Independent Test**: Run migration, then query `GenerationTemplate.objects.filter(prompt_text__gt="").count()` — should return 10. Compare prompt_text with original file.

**Acceptance Scenarios**:

1. **Given** a fresh database after migration, **When** querying GenerationTemplate, **Then** all 10 templates exist with correct prompt text, parameters, and preprocessing config
2. **Given** production database, **When** migration runs, **Then** existing GenerationTemplate records are updated with prompt data from teamreel_prompts.py

---

### User Story 3 - Edit prompts via Django Admin (Priority: P2)

As a platform admin, I want to edit prompt text, parameters, and preprocessing config through Django Admin so I can optimize prompts without deployments.

**Why this priority**: Enables rapid prompt iteration without code changes — key for improving AI output quality.

**Independent Test**: Log into Django Admin, navigate to Generation Templates, edit a prompt's text, save, trigger generation — verify new text is used.

**Acceptance Scenarios**:

1. **Given** I'm logged into Django Admin, **When** I navigate to Generative > Prompt Templates, **Then** I see all templates with search, filter by category
2. **Given** I edit a prompt's text and save, **When** next generation uses this template, **Then** the updated prompt text is used
3. **Given** I change a parameter's default value, **When** generation runs without explicit param, **Then** the new default is applied

---

### User Story 4 - API endpoint for prompt templates (Priority: P3)

As a frontend developer, I want a read-only API for prompt templates so the AI Studio can show available templates with their parameters and descriptions.

**Why this priority**: Frontend currently hardcodes template options — this enables dynamic rendering.

**Independent Test**: `GET /api/v1/generative/templates/` returns list of active templates with their parameters JSON.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** requesting prompt templates, **Then** only active templates for their org are returned
2. **Given** a template with parameters, **When** viewing template detail, **Then** parameter schema (options, defaults, labels) is included

---

### Edge Cases

- What happens when a GenerationTemplate with prompt data is deleted? → Soft-delete only (is_active=False), existing behavior preserved
- What happens when prompt text contains invalid placeholders? → Validate on save, warn in admin
- How does the system handle concurrent edits to the same prompt? → Standard Django optimistic write (last-write-wins is acceptable for admin)
- What if a template is deactivated while a generation is in progress? → In-progress generations use the prompt text captured at job creation time

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST store prompt templates in the database with full prompt text, parameters schema, and preprocessing config
- **FR-002**: System MUST load prompts from database in all generation pipelines (replacing 4 `importlib` call sites)
- **FR-003**: System MUST support `{placeholder}` variable substitution in prompt text
- **FR-004**: System MUST migrate all 10 existing templates from `teamreel_prompts.py` via data migration
- **FR-005**: System MUST provide Django Admin interface for CRUD on prompt templates
- **FR-006**: System MUST extend the existing GenerationTemplate model with prompt_text, parameters_schema, and preprocessing_config fields (extending existing model, not a separate model)
- **FR-007**: System MUST provide read-only API endpoint for frontend to list available templates
- **FR-008**: System MUST cache prompt template lookups to avoid per-request DB queries
- **FR-009**: System MUST invalidate cache when a template is updated via Admin

### Key Entities

- **GenerationTemplate** (existing, extended): Pipeline metadata + prompt storage. Existing fields: name, slug, version, template_type, template_subtype, input_schema, pipeline_config, organisation FK, is_active. **New fields**: `prompt_text` (TextField), `parameters_schema` (JSONField), `preprocessing_config` (JSONField). Organisation FK must be made nullable to support global/default templates.

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic — prompt templates are generic content generation primitives
- [x] All functionality is reusable across multiple downstream products
- [x] Extension points: GenerationTemplate can be extended per-product via proxy models or JSONField metadata

### Architecture & Modularity (Principle II)
- [x] Feature lives within existing `generative` app — no new app needed
- [x] No circular dependencies — extending GenerationTemplate with prompt fields, no new FK edges
- [x] Clean separation: model stores data, pipeline reads it, admin edits it

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained
- [x] Type hints on all new code (model fields, service functions, serializers)
- [x] Formatted with ruff (project standard)

### Testing (Principle IV)
- [x] Test plan: pytest for model, serializer, migration, pipeline integration
- [x] Coverage target: 90%+ on new code
- [x] Integration test: end-to-end generation using DB-backed prompt

### Security & Privacy (Principle V)
- [x] Admin-only write access to prompts — no user-facing mutation endpoints
- [x] Read-only API scoped to authenticated users within their organisation
- [x] No secrets in prompt text — validation prevents `{{secret_key}}` patterns

### Performance & Reliability (Principle VI)
- [x] Cache-backed lookups — no per-request DB query for prompt text
- [x] Cache invalidation via post_save signal on GenerationTemplate
- [x] Graceful degradation: if cache misses, falls back to DB query

### API Design (Principle VII)
- [x] DRF extends existing GenerationTemplateSerializer with prompt fields
- [x] Org-scoped queryset (existing ViewSet behavior preserved)
- [x] Consistent with existing GenerationTemplateViewSet patterns

### Documentation (Principle XI)
- [x] Feature documentation in `docs/testing/` (manual test script)
- [x] Admin guide for editing prompts

### Delivery & Integration (Principle XIII)
- [x] Migration: additive only (new fields + data migration) — no destructive operations
- [x] Seed data: data migration populates 10 templates from Python file
- [x] Admin: GenerationTemplateAdmin extended with prompt fieldset
- [x] API: documented in DRF browsable API

**Violations Requiring Justification**: None

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 10 existing prompt templates are queryable from `GenerationTemplate.objects.filter(is_active=True, prompt_text__gt="")` after migration
- **SC-002**: Zero references to `teamreel_prompts.py` or `importlib.util.spec_from_file_location` remain in `src/generative/`
- **SC-003**: Admin can edit a prompt's text and the change takes effect on next generation without deployment
- **SC-004**: `pytest` passes with 0 failures; no regressions in existing generation tests
- **SC-005**: API endpoint returns templates in < 50ms (cached path)
