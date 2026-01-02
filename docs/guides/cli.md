# CLI Documentation

## Overview

The `constitution-engine` command-line interface provides a way to run constitutional checks from the command line or CI/CD environments like GitHub Actions.

## Installation

```bash
pip install constitution-engine
```

After installation, the `constitution-engine` command will be available in your PATH.

## Basic Usage

```bash
# Run with default configuration
constitution-engine

# Run with explicit config file
constitution-engine --config .constitution.yaml

# Run with specific repository path
constitution-engine --repo-path /path/to/repo

# Run with verbose output
constitution-engine --verbose
```

## Command-Line Arguments

### `--config`, `-c`

Path to the constitution configuration file.

- **Type**: Path
- **Default**: Search for `.constitution.yaml` in current and parent directories
- **Example**: `--config custom-constitution.yaml`

### `--repo-path`, `-r`

Path to the repository to analyze.

- **Type**: Path
- **Default**: Current directory (`.`)
- **Example**: `--repo-path /path/to/my/repo`

### `--output`, `-o`

Output format for results.

- **Type**: Choice (`console`, `json`, `both`)
- **Default**: `console`
- **Example**: `--output json`

Formats:
- `console`: Human-readable console output
- `json`: Machine-readable JSON output
- `both`: Both console and JSON output

### `--fail-on`

Minimum severity level to fail on (exit code 1).

- **Type**: Choice (`low`, `medium`, `high`, `critical`, `never`)
- **Default**: `high`
- **Example**: `--fail-on medium`

Severity levels (in increasing order):
- `low`: Informational violations
- `medium`: Minor violations that should be addressed
- `high`: Significant violations that must be fixed
- `critical`: Critical violations that block deployment
- `never`: Never fail (always exit 0, even with violations)

### `--no-git`

Disable Git metadata collection.

- **Type**: Flag (boolean)
- **Default**: `false` (Git metadata enabled)
- **Example**: `--no-git`

Use this flag when:
- Running in non-Git repositories
- Git is not available
- You want to skip Git-related checks

### `--verbose`, `-v`

Enable verbose logging output.

- **Type**: Flag (boolean)
- **Default**: `false` (info level logging)
- **Example**: `--verbose`

### `--version`

Display version information and exit.

- **Type**: Flag (boolean)
- **Example**: `--version`

## Environment Variables

The CLI supports configuration via environment variables for easier integration with CI/CD systems.

### `CONSTITUTION_CONFIG`

Path to the constitution configuration file.

- **Overrides**: Default config file search
- **Overridden by**: `--config` command-line argument
- **Example**: `export CONSTITUTION_CONFIG=/path/to/constitution.yaml`

### `CONSTITUTION_REPO_PATH`

Path to the repository to analyze.

- **Overrides**: Current directory default
- **Overridden by**: `--repo-path` command-line argument
- **Example**: `export CONSTITUTION_REPO_PATH=/path/to/repo`

### `CONSTITUTION_FAIL_ON`

Minimum severity level to fail on.

- **Overrides**: `high` default
- **Overridden by**: `--fail-on` command-line argument
- **Values**: `low`, `medium`, `high`, `critical`, `never`
- **Example**: `export CONSTITUTION_FAIL_ON=medium`

### GitHub Actions Environment Variables

When running in GitHub Actions (detected via `GITHUB_ACTIONS=true`), the CLI automatically integrates with workflow features:

#### `GITHUB_ACTIONS`

Automatically set by GitHub Actions to `"true"`.

When detected, the CLI:
- Outputs `::error::` and `::warning::` annotations for violations
- Writes detailed summaries to `$GITHUB_STEP_SUMMARY`
- Formats output for optimal GitHub UI integration

#### `GITHUB_STEP_SUMMARY`

Path to the step summary file (automatically set by GitHub Actions).

The CLI writes a comprehensive markdown summary including:
- Overall pass/fail status
- Count of passed, failed, and skipped checks
- Details of all violations with severity levels
- Affected file paths

## Exit Codes

The CLI uses standard exit codes to indicate different outcomes:

| Exit Code | Meaning | Description |
|-----------|---------|-------------|
| 0 | Success | All checks passed, or violations below `--fail-on` threshold |
| 1 | Violations | Constitutional violations at or above `--fail-on` threshold |
| 2 | Error | Execution error (config not found, engine crash, etc.) |

## GitHub Actions Integration

### Basic Workflow

```yaml
name: Constitutional Enforcement

on: [push, pull_request]

jobs:
  constitutional-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for Git metadata

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - run: pip install constitution-engine

      - run: |
          constitution-engine \
            --config .constitution.yaml \
            --fail-on high \
            --verbose
```

### Advanced Workflow Features

See `docs/examples/github-actions-workflow.yml` for a complete reference workflow with:

- Artifact uploads for results
- Continue-on-error pattern for capturing results
- Optional PR comments
- Custom failure handling

### Annotations

When running in GitHub Actions, violations automatically appear as annotations in:

- Pull request "Files changed" view
- Workflow run logs
- Commit checks

Annotation format:
- High/critical violations → `::error::` (red, block PR)
- Medium/low violations → `::warning::` (yellow, informational)

Example annotation:
```
::error file=src/myapp/views.py::[@CORE-MIGRATION-001] Dangerous migration detected: DROP TABLE in migration file
```

### Step Summaries

After each run, a detailed markdown summary is written to the job summary, including:

- ✅ Overall pass/fail status
- 📊 Statistics (passed, failed, errors, skipped)
- 📝 Detailed violation list with:
  - Severity indicator (🚨 critical, ❌ high, ⚠️ medium, ℹ️ low)
  - Rule identifier
  - Violation message
  - Affected file paths

## Examples

### Local Development

```bash
# Quick check with console output
constitution-engine

# Detailed check with JSON output for tools
constitution-engine --output json --verbose

# Check specific directory
constitution-engine --repo-path ../my-other-project

# Strict check (fail on any violation)
constitution-engine --fail-on low
```

### CI/CD Integration

```bash
# GitHub Actions (annotations enabled automatically)
constitution-engine --config .constitution.yaml --fail-on high

# GitLab CI (console output)
constitution-engine --output console --fail-on medium

# Jenkins (JSON output for parsing)
constitution-engine --output json --no-git

# Docker build (environment variables)
export CONSTITUTION_CONFIG=/app/constitution.yaml
export CONSTITUTION_FAIL_ON=critical
constitution-engine
```

### Output Formats

#### Console Output

```
Running constitutional checks...
✅ PASS: @CORE-SETTINGS-001 - Settings properly configured
❌ FAIL: @CORE-MIGRATION-001 - Dangerous migration detected
   Severity: HIGH
   Message: DROP TABLE found in migration file
   Files: src/myapp/migrations/0005_dangerous.py

Results: 15 passed, 1 failed, 0 errors
```

#### JSON Output

```json
[
  {
    "rule_identifier": "@CORE-SETTINGS-001",
    "status": "PASS",
    "severity": "HIGH",
    "message": "Settings properly configured",
    "affected_paths": []
  },
  {
    "rule_identifier": "@CORE-MIGRATION-001",
    "status": "FAIL",
    "severity": "HIGH",
    "message": "DROP TABLE found in migration file",
    "affected_paths": ["src/myapp/migrations/0005_dangerous.py"]
  }
]
```

## Troubleshooting

### "Configuration file not found"

**Problem**: CLI cannot find `.constitution.yaml`

**Solutions**:
- Specify config path: `--config path/to/constitution.yaml`
- Create config in repository root
- Use `CONSTITUTION_CONFIG` environment variable

### "Git not available"

**Problem**: Git adapter fails because Git is not installed

**Solutions**:
- Install Git: `apt-get install git` (Ubuntu) or `brew install git` (macOS)
- Use `--no-git` flag to disable Git metadata collection
- Ensure Git is in PATH

### Exit code 2 (error)

**Problem**: Engine crashes or encounters unexpected error

**Solutions**:
- Run with `--verbose` for detailed error logs
- Check configuration file syntax
- Verify repository path is correct
- Check permissions on repository files

### No annotations in GitHub Actions

**Problem**: Annotations not appearing in workflow

**Solutions**:
- Verify `GITHUB_ACTIONS=true` is set (automatic in GitHub)
- Check workflow has proper permissions
- Ensure CLI is outputting to stdout (not redirected)

## Python API

For programmatic use, import the CLI function directly:

```python
from constitution_engine.cli import cli

# Run with custom arguments
exit_code = cli(["--config", "test.yaml", "--verbose"])

# Integrate with your tooling
if exit_code == 0:
    print("All checks passed!")
elif exit_code == 1:
    print("Violations detected")
else:
    print("Error running checks")
```

## Further Reading

- [Configuration Guide](configuration.md) - How to write constitution files
- [Rule Writing Guide](rules.md) - Creating custom rules
- [GitHub Actions Reference](examples/github-actions-workflow.yml) - Complete workflow example
- [API Documentation](api.md) - Using the engine programmatically
