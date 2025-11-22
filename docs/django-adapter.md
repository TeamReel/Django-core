# Django Core-App Adapter

The Django Core-App adapter provides filesystem-based analysis of Django projects without importing Django or the target project. This makes it safe to use in CI/CD environments and avoids side effects from importing application code.

## Overview

The adapter:
- Discovers Django apps by scanning the project structure
- Identifies settings files, test directories, and management commands
- Builds a `RepositoryContext` with Django-specific metadata
- Works entirely through filesystem operations (no imports)

## Installation

The Django adapter is included with the Constitutional Enforcement Engine. No additional dependencies are required.

## Basic Usage

### Simple Configuration

```python
from pathlib import Path
from constitution_engine.adapters.django_core import DjangoAdapter

# Create adapter for a Django project
adapter = DjangoAdapter.from_project_root(
    "/path/to/django-project"
)

# Build repository context
context = adapter.build_context()

# Get project structure
structure = adapter.get_project_structure()
print(f"Found {len(structure['apps'])} Django apps")
```

### Custom Configuration

```python
from constitution_engine.adapters.django_core import DjangoAdapter, DjangoAdapterConfig

# Configure adapter with custom options
config = DjangoAdapterConfig(
    project_root=Path("/path/to/django-project"),
    src_dir="src",                              # Source directory name
    apps_dir=None,                              # Apps directly in src/
    settings_module="config.settings.base",     # Settings module path
    test_dir="tests",                           # Test directory name
    manage_py_path="manage.py",                 # Path to manage.py
    excluded_apps=["migrations"],               # Apps to exclude
    excluded_dirs=[                             # Directories to exclude
        "__pycache__",
        ".pytest_cache",
        "*.egg-info",
    ],
)

adapter = DjangoAdapter(config)
```

## Configuration Options

### DjangoAdapterConfig

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `project_root` | `Path` | *required* | Root directory of the Django project |
| `src_dir` | `str` | `"src"` | Source directory containing Django apps |
| `apps_dir` | `str \| None` | `None` | Apps subdirectory (if apps are nested) |
| `settings_module` | `str` | `"config.settings.base"` | Python path to settings module |
| `test_dir` | `str` | `"tests"` | Directory containing tests |
| `manage_py_path` | `str` | `"manage.py"` | Path to manage.py (relative to project root) |
| `excluded_apps` | `list[str]` | `["migrations"]` | App names to exclude |
| `excluded_dirs` | `list[str]` | See below | Directory patterns to exclude |

**Default excluded directories:**
- `__pycache__`
- `.pytest_cache`
- `*.egg-info`
- `.mypy_cache`
- `.ruff_cache`

## API Reference

### DjangoAdapter

#### `__init__(config: DjangoAdapterConfig)`

Initialize the adapter with configuration.

#### `build_context() -> RepositoryContext`

Build a `RepositoryContext` from the Django project structure.

**Returns:** `RepositoryContext` with:
- `detected_languages`: `{"python"}`
- `tags`: `{"django", "django-core-app"}`
- `metadata`: Dict containing:
  - `adapter`: `"django_core"`
  - `settings_module`: Configured settings module
  - `apps`: List of discovered app info dicts
  - `has_manage_py`: Boolean
  - `has_tests`: Boolean

#### `get_app_paths() -> list[Path]`

Get paths to all discovered Django apps.

**Returns:** List of `Path` objects pointing to app directories.

#### `get_test_paths() -> list[Path]`

Get paths to test directories and files.

**Returns:** List of `Path` objects for:
- Main `tests/` directory
- App-level `tests.py` files
- App-level `tests/` directories

#### `get_settings_files() -> list[Path]`

Get paths to Django settings files.

**Returns:** List of `Path` objects for settings files based on `settings_module` configuration.

#### `get_project_structure() -> dict[str, list[Path]]`

Get a structured view of the Django project.

**Returns:** Dict with keys:
- `apps`: List of app directory paths
- `tests`: List of test paths
- `settings`: List of settings file paths
- `manage_py`: List with manage.py path (empty if not found)

#### `from_project_root(project_root, **overrides) -> DjangoAdapter`

Convenience constructor to create adapter from project root.

**Args:**
- `project_root`: Root directory path (str or Path)
- `**overrides`: Optional configuration overrides

**Returns:** Configured `DjangoAdapter` instance.

## Project Structure Requirements

The adapter expects a Django Core-App style structure:

```
project-root/
├── manage.py
├── src/
│   ├── config/
│   │   ├── __init__.py
│   │   └── settings/
│   │       ├── __init__.py
│   │       ├── base.py
│   │       ├── local.py
│   │       └── production.py
│   ├── app1/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── tests.py
│   │   └── migrations/
│   └── app2/
│       ├── __init__.py
│       └── ...
└── tests/
    ├── __init__.py
    └── ...
```

### Required Elements

- **Project root**: Directory containing `manage.py`
- **Source directory**: Directory containing Django apps (default: `src/`)
- **Apps**: Directories with `__init__.py` files

### Optional Elements

- `manage.py`: Detected but not required
- `tests/`: Project-level test directory
- App-level `tests.py` or `tests/` directories
- `migrations/` directories (excluded by default)

## App Discovery

The adapter discovers apps by:

1. Scanning the configured apps directory (`src/` by default)
2. Looking for directories with `__init__.py` files
3. Excluding directories matching `excluded_dirs` patterns
4. Excluding apps in `excluded_apps` list

For each discovered app, the adapter detects:
- `has_models`: Presence of `models.py`
- `has_views`: Presence of `views.py`
- `has_urls`: Presence of `urls.py`
- `has_tests`: Presence of `tests.py` or `tests/` directory
- `has_migrations`: Presence of `migrations/` directory

## Integration with Engine

### Using with the Engine

```python
from constitution_engine.adapters.django_core import DjangoAdapter
from constitution_engine.core.engine import Engine

# Build context with Django adapter
adapter = DjangoAdapter.from_project_root("/path/to/project")
context = adapter.build_context()

# Run engine with Django context
engine = Engine()
results = engine.run(context)
```

### Using in Configuration

Add Django adapter options to your engine configuration:

```python
from constitution_engine.core.models import ConfigurationProfile

config = ConfigurationProfile(
    adapter_options={
        "django_core": {
            "settings_module": "config.settings.production",
            "excluded_apps": ["migrations", "legacy_app"],
        }
    }
)
```

## Limitations

### No Import Side Effects

The adapter **does not import** Django or your project code. This means:

✅ **Advantages:**
- Safe to use in CI/CD
- No risk of executing application code
- Fast (no Django initialization)
- Works with incomplete environments

❌ **Limitations:**
- Cannot detect dynamically registered apps
- Cannot inspect runtime configuration
- Cannot analyze database schema
- Cannot detect apps defined only in `INSTALLED_APPS`

### Filesystem-Only Analysis

The adapter relies entirely on filesystem structure:

- Apps must be physical directories with `__init__.py`
- Settings must be Python files (not dynamic imports)
- Cannot detect apps from entry points or plugins

### Django Core-App Specific

The adapter is optimized for Django Core-App style projects with:
- Explicit `src/` directory
- Apps as subdirectories of `src/`
- Settings as a package under `config/settings/`

For non-standard Django layouts, you may need to adjust configuration or use a different adapter.

## Examples

### Example 1: Analyze Current Project

```python
from pathlib import Path
from constitution_engine.adapters.django_core import DjangoAdapter

# Analyze the current Django project
adapter = DjangoAdapter.from_project_root(Path.cwd())

# Print discovered apps
for app in adapter._discover_apps():
    print(f"App: {app['name']}")
    print(f"  Has models: {app['has_models']}")
    print(f"  Has tests: {app['has_tests']}")
```

### Example 2: Custom Exclusions

```python
from constitution_engine.adapters.django_core import DjangoAdapter

# Exclude specific apps and directories
adapter = DjangoAdapter.from_project_root(
    "/path/to/project",
    excluded_apps=["migrations", "legacy", "deprecated"],
    excluded_dirs=[
        "__pycache__",
        "*.egg-info",
        "node_modules",  # If you have frontend code
        ".venv",         # Virtual environment
    ],
)
```

### Example 3: Different Settings Module

```python
from constitution_engine.adapters.django_core import DjangoAdapter

# Use production settings for analysis
adapter = DjangoAdapter.from_project_root(
    "/path/to/project",
    settings_module="config.settings.production",
)

settings_files = adapter.get_settings_files()
print(f"Analyzing with settings: {settings_files}")
```

## Testing

The adapter includes comprehensive tests:

```bash
# Run adapter tests
pytest tests/constitution_engine/adapters/test_django_adapter.py

# Run with coverage
pytest tests/constitution_engine/adapters/test_django_adapter.py --cov=src/constitution_engine/adapters/django_core
```

Test fixtures are available in `tests/fixtures/django_project/` for use in your own tests.

## Troubleshooting

### "Project root does not exist"

**Problem:** The specified project root path doesn't exist.

**Solution:** Verify the path is correct and absolute:
```python
from pathlib import Path
project_root = Path("/path/to/project").resolve()
assert project_root.exists(), f"Path not found: {project_root}"
```

### "Source directory does not exist"

**Problem:** The configured `src_dir` doesn't exist in the project.

**Solution:** Check the source directory name matches your project:
```python
# If your apps are in a different directory
adapter = DjangoAdapter.from_project_root(
    "/path/to/project",
    src_dir="apps",  # Not "src"
)
```

### No Apps Discovered

**Problem:** `get_app_paths()` returns an empty list.

**Possible causes:**
1. Apps don't have `__init__.py` files
2. Apps are in `excluded_apps` list
3. Wrong `apps_dir` configuration

**Solution:** Check app structure and configuration:
```python
config = DjangoAdapterConfig.from_project_root("/path/to/project")
print(f"Looking in: {config.apps_path}")
print(f"Excluded: {config.excluded_apps}")

# List directories in apps path
for item in config.apps_path.iterdir():
    if item.is_dir():
        has_init = (item / "__init__.py").exists()
        print(f"  {item.name}: has __init__.py = {has_init}")
```

### Settings Files Not Found

**Problem:** `get_settings_files()` returns empty list.

**Solution:** Verify settings module path matches your structure:
```python
# If settings are at src/myproject/settings.py (not a package)
adapter = DjangoAdapter.from_project_root(
    "/path/to/project",
    settings_module="myproject.settings",  # Not "config.settings.base"
)
```

## See Also

- [Core Engine Documentation](../README.md)
- [Testing Guide](../testing.md)
- [CLI Documentation](../cli.md)
- [Django Core-App Constitution](../../.kittify/memory/constitution.md)
