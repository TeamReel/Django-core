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
- timestamp: '2026-03-31T00:00:00Z'
  lane: planned
  agent: planner
  action: WP prompt regenerated via /spec-kitty.tasks — expanded with implementation detail
---

# Work Package Prompt: WP02 – Pipeline Refactor + Caching

## Objective

Replace all `importlib.util.spec_from_file_location` calls that load `teamreel_prompts.py` with database lookups against `GenerationTemplate`. Add a caching layer with signal-based invalidation. Implement variable substitution via a new `prompt_service.py`.

After this WP, zero references to `importlib.util.spec_from_file_location` or `teamreel_prompts` remain in `src/generative/` (excluding migrations).

## Requirements Covered

- **FR-002**: System MUST load prompts from database in all generation pipelines (replacing 4 `importlib` call sites)
- **FR-003**: System MUST support `{placeholder}` variable substitution in prompt text
- **FR-008**: System MUST cache prompt template lookups to avoid per-request DB queries
- **FR-009**: System MUST invalidate cache when a template is updated via Admin

## Context

### Pre-WP02 State (after WP01 completion)

WP01 (committed `d5b1e9550`) added 3 fields to `GenerationTemplate`:
- `prompt_text` (TextField) — stores the actual AI prompt with `{placeholder}` variables
- `parameters_schema` (JSONField) — parameter definitions (`{key: {label, type, options, default}}`)
- `preprocessing_config` (JSONField) — preprocessing pipeline per input key

10 templates are seeded in the database via migration `0010_seed_prompt_templates.py`. Organisation FK is now nullable for global/default templates.

**The pipeline still uses importlib** — generation calls still load the archived Python file. This WP replaces all those calls with DB lookups.

### Call Sites to Replace (4 importlib + 1 helper)

All use this identical broken pattern:
```python
import importlib.util
import os
prompts_path = os.path.join(settings.BASE_DIR, "..", "teamreel_prompts.py")
if not os.path.exists(prompts_path):
    prompts_path = os.path.join(settings.BASE_DIR, "teamreel_prompts.py")
spec = importlib.util.spec_from_file_location("teamreel_prompts", prompts_path)
prompts_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prompts_module)
```

| # | File | Lines | Function | Usage |
|---|------|-------|----------|-------|
| 1 | `views_generate.py` | 878–920 | `list_asset_templates_view` | Lists all templates with metadata for frontend |
| 2 | `services/asset_pipeline.py` | 53–87 | `_get_template_output_type()` | Returns 'image' or 'video' for a template slug |
| 3 | `services/asset_pipeline.py` | 100–170 | `generate_asset()` | Main image generation — loads template, resolves prompt, preprocesses inputs |
| 4 | `services/asset_pipeline.py` | 375–395 | `_load_prompts_module()` | Helper used by `generate_video()` (line ~440) |

### Additional Reference (non-functional)

| File | Line | Content |
|------|------|---------|
| `_asset_helpers.py` | 251 | `help_text="Template key from teamreel_prompts.TEMPLATES"` |

### Variable Substitution Pattern

Templates use `{placeholder}` syntax in `prompt_text`:
```
Convert this club logo into a clean, standardized format.
Background: {background_description}.
```

Parameters provide values:
```json
{"background": {"label": "Achtergrond", "type": "select", "options": ["transparent", "white", "dark"], "default": "transparent"}}
```

The existing `resolve_prompt(template_id, params)` in `teamreel_prompts.py` merges defaults with user params, then applies `str.format()`.

### Cache Strategy (from plan.md)

- **Key format**: `prompt_template:{org_id}:{slug}`
- **TTL**: 300 seconds
- **Invalidation**: `post_save` signal on GenerationTemplate
- **Fallback chain**: org-specific → global (org=None) → raise error

---

## Tasks

### T006: Create prompt loading service

**Purpose**: Centralize all prompt template lookups behind a cached service layer. This replaces the scattered importlib calls with a single, tested entry point.

**File**: `src/generative/services/prompt_service.py` (NEW)

**Steps**:
1. Create `prompt_service.py` in `src/generative/services/`
2. Define custom exception class:
   ```python
   class GenerationTemplateNotFound(Exception):
       """Raised when a prompt template cannot be found by slug."""
       def __init__(self, slug: str, organisation_id: int | None = None):
           self.slug = slug
           self.organisation_id = organisation_id
           super().__init__(f"Template not found: slug={slug}, org={organisation_id}")
   ```
3. Implement `get_prompt_template(slug, organisation_id=None)`:
   - Build cache key: `prompt_template:{organisation_id or 'global'}:{slug}`
   - Try Django cache.get(key)
   - On cache miss: query `GenerationTemplate.objects.filter(slug=slug, is_active=True)`
   - Priority: org-specific first, then global (`organisation__isnull=True`)
   - Cache the result with TTL 300s
   - Raise `GenerationTemplateNotFound` if neither found
   - Use `select_related("organisation")` on the queryset
   - Return type: `GenerationTemplate`
4. Add type hints on all functions and parameters

**Validation**:
- `get_prompt_template("logo_standardize")` returns the seeded template
- `get_prompt_template("nonexistent")` raises `GenerationTemplateNotFound`
- Second call hits cache (no DB query)

**Edge cases**:
- Org-specific template overrides global template with same slug
- Template exists but `is_active=False` → not returned
- `organisation_id=None` → only searches global templates

---

### T007: Create cache invalidation signal

**Purpose**: Ensure that when a template is edited via Django Admin, the cached version is immediately invalidated so the next pipeline call gets fresh data.

**Files**:
- `src/generative/services/prompt_service.py` — add `invalidate_prompt_cache(instance)` function
- `src/generative/apps.py` — register signal in `ready()`

**Steps**:
1. In `prompt_service.py`, add function:
   ```python
   def invalidate_prompt_cache(instance: "GenerationTemplate") -> None:
       """Clear cache entries for a template after save/delete."""
       from django.core.cache import cache
       # Clear org-specific key
       org_id = instance.organisation_id or "global"
       cache.delete(f"prompt_template:{org_id}:{instance.slug}")
       # Also clear the global key (in case org-specific was deleted)
       cache.delete(f"prompt_template:global:{instance.slug}")
   ```
2. In `prompt_service.py`, add signal receiver:
   ```python
   from django.db.models.signals import post_save, post_delete
   from django.dispatch import receiver

   @receiver(post_save, sender="generative.GenerationTemplate")
   @receiver(post_delete, sender="generative.GenerationTemplate")
   def on_template_change(sender, instance, **kwargs):
       invalidate_prompt_cache(instance)
   ```
3. In `src/generative/apps.py`, update `ready()` to import signals:
   ```python
   def ready(self):
       import generative.services.prompt_service  # noqa: F401 — registers signals
   ```

**Validation**:
- Create template → cache key does not exist yet
- Call `get_prompt_template(slug)` → result cached
- Save template via admin → cache cleared
- Next `get_prompt_template(slug)` → fresh DB query

**Edge cases**:
- Deleting a template also invalidates cache (post_delete signal)
- Changing a template's slug → old slug's cache is NOT cleared (acceptable — TTL handles expiry)

---

### T008: Replace importlib call sites with DB lookups

**Purpose**: Remove all 4 importlib patterns and replace with calls to `prompt_service.get_prompt_template()`. This is the core refactor that makes the pipeline use DB-backed prompts.

**Files to modify**:
1. `src/generative/views_generate.py` (lines 870–920)
2. `src/generative/services/asset_pipeline.py` (lines 53–87)
3. `src/generative/services/asset_pipeline.py` (lines 100–170)
4. `src/generative/services/asset_pipeline.py` (lines 375–395)
5. `src/generative/_asset_helpers.py` (line 251 — help_text only)

**Steps**:

**Call site 1: `list_asset_templates_view`** (views_generate.py, lines 878–920):
- Remove the entire importlib block
- Replace with:
  ```python
  from .models import GenerationTemplate
  templates = GenerationTemplate.objects.filter(
      is_active=True, prompt_text__gt=""
  ).values("slug", "name", "template_type", "description",
           "parameters_schema", "preprocessing_config")
  ```
- Map the queryset to the response format the frontend expects:
  ```python
  result = []
  for t in templates:
      result.append({
          "id": t["slug"],
          "name": t["name"],
          "category": t["template_type"],
          "description": t["description"],
          "input_requirements": list(t["preprocessing_config"].keys()),
          "parameters": t["parameters_schema"],
      })
  return Response({"templates": result})
  ```
- Remove `import importlib.util` and `import os` (if no longer needed)

**Call site 2: `_get_template_output_type`** (asset_pipeline.py, lines 53–87):
- Remove entire importlib block
- Replace with:
  ```python
  from .prompt_service import get_prompt_template
  template = get_prompt_template(template_id)
  return template.pipeline_config.get("output_type", "image")
  ```
- Note: `output_type` is in `pipeline_config` JSONField, not a separate field

**Call site 3: `generate_asset`** (asset_pipeline.py, lines 130–170):
- Remove importlib block
- Replace with:
  ```python
  from .prompt_service import get_prompt_template, resolve_prompt
  db_template = get_prompt_template(template_id)
  PREPROCESSORS_MAP = db_template.preprocessing_config
  final_prompt = resolve_prompt(db_template, params)
  ```
- Update subsequent code to use `db_template` instead of `template` dict
- Map `input_requirements` from `db_template.preprocessing_config.keys()`

**Call site 4: `_load_prompts_module` + `generate_video`** (asset_pipeline.py, lines 375–450):
- Remove `_load_prompts_module()` function entirely
- In `generate_video()`, replace:
  ```python
  prompts_module = _load_prompts_module()
  TEMPLATES = prompts_module.TEMPLATES
  resolve_prompt = prompts_module.resolve_prompt
  ```
  With:
  ```python
  from .prompt_service import get_prompt_template, resolve_prompt
  db_template = get_prompt_template(template_id)
  ```
- Update subsequent template access to use `db_template` fields

**Call site 5: `_asset_helpers.py` help_text** (line 251):
- Change `help_text="Template key from teamreel_prompts.TEMPLATES"` to `help_text="Template slug from GenerationTemplate"`

**Validation**:
- `grep -r "importlib.util.spec_from_file_location" src/generative/` returns 0 results (excluding migrations)
- `grep -r "teamreel_prompts" src/generative/` returns 0 results (excluding migrations)
- `list_asset_templates_view` returns templates from DB
- `generate_asset("logo_standardize", ...)` works with DB-backed prompt
- `generate_video(...)` works with DB-backed prompt

**Edge cases**:
- `generate_asset` with PILLOW_ONLY_TEMPLATES or `photo_composite_gemini` — these bypass prompt loading, should NOT be affected
- `_get_template_output_type` for templates without `pipeline_config.output_type` — defaults to "image"
- Empty DB (no seeded templates) → `GenerationTemplateNotFound` raised with clear error message

---

### T009: Implement variable substitution

**Purpose**: Replace the `resolve_prompt()` function from `teamreel_prompts.py` with a database-aware version that merges parameter defaults with user overrides and substitutes `{placeholder}` variables in `prompt_text`.

**File**: `src/generative/services/prompt_service.py` (add to existing)

**Steps**:
1. Implement `SafeDict` class:
   ```python
   class SafeDict(dict):
       """Dict subclass that returns '{key}' for missing keys instead of raising."""
       def __missing__(self, key: str) -> str:
           return f"{{{key}}}"
   ```
2. Implement `resolve_prompt(template, context)`:
   ```python
   def resolve_prompt(template: "GenerationTemplate", context: dict[str, str]) -> str:
       """Resolve a prompt template by substituting variables.

       Merges parameter defaults from parameters_schema with user-provided
       context values, then applies str.format_map() with SafeDict fallback.
       """
       # Build defaults from parameters_schema
       defaults: dict[str, str] = {}
       for key, param_def in template.parameters_schema.items():
           if "default" in param_def:
               defaults[key] = str(param_def["default"])

       # Merge: user context overrides defaults
       merged = {**defaults, **context}

       # Substitute using SafeDict (unknown placeholders stay as {key})
       return template.prompt_text.format_map(SafeDict(merged))
   ```

**Validation**:
- Template with `"Background: {background}."` + context `{"background": "white"}` → `"Background: white."`
- Template with `"{missing_var}"` + empty context → `"{missing_var}"` (not an error)
- Defaults from parameters_schema are used when context doesn't provide a value
- User context overrides parameter defaults

**Edge cases**:
- Template with no placeholders → returns prompt_text as-is
- Template with empty `parameters_schema` + context with values → substitution still works
- Context value contains `{nested}` braces → treated as literal text (no recursive substitution)
- Empty prompt_text → returns empty string

---

## Done Criteria

- [ ] `src/generative/services/prompt_service.py` exists with `get_prompt_template()`, `resolve_prompt()`, `invalidate_prompt_cache()`
- [ ] Cache integration works: key format `prompt_template:{org_id}:{slug}`, TTL 300s
- [ ] Signal-based cache invalidation on save and delete
- [ ] Zero references to `importlib.util.spec_from_file_location` in `src/generative/` (excluding migrations)
- [ ] Zero references to `teamreel_prompts` in `src/generative/` (excluding migrations)
- [ ] `list_asset_templates_view` returns templates from DB
- [ ] `generate_asset()` uses DB prompt text with variable substitution
- [ ] `generate_video()` uses DB prompt text with variable substitution
- [ ] `python manage.py check` passes
- [ ] `pytest tests/generative/` passes (no regressions)
