---
work_package_id: "WP09"
subtasks:
  - "T078"
  - "T079"
  - "T080"
  - "T081"
  - "T082"
  - "T083"
  - "T084"
  - "T085"
title: "Scaffolding Demo Example"
phase: "Phase 3 - Examples"
lane: "done"
assignee: ""
agent: "copilot"
shell_pid: ""
review_status: "approved without changes"
reviewed_by: "claude-reviewer"
history:
  - timestamp: "2025-12-04T21:30:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-05T10:40:00Z"
    lane: "doing"
    agent: "claude-implementer"
    action: "Started implementation of Scaffolding Demo Example"
  - timestamp: "2025-12-05T11:15:00Z"
    lane: "for_review"
    agent: "claude-implementer"
    action: "Implementation complete, moved to review"
  - timestamp: "2025-12-05T11:20:00Z"
    lane: "done"
    agent: "claude-reviewer"
    action: "Review approved - 48 smoke tests pass, 28 example tests pass"
---

# Work Package Prompt: WP09 – Scaffolding Demo Example

## Objectives & Success Criteria

**Goal**: Create an example demonstrating the CLI scaffolding system.

**Success Criteria**:
- Example shows how to use `kitty scaffold` commands
- Demonstrates custom templates
- Includes before/after walkthrough
- Smoke tests validate scaffolding works

## Context & Constraints

**Reference Documents**:
- `kitty-specs/021-docs-examples/spec.md` - User Story 5, FR-044 through FR-051
- `kitty-specs/020-core-scaffolding-cli/spec.md` - CLI commands and templates
- `.kittify/templates/` - Existing templates

**Dependencies**: WP01 (structure), WP02 (getting started)

**Example Structure**:
```
examples/scaffolding-demo/
├── README.md
├── templates/
│   └── custom-module/
│       ├── manifest.yaml
│       ├── models.py.j2
│       ├── views.py.j2
│       └── tests.py.j2
├── output/
│   └── .gitkeep
└── tests/
    └── test_scaffolding.py
```

## Subtasks & Detailed Guidance

### T078 – Create `examples/scaffolding-demo/` directory structure

**Purpose**: Set up example project skeleton.

**Steps**:
1. Create directory structure as shown above
2. Add `.gitkeep` in `output/` for empty dir
3. Create template directory

**Files**: `examples/scaffolding-demo/` directory tree

### T079 – Create custom module template manifest

**Purpose**: Define a custom scaffolding template.

**Content**:
```yaml
# examples/scaffolding-demo/templates/custom-module/manifest.yaml
name: custom-module
description: Generate a Django app with models, views, and tests
version: "1.0.0"

variables:
  - name: app_name
    description: Name of the Django app
    required: true
    validation: "^[a-z][a-z0-9_]*$"

  - name: model_name
    description: Name of the primary model
    required: true
    validation: "^[A-Z][a-zA-Z0-9]*$"

  - name: include_tests
    description: Generate test file
    required: false
    default: true
    type: boolean

files:
  - source: models.py.j2
    destination: "{{ app_name }}/models.py"

  - source: views.py.j2
    destination: "{{ app_name }}/views.py"

  - source: tests.py.j2
    destination: "{{ app_name }}/tests.py"
    condition: "{{ include_tests }}"

post_generate:
  - message: "App '{{ app_name }}' created successfully!"
  - message: "Next steps: Add to INSTALLED_APPS and create migrations"
```

**Files**: `examples/scaffolding-demo/templates/custom-module/manifest.yaml`

### T080 – Create model template

**Purpose**: Jinja2 template for models.py.

**Content**:
```jinja2
{# examples/scaffolding-demo/templates/custom-module/models.py.j2 #}
"""Models for {{ app_name }} app."""
from django.db import models
from django.conf import settings


class {{ model_name }}(models.Model):
    """{{ model_name }} model.

    TODO: Add your fields here.
    """
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='{{ app_name }}_{{ model_name | lower }}s'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = '{{ model_name }}'
        verbose_name_plural = '{{ model_name }}s'

    def __str__(self):
        return self.name
```

**Files**: `examples/scaffolding-demo/templates/custom-module/models.py.j2`

### T081 – Create views template

**Purpose**: Jinja2 template for views.py.

**Content**:
```jinja2
{# examples/scaffolding-demo/templates/custom-module/views.py.j2 #}
"""Views for {{ app_name }} app."""
from rest_framework import viewsets, permissions
from .models import {{ model_name }}
from .serializers import {{ model_name }}Serializer


class {{ model_name }}ViewSet(viewsets.ModelViewSet):
    """ViewSet for {{ model_name }} CRUD operations."""
    queryset = {{ model_name }}.objects.all()
    serializer_class = {{ model_name }}Serializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_queryset(self):
        """Filter queryset by user."""
        return self.queryset.filter(created_by=self.request.user)
```

**Files**: `examples/scaffolding-demo/templates/custom-module/views.py.j2`

### T082 – Create tests template

**Purpose**: Jinja2 template for tests.py.

**Content**:
```jinja2
{# examples/scaffolding-demo/templates/custom-module/tests.py.j2 #}
"""Tests for {{ app_name }} app."""
import pytest
from django.urls import reverse
from .models import {{ model_name }}


@pytest.fixture
def {{ model_name | lower }}(user):
    """Create a {{ model_name }} instance for testing."""
    return {{ model_name }}.objects.create(
        name='Test {{ model_name }}',
        description='Test description',
        created_by=user
    )


@pytest.mark.django_db
class Test{{ model_name }}Model:
    def test_str_representation(self, {{ model_name | lower }}):
        assert str({{ model_name | lower }}) == 'Test {{ model_name }}'

    def test_ordering(self, user):
        """Test that {{ model_name }}s are ordered by created_at desc."""
        first = {{ model_name }}.objects.create(name='First', created_by=user)
        second = {{ model_name }}.objects.create(name='Second', created_by=user)

        items = list({{ model_name }}.objects.all())
        assert items[0] == second
        assert items[1] == first


@pytest.mark.django_db
class Test{{ model_name }}API:
    def test_create_{{ model_name | lower }}(self, authenticated_client):
        response = authenticated_client.post('/api/{{ app_name }}/', {
            'name': 'New {{ model_name }}',
            'description': 'Description'
        })
        assert response.status_code == 201

    def test_list_{{ model_name | lower }}s(self, authenticated_client, {{ model_name | lower }}):
        response = authenticated_client.get('/api/{{ app_name }}/')
        assert response.status_code == 200
        assert len(response.data['results']) == 1
```

**Files**: `examples/scaffolding-demo/templates/custom-module/tests.py.j2`

### T083 – Create usage demonstration script

**Purpose**: Show how to use the scaffolding CLI.

**Content**:
```python
#!/usr/bin/env python
"""Demonstration of scaffolding CLI usage.

Run this script to see scaffolding in action:
    python demo_scaffold.py
"""
import subprocess
import sys
from pathlib import Path

EXAMPLE_DIR = Path(__file__).parent
OUTPUT_DIR = EXAMPLE_DIR / "output"
TEMPLATE_DIR = EXAMPLE_DIR / "templates"

def main():
    print("=== Scaffolding Demo ===\n")

    # Clean output directory
    for item in OUTPUT_DIR.glob("*"):
        if item.name != ".gitkeep":
            if item.is_dir():
                import shutil
                shutil.rmtree(item)
            else:
                item.unlink()

    # Run scaffolding command
    print("Running: kitty scaffold custom-module")
    print("  --app-name=inventory")
    print("  --model-name=Product")
    print("  --include-tests=true")
    print()

    cmd = [
        sys.executable, "-m", "kittify", "scaffold",
        "--template-dir", str(TEMPLATE_DIR),
        "--output-dir", str(OUTPUT_DIR),
        "custom-module",
        "--app-name", "inventory",
        "--model-name", "Product",
        "--include-tests", "true"
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode == 0:
        print("✓ Scaffolding successful!")
        print("\nGenerated files:")
        for f in OUTPUT_DIR.rglob("*.py"):
            print(f"  - {f.relative_to(OUTPUT_DIR)}")
    else:
        print("✗ Scaffolding failed:")
        print(result.stderr)
        return 1

    return 0

if __name__ == "__main__":
    sys.exit(main())
```

**Files**: `examples/scaffolding-demo/demo_scaffold.py`

### T084 – Create pytest tests for scaffolding

**Purpose**: Test scaffolding functionality.

**Content**:
```python
# examples/scaffolding-demo/tests/test_scaffolding.py
"""Tests for scaffolding demo."""
import pytest
from pathlib import Path
import tempfile
import yaml

TEMPLATE_DIR = Path(__file__).parent.parent / "templates" / "custom-module"

class TestManifest:
    def test_manifest_is_valid_yaml(self):
        """Verify manifest.yaml is valid."""
        manifest_path = TEMPLATE_DIR / "manifest.yaml"
        with open(manifest_path) as f:
            manifest = yaml.safe_load(f)

        assert manifest['name'] == 'custom-module'
        assert 'variables' in manifest
        assert 'files' in manifest

    def test_manifest_has_required_variables(self):
        """Verify required variables are defined."""
        manifest_path = TEMPLATE_DIR / "manifest.yaml"
        with open(manifest_path) as f:
            manifest = yaml.safe_load(f)

        var_names = [v['name'] for v in manifest['variables']]
        assert 'app_name' in var_names
        assert 'model_name' in var_names

class TestTemplates:
    def test_templates_are_valid_jinja2(self):
        """Verify templates are valid Jinja2."""
        from jinja2 import Environment, FileSystemLoader

        env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)))

        for template_file in TEMPLATE_DIR.glob("*.j2"):
            template = env.get_template(template_file.name)
            assert template is not None

    def test_templates_render_with_variables(self):
        """Verify templates render correctly."""
        from jinja2 import Environment, FileSystemLoader

        env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)))
        template = env.get_template("models.py.j2")

        result = template.render(
            app_name="inventory",
            model_name="Product"
        )

        assert "class Product(models.Model)" in result
        assert "inventory_products" in result
```

**Files**: `examples/scaffolding-demo/tests/test_scaffolding.py`

### T085 – Write `examples/scaffolding-demo/README.md`

**Purpose**: Step-by-step walkthrough.

**Content Structure**:
1. **Overview**: What this example demonstrates
2. **Template Structure**: Explain manifest and templates
3. **Running the Demo**:
   ```bash
   cd examples/scaffolding-demo
   python demo_scaffold.py
   ```
4. **Output Walkthrough**: Explain generated files
5. **Creating Custom Templates**: How to create your own
6. **Template Variables**: Variable types and validation
7. **Best Practices**: Template design tips
8. **Running Tests**: `pytest`

**Files**: `examples/scaffolding-demo/README.md`

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| CLI not installed | Include manual steps as fallback |
| Template syntax errors | Validate in tests |

## Definition of Done Checklist

- [ ] T078: Directory structure created
- [ ] T079: Manifest.yaml with variables
- [ ] T080: models.py.j2 template
- [ ] T081: views.py.j2 template
- [ ] T082: tests.py.j2 template
- [ ] T083: demo_scaffold.py script
- [ ] T084: Pytest tests for templates
- [ ] T085: README with walkthrough
- [ ] Demo runs successfully
- [ ] `tasks.md` updated with completion status

## Review Guidance

- Run demo_scaffold.py end-to-end
- Verify generated code is valid Python
- Check README covers all template features

## Activity Log

- 2025-12-04T21:30:00Z – system – lane=planned – Prompt created.
- 2025-12-05T13:08:39Z – copilot – shell_pid= – lane=done – Marked complete
