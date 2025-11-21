# Constitutional Enforcement Engine

A technology-agnostic constitutional enforcement engine that validates repositories against constitutions, workflow rules, and hygiene checks.

## Package Structure

```
src/constitution_engine/
├── __init__.py                 # Package root with public API
├── py.typed                    # PEP 561 type marker
├── core/                       # Engine core
│   ├── __init__.py
│   ├── models.py               # Core data models (ConstitutionRule, CheckResult, etc.)
│   ├── interfaces.py           # Protocols for rules, validators, reporters
│   └── engine.py               # Engine orchestrator and pipeline
├── rules/                      # Generic rule definitions
│   └── __init__.py
├── validators/                 # Higher-level validators
│   └── __init__.py
├── reporters/                  # Output formatters
│   └── __init__.py
├── workflow/                   # Spec Kitty workflow utilities
│   └── __init__.py
├── spec_kitty_integration/     # Integration helpers
│   └── __init__.py
├── modules/                    # Language-specific rule packs
│   ├── __init__.py
│   └── python/                 # Python-specific rules
│       └── __init__.py
└── adapters/                   # External system integrations
    └── __init__.py
```

## Core Components

### Data Models (`core/models.py`)

- **`ConstitutionRule`**: Represents a single enforceable rule with identifier, description, severity, and category
- **`CheckResult`**: Represents the outcome of running a rule (pass/fail/skip/error) with affected paths and details
- **`ConfigurationProfile`**: Engine configuration including enabled rules, target directories, and options
- **`RepositoryContext`**: Repository metadata including root path, detected languages, and constitution file

### Engine (`core/engine.py`)

The `Engine` class orchestrates:
1. Rule registration and discovery
2. Validator registration for post-processing
3. Reporter registration for output
4. Execution pipeline: rules → validators → results
5. Exit code determination based on results

### Interfaces (`core/interfaces.py`)

Protocols defining contracts for:
- **`RuleProtocol`**: Atomic checks that execute against repository context
- **`ValidatorProtocol`**: Higher-level validation and result post-processing
- **`ReporterProtocol`**: Result formatting and output
- **`ModuleProtocol`**: Language-specific rule discovery

## Usage Example

```python
from pathlib import Path
from constitution_engine import CheckResult, CheckStatus, ConfigurationProfile, RepositoryContext
from constitution_engine.core.engine import Engine

# Create configuration and context
config = ConfigurationProfile(enabled_rules=["RULE-001"])
context = RepositoryContext(root_path=Path("/path/to/repo").absolute())

# Initialize engine
engine = Engine(config=config, context=context)

# Register rules, validators, reporters...
# (Implementation of these components in subsequent work packages)

# Run checks
results = engine.run_once()
exit_code = engine.get_exit_code(results)
```

## Development

### Running Tests

```bash
# Run all tests
pytest tests/constitution_engine/

# Run with coverage
pytest tests/constitution_engine/ --cov=constitution_engine --cov-report=html
```

### Type Checking

```bash
mypy src/constitution_engine/
```

### Linting

```bash
ruff check src/constitution_engine/
```

## Architecture Principles

- **Stack-agnostic core**: No framework dependencies in core engine
- **Plugin-based extensibility**: Rules, validators, and reporters are pluggable
- **Type-safe**: Full type hints for static analysis
- **Deterministic**: No side effects in rule execution
- **Fast**: Designed to run in < 30 seconds on typical repositories

## Work Package Status

- ✅ WP01: Core engine foundation & data model (Completed)
- ⏳ WP02: Configuration loader & RepositoryContext builder (Planned)
- ⏳ WP03: Plugin/module discovery system (Planned)
- ⏳ WP04: Rule & validator systems (Planned)
- ⏳ WP05: Reporter subsystem (Planned)
- ⏳ WP06: Git adapter (Planned)
- ⏳ WP07: GitHub Actions adapter & CI wiring (Planned)
- ⏳ WP08: Django Core-App adapter (Planned)
- ⏳ WP09: Test suite (unit, integration, e2e) (Planned)
- ⏳ WP10: Documentation & developer onboarding (Planned)
