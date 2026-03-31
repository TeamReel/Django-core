---
work_package_id: WP02
title: PromptService Core + Cache Infrastructure
lane: "for_review"
dependencies: []
requirement_refs:
- FR-001
- FR-002
- FR-003
- FR-005
- NFR-001
- NFR-002
planning_base_branch: main
merge_target_branch: main
branch_strategy: Planning artifacts for this feature were generated on main. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into main unless the human explicitly redirects the landing branch.
base_branch: main
base_commit: b16ad27b41f35d9bb3f7dd9a90f920130a096447
created_at: '2026-03-31T07:08:28.128153+00:00'
subtasks:
- T001
- T002
- T003
- T004
- T005
- T006
phase: Phase 1 - Core Service
assignee: ''
agent: bouwer
shell_pid: '89732'
review_status: ''
reviewed_by: ''
review_feedback: ''
history:
- timestamp: '2026-03-31T06:55:35Z'
  lane: planned
  agent: system
  shell_pid: ''
  action: Prompt generated via /spec-kitty.tasks
---

# Work Package Prompt: WP02 – PromptService Core + Cache Infrastructure

## Branch Strategy

- **Planning/base branch at prompt creation**: `main`
- **Final merge target for completed work**: `main`
- **Actual worktree base may differ later**: `/spec-kitty.implement` populates frontmatter `base_branch` when the worktree is created. For stacked WPs it may point at another WP branch, but the final merge target remains `main` unless the human explicitly changes the landing branch.
- **If human instructions contradict these fields**: stop and resolve the intended landing branch before coding.

**Implementation command**: `spec-kitty implement WP02`

---

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check `review_status`. If it says `has_feedback`, read `review_feedback` first.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: When you understand the feedback, update `review_status: acknowledged`.

---

## Objectives & Success Criteria

Build the `PromptService` module that provides:
1. **Cached template lookup** by slug (`get_template()`) — cache TTL 300s, raises `GenerationTemplateNotFound` when not found
2. **Cached active templates list** (`get_active_templates()`) — returns all active templates for an org
3. **Prompt resolution** (`resolve_prompt()`) — substitutes `{placeholder}` variables using `PARAM_RESOLVERS`, handles special cases
4. **Signal-based cache invalidation** — `post_save` on `GenerationTemplate` invalidates cache tags

**Success criteria:**
- All `PromptService` functions work correctly
- Cache hit rate >90% on repeated lookups (TTL 300s, NFR-001)
- Cache invalidation < 1 second after save (NFR-002)
- `GenerationTemplateNotFound` raised for unknown slugs (FR-005)
- Tests pass: `pytest tests/generative/test_prompt_service.py`

## Context & Constraints

- **Existing model**: `GenerationTemplate` in `src/generative/models.py` (L128-280) — already has `prompt_text`, `parameters_schema`, `preprocessing_config` fields (WP01 done)
- **Existing cache infrastructure**: `@cache_result` and `@cache_invalidate` decorators in `src/core/cache/decorators.py` — use these, do NOT build custom caching
- **Existing signal pattern**: `src/transactions/signals.py` — follow this pattern for `post_save`
- **Legacy file**: `archive/legacy-root-cleanup/scripts/teamreel_prompts.py` — source for PARAM_RESOLVERS, ROLE_EQUIPMENT, OUTFIT_STYLE_DETAILS constants
- **Constitution**: TEST_FIRST paradigm — write tests before implementation
- **Plan**: `kitty-specs/002-prompt-template-library/plan.md`
- **Research**: `kitty-specs/002-prompt-template-library/research.md` (section 2-5)
- **Data Model**: `kitty-specs/002-prompt-template-library/data-model.md`

## Subtasks & Detailed Guidance

### Subtask T001 – Create prompt_service.py module + migrate constants

- **Purpose**: Set up the service module skeleton and migrate all static lookup data from the legacy `teamreel_prompts.py`.
- **Steps**:
  1. Create `src/generative/services/prompt_service.py`
  2. Add the `GenerationTemplateNotFound` exception:
     ```python
     class GenerationTemplateNotFound(Exception):
         """Raised when a template slug is not found in the database."""
         def __init__(self, slug: str):
             self.slug = slug
             super().__init__(f"Generation template not found: {slug}")
     ```
  3. Read `archive/legacy-root-cleanup/scripts/teamreel_prompts.py` and migrate these constants:
     - **`PARAM_RESOLVERS`**: Dict of ~15 parameter types, each mapping values to human-readable prompt text. Example: `{"skin_tone": {"light": "lichte huidskleur", "medium": "medium huidskleur", ...}, ...}`
     - **`ROLE_EQUIPMENT`**: Dict mapping player role to equipment prompt text. Example: `{"goalkeeper": "keepershandschoenen en een...", ...}`
     - **`OUTFIT_STYLE_DETAILS`**: Dict mapping outfit style to multi-line detail prompt text.
  4. Add function stubs (empty, will be implemented in T003/T005):
     ```python
     def get_template(slug: str, organisation_id: int | None = None) -> GenerationTemplate:
         raise NotImplementedError

     def get_active_templates(organisation_id: int | None = None) -> list[GenerationTemplate]:
         raise NotImplementedError

     def resolve_prompt(
         template: GenerationTemplate,
         params: dict[str, str],
         kit_analysis: dict | None = None,
         extra_context: str | None = None,
     ) -> str:
         raise NotImplementedError

     def invalidate_template_cache(slug: str | None = None) -> None:
         raise NotImplementedError
     ```
  5. Add necessary imports: `from src.generative.models import GenerationTemplate`
- **Files**:
  - `src/generative/services/prompt_service.py` (new, ~150 lines for constants + stubs)
  - Reference: `archive/legacy-root-cleanup/scripts/teamreel_prompts.py` (read only)
- **Parallel?**: Yes — independent preparatory work.
- **Notes**: Copy PARAM_RESOLVERS faithfully. Verify all ~80 value→text mappings match the legacy file exactly. Use Python type hints on all constants and functions.

### Subtask T002 – Write unit tests for get_template() and get_active_templates()

- **Purpose**: TEST_FIRST — write tests before implementing the cache-backed lookup functions.
- **Steps**:
  1. Create `tests/generative/test_prompt_service.py`
  2. Use existing fixtures from `tests/generative/conftest.py` — `organisation`, `user`, `template` fixtures are available
  3. Write tests:
     - **`test_get_template_returns_active_template`**: Create a template with known slug, call `get_template(slug)`, assert returns correct template
     - **`test_get_template_not_found_raises`**: Call `get_template("nonexistent_slug")`, assert raises `GenerationTemplateNotFound` with correct slug attribute
     - **`test_get_template_inactive_not_returned`**: Create inactive template, call `get_template(slug)`, assert raises `GenerationTemplateNotFound`
     - **`test_get_template_cache_hit`**: Call `get_template(slug)` twice, assert only 1 DB query (use `django.test.utils.override_settings` or `assertNumQueries`)
     - **`test_get_active_templates_returns_only_active`**: Create active + inactive templates, call `get_active_templates()`, assert only active returned
     - **`test_get_active_templates_org_scoped`**: Create templates for different orgs, call `get_active_templates(org_id=X)`, assert only org X templates returned
     - **`test_get_template_global_template_returned`**: Create template with `organisation=None`, assert it's returned for any org query
  4. All tests should initially fail (functions raise `NotImplementedError`)
- **Files**:
  - `tests/generative/test_prompt_service.py` (new, ~120 lines)
- **Parallel?**: Can be written in parallel with T004.
- **Notes**: Use `@pytest.mark.django_db` on all DB tests. Use `pytest` fixtures style (not unittest.TestCase).

### Subtask T003 – Implement get_template() and get_active_templates() with cache

- **Purpose**: Implement the cached lookup functions so T002 tests pass.
- **Steps**:
  1. In `src/generative/services/prompt_service.py`, implement `get_template()`:
     ```python
     from src.core.cache.decorators import cache_result
     from src.core.cache.services import CacheService

     @cache_result(key_pattern="prompt_template:{slug}", ttl=300, tags=["prompt_templates", "prompt_template:{slug}"])
     def get_template(slug: str, organisation_id: int | None = None) -> GenerationTemplate:
         qs = GenerationTemplate.objects.filter(slug=slug, is_active=True)
         if organisation_id is not None:
             qs = qs.filter(Q(organisation_id=organisation_id) | Q(organisation__isnull=True))
         template = qs.first()
         if template is None:
             raise GenerationTemplateNotFound(slug)
         return template
     ```
  2. Implement `get_active_templates()`:
     ```python
     @cache_result(key_pattern="prompt_templates:active_list:{organisation_id}", ttl=300, tags=["prompt_templates"])
     def get_active_templates(organisation_id: int | None = None) -> list[GenerationTemplate]:
         qs = GenerationTemplate.objects.filter(is_active=True).select_related("organisation")
         if organisation_id is not None:
             qs = qs.filter(Q(organisation_id=organisation_id) | Q(organisation__isnull=True))
         return list(qs)
     ```
  3. Implement `invalidate_template_cache()`:
     ```python
     def invalidate_template_cache(slug: str | None = None) -> None:
         cache_service = CacheService()
         tags = ["prompt_templates"]
         if slug:
             tags.append(f"prompt_template:{slug}")
         cache_service.invalidate_tags(tags)
     ```
  4. Run `pytest tests/generative/test_prompt_service.py` — T002 tests should pass
- **Files**:
  - `src/generative/services/prompt_service.py` (edit)
- **Parallel?**: No — depends on T001 (skeleton) and T002 (tests exist).
- **Notes**:
  - `@cache_result` may have issues caching Django model instances if they're not serializable. If cache serialization fails, use pickle-safe approach or cache the queryset values as dicts and reconstruct. Test this explicitly.
  - Use `Q` objects from `django.db.models` for the org filter OR condition.
  - `select_related("organisation")` on `get_active_templates()` to avoid N+1.

### Subtask T004 – Write unit tests for resolve_prompt()

- **Purpose**: TEST_FIRST — write tests for prompt resolution before implementing it.
- **Steps**:
  1. In `tests/generative/test_prompt_service.py`, add a new test class or section for `resolve_prompt()`:
     - **`test_resolve_prompt_basic_substitution`**: Template with `prompt_text="Generate a {color} {item}"`, params `{"color": "red", "item": "ball"}` → `"Generate a red ball"`
     - **`test_resolve_prompt_param_resolver_lookup`**: Template with `{skin_tone}` placeholder, params `{"skin_tone": "light"}` → resolves via PARAM_RESOLVERS to Dutch text
     - **`test_resolve_prompt_role_equipment`**: Template with `{role_equipment}` placeholder, params with role → resolves via ROLE_EQUIPMENT constant
     - **`test_resolve_prompt_home_kit_override`**: Test the special case where home-kit params override standard kit description
     - **`test_resolve_prompt_user_instruction_appended`**: Template + `extra_context="user says: make it blue"` → appended to prompt
     - **`test_resolve_prompt_missing_param_left_as_placeholder`**: Template has `{unknown}` placeholder not in params → left as-is or handled gracefully
     - **`test_resolve_prompt_empty_prompt_text`**: Template with empty `prompt_text` → returns empty string
     - **`test_resolve_prompt_kit_analysis_integration`**: Pass `kit_analysis` dict → verify it's used in prompt construction
  2. All tests should fail (function raises `NotImplementedError`)
- **Files**:
  - `tests/generative/test_prompt_service.py` (edit, add ~100 lines)
- **Parallel?**: Can be written in parallel with T002.
- **Notes**: Create test templates with known `prompt_text` content using pytest fixtures. Don't rely on seed data for resolution tests — use explicit test data.

### Subtask T005 – Implement resolve_prompt()

- **Purpose**: Implement prompt resolution so T004 tests pass. This is the core logic migrated from legacy `teamreel_prompts.resolve_prompt()`.
- **Steps**:
  1. Study the legacy implementation in `archive/legacy-root-cleanup/scripts/teamreel_prompts.py` — the `resolve_prompt()` function:
     - Takes `template_id`, `params`, `kit_analysis`, `extra_context`
     - Gets template from TEMPLATES dict
     - For each param, resolves via PARAM_RESOLVERS if applicable
     - Handles special home-kit logic (overrides kit description when home_kit=True)
     - Appends user_instruction if present
     - Returns resolved prompt string
  2. Implement `resolve_prompt()` in `prompt_service.py`:
     ```python
     def resolve_prompt(
         template: GenerationTemplate,
         params: dict[str, str],
         kit_analysis: dict | None = None,
         extra_context: str | None = None,
     ) -> str:
         prompt = template.prompt_text
         if not prompt:
             return ""

         # Resolve params through PARAM_RESOLVERS
         resolved_params = {}
         for key, value in params.items():
             if key in PARAM_RESOLVERS and value in PARAM_RESOLVERS[key]:
                 resolved_params[key] = PARAM_RESOLVERS[key][value]
             else:
                 resolved_params[key] = value

         # Handle role_equipment special case
         if "role" in params and params["role"] in ROLE_EQUIPMENT:
             resolved_params["role_equipment"] = ROLE_EQUIPMENT[params["role"]]

         # Handle outfit style details
         if "outfit_style" in params and params["outfit_style"] in OUTFIT_STYLE_DETAILS:
             resolved_params["outfit_style_details"] = OUTFIT_STYLE_DETAILS[params["outfit_style"]]

         # Handle kit_analysis
         if kit_analysis:
             resolved_params["kit_description"] = kit_analysis.get("description", "")
             # Home-kit override logic
             if kit_analysis.get("is_home_kit"):
                 resolved_params["kit_override"] = "thuistenue"

         # Substitute placeholders
         for key, value in resolved_params.items():
             prompt = prompt.replace(f"{{{key}}}", str(value))

         # Append extra context (user_instruction)
         if extra_context:
             prompt = f"{prompt}\n\n{extra_context}"

         return prompt
     ```
  3. Run `pytest tests/generative/test_prompt_service.py` — T004 tests should pass
  4. **IMPORTANT**: Study the legacy `resolve_prompt()` carefully. The above is a simplified version — the actual implementation may have additional special cases. Match the legacy behavior exactly.
- **Files**:
  - `src/generative/services/prompt_service.py` (edit)
- **Parallel?**: No — depends on T004 (tests exist) and T001 (constants migrated).
- **Notes**: The legacy `resolve_prompt()` is ~60 lines with several branches. Study it thoroughly before implementing. Don't simplify logic that exists for a reason.

### Subtask T006 – Create signals.py + update apps.py + signal tests

- **Purpose**: Set up automatic cache invalidation when templates are saved via Admin or API.
- **Steps**:
  1. Create `src/generative/signals.py`:
     ```python
     import logging

     from django.db.models.signals import post_save
     from django.dispatch import receiver

     from src.generative.models import GenerationTemplate
     from src.generative.services.prompt_service import invalidate_template_cache

     logger = logging.getLogger(__name__)

     @receiver(post_save, sender=GenerationTemplate)
     def invalidate_template_cache_on_save(sender, instance, **kwargs):
         """Invalidate prompt template cache when a template is saved."""
         logger.info(
             "Invalidating template cache for %s",
             instance.slug,
             extra={"slug": instance.slug, "pk": instance.pk},
         )
         invalidate_template_cache(slug=instance.slug)
     ```
  2. Update `src/generative/apps.py` to register signals:
     ```python
     class GenerativeConfig(AppConfig):
         # ... existing code ...

         def ready(self):
             import src.generative.signals  # noqa: F401
     ```
     Check if `ready()` already exists — if so, add the import inside it.
  3. Write signal tests in `tests/generative/test_prompt_service.py`:
     - **`test_cache_invalidated_on_template_save`**: Get template via cache, modify + save, get again, assert fresh data returned
     - **`test_signal_called_on_admin_save`**: Verify `invalidate_template_cache_on_save` is called when template is saved
  4. Run full test suite: `pytest tests/generative/test_prompt_service.py`
- **Files**:
  - `src/generative/signals.py` (new, ~20 lines)
  - `src/generative/apps.py` (edit, add 1-2 lines in `ready()`)
  - `tests/generative/test_prompt_service.py` (edit, add ~30 lines)
- **Parallel?**: No — depends on T003 (invalidate_template_cache implemented).
- **Notes**: Check if `src/generative/apps.py` already has a `ready()` method. If so, append the import. Follow the pattern in `src/transactions/apps.py` for signal registration.

## Test Strategy

Per constitution TEST_FIRST paradigm:
1. **T002**: Write `get_template`/`get_active_templates` tests (7 tests)
2. **T003**: Implement → tests pass
3. **T004**: Write `resolve_prompt` tests (8 tests)
4. **T005**: Implement → tests pass
5. **T006**: Write signal tests (2 tests) + implement signal

**Total**: ~17 unit tests in `tests/generative/test_prompt_service.py`

**Run commands**:
```bash
pytest tests/generative/test_prompt_service.py -v  # WP02 tests
pytest tests/generative/ -v  # All generative tests (includes WP01)
```

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| PARAM_RESOLVERS migration error | Wrong prompt text in AI generation | Cross-reference every value with legacy file, add test for each resolver |
| Cache serialization of Django model | `get_template()` fails on cache read | Test cache round-trip in T002. If model isn't pickle-safe, cache dict and reconstruct |
| Signal import order | `ready()` fails on startup | Follow existing pattern in `src/transactions/apps.py`. Test with `python manage.py check` |
| resolve_prompt edge cases | Missing special case logic | Study legacy function thoroughly. Add edge case tests in T004 |

## Review Guidance

- Verify PARAM_RESOLVERS completeness against legacy file (spot-check at least 5 resolver categories)
- Verify `@cache_result` TTL is exactly 300s
- Verify `GenerationTemplateNotFound` includes the slug in the error message
- Verify `resolve_prompt()` handles all special cases from legacy (home-kit, user_instruction, guest player)
- Verify signal is registered in `apps.py:ready()` — not just defined in `signals.py`
- Run `python manage.py check` to verify signal registration doesn't break startup

## Activity Log

- 2026-03-31T06:55:35Z – system – lane=planned – Prompt created.
- 2026-03-31T07:08:29Z – bouwer – shell_pid=89732 – lane=doing – Assigned agent via workflow command
- 2026-03-31T09:39:44Z – bouwer – shell_pid=89732 – lane=for_review – Ready for review: PromptService core with cached lookup (get_template/get_active_templates, TTL 300s), resolve_prompt with full PARAM_RESOLVERS migration, signal-based cache invalidation. 25 tests pass, ruff clean, manage.py check clean.
