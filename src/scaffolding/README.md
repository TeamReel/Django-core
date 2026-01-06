# Scaffolding (B20 - Scaffolding CLI)

**Status**: ✅ Complete
**Location**: `src/scaffolding/`

## Purpose

Provides CLI tooling for generating Django modules, boilerplate code, and enforcing Core-App architectural conventions through template-based code generation.

## Scope

**✅ Included**:
- Django app scaffolding with constitutional validation
- Template-based code generation
- Built-in templates for common patterns
- CLI interface (console script and Django management command)
- Atomic generation with rollback on failure
- Conflict detection and staging directory support
- Extensible template system
- UX enhancements (progress indicators, colors, confirmations)

**❌ Excluded** (Product-Agnostic Constraint):
- Product-specific templates
- Database migration generation (use Django's makemigrations)
- Frontend scaffolding (handled separately)
- Code refactoring tools

## Key Components

### CLI
- **`cli.py`**: Click-based command-line interface with subcommands
- **`management/commands/scaffold.py`**: Django management command wrapper

### Generation
- **`CodeGenerator`**: Core generation engine with validation and rollback
- **`generator.py`**: Orchestrates template rendering and file creation
- **`exceptions.py`**: Generation-specific exceptions (ConflictError, ValidationError)

### Rendering
- **`rendering/`**: Jinja2-based template rendering with Core-App conventions

### Templates
- **`built_in_templates/`**: Provided templates for common patterns
- **`templates/`**: Template registry and discovery

### Validation
- **`validation/`**: Constitutional validation and naming convention checks

### UX
- **`ux/`**: User experience enhancements (prompts, colors, progress bars)

### Utilities
- **`utils/`**: File system operations, path handling, template discovery

## Public Interface

**Safe to Import** (Stable API):
```python
from scaffolding.generation import CodeGenerator
from scaffolding.cli import scaffold  # For programmatic CLI invocation
```

**Internal Use Only** (May change):
```python
# Do NOT import these from downstream projects
from scaffolding.rendering.engine import _render_template  # Internal rendering
from scaffolding.validation.checks import _validate_name  # Internal validation
```

## Integration Example

**Command Line Usage**:
```bash
# Console script (installed via setup.py/pyproject.toml)
django-core-scaffold app payments --template=crud

# Django management command (alternative interface)
python manage.py scaffold app payments --template=crud

# Non-interactive mode (CI/CD)
django-core-scaffold app payments --template=crud --no-interactive

# List available templates
django-core-scaffold list-templates

# Get help
django-core-scaffold --help
django-core-scaffold app --help
```

**Programmatic Usage**:
```python
from scaffolding.generation import CodeGenerator

# Generate Django app with template
generator = CodeGenerator(
    app_name="payments",
    template="crud",
    target_dir="/path/to/project/src",
)

try:
    generator.generate()
    print("App generated successfully")
except ConflictError:
    print("App already exists")
except ValidationError as e:
    print(f"Validation failed: {e}")
```

## Related Modules

**Dependencies** (This module requires):
- [B02 Constitution Engine] - Constitutional validation
- Jinja2 - Template rendering
- Click - CLI framework

**Used By** (Modules that depend on this):
- Developers - Generate boilerplate code
- CI/CD pipelines - Automated code generation

## Extension Points

**How Downstream Products Can Extend**:

1. **Custom Templates**:
   ```python
   # your_product/templates/my_template/
   # __init__.py
   # models.py.j2
   # views.py.j2
   # urls.py.j2

   # Use custom template
   django-core-scaffold app myapp --template=/path/to/your_product/templates/my_template
   ```

2. **Custom Validators**:
   ```python
   # your_product/validators.py
   from scaffolding.validation import BaseValidator

   class ProductValidator(BaseValidator):
       """Validate product-specific conventions."""

       def validate(self, context):
           if context["app_name"] not in ALLOWED_APPS:
               raise ValidationError(f"App {context['app_name']} not allowed")
   ```

3. **Custom CLI Commands**:
   ```python
   # your_product/cli.py
   import click
   from scaffolding.cli import scaffold

   @scaffold.command()
   @click.argument("name")
   def custom_scaffold(name):
       """Custom scaffolding command."""
       # Custom logic
       pass
   ```

## Configuration

**Required Settings**:
```python
# settings.py
INSTALLED_APPS = [
    # ...
    "scaffolding",
]

# Constitutional validation (optional but recommended)
CONSTITUTION_ENGINE_ENABLED = True
```

**Environment Variables**:
```bash
SCAFFOLDING_TEMPLATE_DIR=/path/to/custom/templates  # Custom template directory
SCAFFOLDING_NO_COLOR=true  # Disable colored output
```

**Optional Settings**:
```python
# settings.py (optional)
SCAFFOLDING_DEFAULT_TEMPLATE = "crud"  # Default template name
SCAFFOLDING_VALIDATE = True  # Enable constitutional validation
SCAFFOLDING_INTERACTIVE = True  # Enable interactive prompts
```

## Testing

**Run Module Tests**:
```bash
pytest tests/scaffolding/ -v
```

**Key Test Coverage**:
- ✅ CLI argument parsing and validation
- ✅ Template rendering and variable substitution
- ✅ File generation and atomic rollback
- ✅ Conflict detection and handling
- ✅ Constitutional validation integration
- ✅ Built-in templates generate valid code
- ✅ Django management command integration

## References

- **Spec**: [documents/02-roadmap/modules/done/020-Bxx-core-scaffolding-cli.md](../../documents/02-roadmap/modules/done/020-Bxx-core-scaffolding-cli.md)
- **Module Doc**: [documents/04-modules/platform/B20-scaffolding-cli.md](../../documents/04-modules/platform/B20-scaffolding-cli.md)
- **Plugin Development**: [src/scaffolding/PLUGIN_DEVELOPMENT.md](./PLUGIN_DEVELOPMENT.md)
- **Constitution**: [Article II - Architecture and Modularity](../../.kittify/memory/constitution.md#ii-architecture-and-modularity)

## Troubleshooting

**Common Issues**:

1. **Issue**: `django-core-scaffold` command not found
   - **Cause**: Package not installed or not in PATH
   - **Solution**: Install package with `pip install -e .` or use `python manage.py scaffold`

2. **Issue**: Template not found error
   - **Cause**: Template name or path incorrect
   - **Solution**: Run `django-core-scaffold list-templates` to see available templates

3. **Issue**: Conflict error - files already exist
   - **Cause**: Target app directory already exists
   - **Solution**: Use different app name or remove existing directory

4. **Issue**: Validation failure from Constitution Engine
   - **Cause**: Generated code violates architectural rules
   - **Solution**: Review error message and adjust template or naming

5. **Issue**: Permission denied when writing files
   - **Cause**: Insufficient file system permissions
   - **Solution**: Check directory permissions or run with appropriate privileges

## Migration Notes

**Breaking Changes**:
- None - module stable since initial release

**Deprecations**:
- None

## Available Built-In Templates

Current built-in templates (as of latest version):

1. **`basic`**: Minimal Django app structure (models, views, urls)
2. **`crud`**: Full CRUD API with DRF serializers and viewsets
3. **`feature`**: Feature module with permissions and audit integration
4. **`minimal`**: Bare-bones app structure

Run `django-core-scaffold list-templates` for complete list with descriptions.

## CLI Exit Codes

Standard exit codes for scripting and CI/CD:

- **0**: Success
- **1**: User error (invalid input or aborted)
- **2**: System error (not implemented or internal error)
- **3**: Validation failure (constitutional checks failed)
- **4**: Template not found
- **5**: File conflict (target already exists)
