# Project Structure

This guide explains the directory layout and file organization conventions used in Django Core-App.

## Overview

```
django-core/
├── src/                    # Django applications
├── tests/                  # Test suite (mirrors src/)
├── docs/                   # Documentation (this site)
├── kitty-specs/            # Feature specifications
├── examples/               # Example implementations
├── requirements/           # Python dependencies
├── k8s/                    # Kubernetes manifests
├── nginx/                  # Nginx configurations
├── manage.py               # Django management script
├── pyproject.toml          # Python project configuration
├── docker-compose.*.yml    # Docker Compose files
└── README.md               # Project overview
```

---

## Source Code (`src/`)

The `src/` directory contains all Django applications, organized by feature:

```
src/
├── accounts/               # B05: User authentication
├── organisations/          # B06: Organization management
├── projects/               # B07: Project workspaces
├── permissions/            # B08: Hierarchical access control
├── audit/                  # B09: Audit logging
├── settings/               # B10: Settings & feature flags
├── transactions/           # B11: Credits & transactions
├── i18n_preferences/       # B12: Internationalization
├── api/                    # B13: API foundation
├── web_ui/                 # B14: Web UI baseline
├── tasks/                  # B15: Background task scheduling
├── notifications/          # B16: Notification system
├── common/                 # Shared utilities
├── config/                 # Django configuration
├── security_baseline/      # B03: Security validation
├── constitution_engine/    # B02: Constitutional enforcement
└── locale/                 # Translation files
```

### Application Structure

Each Django application follows a consistent structure:

```
src/accounts/
├── __init__.py
├── admin.py                # Django admin configuration
├── api.py                  # Public Python API
├── apps.py                 # Django app configuration
├── models.py               # Database models
├── serializers.py          # DRF serializers
├── services.py             # Business logic layer
├── signals.py              # Django signals
├── urls.py                 # URL routing
├── views.py                # API views/viewsets
├── permissions.py          # DRF permission classes
├── migrations/             # Database migrations
│   └── *.py
└── README.md               # Module documentation
```

### Configuration (`src/config/`)

```
src/config/
├── __init__.py
├── celery.py               # Celery configuration
├── urls.py                 # Root URL configuration
├── wsgi.py                 # WSGI application
├── asgi.py                 # ASGI application
└── settings/               # Environment-specific settings
    ├── __init__.py
    ├── base.py             # Common settings
    ├── local.py            # Development settings
    ├── staging.py          # Staging environment
    ├── production.py       # Production settings
    └── test.py             # Test settings
```

---

## Tests (`tests/`)

The test directory mirrors the source structure:

```
tests/
├── __init__.py
├── conftest.py             # Shared pytest fixtures
├── accounts/               # Tests for accounts module
│   ├── __init__.py
│   ├── conftest.py         # Module-specific fixtures
│   ├── test_api.py         # API tests
│   ├── test_models.py      # Model tests
│   └── test_services.py    # Service layer tests
├── permissions/
├── audit/
├── ... (mirrors src/)
└── fixtures/               # Test data fixtures
    └── *.json
```

### Testing Conventions

- Test files are named `test_*.py`
- Test functions are named `test_*`
- Use `conftest.py` for shared fixtures
- Each module has its own test directory

---

## Documentation (`docs/`)

```
docs/
├── index.md                # Documentation home
├── nav.yml                 # Navigation structure
├── getting-started/        # Onboarding documentation
├── architecture/           # System architecture
│   └── decisions/          # ADR storage
├── modules/                # Module reference
├── guides/                 # How-to guides
├── contributing/           # Contributor guidelines
├── troubleshooting/        # FAQ and troubleshooting
├── examples/               # Example walkthroughs
├── deployment/             # Deployment guides
├── adr/                    # Architecture Decision Records
└── assets/                 # Images and diagrams
```

---

## Feature Specifications (`kitty-specs/`)

Each feature has its own specification directory:

```
kitty-specs/
├── 005-core-accounts-authentication/
│   ├── spec.md             # Feature specification
│   ├── plan.md             # Implementation plan
│   ├── tasks.md            # Work packages & subtasks
│   ├── research.md         # Research findings
│   ├── constitution.md     # Security & invariants
│   └── tasks/              # Work package prompts
│       ├── planned/
│       ├── doing/
│       ├── for_review/
│       └── done/
├── 006-organisation-management-multi/
├── ... (one directory per feature)
```

### Feature Numbering

- `00x`: Foundation features (001-010)
- `01x`: Core business features (011-020)
- `02x`: Extensions & integrations (021+)

---

## Examples (`examples/`)

```
examples/
├── README.md               # Examples overview
├── crud-api/               # CRUD API example (B21)
│   ├── README.md
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
├── background-tasks/       # Celery tasks example (B21)
└── scaffolding-demo/       # Scaffolding CLI demo (B21)
```

---

## Requirements (`requirements/`)

```
requirements/
├── base.txt                # Core dependencies (always installed)
├── local.txt               # Development dependencies
├── production.txt          # Production dependencies
└── test.txt                # Testing dependencies (if separate)
```

### Dependency Hierarchy

```
production.txt → base.txt
local.txt → base.txt
```

---

## Deployment Files

### Docker

```
docker-compose.local.yml    # Local development (hot-reload)
docker-compose.staging.yml  # Staging environment
docker-compose.prod.yml     # Production deployment
Dockerfile                  # Multi-stage build
.dockerignore              # Build context exclusions
```

### Kubernetes (`k8s/`)

```
k8s/
├── configmap.yaml          # Non-sensitive config
├── secret.yaml             # Credentials template
├── deployment-web.yaml     # Django + Gunicorn
├── deployment-celery-worker.yaml
├── deployment-celery-beat.yaml
├── service-web.yaml        # LoadBalancer service
└── hpa-web.yaml            # Horizontal Pod Autoscaler
```

### Nginx (`nginx/`)

```
nginx/
├── local.conf              # Simple HTTP proxy
├── staging.conf            # HTTP + security headers
└── production.conf         # HTTPS + SSL termination
```

---

## Configuration Files

| File | Purpose |
|------|---------|
| `pyproject.toml` | Python project configuration, dependencies, tool settings |
| `manage.py` | Django management script |
| `.env.example` | Environment variable template |
| `.gitignore` | Git ignore patterns |
| `.pre-commit-config.yaml` | Pre-commit hooks |
| `constitution_engine.yaml` | Constitutional rules |
| `CHANGELOG.md` | Version history |

---

## Naming Conventions

### Python

- **Modules**: `snake_case.py`
- **Classes**: `PascalCase`
- **Functions/Variables**: `snake_case`
- **Constants**: `UPPER_SNAKE_CASE`

### Files

- **Django apps**: Singular noun (`account`, not `accounts`) - except for conventional names
- **Test files**: `test_*.py`
- **Migrations**: Auto-generated, don't rename

### Directories

- **Snake case** for multi-word: `getting-started/`, `background-tasks/`
- **Singular** for modules: `account/`, `project/`
- **Plural** for collections: `examples/`, `tests/`

---

## Next Steps

- Follow the [Quickstart](quickstart.md) to set up your environment
- Read about [Architecture](../architecture/index.md) to understand the system design
- Start [Contributing](../contributing/index.md) to the project
