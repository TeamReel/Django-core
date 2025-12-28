# Constitutional Enforcement Engine - Documentation Index

Complete documentation for the Constitutional Enforcement Engine.

## Getting Started

📖 **[Quick Start Guide](./quickstart.md)** - Get up and running in 5 minutes
🏗️ **[Architecture Overview](../../src/constitution_engine/README.md)** - Understand how it works
🎯 **[Constitutional Alignment](./constitutional-alignment.md)** - Principles and non-goals

## Core Documentation

### For Users

- **[CLI Documentation](../../docs/cli.md)** - Command-line interface reference
- **[Configuration Guide](./quickstart.md#configuration)** - How to configure the engine
- **[Testing Guide](../../docs/testing.md)** - Running and writing tests

### For Django Users

- **[Django Adapter Guide](../../docs/django-adapter.md)** - Django Core-App integration
- **[Django Examples](../../docs/examples/django/)** - Code examples

### For Developers

- **[Main README](../../src/constitution_engine/README.md)** - Architecture and internals
- **[Data Models](../../src/constitution_engine/README.md#data-models)** - Core entities
- **[Extension Points](../../src/constitution_engine/README.md#extension-points)** - How to extend

## How-To Guides

📝 **[Writing Custom Rules](./howto/writing-rules.md)** - Create enforcement rules
✅ **[Writing Custom Validators](./howto/writing-validators.md)** - Post-process results
📊 **[Writing Custom Reporters](./howto/writing-reporters.md)** - Format output
🔌 **[Writing Custom Adapters](./howto/writing-adapters.md)** - Add project types

## Examples

- **[Basic Usage](../../docs/examples/django/basic_usage.py)** - Simple Django integration
- **[Custom Configuration](../../docs/examples/django/custom_config.py)** - Advanced setup
- **[GitHub Actions](../../docs/examples/github-actions-workflow.yml)** - CI/CD integration

## Reference

### Core Components

| Component | Description | Location |
|-----------|-------------|----------|
| Engine | Main execution engine | `src/constitution_engine/core/engine.py` |
| Configuration | Config loading and schema | `src/constitution_engine/core/config.py` |
| Context Builder | Repository analysis | `src/constitution_engine/core/context.py` |
| Plugin System | Rule/validator/reporter discovery | `src/constitution_engine/core/plugins.py` |
| Data Models | Core entities | `src/constitution_engine/core/models.py` |
| CLI | Command-line interface | `src/constitution_engine/cli.py` |

### Adapters

| Adapter | Description | Documentation |
|---------|-------------|---------------|
| Git | Repository metadata | Built-in |
| Django Core-App | Django project analysis | [Guide](../../docs/django-adapter.md) |

### Reporters

| Reporter | Description | Output Format |
|----------|-------------|---------------|
| Console | Human-readable output | Terminal with colors |
| JSON | Machine-readable output | Structured JSON |
| GitHub Actions | CI/CD integration | Annotations + summaries |

## Specification Documents

- **[Feature Specification](./spec.md)** - Original requirements
- **[Technical Plan](./plan.md)** - Implementation strategy
- **[Task Breakdown](./tasks.md)** - Work packages and subtasks
- **[Data Model](./data-model.md)** - Entity relationships
- **[API Contracts](./contracts/)** - Interface specifications

## Project Structure

```
constitutional-enforcement-engine/
├── kitty-specs/002-constitutional-enforcement-engine/
│   ├── quickstart.md              # ← Start here!
│   ├── spec.md                    # Feature specification
│   ├── plan.md                    # Technical plan
│   ├── tasks.md                   # Work breakdown
│   ├── data-model.md              # Entity model
│   ├── constitutional-alignment.md # Principles
│   ├── howto/                     # How-to guides
│   │   ├── writing-rules.md
│   │   ├── writing-validators.md
│   │   ├── writing-reporters.md
│   │   └── writing-adapters.md
│   └── contracts/                 # API contracts
│
├── src/constitution_engine/
│   ├── README.md                  # Architecture docs
│   ├── cli.py                     # CLI entry point
│   ├── core/                      # Core engine
│   ├── adapters/                  # Project adapters
│   ├── reporters/                 # Output formatters
│   ├── rules/                     # Built-in rules (future)
│   └── validators/                # Built-in validators (future)
│
├── docs/
│   ├── cli.md                     # CLI reference
│   ├── testing.md                 # Testing guide
│   ├── django-adapter.md          # Django guide
│   └── examples/                  # Code examples
│
└── tests/constitution_engine/     # Test suite
    ├── core/                      # Core tests
    ├── adapters/                  # Adapter tests
    ├── reporters/                 # Reporter tests
    └── fixtures/                  # Test fixtures
```

## Development Workflow

1. **Read** [Quick Start](./quickstart.md) to understand basics
2. **Review** [Architecture](../../src/constitution_engine/README.md) to understand design
3. **Check** [Constitutional Alignment](./constitutional-alignment.md) for principles
4. **Follow** [How-To Guides](./howto/) to extend the engine
5. **Run** tests with [Testing Guide](../../docs/testing.md)

## Common Tasks

### Running the Engine

```bash
constitution-engine --repo-path /path/to/project
```

See: [CLI Documentation](../../docs/cli.md)

### Adding a Custom Rule

1. Read [Writing Rules](./howto/writing-rules.md)
2. Implement the `RuleProtocol`
3. Register with `PluginRegistry`
4. Write tests

### Integrating with Django

1. Read [Django Adapter Guide](../../docs/django-adapter.md)
2. Configure `DjangoAdapter`
3. Use in your project

See: [Django Examples](../../docs/examples/django/)

### Setting Up CI/CD

1. Read [GitHub Actions Example](../../docs/examples/github-actions-workflow.yml)
2. Create workflow file
3. Configure failure threshold

See: [CLI Documentation](../../docs/cli.md#cicd-integration)

## Test Coverage

Current test coverage: **80.17%** (exceeds 75% threshold)

- **243 tests** passing
- **Core engine**: ~85% coverage
- **Reporters**: ~99% coverage
- **Adapters**: ~87% coverage
- **CLI**: ~64% coverage

See: [Testing Guide](../../docs/testing.md)

## Contributing

See main project contributing guidelines.

Areas needing contribution:
- Built-in rules (security, performance)
- Additional adapters (FastAPI, Flask)
- More reporters (HTML, SARIF)
- Documentation improvements

## Support

- **Issues**: [GitHub Issues](https://github.com/TeamReel/django-core/issues)
- **Discussions**: Project discussions
- **Documentation**: This index page

## Version Information

- **Engine Version**: 1.0.0 (MVP)
- **Python Requirement**: 3.12+
- **Status**: Production Ready

## Quick Links

| Link | Purpose |
|------|---------|
| [Quick Start](./quickstart.md) | Get started quickly |
| [Architecture](../../src/constitution_engine/README.md) | Understand the design |
| [CLI Reference](../../docs/cli.md) | Command-line usage |
| [Django Guide](../../docs/django-adapter.md) | Django integration |
| [Writing Rules](./howto/writing-rules.md) | Create custom rules |
| [Testing Guide](../../docs/testing.md) | Test the engine |
| [Constitutional Alignment](./constitutional-alignment.md) | Design principles |

---

**Need help?** Start with the [Quick Start Guide](./quickstart.md) or check the [How-To Guides](./howto/).
