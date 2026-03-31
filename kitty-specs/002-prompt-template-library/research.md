# Research: Prompt Template Library

**Feature**: 002-prompt-template-library
**Date**: 2026-03-31
**Phase**: 0 — Research

## 1. importlib Call Sites Analysis

### Decision: Replace all 4 call sites with PromptService
### Rationale: All sites use identical 7-line boilerplate to load `teamreel_prompts.py`; the file only exists in `archive/` so all calls currently fail silently.
### Alternatives: (A) Keep importlib with fixed path → fragile, no runtime editing; (B) Replace with DB lookups → chosen.

**Call sites detail:**

| # | File | Function | Line | What it loads | Replacement |
|---|------|----------|------|---------------|-------------|
| A | `src/generative/views_generate.py` | `list_asset_templates_view()` | L878-895 | `TEMPLATES` dict → list of template metadata | `GenerationTemplate.objects.filter(is_active=True)` query |
| B | `src/generative/services/asset_pipeline.py` | `_get_template_output_type()` | L55-85 | `TEMPLATES[id]["output_type"]` | `PromptService.get_template(slug).pipeline_config.get("output_type")` |
| C | `src/generative/services/asset_pipeline.py` | `generate_asset()` | L129-165 | `TEMPLATES`, `resolve_prompt()`, preprocessing | `PromptService.get_template()` + `PromptService.resolve_prompt()` |
| D | `src/generative/services/asset_pipeline.py` | `_load_prompts_module()` | L375-390 | Full module for video generation | `PromptService.get_template()` + `PromptService.resolve_prompt()` |

## 2. PARAM_RESOLVERS Migration Strategy

### Decision: Keep as module-level constants in `prompt_service.py`
### Rationale: PARAM_RESOLVERS are static domain knowledge (parameter enum values → natural language prompt text). They are shared across all templates and don't vary per-org. Moving to DB would be over-engineering for 10 templates.
### Alternatives: (A) Store in DB (JSONField or separate table) → over-engineering, no business need for per-org customization (out of scope per spec); (B) Module constants → chosen, matches current pattern, easy to migrate to DB later.

**Migrated constants:**
- `PARAM_RESOLVERS` — ~15 parameter types, ~80 value→text mappings
- `ROLE_EQUIPMENT` — role → equipment prompt text
- `OUTFIT_STYLE_DETAILS` — outfit style → multi-line detail text

## 3. Cache Strategy

### Decision: Use `@cache_result` + `@cache_invalidate` decorators from `src/core/cache/decorators.py`
### Rationale: Established project pattern with tag-based invalidation. Already used by transactions, projects, notifications.
### Alternatives: (A) Manual `cache.get()`/`cache.set()` → verbose, error-prone; (B) `@cache_result` decorator → chosen, DRY, tag-based; (C) Third-party caching lib → unnecessary complexity.

**Cache design:**

| Operation | Key Pattern | TTL | Tags |
|-----------|-------------|-----|------|
| `get_template(slug)` | `prompt_template:{slug}` | 300s | `["prompt_templates", "prompt_template:{slug}"]` |
| `get_all_active_templates()` | `prompt_templates:active_list` | 300s | `["prompt_templates"]` |

**Invalidation trigger:** `post_save` signal on `GenerationTemplate` → `cache_service.invalidate_tags(["prompt_templates"])`. This invalidates both individual template caches and the active list cache.

## 4. Signal-Based Invalidation Pattern

### Decision: post_save signal in `src/generative/signals.py`, registered in `apps.py:ready()`
### Rationale: Follows `src/transactions/signals.py` pattern. Cache is single-server (Redis on Railway), so signal-based invalidation is sufficient — no distributed cache issues.
### Alternatives: (A) Override `GenerationTemplate.save()` → mixes concerns; (B) post_save signal → chosen, clean separation.

## 5. resolve_prompt() Migration

### Decision: Implement as `PromptService.resolve_prompt(template, params, kit_analysis, extra_context)` method
### Rationale: The legacy `resolve_prompt()` does: (1) look up template by ID, (2) substitute {placeholders} with resolved param values via PARAM_RESOLVERS, (3) handle special cases (home-kit override, user_instruction append, guest player override). All this logic migrates cleanly to a service method.
### Alternatives: (A) Template method on model → too much logic for model layer; (B) Standalone function → no cache integration; (C) Service method → chosen, clean encapsulation.

**resolve_prompt flow:**
1. Get template from cache/DB via `get_template(slug)`
2. Start with `template.prompt_text`
3. For each `{placeholder}` in prompt_text:
   - Look up param value in `params` dict
   - Resolve value through `PARAM_RESOLVERS` if applicable
   - Substitute in prompt text
4. Handle special cases: home_kit override, user_instruction append
5. Return resolved prompt string

## 6. Serializer Validation for parameters_schema and preprocessing_config

### Decision: Add `validate_parameters_schema()` and `validate_preprocessing_config()` to `GenerationTemplateSerializer`
### Rationale: FR-008 and FR-009 require structural validation. The model's `clean()` already validates `parameters_schema` (each value must have `label` and `type`), but serializer validation gives better API error messages.
### Alternatives: (A) Model-only validation → poor API UX; (B) Serializer + model validation → chosen, belt-and-suspenders.

**Validation rules:**
- `parameters_schema`: Must be dict. Each value must be dict with `label` (str) and `type` (str). Optional: `options` (list), `default`.
- `preprocessing_config`: Must be dict. Each value must be string (preprocessor function name).

## 7. Legacy Endpoint Deprecation

### Decision: Keep `/api/v1/generative/assets/templates/` working but refactor to use DB
### Rationale: C-005 requires backward API compat. The legacy FBV `list_asset_templates_view` currently returns empty (file missing). Refactoring it to query DB improves it without breaking the contract.
### Alternatives: (A) Remove the endpoint → breaks C-005; (B) Redirect to `/templates/` → different response format; (C) Refactor FBV to use DB → chosen, backward compat maintained.

## 8. Test Strategy (TEST_FIRST)

### Decision: Write tests before implementation per constitution TEST_FIRST directive
### Rationale: Constitution requires test-first paradigm.

**Test plan:**

| Test File | Tests | Covers |
|-----------|-------|--------|
| `test_prompt_service.py` | ~15 tests | get_template(), resolve_prompt(), cache hit/miss, invalidation, not-found error |
| `test_prompt_pipeline_integration.py` | ~8 tests | Pipeline uses DB templates, image+video generation, fallback behavior |
| `test_prompt_serializer_validation.py` | ~6 tests | parameters_schema validation, preprocessing_config validation |

**Estimated total**: ~29 new tests + 21 existing WP01 tests = ~50 tests for the feature.
