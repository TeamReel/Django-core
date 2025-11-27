# Django Core

Enterprise-ready Django foundation with authentication, organizations, projects, hierarchical access control, audit logging, and security baseline.

## Features

### Authentication & User Management (Feature 005)

Custom user model with email-based authentication, password reset, and Django REST Framework integration.

**Key Capabilities**:
- Email-based authentication (no username)
- Password reset with secure tokens
- User profile management
- Django REST Framework API endpoints

**Documentation**: [src/accounts/README.md](src/accounts/README.md)

---

### Organization Management (Feature 006)

Multi-tenant organization system with soft deletion, member management, and rate limiting.

**Key Capabilities**:
- Create and manage organizations
- Add/remove members with role-based access
- Soft deletion with 30-day grace period
- Rate limiting per organization (Redis-backed)
- Prometheus metrics for observability

**Documentation**: [src/organisations/README.md](src/organisations/README.md)

---

### Project Management (Feature 007)

Project workspaces within organizations with hierarchical access control.

**Key Capabilities**:
- Create projects within organizations
- Project archival and restoration
- Hierarchical permissions (organization → project)
- Slug-based URLs with uniqueness constraints

**Documentation**: [src/projects/README.md](src/projects/README.md)

---

### Hierarchical Access Control (Feature 008 - B08)

Role-based permission system with inheritance across organization and project hierarchies.

**Key Capabilities**:
- Define roles with granular permissions
- Assign roles at organization and project levels
- Permission inheritance (organization → project)
- Permission caching with Redis
- Built-in roles: Owner, Admin, Member, Viewer
- Additive-only permission model (no subtraction)

**Quick Start**:
```python
from permissions.api import check_permission, assign_role

# Check permission
if check_permission(user, 'projects.update', resource=project):
    project.name = "New Name"
    project.save()

# Assign role
assign_role(user, 'admin', organisation=org)
```

**Documentation**:
- [API Documentation](src/permissions/README.md)
- [Architecture Decision Record](docs/architecture/decisions/ADR-008-additive-permission-inheritance.md)

---

### Audit Logging (Feature 009)

Immutable audit trail for system-wide activity tracking. Automatically logs permission checks, role changes, and custom application events.

**Key Capabilities**:
- Records WHO did WHAT, WHEN, and WHERE (organizational context)
- Read-only admin interface for searching and filtering events
- Automatic logging for B08 permission checks and role changes
- Graceful failure - audit never breaks application flow
- PostgreSQL JSONField with GIN index for fast metadata queries
- Prometheus metrics and Django signals for observability

**Quick Start**:
```python
from audit.api import audit_log

# Record an event
audit_log.record(
    'auth.login',
    user=request.user,
    metadata={'ip': request.META['REMOTE_ADDR']}
)

# Search events in admin
# Visit /admin/audit/auditevent/
```

**Documentation**:
- [API Documentation](src/audit/README.md)
- [Quickstart Guide](kitty-specs/009-audit-logging-system/quickstart.md)
- [Architecture Decision Record](docs/architecture/decisions/ADR-009-audit-event-storage.md)

**Performance**:
- 100 events/sec per instance
- <10ms overhead per audit call
- <2s searches on 100k+ events

---

### Security Baseline

Constitutional enforcement engine with security rule validation and ASVS compliance reporting.

**Key Capabilities**:
- Django security settings validation
- ASVS coverage reporting
- Constitutional rule engine
- Security audit logging

**Documentation**: [src/security_baseline/README.md](src/security_baseline/README.md)

---

## Technology Stack

- **Python**: 3.12+
- **Django**: 5.1+
- **Database**: PostgreSQL 13+ (JSONB, GIN indexes)
- **Cache**: Redis 6+ (django-redis)
- **API**: Django REST Framework 3.14+
- **Observability**: django-prometheus, Prometheus metrics
- **Testing**: pytest 8.0+, pytest-django, pytest-cov
- **Type Safety**: mypy 1.8+, django-stubs
- **Code Quality**: ruff, black, pre-commit hooks

---

## Getting Started

### Prerequisites

- Python 3.12+
- PostgreSQL 13+
- Redis 6+

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/TeamReel/django-core.git
   cd django-core
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements/local.txt
   ```

4. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your database and Redis settings
   ```

5. **Run migrations**:
   ```bash
   python manage.py migrate
   ```

6. **Create superuser**:
   ```bash
   python manage.py createsuperuser
   ```

7. **Run development server**:
   ```bash
   python manage.py runserver
   ```

Visit http://localhost:8000/admin/ to access the Django admin interface.

---

## Development

### Running Tests

```bash
# All tests
pytest

# Specific app
pytest tests/audit/

# With coverage
pytest --cov=src --cov-report=html
```

### Type Checking

```bash
mypy src/
```

### Code Quality

```bash
# Linting
ruff check src/

# Formatting
black src/

# Pre-commit hooks
pre-commit run --all-files
```

---

## Project Structure

```
django-core/
├── src/                          # Django applications
│   ├── accounts/                 # User authentication (Feature 005)
│   ├── organisations/            # Organization management (Feature 006)
│   ├── projects/                 # Project workspaces (Feature 007)
│   ├── permissions/              # Hierarchical access control (Feature 008)
│   ├── audit/                    # Audit logging (Feature 009)
│   ├── security_baseline/        # Security validation
│   ├── constitution_engine/      # Constitutional rule engine
│   ├── common/                   # Shared utilities
│   └── config/                   # Django settings
├── tests/                        # Test suite
├── docs/                         # Documentation
│   ├── architecture/             # ADRs and architecture docs
│   ├── howto/                    # How-to guides
│   └── examples/                 # Code examples
├── kitty-specs/                  # Feature specifications
├── requirements/                 # Python dependencies
│   ├── base.txt                  # Common dependencies
│   ├── local.txt                 # Development dependencies
│   └── production.txt            # Production dependencies
├── manage.py                     # Django management script
├── pyproject.toml                # Python project configuration
├── CHANGELOG.md                  # Project changelog
└── README.md                     # This file
```

---

## Architecture

### Hierarchical Access Control

Organizations contain projects. Permissions assigned at the organization level are inherited by all projects within that organization. Roles can be assigned at both levels:

```
Organization (Owner role)
  ├── Project A (inherits Owner permissions)
  ├── Project B (inherits Owner permissions)
  └── Project C (Admin role assigned specifically)
```

### Audit Logging

All permission checks and role changes are automatically logged. Custom events can be recorded via the `audit_log.record()` API. Events are stored in PostgreSQL with JSONB metadata for flexible querying.

### Security Validation

The constitutional engine validates Django security settings against a security baseline. Rules can be exempted for local development via `.security/exemptions.yaml`.

---

## Configuration

### Environment Variables

See `.env.example` for required environment variables:

- `SECRET_KEY`: Django secret key (generate with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`)
- `DEBUG`: Set to `False` in production
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `ALLOWED_HOSTS`: Comma-separated list of allowed hostnames

### Settings

Django settings are organized by environment:

- `config/settings/base.py`: Common settings
- `config/settings/local.py`: Development settings
- `config/settings/staging.py`: Staging settings
- `config/settings/production.py`: Production settings

Activate an environment: `export DJANGO_SETTINGS_MODULE=config.settings.production`

---

## Observability

### Prometheus Metrics

Metrics are exposed at `/metrics` endpoint:

- `audit_events_recorded_total`: Count of recorded audit events
- `audit_failures_total`: Count of audit recording failures
- `permission_checks_total`: Count of permission checks
- `permission_cache_hits_total`: Count of cache hits
- `permission_cache_misses_total`: Count of cache misses

### Audit Events

View audit events in the Django admin at `/admin/audit/auditevent/`. Use filters and search to find specific events. Export to CSV for external analysis.

---

## Contributing

1. Create a feature branch from `main`
2. Implement changes following the coding standards
3. Add tests (aim for >85% coverage)
4. Run type checking (`mypy src/`)
5. Run linting (`ruff check src/`)
6. Run tests (`pytest`)
7. Submit pull request

---

## License

Proprietary - Team Reel

---

## Support

For questions or issues, contact the engineering team at TeamReel.
