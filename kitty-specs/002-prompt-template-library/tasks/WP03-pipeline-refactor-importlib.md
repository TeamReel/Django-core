---
work_package_id: WP03
title: Pipeline Refactor — Replace importlib Call Sites
lane: planned
dependencies: [WP02]
requirement_refs:
- FR-004
- FR-006
- NFR-003
- NFR-004
- C-005
planning_base_branch: main
merge_target_branch: main
branch_strategy: Planning artifacts for this feature were generated on main. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into main unless the human explicitly redirects the landing branch.
subtasks:
- T007
- T008
- T009
- T010
- T011
phase: Phase 2 - Pipeline Refactor
assignee: ''
agent: ''
shell_pid: ''
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

# Work Package Prompt: WP03 – Pipeline Refactor — Replace importlib Call Sites

## Branch Strategy

- **Planning/base branch at prompt creation**: `main`
- **Final merge target for completed work**: `main`
- **Actual worktree base may differ later**: `/spec-kitty.implement` populates frontmatter `base_branch` when the worktree is created. For stacked WPs it may point at another WP branch, but the final merge target remains `main` unless the human explicitly changes the landing branch.
- **If human instructions contradict these fields**: stop and resolve the intended landing branch before coding.

**Implementation command**: `spec-kitty implement WP03 --base WP02`

---

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check `review_status`. If it says `has_feedback`, read `review_feedback` first.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: When you understand the feedback, update `review_status: acknowledged`.

---

## Objectives & Success Criteria

Replace **all 4 importlib call sites** that load `teamreel_prompts.py` with database lookups via the `PromptService` built in WP02. After this WP:

1. **Zero importlib references** remain in `src/generative/` for template loading
2. **Pipeline generates images using DB templates** — preprocessing, prompt resolution, and input requirements all come from the database
3. **Pipeline generates videos using DB templates** — same pattern as images
4. **Legacy FBV endpoint works with DB** — `/api/v1/generative/assets/templates/` returns DB templates with backward-compatible response format (C-005)
5. **Zero regression** — all existing tests pass (NFR-003)

**Success criteria:**
- `grep -r "importlib" src/generative/` returns zero results for template loading
- `pytest tests/generative/` passes with zero failures
- `pytest tests/generative/test_prompt_pipeline_integration.py` passes

## Context & Constraints

- **WP02 provides**: `get_template()`, `get_active_templates()`, `resolve_prompt()`, `invalidate_template_cache()` in `src/generative/services/prompt_service.py`
- **4 call sites** — each uses identical 7-line importlib boilerplate (see research.md section 1):
  - **Site A**: `src/generative/views_generate.py:list_asset_templates_view()` (~L878-895)
  - **Site B**: `src/generative/services/asset_pipeline.py:_get_template_output_type()` (~L55-85)
  - **Site C**: `src/generative/services/asset_pipeline.py:generate_asset()` (~L129-165)
  - **Site D**: `src/generative/services/asset_pipeline.py:_load_prompts_module()` (~L375-390)
- **Current state**: All 4 sites fail silently because `teamreel_prompts.py` only exists in `archive/`. They return empty/fallback values.
- **Constraint C-005**: Existing API contract at `/api/v1/generative/assets/templates/` must not break. The legacy FBV returns `{"templates": [...]}` format.
- **Legacy field mapping** (from data-model.md):
  - `TEMPLATES[id]["id"]` → `template.slug`
  - `TEMPLATES[id]["name"]` → `template.name`
  - `TEMPLATES[id]["category"]` → `template.template_subtype`
  - `TEMPLATES[id]["description"]` → `template.description`
  - `TEMPLATES[id]["input_requirements"]` → `template.input_schema`
  - `TEMPLATES[id]["parameters"]` → `template.parameters_schema`
  - `TEMPLATES[id]["preprocessing"]` → `template.preprocessing_config`
  - `TEMPLATES[id]["output_type"]` → `template.pipeline_config.get("output_type", "image")`

## Subtasks & Detailed Guidance

### Subtask T007 – Write integration tests for pipeline with PromptService

- **Purpose**: TEST_FIRST — write integration tests before refactoring the pipeline.
- **Steps**:
  1. Create `tests/generative/test_prompt_pipeline_integration.py`
  2. Write tests:
     - **`test_list_asset_templates_returns_db_templates`**: Call `list_asset_templates_view` (via test client), assert response contains DB templates with correct fields (`id`, `name`, `category`, `description`, `input_requirements`, `parameters`)
     - **`test_list_asset_templates_response_format_backward_compat`**: Assert response is `{"templates": [...]}` with each item having the legacy field names
     - **`test_get_template_output_type_from_db`**: Call `_get_template_output_type(slug)`, assert returns `"image"` for image templates and `"video"` for video templates
     - **`test_generate_asset_uses_db_template`**: Mock the AI provider, call `generate_asset()` with a known template slug, verify it fetches template from DB and uses `resolve_prompt()` for prompt text
     - **`test_generate_asset_preprocessing_from_db`**: Verify that `generate_asset()` reads `preprocessing_config` from the DB template, not from importlib
     - **`test_generate_asset_input_requirements_from_db`**: Verify that `generate_asset()` reads input requirements from `input_schema`, not from importlib
     - **`test_video_generation_uses_db_template`**: Mock video provider, call video generation, verify it uses PromptService
     - **`test_no_importlib_in_generative_module`**: Use `ast` or grep to verify no importlib usage remains in `src/generative/`
  3. Some tests will pass after T008-T010, others (like the importlib check) are regression guards
- **Files**:
  - `tests/generative/test_prompt_pipeline_integration.py` (new, ~150 lines)
- **Parallel?**: No — write first, then implement T008-T010.
- **Notes**:
  - Use `@pytest.mark.django_db` and `APIClient` from DRF for the FBV test
  - Use `unittest.mock.patch` to mock AI provider calls (Gemini, OpenAI)
  - Seed test templates using existing fixtures from `conftest.py` or create specific ones

### Subtask T008 – Replace importlib in views_generate.py:list_asset_templates_view()

- **Purpose**: Refactor the legacy FBV to query the database instead of loading from importlib.
- **Steps**:
  1. Open `src/generative/views_generate.py`, find `list_asset_templates_view()` (~L878-895)
  2. Current code (conceptual):
     ```python
     def list_asset_templates_view(request):
         try:
             # 7-line importlib boilerplate
             prompts_module = ...
             templates = []
             for template_id, template_data in prompts_module.TEMPLATES.items():
                 templates.append({
                     "id": template_id,
                     "name": template_data["name"],
                     "category": template_data["category"],
                     ...
                 })
             return Response({"templates": templates})
         except Exception:
             return Response({"templates": []})
     ```
  3. Replace with:
     ```python
     from src.generative.services.prompt_service import get_active_templates

     def list_asset_templates_view(request):
         templates = get_active_templates()
         result = []
         for template in templates:
             result.append({
                 "id": template.slug,
                 "name": template.name,
                 "category": template.template_subtype or "",
                 "description": template.description or "",
                 "input_requirements": template.input_schema.get("required", []) if isinstance(template.input_schema, dict) else [],
                 "parameters": template.parameters_schema or {},
             })
         return Response({"templates": result})
     ```
  4. **CRITICAL**: Maintain the exact response format for C-005:
     - `"id"` → template.slug (not template.pk)
     - `"category"` → template.template_subtype (maps to legacy category)
     - `"input_requirements"` → extracted from input_schema JSON (legacy had a flat list)
     - `"parameters"` → template.parameters_schema (1:1 mapping)
  5. Remove the importlib boilerplate (the `import importlib.util`, `os.path.join`, `spec_from_file_location` block)
  6. Remove the try/except that catches importlib failures (no longer needed)
- **Files**:
  - `src/generative/views_generate.py` (edit ~L878-895)
- **Parallel?**: Yes — touches different file than T009/T010.
- **Notes**: Study the exact current response format carefully. The frontend may depend on specific field names and types.

### Subtask T009 – Replace importlib in _get_template_output_type() and _load_prompts_module()

- **Purpose**: Replace the two simpler importlib call sites in asset_pipeline.py.
- **Steps**:
  1. Open `src/generative/services/asset_pipeline.py`
  2. **Replace `_get_template_output_type()` (~L55-85)**:
     - Current: loads importlib module, reads `TEMPLATES[template_id].get("output_type", "image")`
     - Replace with:
       ```python
       from src.generative.services.prompt_service import get_template, GenerationTemplateNotFound

       def _get_template_output_type(template_id: str) -> str:
           """Return 'image' or 'video' based on template pipeline_config."""
           try:
               template = get_template(template_id)
               return template.pipeline_config.get("output_type", "image") if template.pipeline_config else "image"
           except GenerationTemplateNotFound:
               return "image"  # Default fallback
       ```
  3. **Remove `_load_prompts_module()` helper (~L375-390)**:
     - This function exists solely to load the importlib module for video generation
     - After refactoring, video generation will use `get_template()` + `resolve_prompt()` directly
     - Delete the entire function
     - Update all callers of `_load_prompts_module()` to use PromptService instead
  4. Remove importlib-related imports at the top of the file
- **Files**:
  - `src/generative/services/asset_pipeline.py` (edit)
- **Parallel?**: Yes — can be done alongside T008 (different file).
- **Notes**: The `_load_prompts_module()` is used by video generation further down in the file. Find ALL callers before removing it.

### Subtask T010 – Replace importlib in generate_asset() (most complex)

- **Purpose**: Refactor the core image generation function to use PromptService for all template data.
- **Steps**:
  1. Open `src/generative/services/asset_pipeline.py`, find `generate_asset()` (~L129-165)
  2. This function currently uses importlib-loaded data for:
     - **Preprocessing config**: `TEMPLATES[template_id].get("preprocessing", {})` → maps input images through preprocessing functions
     - **Input requirements**: `template.get("input_requirements", [])` → checks if reference_photo is needed for kit analysis
     - **Prompt resolution**: calls `resolve_prompt(template_id, params, kit_analysis)` from importlib module
     - **Template config**: passes to Gemini API content parts
  3. Replace each usage:
     ```python
     # At the top of generate_asset():
     from src.generative.services.prompt_service import get_template, resolve_prompt

     db_template = get_template(template_id)

     # Replace preprocessing config:
     # OLD: preprocessing = TEMPLATES[template_id].get("preprocessing", {})
     preprocessing = db_template.preprocessing_config or {}

     # Replace input requirements check:
     # OLD: input_reqs = template.get("input_requirements", [])
     input_reqs = db_template.input_schema.get("required", []) if isinstance(db_template.input_schema, dict) else []

     # Replace prompt resolution:
     # OLD: prompt = prompts_module.resolve_prompt(template_id, params, kit_analysis)
     prompt = resolve_prompt(db_template, params, kit_analysis, extra_context=user_instruction)

     # Guest player override (append to prompt as before)
     ```
  4. **Carefully preserve the function's overall flow**:
     - Load template from DB (instead of importlib)
     - Apply preprocessing per input image
     - Check for kit analysis requirement
     - Resolve prompt via service
     - Handle guest player override
     - Send to AI provider
  5. Remove all importlib boilerplate from `generate_asset()`
  6. Test: run `pytest tests/generative/test_prompt_pipeline_integration.py`
- **Files**:
  - `src/generative/services/asset_pipeline.py` (edit, ~L129-165 and surrounding)
- **Parallel?**: No — depends on T009 (shared file, avoid merge conflicts).
- **Notes**:
  - This is the **most complex** refactoring because `generate_asset()` uses multiple template attributes
  - Read the entire function before making changes — understand the full flow
  - The `input_schema` is stored as JSON Schema; the legacy `input_requirements` was a flat list. Extract the list from `input_schema.get("required", [])` or similar.
  - Keep error handling: if template not found, the function should handle `GenerationTemplateNotFound` gracefully (log + return error, don't crash the pipeline)

### Subtask T011 – Remove unused imports + verify clean

- **Purpose**: Clean up all remaining importlib references and verify the refactor is complete.
- **Steps**:
  1. Search for importlib in the generative module:
     ```bash
     grep -rn "importlib" src/generative/
     ```
     Verify zero results for template-loading patterns
  2. Search for references to `teamreel_prompts`:
     ```bash
     grep -rn "teamreel_prompts" src/generative/
     ```
     Verify zero results (only archive/ should have references)
  3. Remove any orphaned imports:
     - `import importlib.util` → remove
     - `import os` if only used for importlib path → check usage before removing
  4. Run linting:
     ```bash
     ruff check src/generative/ --select=F401
     ```
  5. Run full regression:
     ```bash
     pytest tests/generative/ -v
     pytest  # Full test suite
     python manage.py check
     ```
  6. Verify all T007 integration tests pass
- **Files**:
  - `src/generative/views_generate.py` (cleanup)
  - `src/generative/services/asset_pipeline.py` (cleanup)
- **Parallel?**: No — final cleanup step.
- **Notes**: Don't remove `import os` if it's used elsewhere in the file — only remove if it was solely for importlib path construction.

## Test Strategy

Per TEST_FIRST paradigm:
1. **T007**: Write integration tests (8 tests) — initially most fail
2. **T008-T010**: Implement replacements → integration tests start passing
3. **T011**: Final verification — all tests pass

**Total**: ~8 integration tests in `tests/generative/test_prompt_pipeline_integration.py`

**Run commands**:
```bash
pytest tests/generative/test_prompt_pipeline_integration.py -v  # WP03 tests
pytest tests/generative/ -v  # All generative tests
pytest  # Full regression
python manage.py check  # Django system check
ruff check src/generative/  # Lint check
```

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Response format regression (C-005) | Frontend breaks on `/assets/templates/` | T007 test verifies exact response structure with legacy field names |
| generate_asset() flow disruption | Image generation fails | Integration test with mocked AI provider verifies full flow; keep fallback behavior |
| input_schema format mismatch | Wrong input requirements extracted | Verify seed data format matches what pipeline expects; add format handling for both list and JSON Schema |
| _load_prompts_module() has hidden callers | Video generation breaks | Grep for all callers before removing; integration test covers video path |

## Review Guidance

- Verify ALL 4 importlib sites are replaced — `grep -rn "importlib" src/generative/` should return nothing for template loading
- Verify C-005: response format of `/api/v1/generative/assets/templates/` matches legacy format exactly
- Verify `generate_asset()` still handles all edge cases (guest player, missing params, preprocessing errors)
- Verify `_load_prompts_module()` has no remaining callers before accepting its removal
- Run `pytest` to confirm zero regressions
- Check that `ruff check src/generative/` is clean

## Activity Log

- 2026-03-31T06:55:35Z – system – lane=planned – Prompt created.
