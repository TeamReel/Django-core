# B01: Core Project Skeleton

**Phase:** 1
**Status:** ✅ Done
**Module ID:** 001
**Category:** Backend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 1. B01 – Core Project Skeleton

**Doel**: Basale, production-ready Django projectstructuur met settingslagen, CI en modulaire apps.

**Status**: ✅ Complete

**Key Features**:
- Django 5.x project structure
- Settings layers (base/dev/test/prod)
- CI/CD pipeline (GitHub Actions)
- Docker configuration
- pytest test harness

---
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Feature Specification: Core Project Skeleton
*Path: [kitty-specs/001-core-project-skeleton/spec.md](../../../../kitty-specs/001-core-project-skeleton/spec.md)*

**Feature Branch**: `001-core-project-skeleton`
**Created**: 2025-11-20
**Status**: Draft
**Input**: User description: "Establish a clean, product-agnostic Django 5.x project skeleton with src/ layout, environment-based settings, DRF setup, pytest toolchain, and documented extension patterns. No domain logic or UI."

## Summary

The Core Project Skeleton establishes the foundational infrastructure for the Django Core-App. It provides a complete, production-ready Django 5.x project structure with src/-based layout, environment-specific settings (base/local/staging/production), Django REST Framework configuration, mandatory tooling (Black, Ruff, mypy, pytest), and secure-by-default configurations. This skeleton embeds all constitutional principles—modularity, type safety, testing discipline, security, and observability—while remaining strictly product-agnostic. Downstream product teams can extend this core via documented patterns without modifying the skeleton itself.

## Goals and Non-Goals

### Goals

- Provide a clean Django 5.x project structure using src/ layout with clear separation of concerns
- Establish Django config package with environment-based settings (base, local, staging, production)
- Configure Django REST Framework with secure defaults and consistent API patterns
- Set up complete testing infrastructure: pytest, pytest-django, coverage configuration
- Integrate mandatory tooling: Black (formatting), Ruff (linting), mypy (type checking)
- Implement secure-by-default settings: CSRF enabled, secure cookies, strict ALLOWED_HOSTS, DEBUG off in production
- Create empty core_apps/ directory ready for future modular Django apps
- Add observability placeholders: structured logging configuration, health check endpoints, metrics hooks
- Provide pre-commit hooks that match CI quality gates
- Document extension patterns for downstream product teams (README with "How to Extend" guide)
- Support Python 3.12+ baseline with type hints throughout configuration code
- Enable environment variable management for secrets (no secrets in code)

### Non-Goals

- No user interface (templates, static files, frontend)
- No business logic or domain models (accounts, organizations, projects)
- No authentication/authorization implementation (infrastructure only, no login flows)
- No advanced permissions system
- No complete audit logging implementation (placeholders only)
- No plugin registration system or complex extension mechanisms
- No database migrations for domain models (migrations infrastructure only)
- No production deployment configurations (CI/CD, Docker, orchestration)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bootstrap Core App from Scratch (Priority: P1)

A developer clones the Django Core-App repository for the first time and needs to get the project running locally to begin development.

**Why this priority**: Without a working local environment, no development can occur. This is the absolute foundation for all future work.

**Independent Test**: Clone repository, follow setup instructions, run Django development server successfully, and execute test suite with all tests passing.

**Acceptance Scenarios**:

1. **Given** a fresh clone of the repository, **When** developer follows README setup instructions, **Then** virtual environment is created, dependencies install without errors, and project structure is visible
2. **Given** dependencies are installed, **When** developer runs `python manage.py check`, **Then** Django system check passes with no errors
3. **Given** project configuration is valid, **When** developer runs `python manage.py runserver`, **Then** development server starts on localhost:8000
4. **Given** development server is running, **When** developer accesses health check endpoint, **Then** receives 200 OK response
5. **Given** project is configured, **When** developer runs `pytest`, **Then** all initial tests pass with green output
6. **Given** project is set up, **When** developer runs linting/formatting checks (Black, Ruff, mypy), **Then** all checks pass without violations

---

### User Story 2 - Extend Core with New Django App (Priority: P2)

A downstream product developer needs to add product-specific functionality by creating a new Django app within the core_apps/ structure.

**Why this priority**: Validates that the extension pattern works and the skeleton supports its primary purpose: being extended by downstream products.

**Independent Test**: Follow documented extension guide, create a new Django app in core_apps/, add it to INSTALLED_APPS, create a simple model and test, verify it works end-to-end.

**Acceptance Scenarios**:

1. **Given** the extension guide documentation, **When** developer reads "How to Extend" section, **Then** understands where to create new apps and how to structure them
2. **Given** understanding of extension patterns, **When** developer creates new app `core_apps/example_app/`, **Then** app follows standard Django app structure with proper __init__.py, apps.py, models.py, tests/
3. **Given** new app is created, **When** developer adds app to INSTALLED_APPS in settings, **Then** Django recognizes the app without errors
4. **Given** app is registered, **When** developer creates a simple model and migration, **Then** `python manage.py makemigrations` generates migration file
5. **Given** migration exists, **When** developer runs `python manage.py migrate`, **Then** migration applies successfully
6. **Given** model exists, **When** developer writes test for model, **Then** test runs via pytest and passes
7. **Given** app is functional, **When** developer runs full test suite, **Then** new app's tests run alongside skeleton tests without conflicts

---

### User Story 3 - Run Quality Gates Before Commit (Priority: P2)

A developer makes changes to the skeleton code and wants to ensure all quality standards are met before committing.

**Why this priority**: Enforces constitutional requirements for code quality and prevents broken code from entering the repository.

**Independent Test**: Make a code change, run pre-commit hooks, verify all checks (Black, Ruff, mypy, tests) execute and pass.

**Acceptance Scenarios**:

1. **Given** pre-commit hooks are installed, **When** developer attempts to commit code, **Then** Black formatting check runs automatically
2. **Given** Black check runs, **When** code is improperly formatted, **Then** Black reformats code and shows diff
3. **Given** formatting passes, **When** Ruff linting runs, **Then** identifies any code quality violations
4. **Given** linting passes, **When** mypy type checking runs on core modules, **Then** validates type hints are correct
5. **Given** all static checks pass, **When** developer manually runs `pytest`, **Then** full test suite executes and passes
6. **Given** all checks pass, **When** developer pushes to remote, **Then** understands that CI will run identical checks

---

### User Story 4 - Configure Environment-Specific Settings (Priority: P3)

A developer needs to run the application in different environments (local development, staging, production) with appropriate configurations for each.

**Why this priority**: Essential for deployment readiness, but not blocking initial development work.

**Independent Test**: Create .env file with environment-specific variables, start application in each environment mode, verify correct settings are loaded.

**Acceptance Scenarios**:

1. **Given** settings structure (base.py, local.py, staging.py, production.py), **When** developer reviews settings files, **Then** understands inheritance hierarchy and which file applies to which environment
2. **Given** local development mode, **When** developer starts server, **Then** DEBUG=True, ALLOWED_HOSTS=['localhost', '127.0.0.1'], and local database is used
3. **Given** production mode, **When** application starts, **Then** DEBUG=False, ALLOWED_HOSTS is restricted to actual domain, HTTPS is enforced, and secure cookie settings are enabled
4. **Given** environment variables are needed, **When** developer creates .env file, **Then** secrets are loaded from environment (not committed to repository)
5. **Given** different environments, **When** developer reviews logging configuration, **Then** sees structured JSON logging in production, human-readable logging in development

---

### Edge Cases

- **Missing environment variables**: What happens when required environment variables (SECRET_KEY, DATABASE_URL) are not set? System should fail fast with clear error message identifying missing variables.
- **Incompatible Python version**: How does system handle Python < 3.12? Setup documentation should specify version requirement, and dependencies should enforce minimum version.
- **Migration conflicts**: What happens when developer creates apps with conflicting migration numbers? Django's migration system handles this; document resolution process in extension guide.
- **Circular imports**: How does structure prevent circular dependencies between core_apps? Document layering rules and import patterns in extension guide.
- **Test isolation failures**: What happens when tests have state leakage? pytest-django's transaction-based test isolation handles this; document proper test fixture usage.

## Requirements *(mandatory)*

### Functional Requirements

#### Project Structure & Organization

- **FR-001**: Project MUST use src/ layout with Django project configuration in `src/config/`
- **FR-002**: Project MUST include empty `src/core_apps/` directory for future modular Django apps
- **FR-003**: Project MUST separate tests into `tests/` directory at repository root (separate from src/)
- **FR-004**: Project MUST include `docs/` directory for documentation with initial README files

#### Settings & Configuration

- **FR-005**: Settings MUST be split into environment-specific modules: base.py (shared), local.py (development), staging.py, production.py
- **FR-006**: Base settings MUST configure Django 5.x with secure defaults: CSRF enabled, secure cookies, strict ALLOWED_HOSTS
- **FR-007**: Production settings MUST enforce DEBUG=False, HTTPS-only, secure session/CSRF cookies
- **FR-008**: Settings MUST load secrets from environment variables using python-decouple or django-environ (no secrets in code)
- **FR-009**: Settings MUST configure Django REST Framework with default pagination, authentication classes, and renderer classes

#### Testing Infrastructure

- **FR-010**: Project MUST use pytest and pytest-django as testing framework
- **FR-011**: Project MUST include pytest.ini or pyproject.toml configuration with Django settings module specified
- **FR-012**: Project MUST include initial smoke tests validating project configuration
- **FR-013**: Project MUST configure coverage.py with minimum thresholds and reporting
- **FR-014**: Tests MUST run successfully on fresh clone with zero failures

#### Code Quality Tooling

- **FR-015**: Project MUST include Black configuration (pyproject.toml) for code formatting
- **FR-016**: Project MUST include Ruff configuration for linting with constitutional rule sets enabled
- **FR-017**: Project MUST include mypy configuration for type checking core modules (strict mode)
- **FR-018**: Project MUST include pre-commit configuration file with hooks for Black, Ruff, mypy
- **FR-019**: All configuration files MUST be validated and working (running each tool produces no errors on skeleton code)

#### Security & Privacy

- **FR-020**: Project MUST include .env.example file showing required environment variables (no actual secrets)
- **FR-021**: .gitignore MUST exclude .env files, secrets, local databases, and Python cache files
- **FR-022**: Settings MUST configure secure password hashing using Django's default (Argon2 or PBKDF2)
- **FR-023**: Settings MUST configure ALLOWED_HOSTS as environment variable (no wildcard defaults)
- **FR-024**: Settings MUST disable DEBUG in production via environment variable check

#### Observability & Monitoring

- **FR-025**: Project MUST configure structured logging using Python's logging module
- **FR-026**: Logging configuration MUST output JSON format in production, human-readable in development
- **FR-027**: Project MUST include health check endpoint at `/health/` returning JSON status
- **FR-028**: Project MUST include placeholder metrics middleware (no-op implementation, ready for instrumentation)
- **FR-029**: Settings MUST configure Django's system check framework for startup validation

#### Dependencies

- **FR-030**: Project MUST use requirements.txt or pyproject.toml for dependency management
- **FR-031**: Dependencies MUST be pinned to specific versions (no loose ranges)
- **FR-032**: Project MUST include separate requirements files: base, dev, production
- **FR-033**: Minimum dependencies: Django 5.x, djangorestframework, pytest, pytest-django, black, ruff, mypy
- **FR-034**: Project MUST specify Python 3.12+ requirement in setup files

#### Documentation

- **FR-035**: Repository root MUST include README.md with project overview and setup instructions
- **FR-036**: README MUST include "Quick Start" section with step-by-step local setup
- **FR-037**: README MUST include "How to Extend" section documenting extension patterns for downstream products
- **FR-038**: README MUST reference constitution.md and explain governance principles
- **FR-039**: Each major directory (src/, tests/, docs/) MUST include README.md explaining its purpose

#### Development Workflow

- **FR-040**: Project MUST include Makefile or task runner script for common operations (test, lint, format, run)
- **FR-041**: Project MUST include .editorconfig for consistent editor configuration
- **FR-042**: Django management commands MUST work from repository root
- **FR-043**: Project MUST start successfully with `python manage.py runserver` after setup

### Assumptions

- Python 3.12 is available on developer machines or in CI environments
- Developers are familiar with basic Django concepts (apps, settings, migrations)
- PostgreSQL will be the production database (SQLite acceptable for local development)
- Standard Django project layout conventions are understood by the team
- Git is used for version control (evidenced by .gitignore requirements)
- Pre-commit hooks will be adopted by developers (installation documented, not enforced)
- CI/CD system exists or will be added in a future feature (configuration not included here)
- Developers have access to environment variable configuration in their deployment environments

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [x] All functionality is reusable across multiple downstream products
- [x] Extension points are clearly documented via "How to Extend" guide

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering: settings → apps → tests
- [x] No circular dependencies introduced (empty core_apps structure prevents this)
- [x] Extension points are stable and documented (Django app structure)

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained
- [x] Type hints will be used in configuration modules
- [x] Code will be formatted with Black and linted with Ruff

### Testing (Principle IV)
- [x] Test plan includes pytest + pytest-django tests
- [x] Coverage targets defined (initial baseline, incremental improvement)
- [x] Integration tests planned (smoke tests for skeleton validation)

### Security & Privacy (Principle V)
- [x] Secure defaults (CSRF, secure cookies, ALLOWED_HOSTS) maintained
- [x] No secrets in code; env vars/secret managers documented
- [x] Authentication/authorization handled through centralized mechanisms (infrastructure only)
- [x] No sensitive data will be logged (logging configuration excludes sensitive keys)

### Performance & Reliability (Principle VI)
- [x] No N+1 queries (no database queries in skeleton)
- [x] Pagination implemented for DRF defaults
- [x] Structured logging and metrics hooks included
- [x] Graceful degradation strategy defined (health checks, Django system checks)

### API Design (Principle VII)
- [x] DRF standards followed (default configuration)
- [x] API responses are consistent (DRF default renderers configured)
- [x] Breaking changes use versioning (documentation planned for future)
- [x] Validation occurs at boundary (DRF serializer configuration ready)

### Documentation (Principle XI)
- [x] Feature documentation plan included (README structure defined)
- [x] Extension guide updates identified (new "How to Extend" section)
- [x] ADR planned for major architectural decisions (src/ layout rationale)

**Violations Requiring Justification**: None

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developer can clone repository, follow setup instructions, and have working development environment in under 10 minutes
- **SC-002**: All pre-commit hooks (Black, Ruff, mypy) execute in under 30 seconds on average developer machine
- **SC-003**: Full test suite runs in under 5 seconds (skeleton tests only, no domain logic)
- **SC-004**: Health check endpoint responds within 100ms in local development
- **SC-005**: Project passes all Django system checks with zero warnings or errors
- **SC-006**: Running `python manage.py check --deploy` passes all production readiness checks
- **SC-007**: Documentation completeness: 100% of mandatory README sections completed with actionable instructions
- **SC-008**: Extension validation: Developer can add new Django app to core_apps/ and have it working (migrated, tested) in under 15 minutes following extension guide
- **SC-009**: Zero secrets or sensitive configuration values committed to repository (verified via .gitignore and code review)
- **SC-010**: Type checking passes with zero errors when running `mypy src/config/`
