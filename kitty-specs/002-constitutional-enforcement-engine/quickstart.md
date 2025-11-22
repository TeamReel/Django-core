# Constitutional Enforcement Engine - Quick Start

This guide will help you get started with the Constitutional Enforcement Engine in under 5 minutes.

## Prerequisites

- Python 3.12 or higher
- Git (for repository analysis features)
- A Django Core-App style project (or any Python project)

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/TeamReel/django-core.git
cd django-core

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -e .
pip install -r requirements/local.txt
```

### Verify Installation

```bash
# Check that the CLI is available
constitution-engine --help

# Run the test suite
pytest tests/constitution_engine/
```

## Basic Usage

### 1. Analyze a Repository

The simplest way to run the engine is against a local repository:

```bash
constitution-engine --repo-path /path/to/your/project
```

This will:
- Discover the project structure
- Run all enabled rules
- Display violations in the console

### 2. Use a Configuration File

Create a configuration file `.constitution.yaml`:

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

fail_on: error  # Fail build on errors or higher
```

Run with configuration:

```bash
constitution-engine --config .constitution.yaml --repo-path .
```

### 3. CI/CD Integration

#### GitHub Actions

Create `.github/workflows/constitution-check.yml`:

```yaml
name: Constitutional Checks

on: [push, pull_request]

jobs:
  enforce:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for Git analysis
      
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      
      - name: Install dependencies
        run: |
          pip install -e .
          pip install -r requirements/local.txt
      
      - name: Run Constitutional Enforcement
        run: |
          constitution-engine \\
            --config .constitution.yaml \\
            --repo-path . \\
            --output json \\
            --fail-on error
```

The engine will automatically:
- Emit GitHub Actions annotations for violations
- Write step summaries with detailed reports
- Exit with appropriate codes for CI

### 4. Django Project Integration

For Django Core-App style projects, use the Django adapter:

```python
from pathlib import Path
from constitution_engine.adapters.django_core import DjangoAdapter
from constitution_engine.core.engine import Engine

# Configure Django adapter
adapter = DjangoAdapter.from_project_root(
    Path("/path/to/django-project"),
    settings_module="config.settings.base"
)

# Build repository context
context = adapter.build_context()

# Run engine
engine = Engine()
results = engine.run(context)

# Process results
for result in results:
    if result.is_failure:
        print(f"❌ {result.rule_identifier}: {result.message}")
```

## Common Workflows

### Check Code Quality

```bash
constitution-engine \\
  --repo-path . \\
  --fail-on warning \\
  --verbose
```

### Generate JSON Report

```bash
constitution-engine \\
  --repo-path . \\
  --output json \\
  > constitution-report.json
```

### Analyze Specific Directory

```bash
constitution-engine \\
  --repo-path /path/to/project \\
  --config .constitution.yaml
```

## Configuration

### Minimal Configuration

```yaml
version: "1.0"
rules:
  enabled:
    - mypy-check
    - ruff-check
```

### Full Configuration

```yaml
version: "1.0"

rules:
  enabled:
    - mypy-check
    - ruff-check
    - test-coverage
    - git-hooks
  
  disabled:
    - experimental-rule
  
  config:
    mypy-check:
      strict: true
    test-coverage:
      threshold: 80
      exclude:
        - "*/migrations/*"
        - "*/tests/*"

output:
  formats:
    - console
    - json
  
  console:
    color: true
    verbose: false
  
  json:
    path: "constitution-report.json"
    indent: 2

fail_on: error  # Levels: info, warning, error, critical

adapters:
  django_core:
    enabled: true
    settings_module: "config.settings.base"
    excluded_apps:
      - migrations
```

## Exit Codes

The CLI uses standard exit codes:

- `0`: Success (all checks passed)
- `1`: Violations found (based on `--fail-on` threshold)
- `2`: Error during execution

## Environment Variables

- `GITHUB_ACTIONS=true`: Enable GitHub Actions integration
- `GITHUB_STEP_SUMMARY`: Path for GitHub step summary (auto-detected)
- `CI=true`: Enable CI-friendly output

## Next Steps

- **Learn the architecture**: Read [`src/constitution_engine/README.md`](../../src/constitution_engine/README.md)
- **Extend the engine**: See [How-To Guides](./howto/)
- **Configure rules**: See [CLI Documentation](../../docs/cli.md)
- **Django integration**: See [Django Adapter Guide](../../docs/django-adapter.md)
- **Testing guide**: See [Testing Documentation](../../docs/testing.md)

## Troubleshooting

### "No module named 'constitution_engine'"

Make sure you've installed the package:
```bash
pip install -e .
```

### "Command not found: constitution-engine"

The CLI script may not be in your PATH. Try:
```bash
python -m constitution_engine.cli --help
```

Or reinstall:
```bash
pip install -e .
```

### Tests Failing

Ensure all dependencies are installed:
```bash
pip install -r requirements/local.txt
pytest tests/constitution_engine/ -v
```

### Configuration Not Found

Specify the config path explicitly:
```bash
constitution-engine --config /absolute/path/to/.constitution.yaml
```

## Getting Help

- **Documentation**: Check the [docs/](../../docs/) directory
- **Issues**: Report bugs on [GitHub Issues](https://github.com/TeamReel/django-core/issues)
- **Examples**: See [docs/examples/](../../docs/examples/)

## What's Next?

The engine is modular and extensible:

1. **Add custom rules**: See [Writing Rules](./howto/writing-rules.md)
2. **Create reporters**: See [Writing Reporters](./howto/writing-reporters.md)
3. **Build adapters**: See [Writing Adapters](./howto/writing-adapters.md)
4. **Understand validation**: See [Writing Validators](./howto/writing-validators.md)

Start with the architecture overview in the main README to understand how components interact.
