# Scaffolding Demo Example

This example demonstrates how to use the scaffolding system to generate Django
module boilerplate from templates. It shows the template structure, variable
substitution, and conditional file generation.

## Overview

The scaffolding system uses:

- **Jinja2 templates** for code generation
- **YAML manifests** for template configuration
- **Variables** for customizing output
- **Conditions** for optional files

## Quick Start

### 1. Install Dependencies

```bash
pip install jinja2 pyyaml
```

### 2. Run the Demo

```bash
cd examples/scaffolding-demo
python demo_scaffold.py
```

This generates a complete Django app structure in the `output/` directory.

### 3. Explore the Output

After running, check `output/inventory/` to see the generated files:

```
output/
└── inventory/
    ├── __init__.py
    ├── admin.py
    ├── apps.py
    ├── models.py
    ├── serializers.py
    ├── tests.py
    ├── urls.py
    └── views.py
```

## Template Structure

### Directory Layout

```
templates/
└── custom-module/
    ├── manifest.yaml       # Template configuration
    ├── __init__.py.j2      # Package init
    ├── admin.py.j2         # Admin interface
    ├── apps.py.j2          # App config
    ├── models.py.j2        # Django model
    ├── serializers.py.j2   # DRF serializers
    ├── tests.py.j2         # Test suite
    ├── urls.py.j2          # URL routing
    └── views.py.j2         # ViewSet implementation
```

### manifest.yaml

The manifest defines template metadata, variables, and file mappings:

```yaml
name: custom-module
description: Django REST API module template
version: "1.0.0"

variables:
  - name: app_name
    description: The Django app name
    required: true
    pattern: "^[a-z_]+$"

  - name: model_name
    description: The model class name
    required: true
    pattern: "^[A-Z][a-zA-Z]+$"

  - name: include_tests
    description: Whether to include tests
    required: false
    default: true

files:
  - source: models.py.j2
    destination: "{{ app_name }}/models.py"

  - source: tests.py.j2
    destination: "{{ app_name }}/tests.py"
    condition: "{{ include_tests }}"
```

## Variables

Variables customize the generated code. This template supports:

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `app_name` | string | Yes | The Django app name (snake_case) |
| `model_name` | string | Yes | The model class name (PascalCase) |
| `model_name_plural` | string | Yes | Plural form for display |
| `include_tests` | bool | No | Generate test file (default: true) |
| `include_serializers` | bool | No | Generate serializers (default: true) |
| `include_urls` | bool | No | Generate URL config (default: true) |
| `author` | string | No | Author name for headers |

## Template Syntax

Templates use Jinja2 syntax for variable interpolation and logic.

### Variable Interpolation

```python
class {{ model_name }}(models.Model):
    """{{ model_name_plural }} model."""
    name = models.CharField(max_length=255)
```

With `model_name="Product"` becomes:

```python
class Product(models.Model):
    """Products model."""
    name = models.CharField(max_length=255)
```

### Conditional Blocks

```python
{% if include_serializers %}
from .serializers import {{ model_name }}Serializer
{% endif %}
```

### Loops

```python
{% for field in fields %}
    {{ field.name }} = models.{{ field.type }}({{ field.args }})
{% endfor %}
```

## Creating Custom Templates

### Step 1: Create Template Directory

```bash
mkdir templates/my-feature
```

### Step 2: Create manifest.yaml

```yaml
name: my-feature
description: My custom feature template
version: "1.0.0"
author: Your Name

variables:
  - name: feature_name
    description: The feature name
    required: true
    pattern: "^[a-z_]+$"

files:
  - source: feature.py.j2
    destination: "{{ feature_name }}.py"

post_generate:
  - message: "✅ Feature generated successfully!"
```

### Step 3: Create Templates

```jinja2
{# feature.py.j2 #}
"""{{ feature_name }} feature module."""

class {{ feature_name | title | replace('_', '') }}Feature:
    """Implementation of the {{ feature_name }} feature."""

    def execute(self):
        pass
```

### Step 4: Register with Scaffolding CLI

Add your template to the scaffolding registry.

## Running Tests

The example includes comprehensive tests for template validation:

```bash
cd examples/scaffolding-demo
pytest tests/ -v
```

Tests verify:
- ✅ Manifest structure is valid
- ✅ All templates are valid Jinja2
- ✅ Templates render without errors
- ✅ Generated code has expected patterns
- ✅ Variable substitution works correctly
- ✅ Conditional generation respects flags

## Integration with Real CLI

This demo uses a simplified script. The full scaffolding CLI provides:

```bash
# List available templates
python -m scaffolding list

# Generate from template
python -m scaffolding scaffold custom-module \
    --app-name inventory \
    --model-name Product \
    --output ./src

# Interactive mode
python -m scaffolding scaffold custom-module --interactive
```

See [docs/cli.md](../../docs/cli.md) for full CLI documentation.

## Best Practices

### Template Design

1. **Keep templates focused** - One template per module type
2. **Use meaningful defaults** - Minimize required variables
3. **Add validation patterns** - Catch errors early
4. **Include comments** - Help users understand the output

### Variable Naming

1. **Use snake_case** for app/module names
2. **Use PascalCase** for class names
3. **Use descriptive names** - `model_name` not `mn`

### File Organization

1. **Group related templates** in directories
2. **Include a README** in template directories
3. **Test templates** with varied inputs

## Troubleshooting

### Common Issues

**Jinja2 TemplateSyntaxError**
- Check for unclosed blocks (`{% endif %}`, `{% endfor %}`)
- Verify variable names match manifest

**Missing Variables**
- Ensure all required variables are provided
- Check for typos in variable names

**Invalid Output**
- Review the manifest file mappings
- Check conditions are evaluating correctly

## Related Documentation

- [CLI Documentation](../../docs/cli.md)
- [CRUD API Example](../crud-api/README.md)
- [Background Tasks Example](../background-tasks/README.md)
