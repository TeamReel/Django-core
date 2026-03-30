# Implementation Plan: Prompt Template Library (D13)
*Path: kitty-specs/001-prompt-template-library/plan.md*

**Branch**: `001-prompt-template-library` | **Date**: 2026-03-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/kitty-specs/001-prompt-template-library/spec.md`

## Summary

Migrate 10 hardcoded prompt templates from `teamreel_prompts.py` (940 lines, archived) to database-backed storage by extending the existing `GenerationTemplate` model with prompt text, parameters schema, and preprocessing config fields. Replace all 4 `importlib.util.spec_from_file_location` call sites with database lookups. Provide Django Admin UI for prompt editing and read-only DRF API for frontend consumption.

## Technical Context

**Language/Version**: Python 3.12, Django 5, Django REST Framework
**Primary Dependencies**: Django 5, DRF, django-filter, PostgreSQL
**Storage**: PostgreSQL (Railway), Django ORM
**Testing**: pytest + pytest-django
**Target Platform**: Linux server (Railway), Windows dev
**Project Type**: Web application (Django backend + React frontend)
**Performance Goals**: Prompt template lookups < 50ms (cached), no impact on generation latency
**Constraints**: No destructive migrations, org-scoped data, backward-compatible API
**Scale/Scope**: ~10 prompt templates initially, growing to ~50. Single `generative` Django app.

## Architecture Decision: Extend vs. New Model

**Decision: Extend `GenerationTemplate` with new fields** (not a separate `PromptTemplate` model)

**Rationale:**
- `GenerationTemplate` already has: name, slug, description, input_schema, pipeline_config, template_type, template_subtype, version, organisation FK
- The spec's proposed `PromptTemplate` with OneToOne to `GenerationTemplate` adds unnecessary indirection
- Adding `prompt_text` (TextField), `parameters_schema` (JSONField), `preprocessing_config` (JSONField) directly to `GenerationTemplate` is cleaner
- Existing `GenerationTemplateViewSet` and `GenerationTemplateSerializer` already handle CRUD + org-scoping
- Existing admin already registered — just needs fieldset update

**What changes:**
1. Add 3 fields to `GenerationTemplate`: `prompt_text`, `parameters_schema`, `preprocessing_config`
2. Make `organisation` FK nullable (`null=True, blank=True`) to support global/default templates (currently NOT nullable — seed data requires this)
3. Data migration: seed 10 templates from `teamreel_prompts.py` with `organisation=None`
4. Replace `importlib` calls with `GenerationTemplate.objects.get(slug=...)` lookups
5. Update admin fieldsets (also fix missing `template_type`/`template_subtype`)
6. Update serializer to expose new fields
7. Add caching layer for prompt lookups (key: `prompt_template:{org_id}:{slug}`, TTL: 300s)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Purpose and Scope
- [x] **Product-Agnostic**: Prompt templates are generic content generation primitives — no product-specific logic
- [x] **Core Focus**: Extends existing `generative` app which is core infrastructure
- [x] **Downstream Extension**: Templates can be extended per-product via JSONField metadata

### II. Architecture and Modularity
- [x] **Single Responsibility**: All changes within `generative` app — prompt storage is its concern
- [x] **Stable APIs**: Extends existing ViewSet/Serializer — backward compatible
- [x] **Minimal Dependencies**: No new dependencies added
- [x] **No Circular Deps**: No new dependency edges
- [x] **No Downstream Imports**: Core only

### III. Code Quality and Style
- [x] **Python 3.12+**: Yes
- [x] **Type Hints**: All new code typed
- [x] **Ruff Formatting**: Project uses ruff (replaces Black)
- [x] **Ruff Linting**: Yes
- [x] **No Dead Code**: Removes 4 `importlib` call sites + archived Python file references
- [x] **Readable Code**: Small focused functions for prompt loading
- [x] **Curated Dependencies**: No new deps

### IV. Testing Strategy
- [x] **pytest + pytest-django**: Yes
- [x] **Test Coverage**: Model, serializer, migration, pipeline integration tests
- [x] **Regression Tests**: Test that generation works without `teamreel_prompts.py` file
- [x] **Deterministic**: DB-backed, no external dependencies
- [x] **Coverage Thresholds**: 90%+ on new code
- [x] **Integration Tests**: End-to-end generation using DB prompt

### V. Security and Privacy
- [x] **Secure Defaults**: Inherits project defaults
- [x] **DEBUG Off**: Inherits project config
- [x] **No Secrets**: No secrets in prompt text — validation prevents it
- [x] **Dependency Scanning**: No new deps
- [x] **Centralized Auth**: Uses existing DRF permission classes
- [x] **No Sensitive Logging**: Prompt text not logged at runtime

### VI. Performance and Reliability
- [x] **No N+1 Queries**: Prompt loaded in single query, cached
- [x] **Pagination**: Existing ViewSet pagination applies
- [x] **Explicit Caching**: Django cache framework, `prompt_template:{slug}` keys, post_save invalidation
- [x] **Structured Logging**: Existing logging infrastructure
- [x] **Health Checks**: Existing `/api/v1/generative/health/` endpoint
- [x] **Metrics Hooks**: N/A for this feature
- [x] **Graceful Degradation**: Cache miss → DB query fallback

### VII. UX and API Design
- [x] **DRF Required**: Extends existing ViewSet
- [x] **Consistent Responses**: Same response format as GenerationTemplate
- [x] **Versioning Strategy**: No breaking changes — additive fields only
- [x] **Clear Errors**: Validation errors for invalid prompt text / JSON schemas
- [x] **Boundary Validation**: Serializer validates prompt_text, parameters_schema, preprocessing_config

### VIII. Developer Experience and Tooling
- [x] **Easy Setup**: No new setup steps — migration auto-seeds templates
- [x] **Mandatory Tools**: All configured
- [x] **Pre-commit Hooks**: Configured
- [x] **Type Checking**: mypy on new code
- [x] **Task Scripts**: Existing `manage.py` commands sufficient
- [x] **Developer Docs**: README update for generative app

### IX. Branching and Git Workflow
- [x] **Feature Branch**: `001-prompt-template-library`
- [x] **Linked to Spec**: References this spec document
- [x] **Focused PRs**: 4 phases, each a focused PR
- [x] **main Stable**: Feature branch workflow

### X. CI/CD and Quality Gates
- [x] **CI Checks**: pytest, ruff, mypy
- [x] **Merge Gates**: All checks pass
- [x] **Scripted Deployment**: Railway auto-deploy

### XI. Documentation and Knowledge Sharing
- [x] **In-Repo Docs**: Feature docs in `documents/`
- [x] **App README**: `src/generative/` README update
- [x] **Getting Started**: Existing guide sufficient
- [x] **Extension Guide**: N/A
- [x] **Spec Sync**: Spec updated on completion
- [x] **ADR Required**: Architecture decision documented above (extend vs. new model)

### XII. Constitution Evolution
- [x] **No Constitution Changes**: No amendments needed
- [x] **Template Updates**: No template changes

### XIII. Feature Delivery & Production Integration
- [x] **Migrations Ready**: Additive only — new fields + data migration. No destructive operations
- [x] **Seed Data Planned**: Data migration seeds 10 templates from archived Python file
- [x] **Admin Registration**: GenerationTemplateAdmin updated with new fieldsets
- [x] **API Documentation**: DRF browsable API auto-documents
- [x] **Demo Integration**: Frontend can use new API to show available templates
- [x] **Manual Test File**: Will be created
- [x] **Documentation**: README + usage examples

### Violations Requiring Justification

None — all checks pass.

**Constitution Check Status**: ✅ PASS

## Project Structure

### Documentation (this feature)

```
kitty-specs/001-prompt-template-library/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research/            # Codebase research artifacts
├── tasks/               # Work packages (generated by spec-kitty tasks)
└── checklists/          # QA checklists
```

### Source Code (affected files)

```
src/generative/
├── models.py            # Add prompt_text, parameters_schema, preprocessing_config to GenerationTemplate
├── admin.py             # Update fieldsets (add Prompt fields + fix missing template_type/subtype)
├── serializers.py       # Expose new fields in GenerationTemplateSerializer
├── views.py             # No changes needed (ViewSet already handles CRUD)
├── views_generate.py    # Replace importlib with DB lookup (line ~883)
├── services/
│   └── asset_pipeline.py  # Replace 3 importlib calls (lines ~69, ~132, ~381) with DB lookup
├── _asset_helpers.py    # Update help_text reference (line ~251)
└── migrations/
    ├── NNNN_add_prompt_fields.py       # Schema migration: 3 new fields
    └── NNNN_seed_prompt_templates.py   # Data migration: 10 templates from archive

tests/
├── test_prompt_templates.py  # Model tests, serializer tests, cache tests
└── test_generation_pipeline.py  # Integration: generation uses DB prompts

archive/legacy-root-cleanup/scripts/
└── teamreel_prompts.py  # Source for seed migration (read-only, not modified)
```

**Structure Decision**: Extends existing `src/generative/` app. No new apps or packages. All changes are additive fields + migration + refactored import calls.

## Phasing

| Phase | Title | Effort | Description |
|-------|-------|--------|-------------|
| H0 | Schema + Seed | ~3 uur | Add fields to model, create data migration, update admin |
| H1 | Pipeline Refactor | ~3 uur | Replace all importlib calls with DB lookups, add caching |
| H2 | API + Serializer | ~2 uur | Expose new fields, add read-only endpoint logic |
| H3 | Tests + Docs | ~2 uur | Full test suite, manual test script, documentation |

**Total estimated effort: ~10 uur**

## Complexity Tracking

No violations or complexity escalations. Feature is a straightforward model extension + data migration + refactor of 4 call sites.