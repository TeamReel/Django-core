# Extension Guide

## Overview

Extend the Django scaffolding CLI with custom templates, loaders, validators, and plugins. This guide covers advanced customization techniques.

## Custom Template Packages

### Creating a Package

Create a distributable template package:

```
my-templates-package/
├── setup.py
├── README.md
├── LICENSE
└── my_templates/
    ├── __init__.py
    ├── api_v2/
    │   ├── __template__.yaml
    │   ├── models.py.j2
    │   └── ...
    └── microservice/
        ├── __template__.yaml
        └── ...
```

**setup.py:**
```python
from setuptools import setup, find_packages

setup(
    name='my-django-templates',
    version='1.0.0',
    packages=find_packages(),
    include_package_data=True,
    package_data={
        'my_templates': [
            '**/__template__.yaml',
            '**/*.j2',
            '**/*.html',
            '**/*.css',
            '**/*.js',
        ],
    },
    install_requires=[
        'django>=5.1',
    ],
    entry_points={
        'scaffolding.templates': [
            'my_templates = my_templates:get_template_path',
        ],
    },
)
```

**my_templates/__init__.py:**
```python
from pathlib import Path

def get_template_path() -> Path:
    """Return path to templates directory."""
    return Path(__file__).parent
```

### Installing Custom Packages

```bash
pip install my-django-templates
```

### Using Package Templates

```bash
python manage.py scaffold generate api_v2 products \
  --template-dir $(python -c "import my_templates; print(my_templates.get_template_path())")
```

---

## Custom Loaders

### Implementing a Loader

Create a custom loader for plugin-based templates:

```python
from pathlib import Path
from typing import List, Optional
from scaffolding.discovery.loaders import TemplateLoader
from scaffolding.discovery.manifest import Template

class PluginLoader(TemplateLoader):
    """Load templates from installed Python packages."""

    def __init__(self, package_name: str):
        self.package_name = package_name

    def load(self) -> List[Template]:
        """Load all templates from package."""
        try:
            module = __import__(self.package_name)
            template_dir = Path(module.__file__).parent

            templates = []
            for template_path in template_dir.glob('*/'):
                if (template_path / '__template__.yaml').exists():
                    template = self._load_template(template_path)
                    templates.append(template)

            return templates
        except ImportError:
            return []

    def _load_template(self, path: Path) -> Template:
        """Load single template from directory."""
        # Implementation details
        pass
```

### Registering Custom Loaders

```python
from scaffolding.discovery.registry import TemplateRegistry

registry = TemplateRegistry()

# Add custom loader
plugin_loader = PluginLoader('my_templates')
for template in plugin_loader.load():
    registry.register(template)

# Now use templates
template = registry.get_template('api_v2')
```

---

## Custom Validators

### Implementing a Validator

Create custom validation logic:

```python
from pathlib import Path
from typing import List, Optional
from scaffolding.validation.base import Validator, ValidationResult, ValidationIssue

class SecurityValidator(Validator):
    """Validate code for security issues."""

    def validate(self, app_dir: Path) -> ValidationResult:
        """Run security validation."""
        issues = []

        # Check for hardcoded secrets
        for file_path in app_dir.rglob('*.py'):
            content = file_path.read_text()

            if 'SECRET_KEY =' in content:
                issues.append(ValidationIssue(
                    level='error',
                    message='Hardcoded SECRET_KEY found',
                    file=str(file_path),
                    line=self._find_line_number(content, 'SECRET_KEY =')
                ))

            if 'password = "' in content.lower():
                issues.append(ValidationIssue(
                    level='warning',
                    message='Possible hardcoded password',
                    file=str(file_path),
                    line=self._find_line_number(content, 'password = "')
                ))

        return ValidationResult(
            passed=len([i for i in issues if i.level == 'error']) == 0,
            issues=issues
        )

    def _find_line_number(self, content: str, search: str) -> int:
        """Find line number of text."""
        for i, line in enumerate(content.splitlines(), 1):
            if search in line:
                return i
        return 0
```

### Using Custom Validators

```python
from scaffolding.generation.generator import CodeGenerator

generator = CodeGenerator()

# Add custom validator
generator.add_validator(SecurityValidator())

# Generate with validation
result = generator.generate_app(
    template=template,
    app_name='secure_app',
    output_dir=Path('./apps/'),
    validate=True  # Will run SecurityValidator
)
```

---

## Custom Jinja2 Filters

### Creating Filters

Add custom Jinja2 filters for template rendering:

```python
from scaffolding.rendering.engine import TemplateRenderer

def pluralize(value: str) -> str:
    """Pluralize English words."""
    if value.endswith('y'):
        return value[:-1] + 'ies'
    elif value.endswith('s'):
        return value + 'es'
    else:
        return value + 's'

def to_camel_case(value: str) -> str:
    """Convert snake_case to camelCase."""
    parts = value.split('_')
    return parts[0] + ''.join(p.capitalize() for p in parts[1:])

def to_kebab_case(value: str) -> str:
    """Convert snake_case to kebab-case."""
    return value.replace('_', '-')

# Register filters
renderer = TemplateRenderer()
renderer.add_filter('pluralize', pluralize)
renderer.add_filter('to_camel_case', to_camel_case)
renderer.add_filter('to_kebab_case', to_kebab_case)
```

### Using Custom Filters in Templates

```jinja
{# Template using custom filters #}
class {{ model_name }}Manager:
    """Manager for {{ model_name | pluralize }}."""

    def get_all_{{ model_name | pluralize | lower }}(self):
        """Get all {{ model_name | pluralize | lower }}."""
        return {{ model_name }}.objects.all()

# JavaScript variable name
const {{ app_name | to_camel_case }} = {};

# CSS class name
.{{ app_name | to_kebab_case }} {
    display: block;
}
```

---

## Post-Generation Hooks

### Implementing Hooks

Create hooks that run after generation:

```python
from pathlib import Path
from typing import Callable, List
from scaffolding.generation.generator import CodeGenerator

class HookManager:
    """Manage post-generation hooks."""

    def __init__(self):
        self.hooks: List[Callable] = []

    def register(self, hook: Callable) -> None:
        """Register a hook function."""
        self.hooks.append(hook)

    def run(self, app_dir: Path, context: dict) -> None:
        """Run all registered hooks."""
        for hook in self.hooks:
            hook(app_dir, context)

# Example hooks
def create_migrations(app_dir: Path, context: dict) -> None:
    """Create initial migrations."""
    import subprocess
    subprocess.run([
        'python', 'manage.py',
        'makemigrations', context['app_name']
    ])

def initialize_git(app_dir: Path, context: dict) -> None:
    """Initialize git repository."""
    import subprocess
    subprocess.run(['git', 'init'], cwd=app_dir)
    subprocess.run(['git', 'add', '.'], cwd=app_dir)
    subprocess.run([
        'git', 'commit', '-m',
        f"Initial commit: {context['app_name']}"
    ], cwd=app_dir)

# Use hooks
hook_manager = HookManager()
hook_manager.register(create_migrations)
hook_manager.register(initialize_git)

# Run after generation
hook_manager.run(app_dir, {'app_name': 'products'})
```

---

## Custom Commands

### Adding CLI Commands

Extend CLI with custom commands:

```python
from scaffolding.cli.commands import Command
from scaffolding.cli.main import ScaffoldCLI

class AnalyzeCommand(Command):
    """Analyze existing app structure."""

    @staticmethod
    def add_arguments(parser):
        """Add command arguments."""
        parser.add_argument('app_name', help='App to analyze')
        parser.add_argument('--detailed', action='store_true')

    def execute(self, args):
        """Execute analyze command."""
        app_dir = Path(args.app_name)

        if not app_dir.exists():
            print(f"Error: App '{args.app_name}' not found")
            return 1

        # Analyze structure
        python_files = list(app_dir.rglob('*.py'))
        test_files = list(app_dir.rglob('test_*.py'))

        print(f"Analysis for {args.app_name}:")
        print(f"  Python files: {len(python_files)}")
        print(f"  Test files: {len(test_files)}")
        print(f"  Test coverage: {len(test_files) / len(python_files) * 100:.1f}%")

        if args.detailed:
            print("\nFile listing:")
            for file in python_files:
                print(f"  - {file.relative_to(app_dir)}")

        return 0

# Register command
cli = ScaffoldCLI()
cli.add_command('analyze', AnalyzeCommand())
```

---

## Template Inheritance Patterns

### Multi-Level Inheritance

Create inheritance hierarchies:

```yaml
# base_app/__template__.yaml (Level 1)
name: base_app
extends: null
files:
  - path: "__init__.py"
  - path: "models.py"

# api_base/__template__.yaml (Level 2)
name: api_base
extends: base_app
files:
  - path: "serializers.py"
  - path: "views.py"

# api_v2/__template__.yaml (Level 3)
name: api_v2
extends: api_base
files:
  - path: "pagination.py"
  - path: "throttling.py"
```

### Mixin Templates

Create reusable mixins:

```yaml
# caching_mixin/__template__.yaml
name: caching_mixin
extends: null
files:
  - path: "cache.py"
  - path: "tests/test_cache.py"

# api_with_cache/__template__.yaml
name: api_with_cache
extends: api_first
mixins:  # Future feature
  - caching_mixin
```

---

## Configuration Files

### Custom Configuration

Create configuration file for project:

```yaml
# .scaffold.yaml
default_template: api-first
template_dirs:
  - ./custom_templates/
  - /shared/templates/

variables:
  author: "Your Name"
  license: "MIT"

validators:
  - ruff
  - mypy
  - security

hooks:
  post_generate:
    - python manage.py makemigrations {app_name}
    - git add .
```

### Loading Configuration

```python
import yaml
from pathlib import Path

def load_config() -> dict:
    """Load configuration from .scaffold.yaml"""
    config_path = Path('.scaffold.yaml')

    if config_path.exists():
        return yaml.safe_load(config_path.read_text())

    return {}

# Use configuration
config = load_config()
default_template = config.get('default_template', 'minimal')
```

---

## Testing Extensions

### Testing Custom Templates

```python
import pytest
from pathlib import Path
from scaffolding.generation.generator import CodeGenerator
from my_templates import MyCustomTemplate

def test_custom_template_generates_files():
    """Test custom template generates expected files."""
    generator = CodeGenerator()
    template = MyCustomTemplate()
    output_dir = Path('/tmp/test_output')

    result = generator.generate_app(
        template=template,
        app_name='test_app',
        output_dir=output_dir,
        variables={'model_name': 'Product'}
    )

    assert result.success
    assert (output_dir / 'test_app' / 'custom_file.py').exists()
```

### Testing Custom Validators

```python
def test_security_validator():
    """Test security validator detects issues."""
    validator = SecurityValidator()
    app_dir = Path('/path/to/test_app')

    result = validator.validate(app_dir)

    assert not result.passed
    assert any('SECRET_KEY' in issue.message for issue in result.issues)
```

---

## Troubleshooting Extensions

### Debugging Template Loading

```python
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger('scaffolding.discovery')

# Will show detailed template loading info
registry.discover_templates(custom_dir)
```

### Debugging Template Rendering

```python
from jinja2 import DebugUndefined

renderer = TemplateRenderer(undefined=DebugUndefined)
# Will show detailed info about undefined variables
```

### Common Issues

**Issue:** Custom template not found

**Solution:** Check template directory structure:
```bash
ls -la custom_templates/my_template/
# Should show __template__.yaml
```

**Issue:** Jinja2 variable undefined

**Solution:** Provide default values:
```jinja
{{ variable_name | default('fallback') }}
```

---

## Best Practices

### 1. Version Your Templates

```yaml
name: my_template
version: "2.0.0"
min_scaffolding_version: "1.0.0"
changelog:
  - version: "2.0.0"
    changes:
      - "Added async support"
      - "Updated to Django 5.1"
```

### 2. Document Template Variables

```yaml
variables:
  required:
    app_name:
      type: string
      description: |
        Django app name in snake_case.
        Must be a valid Python module name.
      example: "user_accounts"
      validation: "^[a-z][a-z0-9_]*$"
```

### 3. Test Template Generation

```bash
# Test all variable combinations
./test_template.sh my_template

# Script content:
python manage.py scaffold generate my_template test1 --var option1=true
python manage.py scaffold generate my_template test2 --var option1=false
python manage.py scaffold validate --directory test1/ --strict
python manage.py scaffold validate --directory test2/ --strict
```

### 4. Provide Examples

Include example usage in template:

```yaml
# __template__.yaml
name: my_template
examples:
  - description: "Basic usage"
    command: "scaffold generate my_template my_app"
  - description: "With custom model"
    command: "scaffold generate my_template products --var model_name=Product"
```

---

## Publishing Extensions

### PyPI Distribution

```bash
# Build package
python setup.py sdist bdist_wheel

# Upload to PyPI
twine upload dist/*

# Install
pip install my-django-templates
```

### GitHub Distribution

```bash
# Install from GitHub
pip install git+https://github.com/username/my-django-templates.git

# Install specific version
pip install git+https://github.com/username/my-django-templates.git@v1.0.0
```

---

## Next Steps

- [CLI User Guide](cli-guide.md): Learn CLI commands
- [Template Authoring Guide](template-authoring.md): Create templates
- [Architecture Overview](architecture.md): Understand internals
- [Quickstart Tutorial](quickstart.md): Complete walkthrough
