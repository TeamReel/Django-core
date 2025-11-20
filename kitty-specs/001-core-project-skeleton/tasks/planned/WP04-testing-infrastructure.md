# Work Package WP04: Testing Infrastructure

**Status**: Planned  
**Priority**: P0 (Must Have)  
**Feature**: 001-core-project-skeleton  
**User Stories**: US-003 (Quality Gates)

---

## Goal

Set up pytest-django testing framework with smoke tests and coverage reporting. This work package establishes the testing foundation that validates skeleton configuration without domain logic tests.

---

## Constitutional Alignment

- **Principle IV (Testing)**: pytest + pytest-django mandatory, deterministic tests, coverage thresholds, fast feedback

---

## Subtasks

### T020: Create tests directory structure
**Description**: Create tests/ directory with __init__.py and subdirectories

**Implementation Guidance**:
- Create directory: `New-Item -ItemType Directory -Path "tests"`
- Create __init__.py: `New-Item -ItemType File -Path "tests\__init__.py"`
- Add docstring to __init__.py explaining test organization

**Definition of Done**:
- [ ] tests/ directory exists at project root
- [ ] tests/__init__.py exists
- [ ] Docstring explains test organization

---

### T021: Configure pytest in pyproject.toml
**Description**: Add pytest configuration section to pyproject.toml

**Implementation Guidance**:
- Add [tool.pytest.ini_options] section to pyproject.toml
- Set DJANGO_SETTINGS_MODULE = "config.settings.local"
- Set python_files, python_classes, python_functions patterns
- Enable --reuse-db for speed
- Configure addopts: -v, --tb=short, --strict-markers
- Set testpaths = ["tests"]

**Definition of Done**:
- [ ] [tool.pytest.ini_options] section exists in pyproject.toml
- [ ] DJANGO_SETTINGS_MODULE configured
- [ ] --reuse-db enabled
- [ ] testpaths set to tests/
- [ ] Verbose output enabled

**Example**:
```toml
[tool.pytest.ini_options]
DJANGO_SETTINGS_MODULE = "config.settings.local"
python_files = ["test_*.py", "*_test.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
testpaths = ["tests"]
addopts = "-v --tb=short --strict-markers --reuse-db"
```

---

### T022: Create conftest.py
**Description**: Create tests/conftest.py with pytest-django fixtures

**Implementation Guidance**:
- Create tests/conftest.py
- Import pytest
- Add docstring explaining fixture purpose
- Create client fixture (pytest-django provides this automatically)
- Create settings fixture for accessing Django settings
- Add any common test data fixtures (minimal for skeleton)

**Definition of Done**:
- [ ] tests/conftest.py exists
- [ ] File imports pytest
- [ ] Docstring explains fixtures
- [ ] Settings fixture available

**Example**:
```python
"""
Pytest fixtures for Django Core-App skeleton tests.

Provides shared fixtures for testing skeleton configuration.
Domain-specific fixtures will be added as features are implemented.
"""
import pytest
from django.conf import settings


@pytest.fixture
def django_settings():
    """Provide access to Django settings for tests."""
    return settings
```

---

### T023: Implement test_health.py [PARALLEL]
**Description**: Create tests/test_health.py with health check endpoint tests

**Implementation Guidance**:
- Create tests/test_health.py
- Import pytest
- Use pytest-django's client fixture
- Test GET /health/ returns 200
- Test response is JSON
- Test response contains "status": "healthy"
- Test response contains "timestamp"
- Test timestamp is valid ISO 8601 format
- Test response time < 100ms (if possible with pytest-benchmark or simple timing)

**Definition of Done**:
- [ ] tests/test_health.py exists
- [ ] Tests use pytest-django client fixture
- [ ] Test status code 200
- [ ] Test JSON response structure
- [ ] Test response contains expected keys
- [ ] All tests pass

**Example**:
```python
"""Tests for health check endpoint."""
import pytest
from datetime import datetime


@pytest.mark.django_db
def test_health_check_returns_200(client):
    """Health check endpoint returns HTTP 200."""
    response = client.get('/health/')
    assert response.status_code == 200


@pytest.mark.django_db
def test_health_check_returns_json(client):
    """Health check endpoint returns JSON response."""
    response = client.get('/health/')
    assert response['Content-Type'] == 'application/json'


@pytest.mark.django_db
def test_health_check_response_structure(client):
    """Health check response contains required fields."""
    response = client.get('/health/')
    data = response.json()
    
    assert 'status' in data
    assert 'timestamp' in data
    assert data['status'] == 'healthy'


@pytest.mark.django_db
def test_health_check_timestamp_valid(client):
    """Health check timestamp is valid ISO 8601 format."""
    response = client.get('/health/')
    data = response.json()
    
    # Validate timestamp can be parsed
    timestamp = data['timestamp']
    datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
```

---

### T024: Implement test_settings.py [PARALLEL]
**Description**: Create tests/test_settings.py with settings validation tests

**Implementation Guidance**:
- Create tests/test_settings.py
- Import pytest and Django settings
- Test INSTALLED_APPS contains required apps (rest_framework, etc.)
- Test REST_FRAMEWORK configuration exists
- Test LOGGING configuration exists
- Test MIDDLEWARE contains SecurityMiddleware
- Test SECRET_KEY is set (but don't expose value)
- Test DEBUG value is boolean

**Definition of Done**:
- [ ] tests/test_settings.py exists
- [ ] Tests validate INSTALLED_APPS
- [ ] Tests validate REST_FRAMEWORK config
- [ ] Tests validate LOGGING config
- [ ] Tests validate MIDDLEWARE
- [ ] All tests pass

**Example**:
```python
"""Tests for Django settings configuration."""
import pytest
from django.conf import settings


def test_required_apps_installed():
    """Required Django apps are in INSTALLED_APPS."""
    required_apps = [
        'django.contrib.admin',
        'django.contrib.auth',
        'django.contrib.contenttypes',
        'rest_framework',
    ]
    
    for app in required_apps:
        assert app in settings.INSTALLED_APPS


def test_rest_framework_configured():
    """REST Framework settings are configured."""
    assert hasattr(settings, 'REST_FRAMEWORK')
    assert 'DEFAULT_PAGINATION_CLASS' in settings.REST_FRAMEWORK
    assert settings.REST_FRAMEWORK['PAGE_SIZE'] == 20


def test_logging_configured():
    """Logging configuration exists."""
    assert hasattr(settings, 'LOGGING')
    assert 'version' in settings.LOGGING
    assert settings.LOGGING['version'] == 1


def test_security_middleware_enabled():
    """SecurityMiddleware is in MIDDLEWARE."""
    assert 'django.middleware.security.SecurityMiddleware' in settings.MIDDLEWARE


def test_secret_key_set():
    """SECRET_KEY is configured."""
    assert hasattr(settings, 'SECRET_KEY')
    assert len(settings.SECRET_KEY) > 0


def test_debug_is_boolean():
    """DEBUG setting is a boolean."""
    assert isinstance(settings.DEBUG, bool)
```

---

### T025: Configure coverage
**Description**: Add coverage configuration to pyproject.toml

**Implementation Guidance**:
- Add [tool.coverage.run] section to pyproject.toml
- Set source = ["src"]
- Set omit patterns: ["*/tests/*", "*/migrations/*", "*/__init__.py"]
- Add [tool.coverage.report] section
- Set fail_under = 80 (minimum threshold)
- Set show_missing = true
- Set skip_covered = false
- Add [tool.coverage.html] section for HTML reports

**Definition of Done**:
- [ ] [tool.coverage.run] section exists
- [ ] source set to src/
- [ ] Appropriate omit patterns configured
- [ ] [tool.coverage.report] section exists
- [ ] fail_under threshold set to 80
- [ ] HTML report directory configured

**Example**:
```toml
[tool.coverage.run]
source = ["src"]
omit = [
    "*/tests/*",
    "*/migrations/*",
    "*/__init__.py",
]

[tool.coverage.report]
fail_under = 80
show_missing = true
skip_covered = false
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise AssertionError",
    "raise NotImplementedError",
]

[tool.coverage.html]
directory = "htmlcov"
```

---

## Independent Test

**Test Name**: Verify pytest runs successfully with coverage

**Test Steps**:
1. Install test dependencies:
   - Ensure requirements/local.txt installed
   - Verify pytest and pytest-django available

2. Run pytest:
   - Run: `pytest`
   - Expected: All tests pass
   - Expected: < 5 seconds total execution time

3. Run pytest with coverage:
   - Run: `pytest --cov=src --cov-report=html --cov-report=term`
   - Expected: Coverage report generated
   - Expected: Coverage > 80%

4. Check HTML coverage report:
   - Open: `htmlcov/index.html`
   - Verify src/ modules listed with coverage percentages

5. Test with verbose output:
   - Run: `pytest -vv`
   - Expected: Detailed test output showing all assertions

**Expected Results**:
- All tests pass (green)
- Test execution < 5 seconds (SC-008)
- Coverage > 80% (SC-010)
- HTML report generated
- No test warnings or errors

---

## Implementation Notes

### Test Organization
- tests/ at project root (not inside src/)
- Mirror src/ structure if needed (e.g., tests/test_common/, tests/test_config/)
- Use test_ prefix for all test files and functions
- Use Test prefix for test classes

### pytest-django Features
- @pytest.mark.django_db decorator for database access
- client fixture for HTTP testing
- settings fixture for configuration testing
- --reuse-db flag for speed (doesn't recreate DB each run)

### Coverage Strategy
- Target 80% minimum for skeleton (can increase later)
- Exclude migrations, __init__.py, test files
- Focus on src/ directory
- HTML reports for detailed analysis

### Test Speed
- Keep tests fast (< 5 seconds total for skeleton)
- Use --reuse-db to avoid database recreation
- No external dependencies in tests
- Minimal fixtures (skeleton phase)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Tests fail on fresh setup | High | Ensure tests are deterministic, no external dependencies |
| Coverage below 80% | Medium | Add more smoke tests for uncovered modules |
| Tests too slow | Low | Use --reuse-db, keep tests simple |
| pytest configuration conflicts | Low | Follow pytest-django best practices |

---

## Reviewer Guidance

### Code Review Checklist
- [ ] tests/ directory structure correct
- [ ] pytest configuration in pyproject.toml complete
- [ ] conftest.py provides useful fixtures
- [ ] test_health.py covers all health check scenarios
- [ ] test_settings.py validates critical settings
- [ ] Coverage configuration targets src/ directory
- [ ] All test files use pytest style (not unittest)

### Testing Checklist
- [ ] `pytest` runs without errors
- [ ] All tests pass
- [ ] Test execution < 5 seconds
- [ ] `pytest --cov=src` generates coverage report
- [ ] Coverage > 80%
- [ ] HTML coverage report accessible
- [ ] No warnings in pytest output

### Manual Test Commands
```powershell
# Run tests
pytest

# Run with verbose output
pytest -vv

# Run with coverage
pytest --cov=src --cov-report=html --cov-report=term

# Run specific test file
pytest tests/test_health.py -v

# Check coverage threshold
pytest --cov=src --cov-fail-under=80
```

---

## Success Criteria Mapping

- **SC-008**: Tests execute in < 5 seconds → Fast smoke tests
- **SC-010**: Test coverage > 80% → Coverage configuration enforces this
- **FR-015**: pytest + pytest-django configured → pyproject.toml configuration
- **FR-016**: Tests for core configuration → test_settings.py
- **FR-017**: Smoke tests → test_health.py

---

## Dependencies

**Prerequisites**: 
- WP02 (Settings) - Tests need Django settings configured
- WP03 (Health Check) - Tests verify health endpoint

**Enables**:
- WP05 (Code Quality) - Tests validate tool configurations work
- WP08 (Validation) - Run tests as part of validation

---

> This work package establishes testing foundation with fast, deterministic smoke tests. Domain logic tests will be added in future features.
