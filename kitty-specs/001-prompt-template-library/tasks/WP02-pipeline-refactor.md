---
work_package_id: WP02
title: Pipeline Refactor + Caching
lane: planned
dependencies:
- WP01
requirement_refs:
- FR-002
- FR-003
- FR-008
- FR-009
planning_base_branch: main
merge_target_branch: main
branch_strategy: Planning artifacts for this feature were generated on main. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into main unless the human explicitly redirects the landing branch.
subtasks:
- T006
- T007
- T008
- T009
phase: H1 - Pipeline Refactor
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

# Work Package Prompt: WP02 – Pipeline Refactor + Caching

## Objective

Replace all `importlib.util.spec_from_file_location` calls that load `teamreel_prompts.py` with database lookups against `GenerationTemplate`. Add caching layer with signal-based invalidation.

## Requirements Covered

- **FR-002**: System MUST load prompts from database in all generation pipelines (replacing 4 `importlib` call sites)
- **FR-003**: System MUST support `{placeholder}` variable substitution in prompt text
- **FR-008**: System MUST cache prompt template lookups to avoid per-request DB queries
- **FR-009**: System MUST invalidate cache when a template is updated via Admin

## Context

### Call Sites to Replace

All use the same pattern:
```python
import importlib.util
prompts_path = os.path.join(settings.BASE_DIR, "..", "teamreel_prompts.py")
spec = importlib.util.spec_from_file_location("teamreel_prompts", prompts_path)
prompts_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prompts_module)
```

| File | Lines | Function |
|---|---|---|
| `src/generative/views_generate.py` | ~878-895 | `list_asset_templates_view` |
| `src/generative/services/asset_pipeline.py` | ~66-75 | `_determine_output_type()` |
| `src/generative/services/asset_pipeline.py` | ~129-139 | `generate_asset()` |
| `src/generative/services/asset_pipeline.py` | ~378-387 | `_load_prompts_module()` |

### Variable Substitution
Templates use `{placeholder}` syntax, e.g.:
```
Convert this club logo into a clean, standardized format.
Background: {background_description}.
```

Parameters provide the values: `{"background": {"label": "Achtergrond", "type": "select", "options": [...], "default": "transparent"}}`

## Tasks

### T006: Create prompt loading service
- Create `src/generative/services/prompt_service.py` with:
  - `get_prompt_template(slug: str, organisation_id: int | None = None) -> GenerationTemplate`
  - Uses Django cache framework: key `prompt_template:{org_id}:{slug}`, TTL 300s
  - Falls back to `organisation=None` templates if org-specific not found (global defaults)
  - Raises `GenerationTemplateNotFound` (custom exception) if neither found

### T007: Create cache invalidation signal
- Add `post_save` signal on `GenerationTemplate` that invalidates cache for that slug
- Register signal in `src/generative/apps.py` → `ready()`
- Invalidation clears both org-specific and global cache keys

### T008: Replace importlib calls
- **views_generate.py** (`list_asset_templates_view`): Replace module loading with `GenerationTemplate.objects.filter(is_active=True, prompt_text__gt="")` query
- **services/asset_pipeline.py** (`_determine_output_type`): Use `get_prompt_template(slug)` instead of module loading
- **services/asset_pipeline.py** (`generate_asset`): Use `get_prompt_template(slug)` + `resolve_prompt()` for variable substitution
- **services/asset_pipeline.py** (`_load_prompts_module`): Replace entire function body with `get_prompt_template()` call

### T009: Implement variable substitution
- Create `resolve_prompt(template: GenerationTemplate, context: dict) -> str` in prompt_service.py
- Uses Python `str.format_map()` with SafeDict (returns `{key}` for missing keys instead of raising)
- Context values are derived from parameters_schema defaults merged with user-provided overrides

## Done Criteria

- [ ] Zero references to `importlib.util.spec_from_file_location` in `src/generative/`
- [ ] Zero references to `teamreel_prompts.py` in `src/generative/`
- [ ] `generate_asset()` works with DB-backed prompts
- [ ] `list_asset_templates_view` returns templates from DB
- [ ] Cache hit returns template in < 5ms
- [ ] Editing template in admin invalidates cache (next request gets fresh data)
- [ ] `pytest` passes with 0 failures
