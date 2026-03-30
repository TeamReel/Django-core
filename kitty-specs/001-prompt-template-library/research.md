# Research: Prompt Template Library (D13)

## 1. Current Architecture

### Template Loading (broken)
All code in `src/generative/` loads prompts via `importlib.util.spec_from_file_location("teamreel_prompts", path)`. The file has been archived to `archive/legacy-root-cleanup/scripts/teamreel_prompts.py` — generation is broken on fresh deploys.

### Call Sites (4 locations, identical pattern)
| File | Lines | Function |
|---|---|---|
| views_generate.py | ~893 | `list_asset_templates_view` |
| services/asset_pipeline.py | ~66 | `_get_template_output_type()` |
| services/asset_pipeline.py | ~137 | `generate_asset()` |
| services/asset_pipeline.py | ~385 | `_load_prompts_module()` |

## 2. Existing GenerationTemplate Model

Full 16-field model already exists with: name, slug, version, template_type, template_subtype, input_schema, pipeline_config, organisation FK. Has CRUD ViewSet, serializer, admin, and URL routing all wired up.

**Key gap**: No `prompt_text` field — the actual AI prompt is loaded from the Python file, not from the model.

**Organisation FK**: `NOT NULL` (on_delete=CASCADE). Must be made nullable to support global seed templates.

**Admin bug found**: `template_type` and `template_subtype` fields exist on the model but are NOT shown in admin fieldsets.

## 3. Template Data Structure (from teamreel_prompts.py)

10 templates total. Each has:
- `id` (slug), `name`, `category`, `description`
- `input_requirements` (list of required inputs)
- `parameters` (dict of param definitions with label, type, options, default)
- `preprocessing` (dict mapping input keys to processor names)
- `prompt_template` (string with `{placeholder}` variable syntax)

## 4. Architecture Decision

**Extend GenerationTemplate** (not separate PromptTemplate model). Rationale:
- Model already has 80% of the fields
- ViewSet, serializer, admin, URLs already wired
- Adding 3 fields is simpler than a new model + OneToOne FK
- Avoids join queries for every prompt lookup

## 5. Existing URL Structure
```
/api/v1/generative/templates/       → GenerationTemplateViewSet (CRUD)
/api/v1/generative/assets/templates/ → list_asset_templates_view (uses importlib)
```

Both endpoints exist. The ViewSet serves admin CRUD, the assets endpoint serves the frontend generation studio.