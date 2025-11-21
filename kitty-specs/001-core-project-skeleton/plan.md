# Implementation Plan: Core Project Skeleton
*Path: [kitty-specs/001-core-project-skeleton/plan.md](kitty-specs/001-core-project-skeleton/plan.md)*

**Branch**: `001-core-project-skeleton` | **Date**: 2025-11-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `kitty-specs/001-core-project-skeleton/spec.md`

## Summary

Establish a production-ready Django 5.x project skeleton with src/ layout, environment-based settings, Django REST Framework configuration, mandatory tooling (Black, Ruff, mypy, pytest), and secure-by-default configurations. This skeleton embeds all constitutional principles while remaining strictly product-agnostic, providing documented extension patterns for downstream products without requiring modification of the skeleton itself.

**Technical Approach**: Use django-admin startproject with custom structure, configure settings inheritance (base → environment-specific), integrate DRF with secure defaults, set up pytest-django testing infrastructure, configure pre-commit hooks matching CI gates, and provide comprehensive documentation with extension guide.

## Technical Context

**Language/Version**: Python 3.12+
**Primary Dependencies**: Django 5.1+, djangorestframework 3.14+, django-environ 0.11+
**Storage**: DATABASE_URL pattern (SQLite default for local dev, PostgreSQL documented for production)
**Testing**: pytest 7.4+, pytest-django 4.5+, coverage 7.3+
**Target Platform**: Cross-platform (Linux, macOS, Windows) web application server
**Project Type**: Single Django project (backend API)
**Performance Goals**:
- Health check endpoint < 100ms response time
- Full test suite < 5 seconds (skeleton only)
- Pre-commit hooks < 30 seconds

**Constraints**:
- No domain logic or business models in this feature
- No UI/templates/frontend
- Must work on fresh clone in < 10 minutes
- All tools must run without errors on skeleton code

**Scale/Scope**: Foundation for multi-product core (no users yet, infrastructure only)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Purpose and Scope
- [x] **Product-Agnostic**: No product-specific logic, pricing, workflows, or UI (skeleton is pure infrastructure)
- [x] **Core Focus**: Aligns with core concerns (foundation for accounts, organisations, projects, settings, audit, observability)
- [x] **Downstream Extension**: Extension patterns documented for product-specific additions

### II. Architecture and Modularity
- [x] **Single Responsibility**: Django config package has one purpose (project configuration)
- [x] **Stable APIs**: Django/DRF standard interfaces only
- [x] **Minimal Dependencies**: Only essential packages (Django, DRF, testing, tooling)
- [x] **No Circular Deps**: Settings → apps structure prevents cycles
- [x] **No Downstream Imports**: Core doesn't import from products (no products exist yet)

### III. Code Quality and Style
- [x] **Python 3.12+**: Specified in pyproject.toml and documentation
- [x] **Type Hints**: Configuration modules will use type hints
- [x] **Black Formatting**: Configuration in pyproject.toml
- [x] **Ruff Linting**: Configuration in pyproject.toml with constitutional rules
- [x] **No Dead Code**: Fresh skeleton has no unused code
- [x] **Readable Code**: Settings modules kept focused and documented
- [x] **Curated Dependencies**: All dependencies justified and pinned

### IV. Testing Strategy
- [x] **pytest + pytest-django**: Primary testing framework
- [x] **Test Coverage**: Smoke tests for skeleton validation, coverage config with baseline
- [x] **Regression Tests**: N/A (no existing functionality)
- [x] **Deterministic**: All tests are deterministic (no external dependencies)
- [x] **Coverage Thresholds**: Initial baseline set, enforced via coverage config
- [x] **Integration Tests**: Health check and system check integration tests

### V. Security and Privacy
- [x] **Secure Defaults**: CSRF enabled, secure cookies, strict ALLOWED_HOSTS in base settings
- [x] **DEBUG Off**: Production settings enforce DEBUG=False
- [x] **No Secrets**: django-environ used, .env.example provided, .gitignore protects secrets
- [x] **Dependency Scanning**: Requirements pinned (CI scanning deferred to future feature)
- [x] **Centralized Auth**: Django auth configured (implementation deferred)
- [x] **No Sensitive Logging**: Logging config excludes sensitive keys

### VI. Performance and Reliability
- [x] **No N+1 Queries**: No database queries in skeleton
- [x] **Pagination**: DRF pagination configured
- [x] **Explicit Caching**: No caching yet (placeholder documented)
- [x] **Structured Logging**: JSON logging in production, human-readable in dev
- [x] **Health Checks**: /health/ endpoint implemented
- [x] **Metrics Hooks**: Placeholder middleware included
- [x] **Graceful Degradation**: Django system checks validate startup

### VII. UX and API Design
- [x] **DRF Required**: DRF configured with defaults
- [x] **Consistent Responses**: DRF JSON renderer configured
- [x] **Versioning Strategy**: Documentation includes versioning guidance for future
- [x] **Clear Errors**: DRF exception handling configured
- [x] **Boundary Validation**: DRF serializer infrastructure ready

### VIII. Developer Experience and Tooling
- [x] **Easy Setup**: README with < 10 minute setup goal
- [x] **Mandatory Tools**: Black, Ruff, mypy, pytest configured
- [x] **Pre-commit Hooks**: .pre-commit-config.yaml matches CI
- [x] **Type Checking**: mypy configured for src/config/ in strict mode
- [x] **Task Scripts**: Makefile with common operations
- [x] **Developer Docs**: README, extension guide, directory READMEs

### IX. Branching and Git Workflow
- [x] **Feature Branch**: Working on 001-core-project-skeleton
- [x] **Linked to Spec**: This plan references spec.md
- [x] **Focused PRs**: Single feature (skeleton only)
- [x] **main Stable**: Not modifying main directly

### X. CI/CD and Quality Gates
- [x] **CI Checks**: Configuration for linting, formatting, mypy, pytest (CI setup deferred)
- [x] **Merge Gates**: Pre-commit hooks establish local gates
- [x] **Scripted Deployment**: Not in scope (deployment infrastructure deferred)

### XI. Documentation and Knowledge Sharing
- [x] **In-Repo Docs**: README, docs/ directory, directory-level READMEs
- [x] **App README**: core_apps/ README documents extension pattern
- [x] **Getting Started**: README Quick Start section
- [x] **Extension Guide**: README "How to Extend" section
- [x] **Spec Sync**: This plan tracks spec alignment
- [x] **ADR Required**: ADR-001 documents src/ layout decision

### XII. Constitution Evolution
- [x] **No Constitution Changes**: No amendments needed
- [x] **Template Updates**: No template changes required

**Constitution Check Status**: ✅ PASS - All requirements satisfied

## Project Structure

### Documentation (this feature)

```
kitty-specs/001-core-project-skeleton/
├── plan.md              # This file
├── research.md          # Phase 0: Technology decisions and best practices
├── data-model.md        # Phase 1: N/A (no domain models in skeleton)
├── quickstart.md        # Phase 1: Developer quick reference
├── contracts/           # Phase 1: API contracts (health check schema)
│   └── health.yaml      # OpenAPI spec for health check endpoint
└── tasks.md             # Phase 2: Generated by /spec-kitty.tasks
```

### Source Code (repository root)

```
django-core/
├── src/
│   ├── config/                    # Django project package
│   │   ├── __init__.py
│   │   ├── asgi.py               # ASGI entry point
│   │   ├── wsgi.py               # WSGI entry point
│   │   ├── urls.py               # Root URL configuration
│   │   └── settings/             # Environment-based settings
│   │       ├── __init__.py
│   │       ├── base.py           # Shared settings (secure defaults)
│   │       ├── local.py          # Development settings
│   │       ├── staging.py        # Staging settings
│   │       └── production.py     # Production settings
│   ├── core_apps/                # Empty directory for future Django apps
│   │   └── README.md             # Extension guide
│   └── common/                   # Shared utilities (if needed)
│       ├── __init__.py
│       ├── health.py             # Health check view
│       └── middleware.py         # Metrics middleware placeholder
├── tests/
│   ├── __init__.py
│   ├── conftest.py               # pytest fixtures
│   ├── test_health.py            # Health check tests
│   └── test_settings.py          # Settings validation tests
├── docs/
│   ├── README.md                 # Documentation index
│   ├── setup.md                  # Detailed setup guide
│   ├── extension-guide.md        # How to extend guide
│   └── adr/                      # Architecture Decision Records
│       └── 001-src-layout.md     # ADR for src/ layout choice
├── .github/                      # GitHub-specific files (already exists)
├── .kittify/                     # Spec Kitty files (already exists)
├── manage.py                     # Django management script
├── pyproject.toml                # Project metadata, tool configs
├── requirements/
│   ├── base.txt                  # Core dependencies
│   ├── local.txt                 # Development dependencies
│   └── production.txt            # Production dependencies
├── .env.example                  # Environment variable template
├── .gitignore                    # Git ignore rules
├── .editorconfig                 # Editor configuration
├── .pre-commit-config.yaml       # Pre-commit hooks
├── Makefile                      # Task automation
└── README.md                     # Project overview and quick start
```

**Structure Decision**:

Using **src/ layout** for Django project with clear separation:
- `src/config/` - Django project configuration package (settings, URLs, WSGI/ASGI)
- `src/core_apps/` - Empty directory for future modular Django apps
- `src/common/` - Shared utilities (health checks, middleware)
- `tests/` - All tests at repository root (separate from source)
- `docs/` - Documentation including ADRs and extension guide
- `requirements/` - Split requirements by environment

This structure enforces constitutional modularity principles and provides clear extension points for downstream products.

## Complexity Tracking

*No violations - Constitution Check passed all requirements.*
