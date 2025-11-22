# Testing Guide

## Overview

The Constitutional Enforcement Engine has a comprehensive test suite covering unit tests, integration tests, and end-to-end tests. This guide explains how to run tests, write new tests, and maintain test quality.

## Test Structure

```
tests/
├── constitution_engine/         # Main test directory
│   ├── test_cli.py             # CLI end-to-end tests
│   ├── test_reporter_discovery.py  # Reporter discovery tests
│   ├── adapters/               # Adapter tests
│   │   └── git/
│   │       └── test_adapter.py # Git adapter tests
│   ├── core/                   # Core engine tests
│   │   ├── test_config.py      # Configuration tests
│   │   ├── test_context.py     # Repository context tests
│   │   ├── test_engine.py      # Engine unit tests
│   │   ├── test_engine_integration.py  # Integration tests
│   │   ├── test_errors.py      # Error handling tests
│   │   ├── test_plugins.py     # Plugin system tests
│   │   ├── test_rules.py       # Rule system tests
│   │   └── test_validators.py  # Validator tests
│   ├── modules/                # Module-specific tests
│   │   └── python/
│   │       └── builtin/        # Built-in rule tests
│   └── reporters/              # Reporter tests
│       ├── test_console.py     # Console reporter tests
│       └── test_json_reporter.py  # JSON reporter tests
├── fixtures/                   # Test fixtures and data
│   └── repos/                  # Synthetic repositories for testing
│       └── basic/              # Basic test repository
└── conftest.py                 # Shared pytest fixtures
```

## Running Tests

### Run All Tests

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run quietly (minimal output)
pytest -q
```

### Run Specific Test Files

```bash
# Run CLI tests
pytest tests/constitution_engine/test_cli.py

# Run core engine tests
pytest tests/constitution_engine/core/

# Run integration tests only
pytest tests/constitution_engine/core/test_engine_integration.py
```

### Run Specific Tests

```bash
# Run a specific test function
pytest tests/constitution_engine/test_cli.py::TestCLIEndToEnd::test_cli_help

# Run tests matching a pattern
pytest -k "test_cli"

# Run tests by marker (if defined)
pytest -m integration
```

### Run with Coverage

```bash
# Run tests with coverage
pytest --cov=src/constitution_engine

# Show missing lines
pytest --cov=src/constitution_engine --cov-report=term-missing

# Generate HTML coverage report
pytest --cov=src/constitution_engine --cov-report=html

# Open HTML report (browser will open htmlcov/index.html)
# Windows:
start htmlcov/index.html
# macOS:
open htmlcov/index.html
# Linux:
xdg-open htmlcov/index.html
```

## Coverage Requirements

The project maintains a **75% minimum coverage threshold** configured in `pyproject.toml`:

```toml
[tool.coverage.report]
fail_under = 75
show_missing = true
skip_covered = false
```

Current coverage status:
- **Overall**: ~80%
- **Core engine**: ~85%
- **Reporters**: ~99%
- **CLI**: ~65% (with annotations path not tested in unit tests)

## Test Categories

### Unit Tests

**Purpose**: Test individual components in isolation

**Location**: Most files in `tests/constitution_engine/`

**Characteristics**:
- Fast execution
- No external dependencies
- Mock external calls
- Focus on single function/class

**Example**:
```python
def test_check_result_creation():
    """Test CheckResult dataclass creation."""
    result = CheckResult(
        rule_identifier="TEST-001",
        status=CheckStatus.PASS,
        severity=Severity.HIGH,
        message="Test passed",
    )
    assert result.status == CheckStatus.PASS
    assert result.severity == Severity.HIGH
```

### Integration Tests

**Purpose**: Test component interactions

**Location**: `tests/constitution_engine/core/test_engine_integration.py`

**Characteristics**:
- Test multiple components together
- Use real filesystem operations
- May use temporary directories
- Validate end-to-end flows

**Example**:
```python
def test_engine_with_valid_config_and_passing_rules(tmp_path):
    """Test engine pipeline with valid configuration."""
    # Create test repository
    req_file = tmp_path / "requirements.txt"
    req_file.write_text("django==4.2.0\n")
    
    # Configure engine
    config = ConfigurationProfile(enabled_rules=["..."])
    context = RepositoryContext(root_path=tmp_path)
    
    # Run engine
    engine = Engine(config=config, context=context)
    results = engine.run()
    
    # Verify results
    assert all(r.status == CheckStatus.PASS for r in results)
```

### End-to-End (E2E) Tests

**Purpose**: Test complete user workflows

**Location**: `tests/constitution_engine/test_cli.py`

**Characteristics**:
- Test from user perspective
- Use CLI interface
- Test subprocess execution
- Validate exit codes and output

**Example**:
```python
def test_cli_with_config_file(tmp_path):
    """Test CLI with configuration file."""
    config = tmp_path / "constitution.yaml"
    config.write_text("version: 1\nrules: []\n")
    
    result = cli([
        "--config", str(config),
        "--repo-path", str(tmp_path),
        "--no-git"
    ])
    
    assert result == 0
```

## Writing New Tests

### Test File Naming

- Test files: `test_<module>.py`
- Test classes: `Test<Feature>`
- Test functions: `test_<behavior>`

### Test Organization

```python
"""
Module docstring explaining what is being tested.
"""

import pytest
from constitution_engine.core import ...


class TestFeatureName:
    """Test suite for FeatureName."""
    
    def test_normal_case(self):
        """Test normal behavior."""
        # Arrange
        ...
        
        # Act
        ...
        
        # Assert
        ...
    
    def test_edge_case(self):
        """Test edge case behavior."""
        ...
    
    def test_error_case(self):
        """Test error handling."""
        with pytest.raises(ExpectedError):
            ...
```

### Using Fixtures

#### Temporary Directories

```python
def test_with_temp_dir(tmp_path):
    """Test using temporary directory."""
    # tmp_path is a pathlib.Path
    test_file = tmp_path / "test.txt"
    test_file.write_text("content")
    assert test_file.read_text() == "content"
```

#### Custom Fixtures

Define in `conftest.py`:

```python
import pytest


@pytest.fixture
def sample_config():
    """Provide a sample configuration."""
    return ConfigurationProfile(
        enabled_rules=["rule1", "rule2"]
    )


@pytest.fixture
def sample_repository(tmp_path):
    """Create a sample repository structure."""
    (tmp_path / "src").mkdir()
    (tmp_path / "tests").mkdir()
    (tmp_path / "README.md").write_text("# Test Repo")
    return tmp_path
```

### Mocking External Calls

```python
from unittest.mock import Mock, patch


def test_with_mock():
    """Test with mocked subprocess."""
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = Mock(
            returncode=0,
            stdout="success"
        )
        
        result = function_that_calls_subprocess()
        
        assert result == "success"
        mock_run.assert_called_once()
```

### Parametrized Tests

```python
import pytest


@pytest.mark.parametrize("input,expected", [
    ("low", Severity.LOW),
    ("medium", Severity.MEDIUM),
    ("high", Severity.HIGH),
    ("critical", Severity.CRITICAL),
])
def test_severity_parsing(input, expected):
    """Test severity string parsing."""
    assert parse_severity(input) == expected
```

## Test Fixtures and Data

### Synthetic Repositories

Located in `tests/fixtures/repos/`:

- **basic/**: Minimal repository with Python and JavaScript files
  - Contains: `pyproject.toml`, `package.json`, `src/`, `tests/`
  - Use for: Basic file discovery and context building tests

To add new fixture repositories:

1. Create directory under `tests/fixtures/repos/<name>/`
2. Add necessary files (code, configs, etc.)
3. Document the fixture purpose in a README
4. Reference in tests via `Path(__file__).parent / "fixtures/repos/<name>"`

### Test Data Files

For test data files (configs, expected output, etc.):

```python
import json
from pathlib import Path


def load_test_data(filename):
    """Load test data from fixtures."""
    fixtures_dir = Path(__file__).parent / "fixtures"
    with open(fixtures_dir / filename) as f:
        return json.load(f)


def test_with_fixture_data():
    """Test using fixture data."""
    data = load_test_data("sample_config.json")
    result = process_config(data)
    assert result.is_valid
```

## Continuous Integration

### GitHub Actions

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests
- Manual workflow dispatch

See `.github/workflows/test.yml` (or equivalent) for CI configuration.

### Pre-commit Hooks

Tests can be run before commits using pre-commit:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: pytest
        name: pytest
        entry: pytest
        language: system
        types: [python]
        pass_filenames: false
```

Enable with:
```bash
pre-commit install
```

## Debugging Tests

### Run with Debug Output

```bash
# Show print statements
pytest -s

# Show locals on failure
pytest -l

# Drop into debugger on failure
pytest --pdb

# More verbose output
pytest -vv
```

### Debug Specific Test

```python
def test_feature():
    """Test with debugging."""
    result = complex_function()
    
    # Add breakpoint
    breakpoint()  # Python 3.7+
    # Or:
    import pdb; pdb.set_trace()  # Earlier versions
    
    assert result == expected
```

### Check Test Discovery

```bash
# See what tests pytest finds
pytest --collect-only

# See why a test is not collected
pytest --collect-only -v
```

## Common Issues and Solutions

### Issue: Import Errors

**Problem**: `ModuleNotFoundError: No module named 'constitution_engine'`

**Solution**: Install package in editable mode
```bash
pip install -e .
```

### Issue: Slow Tests

**Problem**: Tests take too long to run

**Solution**:
- Run specific test files instead of full suite
- Use `pytest-xdist` for parallel execution:
  ```bash
  pip install pytest-xdist
  pytest -n auto
  ```

### Issue: Flaky Tests

**Problem**: Tests pass/fail inconsistently

**Solution**:
- Check for race conditions or timing issues
- Ensure proper test isolation
- Use fixed random seeds if needed:
  ```python
  import random
  random.seed(42)
  ```

### Issue: Coverage Not Updating

**Problem**: Coverage report shows old data

**Solution**: Clear coverage cache
```bash
rm .coverage
rm -rf htmlcov/
pytest --cov=src/constitution_engine
```

## Best Practices

### Test Naming

- **Good**: `test_engine_fails_on_invalid_config`
- **Bad**: `test_1`, `test_engine`

### Test Assertions

- **Good**: `assert result.status == CheckStatus.PASS`
- **Bad**: `assert result.status == "pass"`  # Use enums

### Test Data

- **Good**: Create minimal data needed for test
- **Bad**: Reuse large, complex fixtures across unrelated tests

### Test Independence

- **Good**: Each test sets up its own data
- **Bad**: Tests depend on execution order

### Test Coverage

- **Good**: Test normal cases, edge cases, and error cases
- **Bad**: Only test happy path

## Resources

- [pytest Documentation](https://docs.pytest.org/)
- [pytest-cov Documentation](https://pytest-cov.readthedocs.io/)
- [Python unittest.mock Documentation](https://docs.python.org/3/library/unittest.mock.html)
- [Testing Best Practices](https://docs.python-guide.org/writing/tests/)

## Summary

- Run tests with `pytest`
- Maintain 75%+ coverage
- Use appropriate test type (unit/integration/e2e)
- Follow naming conventions
- Keep tests isolated and independent
- Use fixtures for reusable test data
- Mock external dependencies
- Debug with `-s`, `-l`, or `--pdb` flags
