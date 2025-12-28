# Scaffolding Architecture Overview

## System Architecture

The Django scaffolding CLI is built with a modular architecture that separates concerns and enables extensibility.

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Layer                             │
│  ┌──────────────┬──────────────┬──────────────────────────┐ │
│  │   Commands   │   Prompts    │   Output Formatting      │ │
│  │  (generate,  │  (UX module) │   (tables, JSON, YAML)   │ │
│  │   list, etc) │              │                          │ │
│  └──────────────┴──────────────┴──────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────┐
│                    Generation Layer                          │
│  ┌──────────────┬──────────────┬──────────────────────────┐ │
│  │  Generator   │  Validator   │   Rollback Manager       │ │
│  │  (CodeGen)   │  (Ruff,mypy) │   (atomic operations)    │ │
│  └──────────────┴──────────────┴──────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────┐
│                    Rendering Layer                           │
│  ┌──────────────┬──────────────┬──────────────────────────┐ │
│  │   Engine     │   Context    │    File Processor        │ │
│  │  (Jinja2)    │   Builder    │   (paths, permissions)   │ │
│  └──────────────┴──────────────┴──────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────┐
│                    Discovery Layer                           │
│  ┌──────────────┬──────────────┬──────────────────────────┐ │
│  │   Registry   │   Loaders    │   Inheritance Resolver   │ │
│  │  (templates) │ (built-in,   │   (template hierarchy)   │ │
│  │              │   custom)    │                          │ │
│  └──────────────┴──────────────┴──────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Input (CLI)
      │
      ├─> Command Parser (argparse)
      │
      ├─> Template Discovery (Registry)
      │   ├─> Load built-in templates
      │   ├─> Load custom templates
      │   └─> Resolve inheritance
      │
      ├─> Interactive Prompts (UX) [optional]
      │   └─> Collect variable values
      │
      ├─> Template Rendering (Jinja2)
      │   ├─> Build context
      │   ├─> Render files
      │   └─> Process paths
      │
      ├─> Code Generation (Generator)
      │   ├─> Create directory structure
      │   ├─> Write files
      │   └─> Set permissions
      │
      ├─> Validation (Validator)
      │   ├─> Run Ruff
      │   ├─> Run mypy
      │   └─> Run check_policy.py
      │
      └─> Output (Success/Failure)
          ├─> Display summary
          └─> Exit code (0 or non-zero)
```

---

## Core Components

### 1. CLI Layer (`src/scaffolding/cli/`)

**Purpose:** User interface and command handling.

**Key Files:**
- `main.py`: CLI entry point, command dispatcher
- `commands.py`: Command implementations (generate, list, validate)
- `parser.py`: Argument parsing logic

**Responsibilities:**
- Parse command-line arguments
- Dispatch to appropriate handlers
- Format output for display
- Handle exit codes

### 2. Discovery Layer (`src/scaffolding/discovery/`)

**Purpose:** Find and load templates.

**Key Files:**
- `registry.py`: Template registry
- `loaders.py`: Template loaders (built-in, custom, plugin)
- `manifest.py`: Manifest parsing and validation

**Responsibilities:**
- Discover built-in templates
- Load custom templates from paths
- Resolve template inheritance
- Validate manifests

**Key Classes:**
```python
class TemplateRegistry:
    """Central registry for all templates."""

    def discover_built_in_templates(self) -> None:
        """Load templates from src/scaffolding/built_in_templates/"""

    def discover_templates(self, directory: Path) -> None:
        """Load templates from custom directory."""

    def get_template(self, name: str) -> Template:
        """Retrieve template by name."""
```

### 3. Rendering Layer (`src/scaffolding/rendering/`)

**Purpose:** Render Jinja2 templates with context.

**Key Files:**
- `engine.py`: Jinja2 rendering engine
- `context.py`: Context builder
- `filters.py`: Custom Jinja2 filters

**Responsibilities:**
- Initialize Jinja2 environment
- Build template context from variables
- Render template files
- Process dynamic paths

**Key Classes:**
```python
class TemplateRenderer:
    """Renders Jinja2 templates."""

    def render_file(self, template_path: Path, context: dict) -> str:
        """Render single template file."""

    def render_template(self, template: Template, variables: dict) -> dict:
        """Render all files in template."""
```

### 4. Generation Layer (`src/scaffolding/generation/`)

**Purpose:** Generate code from rendered templates.

**Key Files:**
- `generator.py`: Code generator
- `validator.py`: Code validation
- `rollback.py`: Rollback manager

**Responsibilities:**
- Create directory structures
- Write files to disk
- Set file permissions
- Validate generated code
- Handle errors and rollback

**Key Classes:**
```python
class CodeGenerator:
    """Generates code from templates."""

    def generate_app(
        self,
        template: Template,
        app_name: str,
        output_dir: Path,
        variables: dict,
        validate: bool = True
    ) -> GenerationResult:
        """Generate app from template."""
```

### 5. UX Layer (`src/scaffolding/ux/`)

**Purpose:** Interactive prompts and progress display.

**Key Files:**
- `prompts.py`: Input prompts
- `progress.py`: Progress indicators
- `summary.py`: Generation summary

**Responsibilities:**
- Detect TTY availability
- Prompt for missing variables
- Show progress during generation
- Display generation summary

---

## Design Patterns

### 1. Registry Pattern

Templates are registered in a central registry for easy lookup.

```python
registry = TemplateRegistry()
registry.discover_built_in_templates()
registry.discover_templates(custom_dir)

template = registry.get_template('api-first')
```

### 2. Strategy Pattern

Different loaders handle different template sources.

```python
class BuiltInLoader(TemplateLoader):
    def load(self) -> List[Template]:
        # Load from src/scaffolding/built_in_templates/
        pass

class CustomLoader(TemplateLoader):
    def load(self, directory: Path) -> List[Template]:
        # Load from custom directory
        pass
```

### 3. Template Method Pattern

Base template defines structure; subclasses provide specifics.

```yaml
# minimal (base)
name: minimal
files:
  - path: "models.py"
  - path: "tests/test_models.py"

# api-first (extends minimal)
name: api-first
extends: minimal
files:
  - path: "serializers.py"  # Added files
  - path: "views.py"
```

### 4. Command Pattern

Each CLI command is encapsulated in a handler.

```python
class GenerateCommand:
    def execute(self, args):
        # Generate app from template
        pass

class ListCommand:
    def execute(self, args):
        # List available templates
        pass
```

---

## Extension Points

### 1. Custom Templates

Add custom templates by placing them in a directory:

```bash
custom_templates/
└── my_template/
    ├── __template__.yaml
    └── ...
```

Then use `--template-dir` flag:

```bash
python manage.py scaffold generate my_template app_name \
  --template-dir ./custom_templates/
```

### 2. Custom Loaders

Implement `TemplateLoader` interface:

```python
class PluginLoader(TemplateLoader):
    """Load templates from Python packages."""

    def load(self, package_name: str) -> List[Template]:
        # Load templates from installed package
        pass
```

### 3. Custom Validators

Implement `Validator` interface:

```python
class CustomValidator(Validator):
    """Custom code validation."""

    def validate(self, app_dir: Path) -> ValidationResult:
        # Custom validation logic
        pass
```

### 4. Custom Filters

Add Jinja2 filters:

```python
def custom_filter(value: str) -> str:
    """Custom Jinja2 filter."""
    return value.upper()

# Register in engine
engine.add_filter('custom', custom_filter)
```

---

## Configuration

### Environment Variables

- `SCAFFOLD_TEMPLATE_DIR`: Default template directory
- `SCAFFOLD_OUTPUT_DIR`: Default output directory
- `SCAFFOLD_NON_INTERACTIVE`: Enable non-interactive mode

### Settings (Future)

```python
# settings.py
SCAFFOLDING = {
    'TEMPLATE_DIRS': [
        '/path/to/custom/templates',
    ],
    'DEFAULT_TEMPLATE': 'minimal',
    'VALIDATORS': [
        'scaffolding.validation.RuffValidator',
        'scaffolding.validation.MypyValidator',
        'myapp.validators.CustomValidator',
    ],
}
```

---

## Testing Architecture

### Unit Tests

Test individual components in isolation.

```python
def test_template_registry():
    registry = TemplateRegistry()
    registry.discover_built_in_templates()
    assert registry.get_template('minimal') is not None
```

### Integration Tests

Test component interactions.

```python
def test_end_to_end_generation():
    cli = ScaffoldCLI()
    exit_code = cli.run(['generate', 'minimal', 'test_app'])
    assert exit_code == 0
    assert Path('test_app').exists()
```

### Golden File Tests

Compare generated output to expected output.

```python
def test_golden_files():
    generator.generate_app(template, 'test_app', output_dir)

    actual = (output_dir / 'test_app' / 'models.py').read_text()
    expected = (golden_dir / 'models.py').read_text()

    assert actual == expected
```

---

## Performance Considerations

### Template Caching

Templates are loaded once and cached in memory:

```python
class TemplateRegistry:
    def __init__(self):
        self._cache = {}

    def get_template(self, name: str) -> Template:
        if name not in self._cache:
            self._cache[name] = self._load_template(name)
        return self._cache[name]
```

### Parallel Generation

Multiple apps can be generated in parallel (CI/CD):

```bash
# Generate multiple apps concurrently
python manage.py scaffold generate minimal app1 --output-dir ./app1/ &
python manage.py scaffold generate minimal app2 --output-dir ./app2/ &
wait
```

### Validation Optimization

Skip validation in CI for faster builds:

```bash
python manage.py scaffold generate minimal app --no-validate
```

---

## Security Considerations

### Path Traversal Prevention

All paths are validated to prevent directory traversal:

```python
def validate_output_path(path: Path) -> None:
    """Ensure path is safe."""
    if '..' in str(path):
        raise ValueError("Path traversal not allowed")

    resolved = path.resolve()
    if not resolved.is_relative_to(workspace):
        raise ValueError("Path outside workspace")
```

### Template Injection Prevention

Jinja2 autoescape is enabled:

```python
env = jinja2.Environment(
    autoescape=True,  # Prevent injection
    loader=jinja2.FileSystemLoader(template_dir)
)
```

### Permission Controls

Generated files have appropriate permissions:

```python
def write_file(path: Path, content: str) -> None:
    path.write_text(content)
    path.chmod(0o644)  # rw-r--r--
```

---

## Monitoring and Logging

### Logging Levels

```python
import logging

logger = logging.getLogger('scaffolding')

logger.debug('Loading template: %s', template_name)
logger.info('Generated app: %s', app_name)
logger.warning('Validation skipped')
logger.error('Template not found: %s', template_name)
```

### Metrics (Future)

```python
from prometheus_client import Counter, Histogram

generation_count = Counter('scaffold_generation_total', 'Total generations')
generation_duration = Histogram('scaffold_generation_seconds', 'Generation duration')
```

---

## Migration and Upgrades

### Template Versioning

Templates can specify version compatibility:

```yaml
name: api-first
version: "2.0.0"
django_version: ">=5.1"
min_scaffolding_version: "1.0.0"
```

### Backward Compatibility

New versions maintain backward compatibility:

- Template manifest schema is versioned
- Old manifests are automatically migrated
- Deprecated features show warnings

---

## Next Steps

- [CLI User Guide](cli-guide.md): Learn CLI commands
- [Template Authoring Guide](template-authoring.md): Create templates
- [Extension Guide](extension-guide.md): Advanced customization
- [Quickstart Tutorial](quickstart.md): Complete walkthrough
