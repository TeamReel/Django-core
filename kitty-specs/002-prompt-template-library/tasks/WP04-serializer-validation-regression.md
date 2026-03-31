---
work_package_id: WP04
title: Serializer Validation + Regression
lane: planned
dependencies: []
requirement_refs:
- FR-007
- FR-008
- FR-009
- NFR-003
planning_base_branch: main
merge_target_branch: main
branch_strategy: Planning artifacts for this feature were generated on main. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into main unless the human explicitly redirects the landing branch.
subtasks:
- T012
- T013
- T014
- T015
- T016
phase: Phase 2 - Validation & Polish
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

# Work Package Prompt: WP04 – Serializer Validation + Regression

## Branch Strategy

- **Planning/base branch at prompt creation**: `main`
- **Final merge target for completed work**: `main`
- **Actual worktree base may differ later**: `/spec-kitty.implement` populates frontmatter `base_branch` when the worktree is created. For stacked WPs it may point at another WP branch, but the final merge target remains `main` unless the human explicitly changes the landing branch.
- **If human instructions contradict these fields**: stop and resolve the intended landing branch before coding.

**Implementation command**: `spec-kitty implement WP04` (no dependencies — can run in parallel with WP02/WP03)

---

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check `review_status`. If it says `has_feedback`, read `review_feedback` first.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: When you understand the feedback, update `review_status: acknowledged`.

---

## Objectives & Success Criteria

Add structural validation for `parameters_schema` and `preprocessing_config` JSONFields to the `GenerationTemplateSerializer`, and perform full regression verification.

1. **parameters_schema validation** (FR-008): Each value must be a dict with `label` (str) and `type` (str). Optional: `options` (list), `default`.
2. **preprocessing_config validation** (FR-009): Each value must be a string (preprocessor function name).
3. **Existing seed data passes validation** — the 10 seeded templates must not be rejected by the new validators.
4. **FR-007 verified**: Admin UI displays editable prompt_text, parameters_schema, preprocessing_config fields.
5. **Full regression** (NFR-003): `pytest` passes with zero failures.

**Success criteria:**
- `pytest tests/generative/test_prompt_serializer_validation.py` passes
- `pytest` (full suite) passes with zero failures
- `python manage.py check` passes
- `ruff check src/generative/` is clean

## Context & Constraints

- **Existing serializer**: `GenerationTemplateSerializer` in `src/generative/serializers.py` (L26-155) — already has `validate_input_schema()`, `validate_pipeline_config()`, `validate_version()`. This WP adds two more validators.
- **Existing model validation**: `GenerationTemplate.clean()` already validates `parameters_schema` — checks that each value has `label` and `type`. The serializer validation provides better API-level error messages.
- **Existing admin**: `GenerationTemplateAdmin` in `src/generative/admin.py` — already has `Prompt` fieldset with `prompt_text`, `parameters_schema`, `preprocessing_config`. FR-007 is already satisfied; this WP verifies it.
- **Seed data**: 10 templates seeded in migration 0010. All must pass the new validators — don't make validation stricter than what the seed data satisfies.

## Subtasks & Detailed Guidance

### Subtask T012 – Write tests for validate_parameters_schema()

- **Purpose**: TEST_FIRST — write tests before implementing the validator.
- **Steps**:
  1. Create `tests/generative/test_prompt_serializer_validation.py`
  2. Write tests using `GenerationTemplateSerializer` directly (not through the API — pure serializer tests):
     - **`test_parameters_schema_valid_passes`**: Schema `{"color": {"label": "Kleur", "type": "select", "options": ["red", "blue"], "default": "red"}}` → serializer is valid
     - **`test_parameters_schema_missing_label_fails`**: Schema `{"color": {"type": "select"}}` → serializer raises ValidationError for missing `label`
     - **`test_parameters_schema_missing_type_fails`**: Schema `{"color": {"label": "Kleur"}}` → serializer raises ValidationError for missing `type`
     - **`test_parameters_schema_non_dict_value_fails`**: Schema `{"color": "not_a_dict"}` → serializer raises ValidationError
     - **`test_parameters_schema_empty_passes`**: Schema `{}` → serializer is valid (empty is allowed)
     - **`test_parameters_schema_seed_data_passes`**: Load each seeded template, run through serializer, assert all pass validation (regression guard)
  3. Tests will fail until T013 is implemented
- **Files**:
  - `tests/generative/test_prompt_serializer_validation.py` (new, ~80 lines)
- **Parallel?**: Yes — independent of T014 (different validator).
- **Notes**:
  - Use `GenerationTemplateSerializer(instance=template, data={...}, partial=True)` for update validation tests
  - For the seed data test, use `GenerationTemplate.objects.filter(is_active=True)` to load all seeded templates
  - Import `from rest_framework.exceptions import ValidationError` for assertion

### Subtask T013 – Implement validate_parameters_schema()

- **Purpose**: Add the validator so T012 tests pass.
- **Steps**:
  1. Open `src/generative/serializers.py`, find `GenerationTemplateSerializer` (~L26)
  2. Add `validate_parameters_schema()` method:
     ```python
     def validate_parameters_schema(self, value: dict) -> dict:
         """Validate that parameters_schema has correct structure.

         Each value must be a dict with 'label' (str) and 'type' (str).
         Optional: 'options' (list), 'default'.
         """
         if not isinstance(value, dict):
             raise serializers.ValidationError("parameters_schema must be a dict.")

         for key, param in value.items():
             if not isinstance(param, dict):
                 raise serializers.ValidationError(
                     f"Parameter '{key}' must be a dict, got {type(param).__name__}."
                 )
             if "label" not in param:
                 raise serializers.ValidationError(
                     f"Parameter '{key}' is missing required field 'label'."
                 )
             if "type" not in param:
                 raise serializers.ValidationError(
                     f"Parameter '{key}' is missing required field 'type'."
                 )
             if not isinstance(param["label"], str):
                 raise serializers.ValidationError(
                     f"Parameter '{key}': 'label' must be a string."
                 )
             if not isinstance(param["type"], str):
                 raise serializers.ValidationError(
                     f"Parameter '{key}': 'type' must be a string."
                 )
         return value
     ```
  3. Run `pytest tests/generative/test_prompt_serializer_validation.py -k parameters` — T012 tests should pass
- **Files**:
  - `src/generative/serializers.py` (edit, add ~25 lines)
- **Parallel?**: Yes — independent of T014/T015.
- **Notes**: This mirrors the model's `clean()` validation but provides field-level error messages suitable for API responses. Don't make it stricter than what `clean()` allows.

### Subtask T014 – Write tests for validate_preprocessing_config()

- **Purpose**: TEST_FIRST — write tests for preprocessing_config validation.
- **Steps**:
  1. In `tests/generative/test_prompt_serializer_validation.py`, add tests:
     - **`test_preprocessing_config_valid_passes`**: Config `{"logo": "standardize_logo", "sponsor": "standardize_sponsor"}` → valid
     - **`test_preprocessing_config_non_string_value_fails`**: Config `{"logo": 123}` → raises ValidationError
     - **`test_preprocessing_config_non_dict_fails`**: Config `"not_a_dict"` → raises ValidationError
     - **`test_preprocessing_config_empty_passes`**: Config `{}` → valid (empty is allowed)
     - **`test_preprocessing_config_seed_data_passes`**: Load seeded templates, verify all preprocessing_config values pass validation
  2. Tests will fail until T015 is implemented
- **Files**:
  - `tests/generative/test_prompt_serializer_validation.py` (edit, add ~60 lines)
- **Parallel?**: Yes — independent of T012/T013.
- **Notes**: Keep test structure consistent with T012 tests.

### Subtask T015 – Implement validate_preprocessing_config()

- **Purpose**: Add the validator so T014 tests pass.
- **Steps**:
  1. In `src/generative/serializers.py`, add `validate_preprocessing_config()` method:
     ```python
     def validate_preprocessing_config(self, value: dict) -> dict:
         """Validate that preprocessing_config has correct structure.

         Each value must be a string (preprocessor function name).
         """
         if not isinstance(value, dict):
             raise serializers.ValidationError("preprocessing_config must be a dict.")

         for key, preprocessor in value.items():
             if not isinstance(preprocessor, str):
                 raise serializers.ValidationError(
                     f"Preprocessing '{key}' must be a string (function name), "
                     f"got {type(preprocessor).__name__}."
                 )
         return value
     ```
  2. Run `pytest tests/generative/test_prompt_serializer_validation.py -k preprocessing` — T014 tests should pass
- **Files**:
  - `src/generative/serializers.py` (edit, add ~15 lines)
- **Parallel?**: Yes — independent of T012/T013.
- **Notes**: Simple validator — each value must be a string. No need to verify the function actually exists (that's a runtime concern, not a schema concern).

### Subtask T016 – Full regression verification

- **Purpose**: Verify all feature requirements are satisfied end-to-end.
- **Steps**:
  1. Run full test suite:
     ```bash
     pytest -v  # All tests pass, zero failures
     python manage.py check  # Django system check passes
     ruff check src/generative/  # No lint errors
     ```
  2. Verify FR-006 (API returns correct fields):
     - The existing `GenerationTemplateSerializer` already includes `parameters_schema`, `preprocessing_config`, and `description` in its `fields`
     - Verify by checking serializer Meta class: these fields should be in the field list
  3. Verify FR-007 (Admin displays editable fields):
     - The existing `GenerationTemplateAdmin` already has a `Prompt` fieldset with `prompt_text`, `parameters_schema`, `preprocessing_config`
     - Verify by checking admin fieldsets: these fields should be in the Prompt fieldset
  4. Verify NFR-003 (zero regressions):
     - `pytest tests/generative/test_wp01_schema_seed.py` — all 21 WP01 tests pass
     - `pytest tests/generative/` — all generative tests pass
     - `pytest` — full suite passes
  5. Document any pre-existing failures (not caused by this feature)
- **Files**:
  - No file changes — verification only
- **Parallel?**: No — final step after T012-T015.
- **Notes**: If any tests fail, investigate whether the failure is pre-existing or caused by this WP. Pre-existing failures should be documented but not fixed in this WP.

## Test Strategy

Per TEST_FIRST paradigm:
1. **T012**: Write parameters_schema tests (6 tests)
2. **T013**: Implement → tests pass
3. **T014**: Write preprocessing_config tests (5 tests)
4. **T015**: Implement → tests pass
5. **T016**: Full regression verification

**Total**: ~11 validation tests in `tests/generative/test_prompt_serializer_validation.py`

**Run commands**:
```bash
pytest tests/generative/test_prompt_serializer_validation.py -v  # WP04 tests
pytest tests/generative/ -v  # All generative tests
pytest  # Full regression
python manage.py check  # System check
ruff check src/generative/  # Lint
```

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Validation rejects seed data | 10 seeded templates fail API writes | T012/T014 includes seed data regression test |
| Duplicate validation (model + serializer) | Confusing error messages if both fail | Serializer validator runs first, catches most errors. Model clean() is belt-and-suspenders. |
| Strict validation breaks existing API consumers | Existing writes fail | Keep validation no stricter than model's clean() |

## Review Guidance

- Verify `validate_parameters_schema()` error messages include the parameter key name (helps debugging)
- Verify `validate_preprocessing_config()` error messages include the config key name
- Verify all 10 seeded templates pass through the serializer without errors
- Verify FR-006: `GenerationTemplateSerializer.Meta.fields` includes `parameters_schema`, `preprocessing_config`, `description`
- Verify FR-007: `GenerationTemplateAdmin.fieldsets` includes the Prompt fieldset with correct fields
- Run `pytest` to confirm zero regressions

## Activity Log

- 2026-03-31T06:55:35Z – system – lane=planned – Prompt created.
