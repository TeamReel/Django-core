---
work_package_id: "WP07"
subtasks:
  - "T048"
  - "T049"
  - "T050"
  - "T051"
  - "T052"
  - "T053"
  - "T054"
title: "Core Built-in Templates"
phase: "Phase 3 - Content"
lane: "planned"
assignee: ""
agent: ""
shell_pid: ""
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-04"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP07 – Core Built-in Templates

## Objectives & Success Criteria

**Goal**: Create 4 Core templates (minimal, api-first, service, ui-backed) with manifests, Jinja2 templates, and golden file tests (FR-009).

**Success Criteria**:
- "minimal" template: models.py, apps.py, tests/, migrations/, locale/
- "api-first" template: extends minimal, adds DRF serializers/viewsets/URLs
- "service" template: extends minimal, adds service classes with type hints
- "ui-backed" template: extends minimal, adds views/forms/templates/static
- All templates have __template__.yaml manifests
- Golden file tests verify generated output matches expected structure
- 100% of generated code passes Ruff, mypy, check_policy.py

**Constitutional Alignment**:
- **Principle III (Code Quality)**: All generated code has type hints, passes linting
- **Principle IV (Testing)**: Generated code includes pytest test structure
- **Principle V (Security)**: Generated code follows B03 security baseline

---

## Context & Constraints

**Prerequisites**: WP03 (Template Rendering) must be complete

**Related Documents**:
- Specification: [spec.md](../../spec.md) (FR-009, FR-016-025, US1, US5)
- Planning: [plan.md](../../plan.md) (WP07 description, 4 Core templates)
- Data Model: [data-model.md](../../data-model.md) (TemplateManifest schema)
- Tasks: [tasks.md](../../tasks.md) (WP07 section)

---

## Subtasks

### T048 – Create "minimal" template
- Directory: `src/scaffolding/built_in_templates/minimal/`
- Files: `__init__.py.j2`, `apps.py.j2`, `models.py.j2`, `tests/__init__.py`, `tests/test_models.py.j2`, `migrations/__init__.py`, `locale/.gitkeep`
- Manifest: `__template__.yaml` with name, description, variables, files
- Variables: `app_name` (required)
- **Files**: CREATE 8-10 template files

### T049 – Create "api-first" template
- Directory: `src/scaffolding/built_in_templates/api-first/`
- Extends: minimal
- Additional files: `serializers.py.j2`, `views.py.j2` (DRF viewsets), `urls.py.j2`, `tests/test_api.py.j2`, `tests/test_serializers.py.j2`
- Variables: `app_name` (required), `model_name` (optional, default="Item")
- **Files**: CREATE 12-15 template files

### T050 – Create "service" template
- Directory: `src/scaffolding/built_in_templates/service/`
- Extends: minimal
- Additional files: `services.py.j2` (business logic classes with type hints), `tests/test_services.py.j2`
- No views/URLs (backend logic only)
- **Files**: CREATE 8-10 template files

### T051 – Create "ui-backed" template
- Directory: `src/scaffolding/built_in_templates/ui-backed/`
- Extends: minimal
- Additional files: `views.py.j2` (Django views), `forms.py.j2`, `templates/{app_name}/base.html.j2`, `static/{app_name}/style.css`, `tests/test_views.py.j2`, `tests/test_forms.py.j2`
- **Files**: CREATE 15-20 template files

### T052 – Add __template__.yaml manifest for each template [PARALLEL]
- Define name, description, extends, variables, files for each
- Validate against TemplateManifest schema
- **Files**: CREATE 4 manifest files

### T053 – Add golden file tests for all 4 templates [PARALLEL]
- Generate each template with fixtures
- Compare output to expected golden files
- Verify file structure, content correctness
- **Files**: CREATE `tests/scaffolding/fixtures/golden_files/{minimal,api-first,service,ui-backed}/`

### T054 – Validate templates pass Ruff, mypy, check_policy.py [PARALLEL]
- Run Ruff on generated code → 0 errors
- Run mypy on generated code → 0 type errors
- Run check_policy.py → 100% compliance
- **Files**: CREATE validation tests in `tests/scaffolding/test_templates.py`

---

## Definition of Done

- [ ] All 4 templates created with Jinja2 files
- [ ] All templates have __template__.yaml manifests
- [ ] Golden file tests verify output correctness
- [ ] Generated code passes Ruff (0 errors)
- [ ] Generated code passes mypy (0 type errors)
- [ ] Generated code passes check_policy.py (100% compliance)
- [ ] Template inheritance works (api-first extends minimal, etc.)
- [ ] tasks.md updated: WP07 complete

---

## Activity Log

- 2025-12-04 – system – lane=planned – Prompt created via /spec-kitty.tasks
