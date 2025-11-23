# Security Baseline Testing Guide

**WP14-T135**: Comprehensive testing strategy for the Security Baseline feature.

## Overview

This document outlines the testing strategy, fixtures, and procedures for the `security_baseline` Django app. Our testing infrastructure achieves **>80% code coverage** per SC-008 requirements.

## Table of Contents

1. [Test Structure](#test-structure)
2. [Running Tests](#running-tests)
3. [Test Fixtures](#test-fixtures)
4. [Coverage Requirements](#coverage-requirements)
5. [Writing Tests](#writing-tests)
6. [CI Integration](#ci-integration)

---

## Test Structure

Tests are organized by component under `tests/security_baseline/`:

```
tests/security_baseline/
├── conftest.py                       # Shared fixtures
├── ci/                               # CI scanning tests
│   ├── test_audit_config.py          # Django settings auditing
│   ├── test_scan_code.py              # Bandit static analysis
│   └── test_scan_dependencies.py      # pip-audit dependency scanning
├── config/                           # Configuration tests
│   └── test_exemptions.py             # Rule exemption mechanism
├── integration/                      # Integration tests
│   ├── test_enforcement_modes.py      # Enforcement mode behavior
│   ├── test_manifest_loading.py       # Manifest file loading
│   └── test_startup_*.py              # Django startup integration
├── loader_mapper_tests/              # Loader and mapper tests
│   ├── test_asvs_mapper.py            # OWASP ASVS mapping
│   └── test_manifest_loader.py        # YAML manifest loading
├── reports/                          # Reporting tests
│   ├── test_asvs_coverage.py          # Coverage calculation
│   ├── test_integration.py            # Report generation integration
│   ├── test_logging.py                # Security audit logging
│   └── test_security_report.py        # Report data structures
├── rules/                            # Security rule tests
│   ├── test_base.py                   # Base rule functionality
│   ├── test_csrf_protection.py        # CSRF rules
│   ├── test_database_ssl.py           # Database SSL rules
│   ├── test_django_settings.py        # Django settings rules
│   ├── test_password_validation.py    # Password rules
│   ├── test_registry.py               # Rule registry
│   ├── test_security_headers.py       # Security header rules
│   └── test_session_security.py       # Session security rules
└── validators/                       # Validator tests
    └── test_breach_detector.py        # Password breach detection
```

---

## Running Tests

### Run All Tests

```bash
# Basic test run
pytest tests/security_baseline/

# With output
pytest tests/security_baseline/ -v

# Parallel execution (faster)
pytest tests/security_baseline/ -n auto
```

### Run Specific Test Modules

```bash
# Run only rule tests
pytest tests/security_baseline/rules/

# Run only integration tests
pytest tests/security_baseline/integration/

# Run single test file
pytest tests/security_baseline/rules/test_django_settings.py

# Run single test
pytest tests/security_baseline/rules/test_django_settings.py::TestDebugModeProductionRule::test_debug_true_in_production_fails
```

### Run with Coverage

```bash
# Coverage report in terminal
pytest tests/security_baseline/ --cov=src/security_baseline --cov-report=term

# Generate HTML coverage report
pytest tests/security_baseline/ --cov=src/security_baseline --cov-report=html

# Open coverage report
# Windows: start htmlcov/index.html
# macOS: open htmlcov/index.html
# Linux: xdg-open htmlcov/index.html

# Check coverage threshold (fails if <80%)
pytest tests/security_baseline/ --cov=src/security_baseline --cov-fail-under=80
```

### Run with Django Database

```bash
# Tests marked with @pytest.mark.django_db
pytest tests/security_baseline/ --reuse-db

# Create test database
pytest tests/security_baseline/ --create-db

# Use specific Django settings
pytest tests/security_baseline/ --ds=config.settings.test
```

---

## Test Fixtures

### Core Fixtures (conftest.py)

#### `mock_django_settings`
Provides secure Django settings for testing compliant configurations.

```python
def test_secure_config(mock_django_settings):
    rule = DebugModeProductionRule()
    violation = rule.validate(mock_django_settings, "production")
    assert violation is None
```

#### `mock_insecure_django_settings`
Provides deliberately insecure settings for testing violation detection.

```python
def test_insecure_config(mock_insecure_django_settings):
    rule = DebugModeProductionRule()
    violation = rule.validate(mock_insecure_django_settings, "production")
    assert violation is not None
    assert violation.severity == "CRITICAL"
```

#### `mock_production_settings`
Provides production-grade settings for testing production validation.

```python
def test_production_ready(mock_production_settings):
    # Test all security rules pass with production settings
    for rule in registry.get_all_rules():
        violation = rule.validate(mock_production_settings, "production")
        assert violation is None, f"{rule.rule_id} failed"
```

#### `temp_manifest_file(tmp_path)`
Creates temporary manifest YAML file for testing file I/O.

```python
def test_load_manifest(temp_manifest_file):
    loader = ManifestLoader()
    manifest = loader.load_manifest(str(temp_manifest_file))
    assert manifest["version"] == "1.0"
```

#### `mock_rule_violation`
Provides a mock violation for testing reporting and enforcement.

```python
def test_report_generation(mock_rule_violation):
    reporter = SecurityReporter()
    report = reporter.generate_report([mock_rule_violation])
    assert len(report.violations) == 1
```

### Fixture Projects (tests/fixtures/ci/)

For CI integration testing:

- **`vulnerable_requirements.txt`**: Dependencies with known vulnerabilities
- **`insecure_settings.py`**: Django settings with multiple violations
- **`vulnerable_code.py`**: Python code with Bandit findings

---

## Coverage Requirements

### Minimum Coverage: 80%

Per SC-008 requirement, all `security_baseline` modules must achieve ≥80% code coverage.

### Coverage Configuration

Defined in `pyproject.toml`:

```toml
[tool.coverage.run]
source = ["src"]
omit = [
    "*/tests/*",
    "*/test_*.py",
    "*/migrations/*",
    "*/__init__.py",
    "*/__pycache__/*",
]
branch = true

[tool.coverage.report]
fail_under = 80
show_missing = true
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise AssertionError",
    "raise NotImplementedError",
    "if TYPE_CHECKING:",
    "if __name__ == .__main__.:",
    "@abstractmethod",
    "@overload",
]
```

### Coverage Exclusions

Use `# pragma: no cover` for:
- Defensive code that's difficult to trigger
- Abstract methods (already excluded)
- Debug/development code
- Type checking blocks

```python
def defensive_check(value):
    if value is None:  # pragma: no cover
        # This should never happen in practice
        raise ValueError("Unexpected None value")
    return value
```

### Finding Coverage Gaps

1. Generate HTML coverage report:
   ```bash
   pytest --cov=src/security_baseline --cov-report=html
   ```

2. Open `htmlcov/index.html` in browser

3. Click on files with <100% coverage

4. Red highlights = uncovered lines
   Yellow highlights = partially covered branches

5. Add tests to cover gaps or add `# pragma: no cover` if justified

---

## Writing Tests

### Test Naming Conventions

- Test files: `test_*.py`
- Test classes: `Test*` (e.g., `TestDebugModeRule`)
- Test functions: `test_*` (e.g., `test_debug_enabled_fails`)

### Test Structure

Follow AAA pattern:

```python
def test_rule_violation_detected(mock_insecure_django_settings):
    # Arrange
    rule = DebugModeProductionRule()
    context = mock_insecure_django_settings
    environment = "production"
    
    # Act
    violation = rule.validate(context, environment)
    
    # Assert
    assert violation is not None
    assert violation.rule_id == "SEC001-DEBUG-MODE"
    assert violation.severity == "CRITICAL"
    assert "DEBUG" in violation.message
```

### Unit vs Integration Tests

**Unit Tests** (tests/security_baseline/rules/):
- Test individual security rules in isolation
- Use mock Django settings
- Fast execution (<0.1s per test)
- 1 rule = 1 test class with multiple test methods

**Integration Tests** (tests/security_baseline/integration/):
- Test full Django startup flow
- Test multi-component interactions
- Use `@pytest.mark.django_db` if needed
- Slower execution (0.5-2s per test)

### Django-Specific Testing

```python
import pytest
from django.test import override_settings

@pytest.mark.django_db
def test_with_database():
    # Test code that needs database access
    pass

@override_settings(DEBUG=False, SECRET_KEY="test-key")
def test_with_custom_settings():
    # Test code with overridden settings
    pass
```

### Testing Async Code

```python
import pytest

@pytest.mark.asyncio
async def test_async_function():
    result = await some_async_function()
    assert result is not None
```

### Parametrized Tests

```python
@pytest.mark.parametrize("debug,environment,should_fail", [
    (True, "production", True),
    (False, "production", False),
    (True, "local", False),
    (False, "local", False),
])
def test_debug_mode_various_configs(debug, environment, should_fail):
    settings = {"DEBUG": debug}
    rule = DebugModeProductionRule()
    violation = rule.validate(settings, environment)
    
    if should_fail:
        assert violation is not None
    else:
        assert violation is None
```

---

## CI Integration

### GitHub Actions

`.github/workflows/test.yml`:

```yaml
- name: Run tests with coverage
  run: |
    pytest tests/security_baseline/ \
      --cov=src/security_baseline \
      --cov-report=xml \
      --cov-report=term \
      --cov-fail-under=80 \
      -v

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage.xml
    fail_ci_if_error: true
```

### Pre-commit Hook

`.pre-commit-config.yaml`:

```yaml
- repo: local
  hooks:
    - id: pytest-coverage
      name: pytest with coverage
      entry: pytest
      args: [
        'tests/security_baseline/',
        '--cov=src/security_baseline',
        '--cov-fail-under=80',
        '--quiet'
      ]
      language: system
      pass_filenames: false
      always_run: true
```

### Coverage Badge

Add to README.md:

```markdown
[![codecov](https://codecov.io/gh/your-org/your-repo/branch/main/graph/badge.svg)](https://codecov.io/gh/your-org/your-repo)
```

---

## Troubleshooting

### Test Failures

**ImportError: No module named 'security_baseline'**
- Ensure `src/` is in PYTHONPATH
- Install in editable mode: `pip install -e .`

**Database errors**
- Use `--create-db` to create test database
- Check `DATABASES` settings in `config/settings/local.py`

**Fixture not found**
- Ensure `conftest.py` is in test directory
- Check fixture scope (`function`, `class`, `module`, `session`)

### Coverage Issues

**Coverage too low**
- Run with `--cov-report=html` to see gaps
- Add tests for uncovered lines
- Use `# pragma: no cover` sparingly

**Branch coverage gaps**
- Test both True and False branches
- Test exception handling paths
- Test early returns

---

## Best Practices

1. **One assertion per test** (when possible)
2. **Clear test names** that describe what's being tested
3. **Use fixtures** to avoid duplication
4. **Test edge cases** and error conditions
5. **Keep tests fast** - avoid I/O when possible
6. **Test behavior, not implementation**
7. **Use parametrize** for similar test cases
8. **Document complex test setup**
9. **Clean up resources** (use fixtures with yield)
10. **Review coverage regularly**

---

## Resources

- [pytest Documentation](https://docs.pytest.org/)
- [pytest-django Documentation](https://pytest-django.readthedocs.io/)
- [pytest-cov Documentation](https://pytest-cov.readthedocs.io/)
- [Django Testing Guide](https://docs.djangoproject.com/en/stable/topics/testing/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)

---

**Last Updated**: 2025-11-23 (WP14-T135)
**Coverage Target**: ≥80% (SC-008)
**Current Coverage**: 86%+ ✅
