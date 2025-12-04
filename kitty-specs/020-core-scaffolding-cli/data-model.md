# Data Model: Core Scaffolding CLI
*Path: kitty-specs/020-core-scaffolding-cli/data-model.md*

**Feature**: B20 Core Scaffolding CLI
**Date**: 2025-12-04
**Status**: Planning Phase

---

## Overview

This document defines the data structures, file formats, and entities used by the Core Scaffolding CLI. No persistent database models required - all data is file-based (YAML manifests, Jinja2 templates, generated code).

---

## Template Manifest Schema

### File: `__template__.yaml`

Location: Root of each template directory (e.g., `templates/scaffold/api-first/__template__.yaml`)

**Purpose**: Defines template metadata, inheritance, variables, and file structure.

**Schema (YAML)**:

```yaml
# Required fields
name: string                    # Template identifier (lowercase, hyphen-separated)
description: string             # Human-readable description shown in --list-templates

# Optional fields
extends: string                 # Parent template name (e.g., "core/minimal", "api-first")
                                # Max inheritance depth: 2 levels

variables:                      # Template variable definitions
  <variable_name>:
    type: string                # Variable type: string, boolean, integer
    description: string         # Help text shown in interactive prompts
    required: boolean           # Whether variable is required (default: false)
    default: any                # Default value if not provided
    choices: list[string]       # Optional: valid choices for enum-style variables

files:                          # Template file list (relative paths from template root)
  - string                      # List of files included in this template
                                # Paths relative to template directory
                                # .j2 extension stripped during generation

# Optional metadata
author: string                  # Template author/maintainer
version: string                 # Template version (semver)
tags: list[string]              # Categories/keywords for discoverability
```

**Example - Minimal Template**:

```yaml
name: minimal
description: "Basic Django app structure with no API or UI boilerplate"
variables:
  app_name:
    type: string
    description: "Django app name (snake_case)"
    required: true
  author:
    type: string
    description: "Module author name"
    required: false
    default: "Core-App Team"
files:
  - __init__.py
  - apps.py.j2
  - models.py.j2
  - admin.py.j2
  - tests/__init__.py
  - tests/test_models.py.j2
  - migrations/__init__.py
  - locale/.gitkeep
author: "Core-App Team"
version: "1.0.0"
tags: ["django", "basic", "foundation"]
```

**Example - API-First Template (with inheritance)**:

```yaml
name: api-first
description: "REST API module with Django REST Framework"
extends: minimal                # Inherits from minimal template
variables:
  app_name:
    type: string
    description: "Django app name (snake_case)"
    required: true
  model_name:
    type: string
    description: "Primary model name (PascalCase)"
    required: false
    default: "Item"
  api_version:
    type: string
    description: "API version prefix"
    required: false
    default: "v1"
    choices: ["v1", "v2"]
files:
  - serializers.py.j2           # Override/add to minimal template
  - views.py.j2
  - urls.py.j2
  - permissions.py.j2
  - tests/test_api.py.j2
  - tests/test_serializers.py.j2
author: "Core-App Team"
version: "1.0.0"
tags: ["django", "api", "rest", "drf"]
```

**Validation Rules**:
- `name` must be unique within discovery scope
- `extends` must reference existing template (circular dependencies rejected)
- Inheritance depth ≤ 2 (validated at discovery time)
- `variables` with `required: true` must be provided at generation time
- `files` must exist in template directory (or parent if inherited)

---

## Entities

### Template

**Purpose**: Represents a scaffolding pattern that can be used to generate code.

**Attributes**:
- `name` (str): Unique identifier (e.g., "api-first")
- `description` (str): Human-readable description
- `source_path` (Path): Filesystem location of template directory
- `manifest` (TemplateManifest): Parsed manifest data
- `parent` (Optional[Template]): Parent template if extends is specified
- `variables` (Dict[str, VariableDefinition]): Variable definitions (merged with parent)
- `files` (List[Path]): All template files (merged with parent via inheritance)

**Methods**:
- `resolve_inheritance()`: Build complete file list from parent chain
- `validate()`: Check manifest schema, file existence, inheritance depth
- `get_variable(name: str) -> VariableDefinition`: Get variable def (including inherited)

**Relationships**:
- Has-one TemplateManifest (composition)
- Has-one Optional[Template] as parent (inheritance)
- Has-many VariableDefinition (composition)

---

### TemplateManifest

**Purpose**: Structured representation of `__template__.yaml` file.

**Attributes**:
- `name` (str): Template name
- `description` (str): Description
- `extends` (Optional[str]): Parent template reference
- `variables` (Dict[str, dict]): Variable definitions
- `files` (List[str]): Template file paths
- `metadata` (dict): Optional fields (author, version, tags)

**Methods**:
- `from_yaml(path: Path) -> TemplateManifest`: Parse YAML file
- `validate_schema()`: Validate required fields and types
- `merge_with_parent(parent: TemplateManifest) -> TemplateManifest`: Merge inheritance

**Validation**:
- Schema validated using pydantic or dataclasses
- Required fields: name, description
- Type checking for all fields

---

### VariableDefinition

**Purpose**: Defines a substitutable variable in template files.

**Attributes**:
- `name` (str): Variable name (e.g., "app_name")
- `type` (str): Variable type ("string", "boolean", "integer")
- `description` (str): Help text for prompts
- `required` (bool): Whether variable must be provided
- `default` (Any): Default value if not provided
- `choices` (Optional[List[str]]): Valid choices for enum-style variables

**Methods**:
- `validate_value(value: Any) -> bool`: Check if value is valid
- `prompt_user() -> Any`: Interactive prompt for value (Click prompt)
- `get_effective_value(provided: Any) -> Any`: Return provided or default

**Built-in Variables** (always available):
- `app_name`: Django app name (snake_case)
- `app_label`: Django app label (lowercase)
- `app_class`: AppConfig class name (PascalCase)
- `project_name`: Project name if bootstrapping
- `author`: Author name (from config or prompt)
- `year`: Current year (for copyright headers)

---

### GeneratedApp

**Purpose**: Represents a Django application created by scaffolding.

**Attributes**:
- `name` (str): App name (snake_case)
- `path` (Path): Target directory (e.g., `src/payments/`)
- `template_used` (str): Template name used for generation
- `variables` (Dict[str, Any]): Variable values used during generation
- `files_created` (List[Path]): List of files generated
- `validation_report` (Optional[ValidationReport]): Constitutional validation results

**Methods**:
- `register_in_settings()`: Add to INSTALLED_APPS (future enhancement)
- `rollback()`: Delete all generated files (used on validation failure)

**File Structure** (example for "api-first" template):
```
src/payments/
├── __init__.py
├── apps.py                     # AppConfig class
├── models.py                   # Django models
├── serializers.py              # DRF serializers
├── views.py                    # DRF viewsets
├── urls.py                     # URL routing
├── permissions.py              # Custom permissions
├── admin.py                    # Django admin registration
├── tests/
│   ├── __init__.py
│   ├── test_models.py
│   ├── test_serializers.py
│   └── test_api.py
├── migrations/
│   └── __init__.py
└── locale/
    └── .gitkeep
```

---

### GeneratedProject

**Purpose**: Represents a complete downstream project bootstrapped by `scaffold init`.

**Attributes**:
- `name` (str): Project name (slug)
- `display_name` (str): Human-readable project name
- `path` (Path): Project root directory
- `template_used` (str): Bootstrap template (e.g., "full-core")
- `apps_included` (List[str]): Foundational apps included
- `validation_report` (Optional[ValidationReport]): Constitutional validation results

**File Structure** (example for full Core bootstrap):
```
my-product/
├── README.md
├── .gitignore
├── .env.example
├── pyproject.toml
├── requirements/
│   ├── base.txt
│   ├── local.txt
│   └── production.txt
├── docker-compose.yml
├── Dockerfile
├── manage.py
├── src/
│   ├── __init__.py
│   ├── config/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── accounts/               # Core foundational apps
│   ├── audit/
│   ├── organisations/
│   ├── permissions/
│   ├── projects/
│   ├── settings/
│   └── security_baseline/
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   └── integration/
├── docs/
│   └── README.md
├── kitty-specs/
│   └── README.md
├── .kittify/
│   ├── memory/
│   │   └── constitution.md
│   └── templates/
├── constitution_engine.yaml
└── check_policy.py
```

---

### ValidationReport

**Purpose**: Results from constitutional enforcement validation.

**Attributes**:
- `passed` (bool): Overall pass/fail status
- `violations` (List[Violation]): List of constitutional violations
- `warnings` (List[Warning]): Non-blocking warnings
- `checks_run` (List[str]): Names of checks executed
- `execution_time` (float): Validation duration in seconds

**Methods**:
- `format_for_display() -> str`: Human-readable report for CLI output
- `to_json() -> dict`: Machine-readable format for CI/CD

**Example Output**:
```
Constitutional Validation Report
================================

✅ B01 Structure: PASS
✅ B03 Security: PASS
❌ B04 i18n: FAIL (2 violations)
✅ Code Quality: PASS
✅ Testing: PASS

Violations:
  [B04-001] Missing gettext marker in user-facing string
    File: src/payments/models.py
    Line: 15
    Code: help_text="Payment amount"
    Fix:  help_text=_("Payment amount")

  [B04-002] Missing gettext marker in user-facing string
    File: src/payments/models.py
    Line: 18
    Code: verbose_name="Payment Status"
    Fix:  verbose_name=_("Payment Status")

Validation Result: FAILED
Run with --force to bypass validation
```

---

### Violation

**Purpose**: Single constitutional rule violation.

**Attributes**:
- `rule_id` (str): Rule identifier (e.g., "B04-001")
- `rule_name` (str): Human-readable rule name
- `file_path` (Path): File containing violation
- `line_number` (int): Line number
- `code_snippet` (str): Offending code
- `suggested_fix` (str): How to fix
- `severity` (str): "error" or "warning"

---

## File Formats

### Template File Naming Convention

All template files use `.j2` extension to indicate Jinja2 templates. Extension is stripped during generation.

**Examples**:
- `models.py.j2` → generates `models.py`
- `apps.py.j2` → generates `apps.py`
- `README.md.j2` → generates `README.md`

### Variable Substitution Syntax

Templates use Jinja2 syntax:

```python
# models.py.j2
"""
{{ app_name }} models.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _


class {{ model_name }}(models.Model):
    """{{ model_name }} model for {{ app_name }} app."""

    name = models.CharField(
        max_length=255,
        verbose_name=_("Name"),
        help_text=_("{{ model_name }} name"),
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("{{ model_name }}")
        verbose_name_plural = _("{{ model_name }}s")

    def __str__(self) -> str:
        return self.name
```

---

## CLI Configuration File (Optional)

### File: `.scaffold.yaml` or `pyproject.toml` [tool.scaffold]

**Purpose**: Project-specific scaffolding configuration.

**Schema (YAML)**:

```yaml
template_dirs:                  # Additional template directories
  - ./templates/scaffold
  - ./vendor/templates

defaults:                       # Default values for variables
  author: "My Company Team"
  api_version: "v1"

validation:
  enabled: true                 # Enable constitutional validation
  strict: true                  # Fail on warnings (not just errors)
  rules:                        # Override default rules
    - B01
    - B03
    - B04

generation:
  target_dir: "src"             # Where to generate apps
  auto_register: false          # Auto-add to INSTALLED_APPS (future)
```

**Schema (pyproject.toml)**:

```toml
[tool.scaffold]
template_dirs = ["./templates/scaffold", "./vendor/templates"]

[tool.scaffold.defaults]
author = "My Company Team"
api_version = "v1"

[tool.scaffold.validation]
enabled = true
strict = true
rules = ["B01", "B03", "B04"]

[tool.scaffold.generation]
target_dir = "src"
auto_register = false
```

---

## Directory Structure Conventions

### Template Package Structure

```
my-template-package/
├── setup.py                    # Package metadata with entry_points
├── my_templates/
│   └── scaffold_templates/     # Entry point target
│       ├── __init__.py
│       ├── custom-api/
│       │   ├── __template__.yaml
│       │   ├── models.py.j2
│       │   └── views.py.j2
│       └── custom-service/
│           ├── __template__.yaml
│           └── services.py.j2
```

**Entry Point in setup.py**:

```python
setup(
    name="my-template-package",
    entry_points={
        "scaffold_templates": [
            "custom-api = my_templates.scaffold_templates.custom_api",
            "custom-service = my_templates.scaffold_templates.custom_service",
        ]
    }
)
```

---

## Data Flow

### Generation Flow

```
1. User Input
   ↓
2. Template Discovery
   ├─ Load project-local templates
   ├─ Load configured directories
   ├─ Load Core built-in templates
   └─ Load plugin packages
   ↓
3. Template Selection
   ├─ Resolve template by name
   ├─ Load manifest
   └─ Validate inheritance chain
   ↓
4. Variable Collection
   ├─ Interactive prompts (if TTY)
   ├─ CLI flags
   ├─ Default values
   └─ Built-in variables (app_name, year, etc.)
   ↓
5. Template Rendering
   ├─ Jinja2 render each file
   ├─ Write to staging directory (/tmp/scaffold-{uuid}/)
   └─ Preserve file permissions
   ↓
6. Constitutional Validation
   ├─ Run check_policy.py on staged files
   ├─ Parse validation output
   └─ Generate ValidationReport
   ↓
7. Atomic Move or Rollback
   ├─ IF PASS: Move staged → target (shutil.move)
   ├─ IF FAIL: Delete staged, show report
   └─ Exit with appropriate code (0 or 1)
```

---

## Entity Relationships

```
Template
├── has-one TemplateManifest
├── has-many VariableDefinition
├── has-one Optional[Template] (parent)
└── generates → GeneratedApp or GeneratedProject

TemplateManifest
├── defines-many VariableDefinition
└── references Optional[str] (parent template name)

GeneratedApp
├── created-from Template
├── contains-many File
└── validated-by ValidationReport

ValidationReport
├── contains-many Violation
├── contains-many Warning
└── validates GeneratedApp or GeneratedProject
```

---

## Validation Rules

### Template Manifest Validation

- [x] `name` field is present and non-empty
- [x] `description` field is present and non-empty
- [x] `extends` references valid template (if present)
- [x] Inheritance depth ≤ 2 levels
- [x] No circular dependencies in inheritance chain
- [x] All `files` entries exist in template directory or parent
- [x] All `variables` have valid `type` values
- [x] Required variables have no default value (or validation warns)

### Generated Code Validation

- [x] All files pass Ruff linting
- [x] All files pass mypy type checking
- [x] B01 structure compliance (required directories present)
- [x] B03 security patterns present (no hardcoded secrets, secure defaults)
- [x] B04 i18n markers present (gettext usage in user-facing strings)
- [x] Test directory structure valid (pytest patterns)

---

**Data Model Status**: ✅ Complete - All entities, schemas, and validation rules defined
