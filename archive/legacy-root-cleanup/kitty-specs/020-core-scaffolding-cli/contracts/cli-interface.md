# CLI Interface Contract
*Path: kitty-specs/020-core-scaffolding-cli/contracts/cli-interface.md*

**Feature**: B20 Core Scaffolding CLI
**Date**: 2025-12-04
**Status**: Planning Phase

---

## Overview

This document defines the command-line interface contract for the Core Scaffolding CLI. Both the console script entry point (`django-core-scaffold`) and Django management command (`python manage.py scaffold`) share the same interface.

---

## Console Script Entry Point

### Installation

```bash
# Install Core-App package
pip install django-core-app

# Verify installation
django-core-scaffold --version
```

### Command Structure

```bash
django-core-scaffold <command> [arguments] [options]
```

---

## Commands

### 1. `module` - Generate Django App/Module

**Purpose**: Create a new Django application in an existing project following Core conventions.

**Aliases**: `app`, `module` (both supported)

**Syntax**:
```bash
django-core-scaffold module <app_name> [options]
python manage.py scaffold module <app_name> [options]
```

**Positional Arguments**:
- `app_name` (required): Django app name (snake_case, valid Python identifier)

**Options**:
- `--template, -t <name>`: Template to use (default: "minimal")
- `--path, -p <path>`: Target directory (default: "src/")
- `--model-name <name>`: Primary model name for API templates (default: derived from app_name)
- `--no-interactive`: Skip prompts, use defaults (CI/CD mode)
- `--interactive`: Force interactive mode even with flags
- `--validate / --no-validate`: Run constitutional validation (default: validate)
- `--force`: Bypass validation failures (generates code despite violations)
- `--list-templates`: Show available templates and exit
- `--dry-run`: Show what would be generated without creating files
- `--verbose, -v`: Show detailed generation progress
- `--help, -h`: Show help message

**Examples**:

```bash
# Interactive mode (TTY, no flags)
$ django-core-scaffold module payments
? Select a template: api-first
? Enter model name (default: Payment): Invoice
✓ Module created successfully!

# Non-interactive with flags
$ django-core-scaffold module payments --template api-first --model-name Invoice

# CI/CD mode
$ django-core-scaffold module testdata --template minimal --no-interactive

# Force bypass validation
$ django-core-scaffold module experimental --force --no-validate

# Dry run
$ django-core-scaffold module orders --template api-first --dry-run
```

**Exit Codes**:
- `0`: Success
- `1`: Validation failure or generation error
- `2`: Invalid input (bad app name, missing required args)
- `3`: Template not found
- `4`: File conflict (app already exists)

**Output**:
```
✓ Generating module 'payments' with template 'api-first'...
  Creating src/payments/__init__.py
  Creating src/payments/apps.py
  Creating src/payments/models.py
  Creating src/payments/serializers.py
  Creating src/payments/views.py
  Creating src/payments/urls.py
  Creating src/payments/permissions.py
  Creating src/payments/admin.py
  Creating src/payments/tests/
  Creating src/payments/migrations/
  Creating src/payments/locale/
✓ Running constitutional validation...
  [B01] Structure: PASS
  [B03] Security: PASS
  [B04] i18n: PASS
  [Code Quality] Ruff: PASS
  [Testing] Structure: PASS
✓ Module created successfully!

Next steps:
  1. Add 'payments' to INSTALLED_APPS in settings.py
  2. Run: python manage.py makemigrations payments
  3. Implement business logic in src/payments/
```

---

### 2. `init` - Bootstrap New Project

**Purpose**: Create a complete downstream project with Core-App skeleton and foundational modules.

**Syntax**:
```bash
django-core-scaffold init <project_name> [options]
```

**Positional Arguments**:
- `project_name` (required): Project directory name (slug)

**Options**:
- `--display-name <name>`: Human-readable project name (default: derived from project_name)
- `--template, -t <name>`: Bootstrap template (default: "full-core")
- `--with-modules <list>`: Comma-separated list of Core modules to include (default: all)
- `--no-interactive`: Skip prompts, use defaults
- `--validate / --no-validate`: Run constitutional validation (default: validate)
- `--verbose, -v`: Show detailed generation progress
- `--help, -h`: Show help message

**Examples**:

```bash
# Interactive bootstrap
$ django-core-scaffold init my-product
? Project display name (default: My Product): MyProduct
? Include deployment configs (Docker, K8s)? Yes
? Include example tests? Yes
✓ Project created successfully!

# Non-interactive
$ django-core-scaffold init my-product --display-name "MyProduct" --no-interactive

# Minimal bootstrap (no deployment configs)
$ django-core-scaffold init prototype --template minimal-core
```

**Exit Codes**:
- `0`: Success
- `1`: Validation failure or generation error
- `2`: Invalid input (bad project name, invalid modules)
- `5`: Target directory already exists

**Output**:
```
✓ Bootstrapping project 'my-product'...
  Creating project structure...
  Creating src/ directory
  Creating tests/ directory
  Creating docs/ directory
  Generating foundational modules...
    ✓ accounts
    ✓ audit
    ✓ organisations
    ✓ permissions
    ✓ projects
    ✓ settings
    ✓ security_baseline
  Copying deployment templates...
    ✓ docker-compose.yml
    ✓ Dockerfile
    ✓ k8s/
  Creating configuration files...
    ✓ pyproject.toml
    ✓ .env.example
    ✓ constitution_engine.yaml
    ✓ check_policy.py
✓ Running constitutional validation...
✓ Project created successfully!

Next steps:
  1. cd my-product
  2. python -m venv venv
  3. source venv/bin/activate
  4. pip install -r requirements/local.txt
  5. python manage.py migrate
  6. python manage.py runserver
```

---

### 3. `list-templates` - Show Available Templates

**Purpose**: Display all discoverable templates with descriptions.

**Syntax**:
```bash
django-core-scaffold list-templates [options]
python manage.py scaffold list-templates [options]
```

**Options**:
- `--verbose, -v`: Show template details (variables, files)
- `--json`: Output as JSON (machine-readable)
- `--help, -h`: Show help message

**Examples**:

```bash
# Default output
$ django-core-scaffold list-templates
Available Templates:

Core Templates (built-in):
  minimal         Basic Django app structure with no API or UI boilerplate
  api-first       REST API module with Django REST Framework
  service         Business logic module (no API endpoints)
  ui-backed       Module with Django templates and forms

Project Templates:
  custom-api      Custom API module with company patterns (./templates/scaffold/)

Installed Packages:
  acme-templates  ACME Corp scaffolding templates (v1.2.0)

Use: django-core-scaffold module <name> --template <template_name>

# Verbose output
$ django-core-scaffold list-templates --verbose
[Shows variables, files, inheritance for each template]

# JSON output (for tooling)
$ django-core-scaffold list-templates --json
{
  "core": [
    {
      "name": "minimal",
      "description": "Basic Django app structure",
      "source": "core",
      "variables": [...],
      "files": [...]
    }
  ],
  "project": [...],
  "packages": [...]
}
```

**Exit Codes**:
- `0`: Success
- `1`: Template discovery error

---

### 4. `validate` - Validate Existing Code

**Purpose**: Run constitutional validation on existing code without generating new files.

**Syntax**:
```bash
django-core-scaffold validate <path> [options]
python manage.py scaffold validate <path> [options]
```

**Positional Arguments**:
- `path` (required): Directory or file to validate

**Options**:
- `--rules <list>`: Comma-separated rules to check (default: all)
- `--strict`: Fail on warnings (not just errors)
- `--json`: Output as JSON
- `--help, -h`: Show help message

**Examples**:

```bash
# Validate app directory
$ django-core-scaffold validate src/payments/

# Validate specific rules
$ django-core-scaffold validate src/payments/ --rules B01,B03,B04

# Strict mode (warnings fail)
$ django-core-scaffold validate src/payments/ --strict
```

**Exit Codes**:
- `0`: All checks passed
- `1`: Validation failures detected

---

## Global Options

Available for all commands:

- `--version`: Show version and exit
- `--help, -h`: Show help message
- `--config <path>`: Path to config file (default: `.scaffold.yaml` or `pyproject.toml`)
- `--verbose, -v`: Increase output verbosity
- `--quiet, -q`: Suppress non-error output

---

## Environment Variables

- `SCAFFOLD_TEMPLATE_DIRS`: Colon-separated paths to template directories (overrides config)
- `SCAFFOLD_NO_VALIDATE`: Set to "1" to skip validation by default
- `SCAFFOLD_AUTHOR`: Default author name for generated code
- `CI`: Auto-detected CI environment (disables interactive mode)

**Examples**:

```bash
# Use custom template directory
export SCAFFOLD_TEMPLATE_DIRS="/opt/templates:/home/user/templates"
django-core-scaffold list-templates

# Skip validation in CI
export SCAFFOLD_NO_VALIDATE=1
django-core-scaffold module testdata --template minimal
```

---

## Configuration File

### Location Priority

1. `--config` flag
2. `.scaffold.yaml` in current directory
3. `pyproject.toml` [tool.scaffold] in current directory
4. Core-App defaults

### Example: `.scaffold.yaml`

```yaml
template_dirs:
  - ./templates/scaffold
  - /opt/company-templates

defaults:
  author: "ACME Corp Team"
  api_version: "v1"

validation:
  enabled: true
  strict: false
  rules:
    - B01
    - B03
    - B04

generation:
  target_dir: "src"
```

### Example: `pyproject.toml`

```toml
[tool.scaffold]
template_dirs = ["./templates/scaffold", "/opt/company-templates"]

[tool.scaffold.defaults]
author = "ACME Corp Team"
api_version = "v1"

[tool.scaffold.validation]
enabled = true
strict = false
rules = ["B01", "B03", "B04"]

[tool.scaffold.generation]
target_dir = "src"
```

---

## Error Messages

### Template Not Found

```
Error: Template 'custom-api' not found

Available templates:
  - minimal
  - api-first
  - service
  - ui-backed

Run 'django-core-scaffold list-templates' to see all available templates.
```

### Invalid App Name

```
Error: Invalid app name 'my-app'

Django app names must:
  - Use lowercase letters, numbers, underscores only
  - Start with a letter
  - Be valid Python identifiers

Suggested name: 'my_app'
```

### Validation Failure

```
Constitutional Validation FAILED

[B04] Missing i18n markers: 2 violations
  File: src/payments/models.py
  Line: 15
    help_text="Payment amount"
  Fix: help_text=_("Payment amount")

  File: src/payments/models.py
  Line: 18
    verbose_name="Payment Status"
  Fix: verbose_name=_("Payment Status")

Generation aborted. Fix violations or use --force to bypass validation.
```

### File Conflict

```
Error: App 'payments' already exists at src/payments/

Options:
  1. Choose a different name
  2. Delete existing directory
  3. Use --force to overwrite (destructive!)
```

---

## Django Management Command

### Integration

When Core-App is in `INSTALLED_APPS`, the Django management command is available:

```python
# settings.py
INSTALLED_APPS = [
    ...
    'django_core_app',
    ...
]
```

### Usage

```bash
# Same interface as console script
python manage.py scaffold module payments --template api-first
python manage.py scaffold init my-project
python manage.py scaffold list-templates
python manage.py scaffold validate src/payments/
```

### Benefits

- Works within Django project context (settings loaded)
- Familiar `manage.py` workflow for Django developers
- Can access Django settings for defaults (e.g., `BASE_DIR`, `INSTALLED_APPS`)

---

## Interactive Prompts

### Template Selection

```
? Select a template:
  1) minimal         - Basic Django app structure
  2) api-first       - REST API module with DRF
  3) service         - Business logic module (no API)
  4) ui-backed       - Module with templates and forms
> 2

Selected: api-first
```

### Variable Input

```
? App name: payments
? Model name (default: Payment): Invoice
? API version (default: v1): v1
```

### Confirmation

```
About to generate:
  App: payments
  Template: api-first
  Path: src/payments/
  Variables:
    - model_name: Invoice
    - api_version: v1

Proceed? [Y/n]: y
```

---

## CLI Testing Contract

### Test Commands

```bash
# Unit tests for CLI logic
pytest tests/cli/test_commands.py

# Integration tests for generation
pytest tests/cli/test_generation.py

# Template validation tests
pytest tests/cli/test_templates.py

# End-to-end tests
pytest tests/cli/test_e2e.py
```

### Mock Scenarios

- Interactive mode (TTY simulation with Click testing)
- Non-interactive mode (flag-based invocation)
- Validation success and failure paths
- Template discovery from multiple sources
- File conflict handling
- Exit code verification

---

**CLI Contract Status**: ✅ Complete - All commands, options, and behaviors defined
