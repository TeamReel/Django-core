# Template Authoring Guide

## Overview

Create custom templates for the Django scaffolding CLI to match your project's patterns and conventions. Templates use Jinja2 syntax and YAML manifests to define reusable app structures.

## Template Structure

### Directory Layout

```
my_custom_template/
├── __template__.yaml          # Template manifest (required)
├── __init__.py.j2            # Jinja2 template files
├── apps.py.j2
├── models.py.j2
├── views.py.j2
├── tests/
│   ├── __init__.py
│   └── test_models.py.j2
├── templates/
│   └── base.html.j2
└── static/
    └── style.css
```

### Manifest File (`__template__.yaml`)

Every template must have a `__template__.yaml` manifest that defines its structure.

**Example:**
```yaml
# Template metadata
name: my_custom_template
description: |
  Custom Django app template with specific patterns.
  Includes models, views, and custom utilities.

# Template inheritance (optional)
extends: minimal  # or null for base template

# Django requirements
django_version: ">=5.1"
dependencies:
  - "djangorestframework>=3.14"
  - "django-filter>=23.0"

# Template variables
variables:
  required:
    app_name:
      type: string
      description: "Django app name (snake_case)"
      validation: "^[a-z][a-z0-9_]*$"
  optional:
    model_name:
      type: string
      description: "Primary model name (PascalCase)"
      default: "Item"
      validation: "^[A-Z][a-zA-Z0-9]*$"
    include_api:
      type: boolean
      description: "Include API endpoints"
      default: true

# Files to generate
files:
  - path: "__init__.py"
    template: "__init__.py.j2"
  - path: "apps.py"
    template: "apps.py.j2"
  - path: "models.py"
    template: "models.py.j2"
  - path: "tests/__init__.py"
    template: null  # Empty file
  - path: "tests/test_models.py"
    template: "tests/test_models.py.j2"
  # Conditional files (if include_api is true)
  - path: "serializers.py"
    template: "serializers.py.j2"
    condition: "{{ include_api }}"

# Metadata
author: "Your Name"
version: "1.0.0"
license: "MIT"
```

---

## Manifest Schema

### Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Template identifier (slug) |
| `description` | string | Yes | Human-readable description |
| `extends` | string | No | Parent template name (null for base) |
| `django_version` | string | No | Required Django version |
| `dependencies` | list | No | Python package dependencies |
| `variables` | object | Yes | Template variables |
| `files` | list | Yes | Files to generate |
| `author` | string | No | Template author |
| `version` | string | No | Template version |
| `license` | string | No | Template license |

### Variables

**Required Variables:**
```yaml
variables:
  required:
    app_name:
      type: string
      description: "Django app name"
      validation: "^[a-z][a-z0-9_]*$"
    api_version:
      type: string
      description: "API version"
      validation: "^v[0-9]+$"
```

**Optional Variables:**
```yaml
variables:
  optional:
    model_name:
      type: string
      description: "Model name"
      default: "Item"
      validation: "^[A-Z][a-zA-Z0-9]*$"
    include_tests:
      type: boolean
      description: "Include test files"
      default: true
    max_items:
      type: integer
      description: "Maximum items"
      default: 100
      validation: ">= 1"
```

**Variable Types:**
- `string`: Text value
- `boolean`: true/false
- `integer`: Whole number
- `float`: Decimal number
- `list`: Array of values
- `object`: Nested structure

### Files

**Basic File:**
```yaml
files:
  - path: "models.py"
    template: "models.py.j2"
```

**Empty File:**
```yaml
files:
  - path: "tests/__init__.py"
    template: null
```

**Conditional File:**
```yaml
files:
  - path: "api.py"
    template: "api.py.j2"
    condition: "{{ include_api }}"
```

**Dynamic Path:**
```yaml
files:
  - path: "templates/{{ app_name }}/base.html"
    template: "templates/base.html.j2"
```

---

## Jinja2 Templates

### Basic Syntax

**Variable Substitution:**
```jinja
"""
{{ app_name }} application.
"""

from django.apps import AppConfig


class {{ app_name | title | replace('_', '') }}Config(AppConfig):
    name = "{{ app_name }}"
```

**Conditionals:**
```jinja
{% if include_api %}
from rest_framework import serializers

class {{ model_name }}Serializer(serializers.ModelSerializer):
    class Meta:
        model = {{ model_name }}
        fields = '__all__'
{% endif %}
```

**Loops:**
```jinja
class {{ model_name }}(models.Model):
    {% for field in fields %}
    {{ field.name }} = models.{{ field.type }}Field(
        {% for option, value in field.options.items() %}
        {{ option }}={{ value }},
        {% endfor %}
    )
    {% endfor %}
```

### Filters

**String Filters:**
```jinja
{{ app_name | title }}              # accounts → Accounts
{{ app_name | upper }}              # accounts → ACCOUNTS
{{ app_name | lower }}              # ACCOUNTS → accounts
{{ app_name | capitalize }}         # accounts → Accounts
{{ app_name | replace('_', '') }}   # user_accounts → useraccounts
```

**List Filters:**
```jinja
{{ items | join(', ') }}            # ['a', 'b'] → 'a, b'
{{ items | length }}                # Length of list
{{ items | first }}                 # First item
{{ items | last }}                  # Last item
```

**Default Values:**
```jinja
{{ model_name | default('Item') }}  # Use 'Item' if model_name not set
```

### Comments

```jinja
{# This is a comment - won't appear in generated code #}

{#
Multi-line comment
Also won't appear
#}
```

---

## Template Inheritance

### Extending Built-in Templates

Extend built-in templates to add functionality:

```yaml
name: api_extended
description: API-first template with custom features
extends: api-first  # Inherits all files from api-first

variables:
  required:
    app_name:
      type: string
  optional:
    enable_caching:
      type: boolean
      default: true

files:
  # Inherited files: __init__.py, models.py, serializers.py, etc.

  # Additional files
  - path: "cache.py"
    template: "cache.py.j2"
  - path: "throttling.py"
    template: "throttling.py.j2"
    condition: "{{ enable_caching }}"
```

### Creating Base Templates

Create reusable base templates:

```yaml
# base_app/template__.yaml
name: base_app
description: Foundation for all apps
extends: null  # Base template

variables:
  required:
    app_name:
      type: string

files:
  - path: "__init__.py"
    template: "__init__.py.j2"
  - path: "apps.py"
    template: "apps.py.j2"
  - path: "tests/__init__.py"
    template: null
```

Then extend it:

```yaml
# custom_app/__template__.yaml
name: custom_app
description: Custom app based on base_app
extends: base_app  # Inherits base files

files:
  - path: "custom_module.py"
    template: "custom_module.py.j2"
```

---

## Best Practices

### 1. Use Meaningful Variable Names

```yaml
# Good
variables:
  required:
    app_name:
      type: string
      description: "Django app name in snake_case"
  optional:
    model_name:
      type: string
      description: "Primary model name in PascalCase"
      default: "Item"

# Avoid
variables:
  required:
    name:  # Too generic
      type: string
  optional:
    x:  # Meaningless
      type: string
```

### 2. Validate Variable Inputs

```yaml
variables:
  required:
    app_name:
      type: string
      validation: "^[a-z][a-z0-9_]*$"  # Enforce snake_case
    model_name:
      type: string
      validation: "^[A-Z][a-zA-Z0-9]*$"  # Enforce PascalCase
    api_version:
      type: string
      validation: "^v[0-9]+$"  # Enforce v1, v2 format
```

### 3. Provide Defaults

```yaml
variables:
  optional:
    model_name:
      default: "Item"
    include_tests:
      default: true
    debug_mode:
      default: false
```

### 4. Document Your Template

```yaml
name: my_template
description: |
  Detailed description of what this template does.

  Use cases:
  - API development
  - Microservices
  - Mobile backends

  Requirements:
  - Django 5.1+
  - DRF 3.14+

  Generated structure:
  - models.py: Data models
  - serializers.py: DRF serializers
  - views.py: API viewsets
  - tests/: Comprehensive test suite
```

### 5. Use Type Hints

```jinja
"""
{{ app_name }} services.
"""

from typing import List, Optional

from .models import {{ model_name }}


class {{ service_name | default('ItemService') }}:
    """Service layer for {{ model_name }} operations."""

    @staticmethod
    def get_all() -> List[{{ model_name }}]:
        """Retrieve all {{ model_name | lower }} instances."""
        return {{ model_name }}.objects.all()

    @staticmethod
    def get_by_id(id: int) -> Optional[{{ model_name }}]:
        """Retrieve {{ model_name | lower }} by ID."""
        try:
            return {{ model_name }}.objects.get(pk=id)
        except {{ model_name }}.DoesNotExist:
            return None
```

### 6. Include Tests

Always include test files in templates:

```yaml
files:
  - path: "tests/__init__.py"
    template: null
  - path: "tests/test_models.py"
    template: "tests/test_models.py.j2"
  - path: "tests/test_services.py"
    template: "tests/test_services.py.j2"
  - path: "tests/test_api.py"
    template: "tests/test_api.py.j2"
```

### 7. Follow Django Conventions

```jinja
# apps.py - Use AppConfig
class {{ app_name | title | replace('_', '') }}Config(AppConfig):
    name = "{{ app_name }}"
    default_auto_field = "django.db.models.BigAutoField"

# models.py - Use verbose_name
class {{ model_name }}(models.Model):
    name = models.CharField(
        max_length=255,
        verbose_name=_("Name"),
    )
```

---

## Examples

### Example 1: Minimal Custom Template

**Directory:**
```
custom_minimal/
├── __template__.yaml
├── __init__.py.j2
└── models.py.j2
```

**__template__.yaml:**
```yaml
name: custom_minimal
description: Minimal custom template
extends: null

variables:
  required:
    app_name:
      type: string
      validation: "^[a-z][a-z0-9_]*$"

files:
  - path: "__init__.py"
    template: "__init__.py.j2"
  - path: "models.py"
    template: "models.py.j2"
```

**__init__.py.j2:**
```jinja
"""{{ app_name }} application."""

default_app_config = "{{ app_name }}.apps.{{ app_name | title | replace('_', '') }}Config"
```

**models.py.j2:**
```jinja
"""{{ app_name }} models."""

from django.db import models


class BaseModel(models.Model):
    """Base model with timestamps."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
```

### Example 2: API Template with Conditionals

**__template__.yaml:**
```yaml
name: conditional_api
description: API template with optional features
extends: minimal

variables:
  required:
    app_name:
      type: string
  optional:
    include_filtering:
      type: boolean
      default: true
    include_pagination:
      type: boolean
      default: true
    model_name:
      type: string
      default: "Item"

files:
  - path: "serializers.py"
    template: "serializers.py.j2"
  - path: "views.py"
    template: "views.py.j2"
  - path: "filters.py"
    template: "filters.py.j2"
    condition: "{{ include_filtering }}"
  - path: "pagination.py"
    template: "pagination.py.j2"
    condition: "{{ include_pagination }}"
```

**views.py.j2:**
```jinja
"""{{ app_name }} API views."""

from rest_framework import viewsets
{% if include_filtering %}
from django_filters.rest_framework import DjangoFilterBackend
{% endif %}

from .models import {{ model_name }}
from .serializers import {{ model_name }}Serializer
{% if include_filtering %}
from .filters import {{ model_name }}Filter
{% endif %}
{% if include_pagination %}
from .pagination import {{ model_name }}Pagination
{% endif %}


class {{ model_name }}ViewSet(viewsets.ModelViewSet):
    """ViewSet for {{ model_name }} operations."""

    queryset = {{ model_name }}.objects.all()
    serializer_class = {{ model_name }}Serializer
    {% if include_filtering %}
    filter_backends = [DjangoFilterBackend]
    filterset_class = {{ model_name }}Filter
    {% endif %}
    {% if include_pagination %}
    pagination_class = {{ model_name }}Pagination
    {% endif %}
```

---

## Testing Templates

### Validate Manifest

```bash
# Check manifest syntax
python -c "import yaml; yaml.safe_load(open('__template__.yaml'))"
```

### Generate Test App

```bash
# Generate app from custom template
python manage.py scaffold generate my_template test_app \
  --template-dir ./custom_templates/ \
  --output-dir ./test_output/
```

### Run Validation

```bash
# Validate generated code
python manage.py scaffold validate --directory ./test_output/test_app/ --strict
```

### Test Variables

```bash
# Test with different variables
python manage.py scaffold generate my_template test_app1 \
  --var model_name=Product \
  --var include_api=true \
  --template-dir ./custom_templates/

python manage.py scaffold generate my_template test_app2 \
  --var model_name=Order \
  --var include_api=false \
  --template-dir ./custom_templates/
```

---

## Publishing Templates

### Package Structure

```
my-django-templates/
├── setup.py
├── README.md
├── LICENSE
└── templates/
    ├── api_template/
    │   ├── __template__.yaml
    │   └── ...
    └── service_template/
        ├── __template__.yaml
        └── ...
```

### setup.py

```python
from setuptools import setup, find_packages

setup(
    name='my-django-templates',
    version='1.0.0',
    description='Custom Django scaffolding templates',
    author='Your Name',
    author_email='your.email@example.com',
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        'django>=5.1',
    ],
    classifiers=[
        'Framework :: Django',
        'Programming Language :: Python :: 3',
    ],
)
```

### Distribution

```bash
# Build package
python setup.py sdist bdist_wheel

# Publish to PyPI
twine upload dist/*
```

---

## Advanced Features

### Custom Validators

```python
# In template code
def validate_{{ app_name }}(value):
    """Custom validator for {{ model_name }}."""
    if not value.startswith('prefix_'):
        raise ValidationError('Must start with prefix_')
```

### Post-Generation Hooks

```yaml
# Future feature (not yet implemented)
hooks:
  post_generate:
    - "python manage.py makemigrations {{ app_name }}"
    - "python manage.py migrate"
```

### Template Plugins

```python
# Future feature (not yet implemented)
from scaffolding.plugins import TemplatePlugin

class MyCustomPlugin(TemplatePlugin):
    def process_file(self, content, context):
        # Custom processing
        return content
```

---

## Troubleshooting

### Jinja2 Syntax Errors

**Error:** `jinja2.exceptions.TemplateSyntaxError`

**Solution:** Check template syntax, especially closing tags:
```jinja
{% if condition %}
...
{% endif %}  # Don't forget endif
```

### Variable Not Found

**Error:** `UndefinedError: 'variable_name' is undefined`

**Solution:** Provide default value:
```jinja
{{ variable_name | default('fallback_value') }}
```

### Invalid Manifest

**Error:** `yaml.scanner.ScannerError`

**Solution:** Validate YAML syntax:
```bash
python -c "import yaml; yaml.safe_load(open('__template__.yaml'))"
```

---

## Next Steps

- [CLI User Guide](cli-guide.md): Learn CLI commands
- [Architecture Overview](architecture.md): Understand internals
- [Extension Guide](extension-guide.md): Advanced customization
- [Quickstart Tutorial](quickstart.md): Complete walkthrough

---

## Resources

- [Jinja2 Documentation](https://jinja.palletsprojects.com/)
- [Django App Best Practices](https://docs.djangoproject.com/en/stable/intro/reusable-apps/)
- [YAML Specification](https://yaml.org/spec/1.2/spec.html)
