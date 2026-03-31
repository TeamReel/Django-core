---
work_package_id: WP03
title: API + Admin Polish
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
- T012
- T013
- T014
phase: H2 - API + Admin Polish
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
  action: WP prompt regenerated via /spec-kitty.tasks — expanded from 2 to 5 subtasks with implementation detail
---

# Work Package Prompt: WP03 – API + Admin Polish

## Objective

Polish the DRF API and Django Admin experience for prompt templates. Add serializer validations, a lightweight list serializer, global template support in the ViewSet queryset, a `has_prompt` filter, and improved admin widgets.

## Requirements Covered

- **FR-005**: System MUST provide Django Admin interface for CRUD on prompt templates
- **FR-007**: System MUST provide read-only API endpoint for frontend to list available templates

## Context

### Pre-WP03 State (after WP01)

WP01 added the 3 prompt fields to `GenerationTemplateSerializer`:
```python
fields = [
    ..., "prompt_text", "parameters_schema", "preprocessing_config", ...
]
```

But the serializer has **no validation** for the new fields (model `clean()` validates but serializer does not). The ViewSet queryset filters by `organisation=membership.organisation` only — **global templates (org=None) are excluded**. Admin has the fields in fieldsets but uses default widgets (no textarea for prompt_text, no pretty JSON).

### Existing Serializer (src/generative/serializers.py)

`GenerationTemplateSerializer` is a full `ModelSerializer` with:
- Read-only computed fields: `created_by_username`, `organisation_name`, `parent_template_name`, `provider`, `estimated_cost`
- Existing validations: `validate_input_schema` (JSON Schema Draft 7), `validate_pipeline_config` (provider-specific), `validate_version` (semver)
- 28 fields in total

### Existing ViewSet (src/generative/views.py)

`GenerationTemplateViewSet`:
- Permissions: IsOrgAdmin for write, IsProjectMember for read
- Queryset: `qs.filter(organisation=membership.organisation)` — **no global templates**
- select_related: `("organisation", "created_by", "parent_template")`
- Filters: `["is_active", "is_latest", "parent_template"]`
- Search: `["name", "description", "slug"]`

### Existing Admin (src/generative/admin.py)

After WP01, `GenerationTemplateAdmin` has 5 fieldsets:
1. Basic Info (with template_type, template_subtype)
2. Prompt (prompt_text, parameters_schema, preprocessing_config)
3. Versioning
4. Configuration
5. Metadata

list_display includes `template_type`. list_filter includes `template_type`.

---

## Tasks

### T010: Add serializer validations

**Purpose**: Ensure the API rejects invalid `parameters_schema` and `preprocessing_config` structures with clear error messages. The model's `clean()` only validates parameters_schema — the serializer should validate both fields before reaching the model layer.

**File**: `src/generative/serializers.py`

**Steps**:
1. Add `validate_parameters_schema()` to `GenerationTemplateSerializer`:
   ```python
   def validate_parameters_schema(self, value: dict) -> dict:
       """Validate parameters_schema structure: each param needs label + type."""
       if not isinstance(value, dict):
           raise serializers.ValidationError("Must be a JSON object")
       for key, param_def in value.items():
           if not isinstance(param_def, dict):
               raise serializers.ValidationError(f"Parameter '{key}' must be a dict")
           if "label" not in param_def:
               raise serializers.ValidationError(f"Parameter '{key}' missing 'label'")
           if "type" not in param_def:
               raise serializers.ValidationError(f"Parameter '{key}' missing 'type'")
       return value
   ```
2. Add `validate_preprocessing_config()`:
   ```python
   def validate_preprocessing_config(self, value: dict) -> dict:
       """Validate preprocessing_config keys are known processor types."""
       if not isinstance(value, dict):
           raise serializers.ValidationError("Must be a JSON object")
       for input_key, processor in value.items():
           if not isinstance(processor, str):
               raise serializers.ValidationError(
                   f"Preprocessor for '{input_key}' must be a string"
               )
       return value
   ```

**Validation**:
- `POST` with `{"parameters_schema": {"bg": {"label": "BG"}}}` → error: `bg` missing `type`
- `POST` with `{"parameters_schema": {"bg": {"label": "BG", "type": "select"}}}` → accepted
- `POST` with `{"preprocessing_config": 123}` → error: must be JSON object

**Edge cases**:
- Empty dict `{}` is valid for both fields (no parameters / no preprocessing)
- Null values → handled by model field defaults (`default=dict`)

---

### T011: Add lightweight list serializer

**Purpose**: The full serializer includes `prompt_text` (which can be large) in list views. Create a separate `GenerationTemplateListSerializer` that excludes bulky fields for the list endpoint, reducing payload size and improving performance.

**File**: `src/generative/serializers.py` (add new class), `src/generative/views.py` (use it)

**Steps**:
1. Create `GenerationTemplateListSerializer` in serializers.py:
   ```python
   class GenerationTemplateListSerializer(serializers.ModelSerializer):
       """Lightweight serializer for template list views — excludes prompt_text."""
       organisation_name = serializers.CharField(source="organisation.name", read_only=True)
       provider = serializers.SerializerMethodField()
       has_prompt = serializers.SerializerMethodField()

       class Meta:
           model = GenerationTemplate
           fields = [
               "id", "organisation", "organisation_name", "name", "slug",
               "version", "is_latest", "description", "template_type",
               "template_subtype", "provider", "has_prompt", "is_active",
               "created_at", "updated_at",
           ]

       def get_provider(self, obj):
           return obj.provider

       def get_has_prompt(self, obj):
           return bool(obj.prompt_text)
   ```
2. Update `GenerationTemplateViewSet` to use per-action serializer:
   ```python
   def get_serializer_class(self):
       if self.action == "list":
           return GenerationTemplateListSerializer
       return GenerationTemplateSerializer
   ```
3. Add import of `GenerationTemplateListSerializer` in views.py

**Validation**:
- `GET /api/v1/generative/templates/` → response does NOT include `prompt_text`, `parameters_schema`, `preprocessing_config`
- `GET /api/v1/generative/templates/{id}/` → response includes all fields (full serializer)
- `has_prompt` field is `true` for seeded templates, `false` for templates without prompt_text

---

### T012: Update ViewSet queryset to include global templates

**Purpose**: After WP01, seed templates have `organisation=None` (global). The current queryset `qs.filter(organisation=membership.organisation)` excludes them. Users need to see both their org's templates AND global templates.

**File**: `src/generative/views.py`

**Steps**:
1. Update `get_queryset()` in `GenerationTemplateViewSet`:
   ```python
   from django.db.models import Q

   # In get_queryset, replace:
   #   qs = qs.filter(organisation=membership.organisation)
   # With:
   qs = qs.filter(
       Q(organisation=membership.organisation) | Q(organisation__isnull=True)
   )
   ```
2. Ensure `select_related("organisation")` still works (it does — nullable FK is fine)

**Validation**:
- Authenticated user sees both org-specific and global (org=None) templates
- User with no membership sees `qs.none()` (existing behavior preserved)
- Global templates appear in list response with `organisation: null`, `organisation_name: null`

**Edge cases**:
- Org-specific template with same slug as global template → both returned (unique_together includes org, so both can coexist)
- Unauthenticated user → 401 (existing permission behavior)

---

### T013: Add has_prompt computed field and filter

**Purpose**: Allow the frontend and admin to filter templates that have prompt text populated (useful for distinguishing "fully configured" from "metadata only" templates).

**Files**: `src/generative/serializers.py`, `src/generative/views.py`

**Steps**:
1. Add `has_prompt` to full `GenerationTemplateSerializer`:
   ```python
   has_prompt = serializers.SerializerMethodField()

   # Add to fields list
   # Add to class:
   def get_has_prompt(self, obj: GenerationTemplate) -> bool:
       return bool(obj.prompt_text)
   ```
2. Add `has_prompt` to ViewSet's `filterset_fields` is not straightforward (it's computed, not a model field). Instead, add a custom filter:
   ```python
   # In views.py, add to get_queryset:
   has_prompt = self.request.query_params.get("has_prompt")
   if has_prompt is not None:
       if has_prompt.lower() in ("true", "1"):
           qs = qs.exclude(prompt_text="")
       elif has_prompt.lower() in ("false", "0"):
           qs = qs.filter(prompt_text="")
   ```

**Validation**:
- `GET /api/v1/generative/templates/?has_prompt=true` → only templates with prompt_text
- `GET /api/v1/generative/templates/?has_prompt=false` → only templates without prompt_text
- `GET /api/v1/generative/templates/` (no filter) → all templates

---

### T014: Polish admin for prompt editing

**Purpose**: Improve the Django Admin experience for editing prompt templates. Add a larger textarea for prompt_text, use JSONField widgets for the JSON fields, and add `has_prompt` indicator to the list display.

**File**: `src/generative/admin.py`

**Steps**:
1. Add custom form with widget overrides:
   ```python
   from django import forms

   class GenerationTemplateAdminForm(forms.ModelForm):
       class Meta:
           model = GenerationTemplate
           fields = "__all__"
           widgets = {
               "prompt_text": forms.Textarea(attrs={"rows": 20, "cols": 120, "style": "font-family: monospace;"}),
           }
   ```
2. Set `form = GenerationTemplateAdminForm` on `GenerationTemplateAdmin`
3. Add `has_prompt` method to admin for list_display:
   ```python
   @admin.display(boolean=True, description="Has Prompt")
   def has_prompt(self, obj):
       return bool(obj.prompt_text)
   ```
4. Add `has_prompt` to `list_display`
5. Add filter for templates with/without prompts:
   ```python
   class HasPromptFilter(admin.SimpleListFilter):
       title = "Has Prompt"
       parameter_name = "has_prompt"

       def lookups(self, request, model_admin):
           return [("yes", "With prompt"), ("no", "Without prompt")]

       def queryset(self, request, queryset):
           if self.value() == "yes":
               return queryset.exclude(prompt_text="")
           if self.value() == "no":
               return queryset.filter(prompt_text="")
   ```
6. Add `HasPromptFilter` to `list_filter`

**Validation**:
- Django Admin shows prompt_text in a large monospace textarea
- Admin list shows boolean icon for "Has Prompt" column
- Filter sidebar has "Has Prompt" with "With prompt" / "Without prompt" options
- JSON fields render as standard textarea (Django's built-in JSONField widget is adequate)

**Edge cases**:
- Very long prompt_text (~1000+ chars) → textarea scrolls, form still usable
- Invalid JSON in parameters_schema → Django form validation catches it (built-in JSONField behavior)

---

## Done Criteria

- [ ] Serializer validates `parameters_schema` and `preprocessing_config` structure
- [ ] List endpoint uses lightweight serializer (no `prompt_text` in list response)
- [ ] Detail endpoint uses full serializer (includes all fields)
- [ ] ViewSet queryset returns both org-specific AND global templates
- [ ] `?has_prompt=true` filter works on API endpoint
- [ ] Admin has large monospace textarea for prompt_text
- [ ] Admin list shows "Has Prompt" boolean column with filter
- [ ] Org-scoping enforced on all endpoints (existing behavior preserved)
- [ ] `python manage.py check` passes
- [ ] `pytest tests/generative/` passes
