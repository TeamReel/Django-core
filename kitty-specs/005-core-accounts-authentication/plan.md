# Implementation Plan: Core Accounts & Authentication

**Branch**: `005-core-accounts-authentication` | **Date**: 2025-11-23 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/kitty-specs/005-core-accounts-authentication/spec.md`

## Summary

Implement a generic accounts module providing custom user model with email-as-username authentication, secure email verification and password reset flows, three-tier role system (superadmin/admin/user), and admin user management via both Django Admin and REST API. Integrates with Feature 003 security baseline for brute-force protection and lays foundation for future multi-tenancy features.

## Technical Context

**Language/Version**: Python 3.12+
**Primary Dependencies**: Django 5.1+, Django REST Framework 3.14+, django-stubs (type hints)
**Storage**: PostgreSQL (custom user model, sessions, Django groups/permissions)
**Testing**: pytest + pytest-django, factory_boy for fixtures, coverage >85%
**Target Platform**: Linux server (production), Windows/macOS (development)
**Project Type**: Django web application with REST API
**Performance Goals**: 1,000 concurrent sign-ins <1s latency, admin user list 10k users <2s
**Constraints**: Session timeout 24h inactive/7d absolute, password reset token 1h expiry, email verification 24h expiry
**Scale/Scope**: Extensible user model, 3 core roles, 6 user stories, 33 functional requirements

**Planning Decisions** (from discovery):
1. **Authentication**: Django built-in auth + custom user model (AbstractBaseUser + PermissionsMixin)
2. **Email Backend**: Django SMTP (console for dev, SMTP for prod), multipart HTML+text
3. **Role Implementation**: Django Groups with permissions per group (superadmin/admin/user)
4. **API Authentication**: Session-based (cookies) for both web and REST API
5. **Token Strategy**: Django's PasswordResetTokenGenerator (signed tokens, no DB storage)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Purpose and Scope
- [x] **Product-Agnostic**: Implementation contains NO product-specific logic, pricing, workflows, or UI flows
- [x] **Core Focus**: Feature aligns with core concerns (accounts, organisations, projects, settings, audit, observability)
- [x] **Downstream Extension**: Product-specific needs are handled via documented extension points

### II. Architecture and Modularity
- [x] **Single Responsibility**: Each Django app has one clear purpose
- [x] **Stable APIs**: Public interfaces are documented and stable
- [x] **Minimal Dependencies**: Only necessary dependencies included
- [x] **No Circular Deps**: Dependency graph is acyclic
- [x] **No Downstream Imports**: Core does not import from product-specific projects

### III. Code Quality and Style
- [x] **Python 3.12+**: Baseline version maintained
- [x] **Type Hints**: Core modules will use type hints throughout
- [x] **Black Formatting**: All code will be formatted with Black
- [x] **Ruff Linting**: Ruff will be primary linter
- [x] **No Dead Code**: Implementation removes unused code
- [x] **Readable Code**: Functions/classes remain small and focused
- [x] **Curated Dependencies**: New dependencies are justified and pinned

### IV. Testing Strategy
- [x] **pytest + pytest-django**: Testing framework used
- [x] **Test Coverage**: Tests included for all features
- [x] **Regression Tests**: Bug fixes include tests preventing recurrence
- [x] **Deterministic**: Tests are not flaky or environment-dependent
- [x] **Coverage Thresholds**: Coverage targets defined and enforced (>85% auth, 100% permissions)
- [x] **Integration Tests**: Key user flows have integration test coverage

### V. Security and Privacy
- [x] **Secure Defaults**: CSRF, secure cookies, ALLOWED_HOSTS configured
- [x] **DEBUG Off**: DEBUG disabled in non-dev environments
- [x] **No Secrets**: No secrets committed; env vars/secret managers used
- [x] **Dependency Scanning**: CI will scan dependencies for vulnerabilities
- [x] **Centralized Auth**: Authentication/authorization uses core mechanisms
- [x] **No Sensitive Logging**: Sensitive data not logged

### VI. Performance and Reliability
- [x] **No N+1 Queries**: Query optimization plan documented (select_related for role lookups)
- [x] **Pagination**: APIs use pagination for unbounded data (user lists)
- [x] **Explicit Caching**: Caching strategy documented if used (session caching via Django)
- [x] **Structured Logging**: Logging infrastructure in place (auth events logged)
- [x] **Health Checks**: Health check endpoints defined (via Feature 001)
- [x] **Metrics Hooks**: Observability metrics captured
- [x] **Graceful Degradation**: Failure handling strategy defined (email failures logged, don't block)

### VII. UX and API Design
- [x] **DRF Required**: Django REST Framework used for APIs
- [x] **Consistent Responses**: API response format standardized
- [x] **Versioning Strategy**: Breaking changes handled via versioning or deprecation
- [x] **Clear Errors**: Error messages clear and safe (no data leaks, no email enumeration)
- [x] **Boundary Validation**: Validation in serializers/forms

### VIII. Developer Experience and Tooling
- [x] **Easy Setup**: Local environment setup documented and simple
- [x] **Mandatory Tools**: Black, Ruff, mypy, pytest configured
- [x] **Pre-commit Hooks**: Hooks match CI checks
- [x] **Type Checking**: mypy runs cleanly on core modules
- [x] **Task Scripts**: Common operations scripted (createsuperuser command)
- [x] **Developer Docs**: Setup and development docs exist

### IX. Branching and Git Workflow
- [x] **Feature Branch**: Work occurs on `005-core-accounts-authentication` branch
- [x] **Linked to Spec**: PR will reference spec document
- [x] **Focused PRs**: Changes remain small and focused
- [x] **main Stable**: No direct commits to main

### X. CI/CD and Quality Gates
- [x] **CI Checks**: Linting, formatting, mypy, pytest in CI
- [x] **Merge Gates**: All CI checks must pass before merge
- [x] **Scripted Deployment**: Deployment process documented/automated

### XI. Documentation and Knowledge Sharing
- [x] **In-Repo Docs**: Documentation lives in repository
- [x] **App README**: Each Django app has README
- [x] **Getting Started**: Setup guide exists or will be updated
- [x] **Extension Guide**: "How to extend" documentation exists or planned (user model extension)
- [x] **Spec Sync**: Implementation keeps spec up to date
- [x] **ADR Required**: Major architectural decisions documented (email-as-username, three-tier roles)

### XII. Constitution Evolution
- [x] **No Constitution Changes**: This feature does not require constitution amendments
- [x] **Template Updates**: No template changes required

### Violations Requiring Justification

None. All constitution principles are followed.

**Constitution Check Status**: ✅ PASS

## Project Structure

### Documentation (this feature)

```
kitty-specs/005-core-accounts-authentication/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0 output (next step)
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (OpenAPI schemas)
│   ├── auth.yaml        # Authentication endpoints
│   └── admin.yaml       # Admin user management endpoints
├── checklists/          # Validation checklists
│   └── requirements.md  # Specification quality checklist (completed)
└── tasks.md             # Phase 2 output (NOT created by /spec-kitty.plan)
```

### Source Code (repository root)

```
src/
├── accounts/                    # NEW: Core accounts Django app
│   ├── __init__.py
│   ├── models.py               # Custom User model, Groups setup
│   ├── managers.py             # Custom UserManager
│   ├── admin.py                # Django Admin configuration
│   ├── forms.py                # Registration, password reset forms
│   ├── views.py                # Auth views (register, verify, reset)
│   ├── serializers.py          # DRF serializers
│   ├── permissions.py          # Custom DRF permission classes
│   ├── tokens.py               # Token generation/validation utilities
│   ├── validators.py           # Password validation
│   ├── signals.py              # Post-save signals for user creation
│   ├── urls.py                 # URL routing
│   ├── api/                    # REST API views
│   │   ├── __init__.py
│   │   ├── views.py            # API viewsets
│   │   └── urls.py             # API URL routing
│   ├── management/             # Django management commands
│   │   └── commands/
│   │       └── createsuperuser.py  # Enhanced createsuperuser
│   ├── templates/              # Email templates
│   │   └── accounts/
│   │       ├── email/
│   │       │   ├── verification.html
│   │       │   ├── verification.txt
│   │       │   ├── password_reset.html
│   │       │   └── password_reset.txt
│   │       └── registration/
│   │           ├── register.html
│   │           ├── login.html
│   │           └── password_reset_form.html
│   ├── migrations/
│   │   └── 0001_initial.py
│   ├── py.typed                # Type hint marker
│   └── README.md               # App documentation
│
├── config/                      # MODIFIED: Project settings
│   └── settings/
│       ├── base.py             # Add AUTH_USER_MODEL, session config
│       ├── local.py            # Console email backend
│       └── production.py       # SMTP email backend
│
└── common/                      # EXISTING: Shared utilities
    └── (no changes)

tests/
├── accounts/                    # NEW: Accounts app tests
│   ├── __init__.py
│   ├── conftest.py             # Pytest fixtures
│   ├── factories.py            # factory_boy user factories
│   ├── test_models.py          # User model tests
│   ├── test_authentication.py  # Login/logout tests
│   ├── test_registration.py    # Registration + verification tests
│   ├── test_password_reset.py  # Password reset flow tests
│   ├── test_permissions.py     # Role-based permission tests
│   ├── test_admin.py           # Django Admin tests
│   ├── test_validators.py      # Password validation tests
│   └── api/
│       ├── __init__.py
│       ├── test_auth_api.py    # API authentication endpoints
│       └── test_admin_api.py   # API admin user management
│
└── integration/                 # MODIFIED: Integration tests
    └── test_auth_flow.py       # End-to-end auth flows

requirements/
├── base.txt                     # MODIFIED: Add djangorestframework
├── local.txt                    # MODIFIED: Add factory-boy, faker
└── production.txt               # (no changes)
```

**Structure Decision**: Single Django project structure. New `accounts` app provides authentication and user management as a self-contained module. Integrates with existing `config` settings and `security_baseline` app (Feature 003). Follows Django best practices with clear separation of models, views, serializers, and API endpoints.
