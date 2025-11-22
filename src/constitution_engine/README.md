# Constitutional Enforcement Engine

A modular, extensible code quality enforcement system for Django Core-App projects and Python applications.

## Overview

The Constitutional Enforcement Engine is a **filesystem-based code analysis tool** that enforces project constitution rules without importing application code. It provides:

- **Static Analysis**: Run mypy, Ruff, and other checks
- **Test Coverage**: Enforce minimum coverage thresholds
- **Git Integration**: Analyze repository metadata and changes
- **CI/CD Ready**: GitHub Actions integration with annotations
- **Extensible Architecture**: Plugin system for custom rules, validators, and reporters
- **Django Support**: Special adapter for Django Core-App projects

## Architecture

The engine follows a **pipeline architecture** with clear separation of concerns:

```
┌─────────────────┐
│  Configuration  │ (YAML/TOML files, env vars)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Repository      │ (Filesystem scan, Git metadata)
│ Context Builder │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Plugin         │ (Discover rules, validators, reporters)
│  Discovery      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Rule           │ (Execute checks in parallel)
│  Execution      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Validators     │ (Post-process results, normalize severity)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Reporters      │ (Console, JSON, GitHub Actions)
└─────────────────┘
```

### Core Components

#### 1. **Configuration System** (`core/config.py`, `core/loaders.py`)

Loads and validates configuration from multiple sources:
- YAML/TOML files
- Environment variables
- Programmatic configuration

```python
from constitution_engine.core.loaders import ConfigLoader

config = ConfigLoader.from_file(".constitution.yaml")
```

#### 2. **Repository Context** (`core/context.py`, `core/models.py`)

Builds a representation of the repository without importing code:
- File structure analysis
- Language detection
- Git metadata (branch, commit, changed files)
- Repository tags

```python
from constitution_engine.core.context import RepositoryContextBuilder

builder = RepositoryContextBuilder(Path("/path/to/project"))
context = builder.build()
```

#### 3. **Plugin System** (`core/plugins.py`, `core/interfaces.py`)

Discovers and loads rules, validators, and reporters:
- Entry point discovery
- Registry-based plugin management
- Dependency injection

```python
from constitution_engine.core.plugins import PluginRegistry

registry = PluginRegistry()
rule = registry.get_rule("mypy-check")
```

#### 4. **Rule Execution** (`core/engine.py`, `core/rules.py`)

Executes rules and generates check results:
- Parallel execution where safe
- Error isolation (one rule failure doesn't stop others)
- Structured result format

```python
from constitution_engine.core.engine import Engine

engine = Engine(config)
results = engine.run(context)
```

#### 5. **Validators** (`core/validators.py`, `validators/`)

Post-process results:
- Severity normalization
- Duplicate removal
- Result filtering
- Workflow validation

```python
from constitution_engine.validators import SeverityNormalizer

validator = SeverityNormalizer()
normalized_results = validator.validate(results)
```

#### 6. **Reporters** (`reporters/`)

Format and output results:
- **Console**: Human-readable colored output
- **JSON**: Machine-readable structured data
- **GitHub Actions**: Annotations and step summaries

```python
from constitution_engine.reporters import ConsoleReporter

reporter = ConsoleReporter()
reporter.report(results)
```

#### 7. **Adapters** (`adapters/`)

Project-specific integrations:
- **Git**: Repository metadata and change detection
- **Django**: Django Core-App structure analysis

```python
from constitution_engine.adapters.django_core import DjangoAdapter

adapter = DjangoAdapter.from_project_root("/path/to/project")
context = adapter.build_context()
```

## Key Concepts

### No Import Policy

The engine **never imports** your application code. This provides:
- ✅ **Safety**: No side effects from imports
- ✅ **Speed**: No Django initialization overhead
- ✅ **Simplicity**: Works with incomplete environments
- ✅ **CI-Friendly**: Minimal setup required

### Filesystem-Based Analysis

All analysis uses:
- File existence checks
- Pattern matching (fnmatch, regex)
- Subprocess execution (mypy, ruff)
- Git commands (via subprocess or GitPython)

### Extensibility

Every major component is extensible:
- **Rules**: Add custom checks
- **Validators**: Add custom post-processing
- **Reporters**: Add custom output formats
- **Adapters**: Add project-type support

## Project Structure

```
src/constitution_engine/
├── __init__.py                 # Package entry point
├── cli.py                      # Command-line interface
├── core/                       # Core engine components
│   ├── config.py              # Configuration schema
│   ├── context.py             # Repository context builder
│   ├── engine.py              # Main execution engine
│   ├── errors.py              # Error types
│   ├── integration.py         # High-level integration API
│   ├── interfaces.py          # Plugin interfaces (protocols)
│   ├── loaders.py             # Config file loaders
│   ├── models.py              # Core data models
│   ├── plugins.py             # Plugin discovery and registry
│   ├── rules.py               # Base rule classes
│   └── validators.py          # Base validator classes
├── adapters/                   # Project-type adapters
│   ├── git/                   # Git integration
│   │   └── adapter.py
│   └── django_core/           # Django Core-App adapter
│       ├── adapter.py
│       └── config.py
├── reporters/                  # Output formatters
│   ├── base.py                # Reporter interface
│   ├── console.py             # Console reporter
│   └── json_reporter.py       # JSON reporter
├── rules/                      # Built-in rules (future)
│   └── builtins/
├── validators/                 # Built-in validators (future)
│   └── builtins/
└── modules/                    # Language-specific modules
    └── python/                 # Python rules and validators
```

## Data Models

### ConstitutionRule

Represents a single enforceable rule:

```python
@dataclass(frozen=True)
class ConstitutionRule:
    identifier: str          # e.g., "RULE-001"
    description: str         # Human-readable description
    severity: Severity       # LOW, MEDIUM, HIGH, CRITICAL
    category: str           # e.g., "security", "quality"
    enabled: bool           # Whether rule is active
    metadata: dict          # Additional data
```

### CheckResult

Represents the outcome of running a rule:

```python
@dataclass(frozen=True)
class CheckResult:
    rule_identifier: str     # Rule that generated this result
    status: CheckStatus      # PASS, FAIL, SKIP, ERROR
    message: str            # Human-readable message
    affected_paths: list    # Files/paths related to result
    severity: Severity      # Result severity
    details: dict           # Structured details
```

### RepositoryContext

Represents information about the repository:

```python
@dataclass
class RepositoryContext:
    root_path: Path                    # Repository root
    constitution_path: Path | None     # Constitution file
    detected_languages: set[str]       # e.g., {"python", "javascript"}
    git_branch: str | None            # Current branch
    git_commit: str | None            # Current commit
    tags: set[str]                    # e.g., {"django", "api"}
    metadata: dict                    # Additional context
```

### ConfigurationProfile

Represents the engine's configuration:

```python
@dataclass
class ConfigurationProfile:
    enabled_rules: list[str]           # Rules to run
    target_directories: list[Path]     # Directories to analyze
    adapter_options: dict              # Adapter-specific config
    output_formats: list[str]         # Output formats
    constitution_path: Path | None    # Constitution file
    metadata: dict                    # Additional config
```

## Extension Points

### 1. Writing Rules

Rules implement the `RuleProtocol`:

```python
from constitution_engine.core.interfaces import RuleProtocol
from constitution_engine.core.models import CheckResult, CheckStatus

class MyCustomRule:
    """Custom rule implementation."""
    
    identifier = "my-custom-rule"
    description = "Checks for custom violations"
    severity = Severity.WARNING
    category = "custom"
    
    def execute(self, context: RepositoryContext) -> list[CheckResult]:
        """Execute the rule against the repository context."""
        results = []
        
        # Your custom logic here
        if some_condition:
            results.append(CheckResult(
                rule_identifier=self.identifier,
                status=CheckStatus.FAIL,
                message="Custom violation found",
                severity=self.severity
            ))
        
        return results
```

Register your rule:

```python
from constitution_engine.core.plugins import PluginRegistry

registry = PluginRegistry()
registry.register_rule("my-custom-rule", MyCustomRule())
```

### 2. Writing Validators

Validators post-process results:

```python
from constitution_engine.core.interfaces import ValidatorProtocol

class MyValidator:
    """Custom validator implementation."""
    
    identifier = "my-validator"
    description = "Custom result post-processing"
    
    def validate(
        self,
        results: list[CheckResult],
        context: RepositoryContext
    ) -> list[CheckResult]:
        """Post-process check results."""
        # Filter, transform, or enhance results
        return [result for result in results if some_condition(result)]
```

### 3. Writing Reporters

Reporters format and output results:

```python
from constitution_engine.core.interfaces import ReporterProtocol

class MyReporter:
    """Custom reporter implementation."""
    
    identifier = "my-reporter"
    description = "Custom output format"
    
    def report(
        self,
        results: list[CheckResult],
        context: RepositoryContext
    ) -> None:
        """Generate report from results."""
        for result in results:
            # Custom output logic
            print(f"{result.rule_identifier}: {result.message}")
```

### 4. Writing Adapters

Adapters provide project-specific context:

```python
from constitution_engine.core.models import RepositoryContext

class MyProjectAdapter:
    """Custom project adapter."""
    
    def __init__(self, config):
        self.config = config
    
    def build_context(self) -> RepositoryContext:
        """Build repository context from project structure."""
        return RepositoryContext(
            root_path=self.config.project_root,
            detected_languages={"python"},
            tags={"my-project-type"},
            metadata={
                "adapter": "my-project",
                # Custom metadata
            }
        )
```

## Testing

The engine has comprehensive test coverage:

```bash
# Run all tests
pytest tests/constitution_engine/

# Run with coverage
pytest tests/constitution_engine/ --cov=src/constitution_engine --cov-report=html

# Run specific test categories
pytest tests/constitution_engine/core/          # Core tests
pytest tests/constitution_engine/reporters/     # Reporter tests
pytest tests/constitution_engine/adapters/      # Adapter tests
```

See [`docs/testing.md`](../../docs/testing.md) for detailed testing guide.

## CLI Usage

```bash
# Basic usage
constitution-engine --repo-path /path/to/project

# With configuration
constitution-engine --config .constitution.yaml --repo-path .

# CI/CD mode with JSON output
constitution-engine \
  --repo-path . \
  --output json \
  --fail-on error \
  --no-git

# GitHub Actions (auto-detected)
constitution-engine --repo-path . --fail-on warning
```

See [`docs/cli.md`](../../docs/cli.md) for complete CLI documentation.

## Configuration

Example `.constitution.yaml`:

```yaml
version: "1.0"

rules:
  enabled:
    - mypy-check
    - ruff-check
    - test-coverage
  
  config:
    test-coverage:
      threshold: 75

output:
  formats:
    - console
    - json

fail_on: error
```

## Performance

The engine is designed for speed:
- **Parallel execution**: Rules run concurrently where safe
- **No imports**: Skips slow Python initialization
- **Efficient scanning**: Smart directory traversal
- **Caching**: Reuses Git and filesystem data

Typical execution time: **< 10 seconds** for medium projects (10k-50k LOC).

## Constitutional Alignment

The engine embodies these principles:

1. **Simplicity**: Simple architecture, clear boundaries
2. **Safety**: No imports, no side effects
3. **Extensibility**: Plugin-based, protocol-oriented
4. **Transparency**: Clear error messages, verbose logging
5. **CI-First**: Designed for automation

Non-goals:
- ❌ Runtime code execution
- ❌ Dynamic import analysis
- ❌ IDE integration (use language servers instead)
- ❌ Complex configuration DSL

## Dependencies

### Runtime
- Python 3.12+
- No required external dependencies (pure Python stdlib)

### Optional
- `GitPython`: Enhanced Git integration (falls back to subprocess)
- `tomli`: TOML configuration support (Python < 3.11)

### Development
- `pytest`: Testing framework
- `pytest-cov`: Coverage reporting
- `mypy`: Type checking
- `ruff`: Linting and formatting

## Contributing

See contribution guidelines in the main project README.

Key areas for contribution:
1. **Built-in rules**: Add common checks (security, performance)
2. **Validators**: Add useful post-processing
3. **Reporters**: Add output formats (HTML, XML, SARIF)
4. **Adapters**: Add project-type support
5. **Documentation**: Improve guides and examples

## License

See main project LICENSE file.

## See Also

- [Quick Start Guide](../../kitty-specs/002-constitutional-enforcement-engine/quickstart.md)
- [CLI Documentation](../../docs/cli.md)
- [Testing Guide](../../docs/testing.md)
- [Django Adapter Guide](../../docs/django-adapter.md)
- [How-To Guides](../../kitty-specs/002-constitutional-enforcement-engine/howto/)
