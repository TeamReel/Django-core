# ADR-021: Template Discovery Mechanism

**Status**: Proposed
**Date**: 2025-12-04
**Feature**: B20 Core Scaffolding CLI
**Context**: Need a flexible, predictable template discovery system that works out-of-the-box while supporting customization

---

## Context

The Core Scaffolding CLI generates code from templates. Templates can come from multiple sources:
- Core built-in templates shipped with Core-App
- Project-local custom templates for organization-specific patterns
- Configured filesystem directories for shared templates
- Third-party template packages installed via pip

We need a discovery mechanism that:
1. Works out-of-the-box with zero configuration (day-1 usability)
2. Allows easy customization without modifying Core-App code
3. Has predictable precedence when template names conflict
4. Supports distribution of templates via Python packages
5. Remains simple to understand and debug

---

## Decision

Implement a **hybrid template discovery system** with the following precedence order:

### Discovery Order (First Match Wins)

1. **Project-local templates**: `./templates/scaffold/` in current project
2. **Configured directories**: Paths from `SCAFFOLD_TEMPLATE_DIRS` env var or config file
3. **Core built-in templates**: Templates shipped with Core-App package
4. **Plugin packages**: Templates from installed packages via entry points

### Implementation Details

#### 1. Project-Local Discovery

```python
# Default search path
project_template_dir = Path.cwd() / "templates" / "scaffold"

# Each subdirectory is a template if it contains __template__.yaml
for template_dir in project_template_dir.iterdir():
    if template_dir.is_dir() and (template_dir / "__template__.yaml").exists():
        load_template(template_dir)
```

**Rationale**: Zero configuration required; developers can drop templates into `./templates/scaffold/<template-name>/` and they're immediately discoverable.

#### 2. Configured Directory Discovery

```python
# From environment variable (colon-separated on Unix, semicolon on Windows)
template_dirs = os.getenv("SCAFFOLD_TEMPLATE_DIRS", "").split(os.pathsep)

# From config file (.scaffold.yaml or pyproject.toml)
config = load_config()
template_dirs.extend(config.get("template_dirs", []))

# Discover templates from each directory
for dir_path in template_dirs:
    for template_dir in Path(dir_path).iterdir():
        if template_dir.is_dir() and (template_dir / "__template__.yaml").exists():
            load_template(template_dir)
```

**Rationale**: Supports team-wide shared templates without requiring package installation. Useful for organizations with internal template repositories.

#### 3. Core Built-in Discovery

```python
from importlib.resources import files

core_templates_dir = files("scaffolding") / "built_in_templates"

for template_dir in core_templates_dir.iterdir():
    if template_dir.is_dir() and (template_dir / "__template__.yaml").exists():
        load_template(template_dir)
```

**Rationale**: Core templates always available, even in fresh installations. Provides baseline functionality.

#### 4. Plugin Package Discovery

```python
from importlib.metadata import entry_points

# Discover templates from installed packages
for ep in entry_points(group="scaffold_templates"):
    template_module = ep.load()
    template_dir = Path(template_module.__file__).parent
    load_template(template_dir)
```

**Package Convention**:
```python
# setup.py or pyproject.toml
[project.entry-points."scaffold_templates"]
custom-api = "my_templates.scaffold_templates.custom_api"
custom-service = "my_templates.scaffold_templates.custom_service"
```

**Rationale**: Enables template distribution via pip packages. Supports third-party template ecosystems while keeping Core simple.

---

### Override Behavior

When multiple sources provide templates with the same name:

1. **First match wins**: Template from earlier source takes precedence
2. **Warning logged**: CLI logs when a template overrides another
3. **Explicit selection**: User can see all sources with `--list-templates --verbose`

**Example**:
```
Project has: custom-api
Core has: api-first, custom-api (overridden by project)

Available templates:
  custom-api (project-local) ⚠️ overrides core/custom-api
  api-first (core)
```

---

### Template Inheritance

Templates can extend other templates via `extends` field in manifest:

```yaml
# templates/scaffold/custom-api/__template__.yaml
name: custom-api
extends: core/api-first  # Explicit reference to source
```

**Inheritance Resolution**:
1. Parse `extends` field (format: `<source>//<template-name>` or just `<template-name>`)
2. Resolve parent template using same discovery order
3. Validate inheritance depth ≤ 2 levels
4. Fail fast on circular dependencies

**File-level Override**:
- Child template files override same-named parent files
- Missing files in child are inherited from parent
- No automatic merging (override is complete replacement)

---

### Caching Strategy

Templates discovered once at CLI startup and cached in memory:

```python
class TemplateRegistry:
    def __init__(self):
        self._cache: Dict[str, Template] = {}
        self._discovered = False

    def discover(self):
        if self._discovered:
            return

        # Discover in precedence order
        self._discover_project_local()
        self._discover_configured_dirs()
        self._discover_core_builtin()
        self._discover_plugin_packages()

        self._discovered = True
```

**Rationale**: Template discovery is expensive (filesystem I/O, package imports). Cache ensures single discovery per CLI invocation.

---

## Consequences

### Positive

✅ **Zero configuration for Core templates**: Developers can use `api-first`, `service`, etc. immediately
✅ **Easy customization**: Drop templates into `./templates/scaffold/` without configuration
✅ **Predictable precedence**: Clear, documented order prevents confusion
✅ **Package distribution**: Third-party templates can be shared via pip
✅ **Team-wide sharing**: Configured directories support centralized template repositories
✅ **Override safety**: Warnings prevent silent overrides

### Negative

⚠️ **Discovery complexity**: Four sources to search increases debugging surface
⚠️ **Override conflicts**: Multiple templates with same name require careful management
⚠️ **Package dependencies**: Plugin packages add external dependencies

### Mitigation

- **Debugging**: `--list-templates --verbose` shows all sources and overrides
- **Conflict resolution**: Clear warning messages when overrides occur
- **Package isolation**: Entry point mechanism keeps plugin discovery optional

---

## Alternatives Considered

### Alternative 1: Filesystem-Only Discovery

**Description**: Only discover templates from filesystem paths (project-local + configured dirs). No Core built-in, no plugin packages.

**Rejected Because**:
- Requires copying Core templates into every project (no day-1 usability)
- No way to distribute templates via pip packages
- Every project needs configuration to work

### Alternative 2: Package-Only Discovery

**Description**: All templates distributed as Python packages. No filesystem discovery.

**Rejected Because**:
- Requires packaging knowledge for simple project-local overrides
- Overkill for small customizations (e.g., change one template file)
- High barrier to entry for template authoring

### Alternative 3: Single Source with Explicit Imports

**Description**: All templates in Core. Custom templates must explicitly import and extend Core templates in code.

**Rejected Because**:
- Requires Python coding to create templates (not just YAML + Jinja2)
- Tight coupling between custom templates and Core-App versions
- No clear separation between template data and code

---

## Implementation Notes

### Error Handling

```python
class TemplateNotFoundError(Exception):
    """Raised when requested template cannot be discovered."""
    pass

class CircularDependencyError(Exception):
    """Raised when template inheritance has circular reference."""
    pass

class InheritanceDepthError(Exception):
    """Raised when template inheritance exceeds max depth (2)."""
    pass
```

### Configuration File Schema

```yaml
# .scaffold.yaml
template_dirs:
  - ./vendor/templates
  - /opt/company-templates

discovery:
  enable_project_local: true     # Default: true
  enable_configured_dirs: true   # Default: true
  enable_core_builtin: true      # Default: true
  enable_plugin_packages: true   # Default: true
```

### CLI Debugging Commands

```bash
# Show all discovered templates with sources
django-core-scaffold list-templates --verbose

# Show discovery order and paths
django-core-scaffold --debug list-templates

# Validate specific template
django-core-scaffold validate-template custom-api
```

---

## References

- Spec: [spec.md](../spec.md) - FR-009 to FR-015 (Template System requirements)
- Research: [research.md](../research.md) - Q1: Template Discovery Strategy
- Data Model: [data-model.md](../data-model.md) - Template and TemplateManifest entities

---

**Decision Makers**: Planning phase architectural decisions
**Stakeholders**: Core-App developers, downstream product teams, template authors
