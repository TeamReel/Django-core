# Research: Core Project Skeleton
*Path: [kitty-specs/001-core-project-skeleton/research.md](kitty-specs/001-core-project-skeleton/research.md)*

**Feature**: Core Project Skeleton  
**Date**: 2025-11-20  
**Status**: Complete

## Research Questions and Findings

### 1. Django Project Layout: src/ vs Traditional

**Decision**: Use src/ layout with Django project in `src/config/`

**Rationale**:
- Clearer separation between source code and project metadata
- Prevents accidental imports of top-level files
- Aligns with modern Python packaging best practices
- Makes testing isolation clearer (tests/ separate from src/)
- Supports future package distribution if needed

**Alternatives Considered**:
- **Traditional layout** (project at root): Rejected because it mixes configuration files with code, makes namespace management harder
- **Nested src/django_core/** structure: Rejected as overly complex for a single Django project

**References**:
- Python Packaging Authority: https://packaging.python.org/en/latest/discussions/src-layout-vs-flat-layout/
- Django best practices accept both, but src/ provides better isolation

---

### 2. Environment Configuration Management

**Decision**: Use django-environ with DATABASE_URL pattern

**Rationale**:
- Twelve-factor app compliance (config in environment)
- Simple DATABASE_URL string for database configuration
- Type coercion for environment variables (booleans, lists, etc.)
- Widely adopted Django community standard
- Supports .env files for local development

**Alternatives Considered**:
- **python-decouple**: Similar functionality, less Django-specific
- **django-configurations**: More complex class-based settings (overkill for skeleton)
- **Manual os.environ**: More boilerplate, no type coercion

**Implementation**:
```python
import environ

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, []),
)

# Read .env file if it exists
environ.Env.read_env()

DEBUG = env('DEBUG')
SECRET_KEY = env('SECRET_KEY')
DATABASE_URL = env('DATABASE_URL', default='sqlite:///db.sqlite3')
```

---

### 3. Settings Module Organization

**Decision**: Settings package with inheritance hierarchy (base → environment-specific)

**Rationale**:
- DRY principle: shared settings in base.py
- Environment-specific overrides are explicit
- Easy to see what's different per environment
- Django standard pattern (used by django-admin startproject --template)

**Structure**:
```
settings/
├── __init__.py           # Auto-detect environment or use DJANGO_SETTINGS_MODULE
├── base.py               # All shared settings (80% of config)
├── local.py              # from .base import *; DEBUG=True, etc.
├── staging.py            # from .base import *; staging-specific
└── production.py         # from .base import *; production-specific
```

**Alternatives Considered**:
- **Single settings file with if/else**: Becomes unmaintainable quickly
- **Settings files without inheritance**: Lots of duplication

---

### 4. Testing Framework Configuration

**Decision**: pytest + pytest-django with pyproject.toml configuration

**Rationale**:
- Constitutional requirement (pytest + pytest-django)
- pytest fixtures more Pythonic than unittest setUp/tearDown
- pytest-django provides Django-specific fixtures and database handling
- pyproject.toml centralizes all tool configuration
- Better assertion introspection and output than unittest

**Configuration**:
```toml
[tool.pytest.ini_options]
DJANGO_SETTINGS_MODULE = "config.settings.local"
python_files = ["test_*.py", "*_test.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = [
    "--reuse-db",
    "--cov=src",
    "--cov-report=term-missing",
    "--cov-report=html",
]
```

**Alternatives Considered**:
- **unittest + Django TestCase**: Constitutional requirement specifies pytest
- **pytest.ini file**: pyproject.toml preferred for consolidation

---

### 5. Code Quality Tool Configuration

**Decision**: Black + Ruff + mypy with pyproject.toml configuration

**Rationale**:
- **Black**: Uncompromising formatter, zero configuration needed, constitutional requirement
- **Ruff**: Fast Python linter (Rust-based), replaces Flake8 + isort + others, constitutional requirement
- **mypy**: Type checking for Python, constitutional requirement for core modules
- All tools support pyproject.toml configuration

**Configuration Highlights**:
```toml
[tool.black]
line-length = 100
target-version = ['py312']
include = '\.pyi?$'

[tool.ruff]
line-length = 100
target-version = "py312"
select = [
    "E",   # pycodestyle errors
    "W",   # pycodestyle warnings
    "F",   # pyflakes
    "I",   # isort
    "N",   # pep8-naming
    "S",   # flake8-bandit (security)
    "B",   # flake8-bugbear
]

[tool.mypy]
python_version = "3.12"
strict = true
warn_return_any = true
warn_unused_configs = true
```

**Alternatives Considered**:
- **Pylint**: More opinionated and slower than Ruff
- **Flake8**: Ruff is faster and consolidates multiple tools

---

### 6. Pre-commit Hook Strategy

**Decision**: Use pre-commit framework with hooks for Black, Ruff, mypy, and trailing whitespace

**Rationale**:
- Catches issues before commit (shift-left on quality)
- Constitutional requirement: pre-commit hooks should match CI
- Standard tool in Python ecosystem
- Easy to add/remove hooks
- Runs only on changed files for speed

**Configuration**:
```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files

  - repo: https://github.com/psf/black
    rev: 23.12.0
    hooks:
      - id: black

  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.1.8
    hooks:
      - id: ruff
        args: [--fix]

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.7.1
    hooks:
      - id: mypy
        additional_dependencies: [django-stubs]
```

**Alternatives Considered**:
- **Git hooks manually**: Less maintainable, no version control
- **Make commands only**: Requires developers to remember to run them

---

### 7. Database Configuration Strategy

**Decision**: DATABASE_URL pattern with SQLite default, PostgreSQL documented

**Rationale**:
- Simplest local setup (SQLite requires no installation)
- Production-ready pattern (DATABASE_URL works with PostgreSQL, MySQL, etc.)
- Constitutional requirement: easy local setup (< 10 minutes)
- No Docker or external services needed for initial development

**Implementation**:
```python
# settings/base.py
DATABASES = {
    'default': env.db('DATABASE_URL', default='sqlite:///db.sqlite3')
}
```

**Documentation Required**:
- .env.example shows both SQLite and PostgreSQL examples
- README documents PostgreSQL setup for production-like local dev
- Extension guide explains database configuration

**Alternatives Considered**:
- **PostgreSQL only**: Rejected due to setup friction (requires Docker or local install)
- **In-memory SQLite**: Rejected because migrations need persistent database

---

### 8. Logging Configuration

**Decision**: Structured JSON logging in production, human-readable in development

**Rationale**:
- Constitutional requirement: structured logging for observability
- JSON logs can be ingested by log aggregation systems (ELK, CloudWatch, etc.)
- Human-readable logs better for local development debugging
- Python's logging module supports both formats

**Implementation**:
```python
# settings/base.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(name)s %(levelname)s %(message)s',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',  # Override in production.py
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}

# settings/production.py
LOGGING['handlers']['console']['formatter'] = 'json'
```

**Alternatives Considered**:
- **Only human-readable**: Not production-ready
- **Only JSON**: Poor local development experience

---

### 9. Health Check Implementation

**Decision**: Custom health check view at /health/ returning JSON

**Rationale**:
- Simple, no external dependencies needed initially
- Returns JSON with status and timestamp
- Can be extended with database checks, cache checks, etc. in future features
- Kubernetes/load balancer compatible

**Implementation**:
```python
# src/common/health.py
from django.http import JsonResponse
from django.utils import timezone

def health_check(request):
    return JsonResponse({
        'status': 'healthy',
        'timestamp': timezone.now().isoformat(),
    })
```

**Alternatives Considered**:
- **django-health-check package**: Too complex for skeleton (adds many checks we don't need yet)
- **Plain text response**: JSON more extensible

---

### 10. DRF Configuration Best Practices

**Decision**: Configure DRF with pagination, JSON renderer, and token auth placeholders

**Rationale**:
- Constitutional requirement: DRF with pagination and consistent responses
- Pagination prevents unbounded responses
- JSON renderer ensures consistent API format
- Authentication classes configured (actual implementation deferred)

**Configuration**:
```python
# settings/base.py
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 100,
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

# settings/local.py - Add browsable API for development
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
}
```

---

## Technology Stack Summary

| Category | Technology | Version | Justification |
|----------|-----------|---------|---------------|
| Language | Python | 3.12+ | Constitutional requirement, modern features |
| Framework | Django | 5.1+ | Latest LTS, async support, modern admin |
| API Framework | Django REST Framework | 3.14+ | Constitutional requirement, industry standard |
| Environment Config | django-environ | 0.11+ | DATABASE_URL support, type coercion |
| Testing | pytest | 7.4+ | Constitutional requirement, modern testing |
| Testing (Django) | pytest-django | 4.5+ | Django integration for pytest |
| Coverage | coverage.py | 7.3+ | Code coverage reporting |
| Formatting | Black | 23.12+ | Constitutional requirement, uncompromising |
| Linting | Ruff | 0.1.8+ | Constitutional requirement, fast, comprehensive |
| Type Checking | mypy | 1.7+ | Constitutional requirement, static type checking |
| Django Type Stubs | django-stubs | 4.2+ | Type hints for Django (mypy integration) |
| DRF Type Stubs | djangorestframework-stubs | 3.14+ | Type hints for DRF |
| Pre-commit | pre-commit | 3.5+ | Hook management framework |
| JSON Logging | python-json-logger | 2.0+ | JSON log formatting for production |
| Database (Dev) | SQLite | Built-in | Zero-config local development |
| Database (Prod) | PostgreSQL | 15+ | Production recommendation (not in skeleton) |

---

## Implementation Notes

### Critical Path for Success Criteria

**SC-001: < 10 minute setup**
- Must work: `git clone` → `python -m venv venv` → `pip install -r requirements/local.txt` → `python manage.py migrate` → `python manage.py runserver`
- Key: SQLite default, no external dependencies

**SC-002: Pre-commit hooks < 30 seconds**
- Key: pre-commit runs only on changed files
- Optimization: Ruff is fast (Rust-based)

**SC-003: Test suite < 5 seconds**
- Key: Only smoke tests in skeleton
- Optimization: pytest --reuse-db avoids recreation

**SC-010: mypy zero errors**
- Key: Type hints in settings modules
- Configuration: Strict mode for src/config/ only

### Risk Mitigation

**Risk**: Dependencies pin might break on fresh install
- **Mitigation**: Use `pip-tools` pattern (requirements.in → requirements.txt) or dependabot

**Risk**: Environment variable management confusing
- **Mitigation**: Comprehensive .env.example with comments

**Risk**: Developers skip pre-commit hooks
- **Mitigation**: Document installation, CI runs same checks

---

## References

- Django Documentation: https://docs.djangoproject.com/en/5.1/
- Django REST Framework: https://www.django-rest-framework.org/
- pytest-django: https://pytest-django.readthedocs.io/
- Black: https://black.readthedocs.io/
- Ruff: https://docs.astral.sh/ruff/
- mypy: https://mypy.readthedocs.io/
- django-environ: https://django-environ.readthedocs.io/
- pre-commit: https://pre-commit.com/
