# Constitution Engine Testing

!!! note "Consolidated Documentation"
    General testing patterns and guidelines have been moved to the [Contributing: Testing](contributing/testing.md) guide.
    
    This page contains Constitution Engine-specific testing information.

## Quick Reference

```bash
# Run Constitution Engine tests
pytest tests/constitution_engine/

# Run with coverage
pytest tests/constitution_engine/ --cov=src/constitution_engine
```

## Test Structure

```
tests/constitution_engine/
├── test_cli.py                    # CLI end-to-end tests
├── test_reporter_discovery.py     # Reporter discovery tests
├── adapters/                      # Adapter tests
│   └── git/
│       └── test_adapter.py        # Git adapter tests
├── core/                          # Core engine tests
│   ├── test_config.py             # Configuration tests
│   ├── test_context.py            # Repository context tests
│   ├── test_engine.py             # Engine unit tests
│   ├── test_engine_integration.py # Integration tests
│   ├── test_errors.py             # Error handling tests
│   ├── test_plugins.py            # Plugin system tests
│   ├── test_rules.py              # Rule system tests
│   └── test_validators.py         # Validator tests
├── modules/                       # Module-specific tests
│   └── python/builtin/            # Built-in rule tests
├── reporters/                     # Reporter tests
│   ├── test_console.py            # Console reporter tests
│   └── test_json_reporter.py      # JSON reporter tests
└── fixtures/repos/                # Synthetic test repositories
```

## Module-Specific Fixtures

### Synthetic Repositories

Located in `tests/fixtures/repos/`:

- **basic/**: Minimal repository with Python and JavaScript files
  - Contains: `pyproject.toml`, `package.json`, `src/`, `tests/`
  - Use for: Basic file discovery and context building tests

### Configuration Profile Fixtures

```python
@pytest.fixture
def sample_config():
    """Sample configuration for testing."""
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

## Coverage Target

- **Minimum**: 75%
- **Current**: ~80%

See [Contributing: Testing](contributing/testing.md) for general testing patterns.

