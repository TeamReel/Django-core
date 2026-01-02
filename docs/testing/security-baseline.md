# Security Baseline Testing

!!! note "Consolidated Documentation"
    General testing patterns and guidelines have been moved to the [Contributing: Testing](contributing/testing.md) guide.

    This page contains Security Baseline-specific testing information.

## Quick Reference

```bash
# Run Security Baseline tests
pytest tests/security_baseline/

# Run with coverage (80% minimum)
pytest tests/security_baseline/ --cov=src/security_baseline --cov-fail-under=80
```

## Test Structure

```
tests/security_baseline/
├── conftest.py                       # Shared fixtures
├── ci/                               # CI scanning tests
│   ├── test_audit_config.py          # Django settings auditing
│   ├── test_scan_code.py             # Bandit static analysis
│   └── test_scan_dependencies.py     # pip-audit dependency scanning
├── config/                           # Configuration tests
│   └── test_exemptions.py            # Rule exemption mechanism
├── integration/                      # Integration tests
│   ├── test_enforcement_modes.py     # Enforcement mode behavior
│   ├── test_manifest_loading.py      # Manifest file loading
│   └── test_startup_*.py             # Django startup integration
├── loader_mapper_tests/              # Loader and mapper tests
├── reports/                          # Reporting tests
├── rules/                            # Security rule tests
└── validators/                       # Validator tests
```

## Module-Specific Fixtures

### Django Settings Fixtures

```python
@pytest.fixture
def mock_django_settings():
    """Secure Django settings for testing compliant configurations."""
    return {"DEBUG": False, "SECRET_KEY": "secure-random-key", ...}

@pytest.fixture
def mock_insecure_django_settings():
    """Insecure settings for testing violation detection."""
    return {"DEBUG": True, "SECRET_KEY": "insecure", ...}

@pytest.fixture
def mock_production_settings():
    """Production-grade settings for production validation."""
    ...
```

### Rule Testing Pattern

```python
def test_rule_violation_detected(mock_insecure_django_settings):
    # Arrange
    rule = DebugModeProductionRule()

    # Act
    violation = rule.validate(mock_insecure_django_settings, "production")

    # Assert
    assert violation is not None
    assert violation.rule_id == "SEC001-DEBUG-MODE"
    assert violation.severity == "CRITICAL"
```

### Parametrized Security Rules

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

## Coverage Target

- **Minimum**: 80% (SC-008 requirement)
- **Current**: 86%+

See [Contributing: Testing](contributing/testing.md) for general testing patterns.
