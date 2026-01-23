# Quickstart Guide: Core Scaffolding CLI
*Path: kitty-specs/020-core-scaffolding-cli/quickstart.md*

**Feature**: B20 Core Scaffolding CLI
**Audience**: Developers using Core-App to scaffold new modules or projects
**Date**: 2025-12-04

---

## Prerequisites

- Python 3.12+ installed
- Core-App package installed (`pip install django-core-app`)
- Existing Django project (for module scaffolding) OR empty directory (for project bootstrap)

---

## Quick Start: Generate a Module

### 1. Interactive Mode (Recommended for First-Time Users)

```bash
# Navigate to your Django project root
cd my-project/

# Run scaffold command
django-core-scaffold module payments

# Follow prompts:
? Select a template:
  1) minimal         - Basic Django app structure
  2) api-first       - REST API module with DRF
  3) service         - Business logic module (no API)
  4) ui-backed       - Module with templates and forms
> 2

? Model name (default: Payment): Invoice
? API version (default: v1): v1

✓ Generating module 'payments' with template 'api-first'...
✓ Running constitutional validation...
✓ Module created successfully!

Next steps:
  1. Add 'payments' to INSTALLED_APPS
  2. Run: python manage.py makemigrations payments
  3. Implement business logic
```

### 2. Non-Interactive Mode (For Experienced Users)

```bash
# Generate with all options specified
django-core-scaffold module payments \
  --template api-first \
  --model-name Invoice \
  --no-interactive
```

---

## Quick Start: Bootstrap a New Project

```bash
# Create project directory
mkdir my-new-product
cd my-new-product

# Bootstrap project
django-core-scaffold init my-new-product

# Follow prompts for configuration...

✓ Project created successfully!

# Setup virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements/local.txt

# Run migrations
python manage.py migrate

# Start development server
python manage.py runserver
```

---

## Common Workflows

### Scenario 1: Create API-First Module

**Goal**: Add a REST API module for managing products.

```bash
# Generate module
django-core-scaffold module products --template api-first --model-name Product

# Add to settings
# In settings.py, add 'products' to INSTALLED_APPS

# Create migrations
python manage.py makemigrations products

# Apply migrations
python manage.py migrate

# Implement business logic
# Edit src/products/models.py, src/products/serializers.py, etc.

# Run tests
pytest src/products/tests/
```

**Generated Structure**:
```
src/products/
├── __init__.py
├── apps.py                     # ProductsConfig
├── models.py                   # Product model with type hints
├── serializers.py              # ProductSerializer with DRF
├── views.py                    # ProductViewSet
├── urls.py                     # API routing
├── permissions.py              # Custom permissions (optional)
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

### Scenario 2: Create Service Module (No API)

**Goal**: Add a business logic module for payment processing.

```bash
# Generate service module
django-core-scaffold module payment_processor --template service

# Implement service class
# Edit src/payment_processor/services.py

# Add unit tests
# Edit src/payment_processor/tests/test_services.py

# Run tests
pytest src/payment_processor/tests/
```

**Generated Structure**:
```
src/payment_processor/
├── __init__.py
├── apps.py
├── models.py                   # Minimal model file
├── services.py                 # Service classes with type hints
├── admin.py
├── tests/
│   ├── __init__.py
│   └── test_services.py
├── migrations/
│   └── __init__.py
└── locale/
    └── .gitkeep
```

---

### Scenario 3: Create UI-Backed Module

**Goal**: Add a module with Django templates and forms.

```bash
# Generate UI module
django-core-scaffold module dashboard --template ui-backed

# Implement views and templates
# Edit src/dashboard/views.py, src/dashboard/templates/, etc.

# Add URL routing
# Include dashboard.urls in main urls.py

# Run tests
pytest src/dashboard/tests/
```

**Generated Structure**:
```
src/dashboard/
├── __init__.py
├── apps.py
├── models.py
├── views.py                    # Class-based views
├── forms.py                    # Django forms
├── urls.py                     # URL patterns
├── admin.py
├── templates/
│   └── dashboard/
│       └── index.html
├── static/
│   └── dashboard/
│       ├── css/
│       └── js/
├── tests/
│   ├── __init__.py
│   ├── test_views.py
│   └── test_forms.py
├── migrations/
│   └── __init__.py
└── locale/
    └── .gitkeep
```

---

### Scenario 4: Override Core Template

**Goal**: Customize scaffolding with company-specific patterns.

**Step 1: Create Custom Template Directory**

```bash
# In your project root
mkdir -p templates/scaffold/custom-api

# Copy Core template as starting point
cp -r <core-app-install>/templates/scaffold/api-first/* templates/scaffold/custom-api/
```

**Step 2: Create Manifest**

```yaml
# templates/scaffold/custom-api/__template__.yaml
name: custom-api
description: "Custom API module with company logging and telemetry"
extends: core/api-first        # Inherit from Core template
variables:
  app_name:
    type: string
    required: true
  model_name:
    type: string
    default: "Item"
  include_telemetry:
    type: boolean
    description: "Include OpenTelemetry instrumentation"
    default: true
files:
  - models.py.j2
  - serializers.py.j2
  - views.py.j2
  - telemetry.py.j2            # Custom file
```

**Step 3: Customize Template Files**

```python
# templates/scaffold/custom-api/views.py.j2
"""
{{ app_name }} views with company telemetry.
"""
from rest_framework import viewsets
from .models import {{ model_name }}
from .serializers import {{ model_name }}Serializer
{% if include_telemetry %}
from .telemetry import instrument_view
{% endif %}


{% if include_telemetry %}
@instrument_view
{% endif %}
class {{ model_name }}ViewSet(viewsets.ModelViewSet):
    """ViewSet for {{ model_name }} model."""
    queryset = {{ model_name }}.objects.all()
    serializer_class = {{ model_name }}Serializer
```

**Step 4: Use Custom Template**

```bash
# Generate with custom template
django-core-scaffold module products --template custom-api

# CLI automatically discovers and uses your custom template
# (takes precedence over Core's "api-first" if same name)
```

---

## Troubleshooting

### Issue: Template Not Found

**Symptom**:
```
Error: Template 'my-template' not found
```

**Solution**:
```bash
# List available templates
django-core-scaffold list-templates

# Check template directories
echo $SCAFFOLD_TEMPLATE_DIRS

# Verify template manifest exists
ls templates/scaffold/my-template/__template__.yaml
```

---

### Issue: Validation Failures

**Symptom**:
```
Constitutional Validation FAILED
[B04] Missing i18n markers: 2 violations
```

**Solution**:
```bash
# Option 1: Fix violations in template
# Edit template file to add gettext markers

# Option 2: Force bypass (not recommended)
django-core-scaffold module myapp --template mytemplate --force

# Option 3: Skip validation temporarily
django-core-scaffold module myapp --no-validate
```

---

### Issue: App Name Already Exists

**Symptom**:
```
Error: App 'payments' already exists at src/payments/
```

**Solution**:
```bash
# Option 1: Choose different name
django-core-scaffold module payments_v2

# Option 2: Delete existing directory
rm -rf src/payments/

# Option 3: Use --force to overwrite (⚠️ DESTRUCTIVE)
django-core-scaffold module payments --force
```

---

### Issue: Invalid App Name

**Symptom**:
```
Error: Invalid app name 'my-app'
```

**Solution**:
```bash
# Use snake_case (underscores, not hyphens)
django-core-scaffold module my_app

# App names must be valid Python identifiers
# Valid: my_app, payments, user_profiles
# Invalid: my-app, 123app, app-name
```

---

## Advanced Usage

### Use Custom Configuration File

```bash
# Create .scaffold.yaml in project root
cat > .scaffold.yaml << EOF
template_dirs:
  - ./templates/scaffold
  - /opt/company-templates

defaults:
  author: "Your Name"
  api_version: "v1"

validation:
  enabled: true
  strict: false
EOF

# Configuration automatically loaded
django-core-scaffold module orders
```

---

### CI/CD Integration

```yaml
# .github/workflows/scaffold-test.yml
name: Test Scaffolding

on: [push]

jobs:
  scaffold:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      - run: pip install django-core-app
      - run: django-core-scaffold module testapp --template minimal --no-interactive
      - run: pytest src/testapp/tests/
```

---

### Dry Run (Preview Without Creating Files)

```bash
# See what would be generated
django-core-scaffold module payments --template api-first --dry-run

# Output shows files that would be created
Would create:
  src/payments/__init__.py
  src/payments/apps.py
  src/payments/models.py
  ...
```

---

## Best Practices

### 1. Start with Core Templates

Use Core templates (`minimal`, `api-first`, `service`, `ui-backed`) before creating custom templates. They follow battle-tested patterns.

### 2. Use Interactive Mode for Exploration

When trying a new template, use interactive mode to see available options:

```bash
# Interactive shows prompts and defaults
django-core-scaffold module myapp

# Non-interactive requires knowing all flags
django-core-scaffold module myapp --template api-first --model-name MyModel
```

### 3. Commit Generated Code

Generated code is a starting point, not final implementation. Commit it and customize:

```bash
# Generate
django-core-scaffold module products --template api-first

# Review
git diff src/products/

# Commit
git add src/products/
git commit -m "feat: scaffold products module with api-first template"

# Customize
# Edit src/products/models.py, etc.
```

### 4. Run Tests Immediately

Generated code includes placeholder tests. Run them to verify structure:

```bash
# After generation
pytest src/myapp/tests/

# Should pass with placeholders
# Then implement real tests
```

### 5. Use `--list-templates` Before Generating

Discover available templates before choosing:

```bash
# See options
django-core-scaffold list-templates

# Generate with appropriate template
django-core-scaffold module myapp --template <chosen-template>
```

---

## Next Steps

- **Implement Business Logic**: Generated code is boilerplate; add your domain logic
- **Write Real Tests**: Replace placeholder tests with meaningful test cases
- **Add Migrations**: Run `python manage.py makemigrations` after editing models
- **Customize Templates**: Create custom templates for company-specific patterns
- **Read Full Documentation**: See [CLI Interface Contract](./contracts/cli-interface.md) for all options

---

## Getting Help

```bash
# CLI help
django-core-scaffold --help
django-core-scaffold module --help
django-core-scaffold init --help

# List templates
django-core-scaffold list-templates --verbose

# Validate existing code
django-core-scaffold validate src/myapp/
```

---

**Quickstart Status**: ✅ Complete - All common workflows documented with examples
