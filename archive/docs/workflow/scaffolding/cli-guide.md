# Scaffolding CLI User Guide

## Overview

The Django scaffolding CLI helps you quickly generate Django apps from pre-built templates with best practices baked in. Generate apps with models, serializers, views, forms, tests, and more—all following your project's conventions and constitutional principles.

## Installation

The scaffolding CLI is included with Core-App. No additional installation required.

```bash
# Verify installation
python manage.py scaffold --help
```

## Quick Start

Generate a minimal Django app:

```bash
python manage.py scaffold generate minimal my_app
```

Generate an API-first app with DRF:

```bash
python manage.py scaffold generate api-first products --var model_name=Product
```

## Commands

### `scaffold generate`

Generate a new Django app from a template.

**Syntax:**
```bash
python manage.py scaffold generate <template> <app_name> [options]
```

**Arguments:**
- `<template>`: Template name (minimal, api-first, service, ui-backed)
- `<app_name>`: Django app name (snake_case)

**Options:**
- `--output-dir PATH`: Output directory (default: current directory)
- `--var KEY=VALUE`: Set template variable (can be used multiple times)
- `--no-validate`: Skip validation checks
- `--non-interactive`: Run without prompts (for CI/CD)
- `--force`: Overwrite existing files
- `--verbose`: Show detailed output
- `--quiet`: Suppress non-error output

**Examples:**

Generate minimal app:
```bash
python manage.py scaffold generate minimal accounts
```

Generate API app with custom model:
```bash
python manage.py scaffold generate api-first products \
  --var model_name=Product \
  --output-dir src/
```

Generate service layer:
```bash
python manage.py scaffold generate service orders \
  --var service_name=OrderService
```

Generate UI-backed app:
```bash
python manage.py scaffold generate ui-backed dashboard \
  --var model_name=Widget
```

Generate in CI/CD pipeline:
```bash
python manage.py scaffold generate minimal accounts \
  --non-interactive \
  --no-validate \
  --output-dir ./apps/
```

---

### `scaffold list`

List all available templates.

**Syntax:**
```bash
python manage.py scaffold list [options]
```

**Options:**
- `--format FORMAT`: Output format (table, json, yaml)
- `--verbose`: Show detailed template information

**Examples:**

List templates as table:
```bash
python manage.py scaffold list
```

Output:
```
Available Templates:
┌────────────┬──────────────────────────────────────┬──────────────┐
│ Name       │ Description                          │ Extends      │
├────────────┼──────────────────────────────────────┼──────────────┤
│ minimal    │ Basic Django app with models, tests  │ -            │
│ api-first  │ DRF API with serializers, viewsets   │ minimal      │
│ service    │ Service layer for business logic     │ minimal      │
│ ui-backed  │ Full-stack with views, forms, HTML   │ minimal      │
└────────────┴──────────────────────────────────────┴──────────────┘
```

List templates as JSON:
```bash
python manage.py scaffold list --format json
```

---

### `scaffold validate`

Validate generated app against constitutional policies.

**Syntax:**
```bash
python manage.py scaffold validate [options]
```

**Options:**
- `--directory PATH`: Directory to validate (default: current directory)
- `--strict`: Fail on warnings
- `--format FORMAT`: Output format (text, json)

**Examples:**

Validate current directory:
```bash
python manage.py scaffold validate
```

Validate specific app:
```bash
python manage.py scaffold validate --directory src/accounts/
```

Strict validation (fail on warnings):
```bash
python manage.py scaffold validate --strict
```

---

### `scaffold init` (Future)

Bootstrap a new Django project with foundational modules.

**Syntax:**
```bash
python manage.py scaffold init <project_name> [options]
```

**Options:**
- `--with-modules`: Comma-separated list of modules to include
- `--with-docker`: Include Docker setup
- `--template`: Custom project template

**Examples:**

Bootstrap minimal project:
```bash
python manage.py scaffold init my_project
```

Bootstrap with foundational modules:
```bash
python manage.py scaffold init my_project \
  --with-modules accounts,audit,settings,organisations
```

Bootstrap with Docker:
```bash
python manage.py scaffold init my_project --with-docker
```

---

## Built-in Templates

### minimal

Basic Django app structure with models, apps config, tests, and i18n support.

**Variables:**
- `app_name` (required): Django app name

**Generated Files:**
- `__init__.py`: App initialization
- `apps.py`: AppConfig with ready() hook
- `models.py`: BaseModel + Item example
- `tests/test_models.py`: Model unit tests
- `migrations/__init__.py`: Migration package
- `locale/.gitkeep`: i18n directory

**Use Cases:**
- Simple data models
- Utility apps
- Internal tools
- Foundation for custom apps

**Example:**
```bash
python manage.py scaffold generate minimal payments
```

---

### api-first

API-first Django app with Django REST Framework integration.

**Variables:**
- `app_name` (required): Django app name
- `model_name` (optional, default: "Item"): Primary model name

**Generated Files:**
- All files from `minimal` template
- `serializers.py`: 3 serializer types (full, list, create)
- `views.py`: ViewSet with filtering, search, ordering
- `urls.py`: DRF router configuration
- `permissions.py`: Custom permission classes
- `filters.py`: django-filters integration
- `tests/test_api.py`: API endpoint tests
- `tests/test_serializers.py`: Serializer tests
- `tests/test_permissions.py`: Permission tests

**Use Cases:**
- RESTful APIs
- Microservices
- Mobile app backends
- SPA backends

**Example:**
```bash
python manage.py scaffold generate api-first products \
  --var model_name=Product
```

---

### service

Service-oriented Django app with business logic layer.

**Variables:**
- `app_name` (required): Django app name
- `service_name` (optional, default: "ItemService"): Service class name

**Generated Files:**
- All files from `minimal` template
- `services.py`: Service layer with CRUD operations
- `exceptions.py`: Custom business exceptions
- `tests/test_services.py`: Service unit tests

**Use Cases:**
- Domain-driven design
- Complex business logic
- Transaction management
- Backend services

**Example:**
```bash
python manage.py scaffold generate service orders \
  --var service_name=OrderService
```

---

### ui-backed

Full-stack Django app with views, forms, templates, and static files.

**Variables:**
- `app_name` (required): Django app name
- `model_name` (optional, default: "Item"): Primary model name

**Generated Files:**
- All files from `minimal` template
- `views.py`: Class-based views (List, Detail, Create, Update, Delete)
- `forms.py`: ModelForm with validation
- `urls.py`: URL patterns
- `templates/`: 5 HTML templates (base, list, detail, form, delete)
- `static/css/style.css`: Responsive CSS
- `static/js/main.js`: JavaScript utilities
- `tests/test_views.py`: View tests
- `tests/test_forms.py`: Form tests

**Use Cases:**
- Traditional Django web apps
- Admin dashboards
- Server-side rendered UIs
- Internal tools with UI

**Example:**
```bash
python manage.py scaffold generate ui-backed dashboard \
  --var model_name=Widget
```

---

## Template Variables

Templates can accept variables to customize generated code.

### Setting Variables

Use `--var` flag (can be repeated):

```bash
python manage.py scaffold generate api-first products \
  --var model_name=Product \
  --var app_label=shop
```

### Common Variables

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `app_name` | string | Yes | - | Django app name (snake_case) |
| `model_name` | string | No | "Item" | Primary model name (PascalCase) |
| `service_name` | string | No | "ItemService" | Service class name (PascalCase) |

### Variable Validation

Variables are validated according to template manifest:

- `app_name`: Must match `^[a-z][a-z0-9_]*$` (snake_case)
- `model_name`: Must match `^[A-Z][a-zA-Z0-9]*$` (PascalCase)
- `service_name`: Must match `^[A-Z][a-zA-Z0-9]*Service$` (PascalCase ending in "Service")

**Invalid Examples:**
```bash
# Invalid: app name with hyphens
python manage.py scaffold generate minimal my-app  # ❌

# Invalid: model name not PascalCase
python manage.py scaffold generate api-first products --var model_name=product  # ❌

# Valid:
python manage.py scaffold generate minimal my_app  # ✅
python manage.py scaffold generate api-first products --var model_name=Product  # ✅
```

---

## Non-Interactive Mode (CI/CD)

For CI/CD pipelines, use `--non-interactive` flag to skip all prompts.

**Example CI Script:**
```bash
#!/bin/bash
# .github/workflows/generate-apps.sh

# Generate multiple apps
python manage.py scaffold generate minimal accounts --non-interactive
python manage.py scaffold generate api-first products --var model_name=Product --non-interactive
python manage.py scaffold generate service orders --var service_name=OrderService --non-interactive

# Validate generated code
python manage.py scaffold validate --strict
```

**GitHub Actions Example:**
```yaml
name: Generate Apps
on: [push]

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      - name: Install dependencies
        run: pip install -r requirements/base.txt
      - name: Generate apps
        run: |
          python manage.py scaffold generate minimal accounts --non-interactive
          python manage.py scaffold generate api-first products --var model_name=Product --non-interactive
      - name: Validate
        run: python manage.py scaffold validate --strict
```

---

## Validation

Generated code is automatically validated against:

1. **Ruff**: Linting and code style
2. **mypy**: Type checking
3. **check_policy.py**: Constitutional principles

### Skip Validation

Use `--no-validate` to skip validation (faster, but less safe):

```bash
python manage.py scaffold generate minimal accounts --no-validate
```

### Manual Validation

Validate existing code:

```bash
# Validate specific app
python manage.py scaffold validate --directory src/accounts/

# Validate with strict mode (fail on warnings)
python manage.py scaffold validate --directory src/accounts/ --strict
```

---

## Output Formats

### Table (Default)

Human-readable table format.

```bash
python manage.py scaffold list
```

### JSON

Machine-readable JSON format for parsing.

```bash
python manage.py scaffold list --format json
```

Output:
```json
{
  "templates": [
    {
      "name": "minimal",
      "description": "Basic Django app with models, tests",
      "extends": null,
      "variables": {
        "app_name": {"type": "string", "required": true}
      }
    }
  ]
}
```

### YAML

YAML format for configuration files.

```bash
python manage.py scaffold list --format yaml
```

---

## Troubleshooting

### Template Not Found

**Error:** `Template 'xyz' not found`

**Solution:** List available templates:
```bash
python manage.py scaffold list
```

### Invalid App Name

**Error:** `Invalid app name 'My-App'`

**Solution:** Use snake_case without hyphens:
```bash
python manage.py scaffold generate minimal my_app  # ✅
```

### Permission Denied

**Error:** `PermissionError: Cannot write to /path/`

**Solution:** Check directory permissions or use different output directory:
```bash
python manage.py scaffold generate minimal accounts --output-dir ./apps/
```

### Validation Failed

**Error:** `Validation failed: Ruff check returned errors`

**Solution:** Review generated code or skip validation:
```bash
python manage.py scaffold generate minimal accounts --no-validate
```

---

## Best Practices

### 1. Use Descriptive App Names

```bash
# Good
python manage.py scaffold generate minimal user_accounts
python manage.py scaffold generate api-first product_catalog

# Avoid
python manage.py scaffold generate minimal app1
python manage.py scaffold generate api-first stuff
```

### 2. Customize With Variables

```bash
# Customize model names
python manage.py scaffold generate api-first products --var model_name=Product

# Customize service names
python manage.py scaffold generate service orders --var service_name=OrderService
```

### 3. Validate Early

```bash
# Generate and validate immediately
python manage.py scaffold generate minimal accounts
python manage.py scaffold validate --directory accounts/ --strict
```

### 4. Use Non-Interactive in CI/CD

```bash
# Always use --non-interactive in CI/CD
python manage.py scaffold generate minimal accounts --non-interactive
```

### 5. Keep Templates Updated

Check for new templates regularly:
```bash
python manage.py scaffold list --verbose
```

---

## Next Steps

- [Template Authoring Guide](template-authoring.md): Create custom templates
- [Architecture Overview](architecture.md): Understand how scaffolding works
- [Extension Guide](extension-guide.md): Extend with plugins
- [Quickstart Tutorial](quickstart.md): Complete walkthrough

---

## Support

For issues or questions:
- Check [troubleshooting section](#troubleshooting)
- Review [template authoring guide](template-authoring.md)
- Consult [architecture documentation](architecture.md)
