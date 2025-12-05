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

### Transactions & Credits Engine (Feature 011 - B11)

Generic transaction and credits engine for usage-based billing with flexible prepaid/postpaid policies.

**Key Capabilities**:
- **Single-Ledger Design**: Signed decimal amounts (positive=credit, negative=debit)
- **Computed Balances**: On-demand calculation with Redis caching (60s TTL)
- **Idempotency**: Prevents duplicate charges and usage events
- **Multi-Tenant Isolation**: Organization and project-level scoping
- **Flexible Policies**: Prepaid (block at zero) or postpaid (allow negative) billing
- **Immutable Records**: Transaction and usage event history never modified
- **High Precision**: NUMERIC(14,4) for financial accuracy

**Quick Start**:
```python
from decimal import Decimal
from transactions.services import (
    record_usage_event,
    create_transaction,
    get_organization_balance
)

# Record billable usage
event = record_usage_event(
    event_type='ai_inference',
    user=request.user,
    organization=org,
    metadata={'model': 'gpt-4', 'tokens': 1500},
    idempotency_key=f"inference-{request_id}"
)

# Charge for usage
transaction = create_transaction(
    amount=Decimal('-25.00'),  # Negative = charge
    organization=org,
    source_type='usage_event',
    usage_event=event,
    created_by=request.user,
    idempotency_key=f"charge-{event.id}",
    notes="AI inference charge"
)

# Check balance
balance = get_organization_balance(org.id)
print(f"Current balance: ${balance['current_balance']}")
```

**Documentation**:
- [API Documentation](src/transactions/README.md)
- [Billing Integration Guide](docs/billing-integration.md)
- [Quickstart Guide](kitty-specs/011-core-transactions-credits/quickstart.md)
- [Architecture Decision Records](docs/adr/)
  - [ADR-011-001: Single-Ledger vs Double-Entry](docs/adr/ADR-011-001-single-ledger-vs-double-entry.md)
  - [ADR-011-002: Computed vs Stored Balance](docs/adr/ADR-011-002-computed-vs-stored-balance.md)
  - [ADR-011-003: Idempotency Key Retention](docs/adr/ADR-011-003-idempotency-key-retention.md)
  - [ADR-011-004: Redis Cache Invalidation](docs/adr/ADR-011-004-redis-cache-invalidation.md)

**Performance**:
- <10ms balance queries (with Redis cache)
- <50ms transaction writes
- 100 transactions/sec throughput
- 93% test coverage

---

### Notifications Baseline (Feature 016 - B16)

Multi-channel notification system with email, in-app, and webhook delivery.

**Key Capabilities**:
- **Multi-Channel Delivery**: Email (SMTP), in-app (database), webhook (HTTP POST)
- **Configurable Retry Policies**: Per-type retry with exponential backoff
- **Secure Webhooks**: HMAC-SHA256 signature verification
- **Audit Integration**: Full delivery tracking via B09 audit logging
- **Celery Integration**: Async delivery via B15 task scheduling
- **Observability**: Prometheus metrics, health checks

**Quick Start**:
```python
from notifications.models import Notification, NotificationType

# Send email notification
notification = Notification.objects.create(
    type=NotificationType.objects.get(code='default'),
    channel='email',
    recipient='user@example.com',
    payload={
        'subject': 'Welcome!',
        'body': 'Thanks for signing up.',
    }
)
# Celery task delivers asynchronously

# Query in-app notifications
unread = Notification.objects.filter(
    recipient_user=user,
    channel='in_app',
    read_at__isnull=True
)
```

**Built-in Retry Policies**:
| Policy | Attempts | Window | Use Case |
|--------|----------|--------|----------|
| `best-effort` | 3 | 1 hour | Default, non-critical |
| `critical` | 10 | 24 hours | Password resets, security |

**Documentation**:
- [Architecture Overview](docs/notifications-baseline.md)
- [Extension Guide](docs/notifications-extension-guide.md)
- [Troubleshooting](docs/notifications-troubleshooting.md)
- [Webhook Verification](docs/webhook-signature-verification.md)
- [ADR-016: Retry Policies](docs/adr/016-notification-retry-policies.md)

---

### Platform Observability Foundation (Feature 018 - B18)

Foundational observability primitives for health checks, structured logging, and metrics.

**Key Capabilities**:
- **Health Checks**: Kubernetes liveness (`/health/live`) and readiness (`/health/ready`) probes
- **Structured Logging**: JSON logs with correlation IDs and PII redaction
- **Metrics**: Prometheus-compatible `/metrics` endpoint with task observability
- **Pluggable Exporters**: Protocol-based architecture for Prometheus, StatsD, OpenMetrics
- **B15 Integration**: ObservableTask base class for Celery task metrics
- **Exception Isolation**: All observability hooks never propagate exceptions

**Quick Start**:
```python
# Enable observability in settings
INSTALLED_APPS = [
    # ...
    'observability',
]

# Check health endpoints
curl http://localhost:8000/health/live
curl http://localhost:8000/health/ready

# View metrics
curl http://localhost:8000/metrics

# Use observable tasks
from observability.tasks import ObservableTask

@app.task(base=ObservableTask)
def send_email(recipient, subject, body):
    # Automatic metrics: tasks_started_total, task_duration_seconds, etc.
    ...
```

**Built-in Metrics**:
| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total HTTP requests by method/status |
| `http_request_duration_seconds` | Histogram | HTTP request latency |
| `tasks_started_total` | Counter | Total Celery tasks started |
| `tasks_completed_total` | Counter | Total tasks completed (success/failure) |
| `task_duration_seconds` | Histogram | Task execution duration |

**Documentation**:
- [Quick Start](docs/observability.md)
- [Extension Guide](docs/observability-extension-guide.md)
- [Troubleshooting](docs/observability-troubleshooting.md)
- [ADR-019: Metric Exporter Pluggability](docs/adr/019-metric-exporter-pluggability.md)

---

### Scaffolding CLI (Feature 020 - B20)

Generate Django apps from templates with best practices built-in.

**Key Capabilities**:
- **Built-in Templates**: 4 production-ready templates (minimal, api-first, service, ui-backed)
- **Custom Templates**: Create and share your own templates via Jinja2
- **Template Inheritance**: Extend built-in templates with additional files
- **Interactive UX**: Prompts for missing variables with validation
- **Non-Interactive Mode**: CI/CD support with `--non-interactive` flag
- **Automatic Validation**: Ruff, mypy, and constitutional checks on generated code
- **Atomic Rollback**: Failed generation cleans up partial changes

**Quick Start**:
```bash
# Generate a minimal app
python manage.py scaffold generate minimal accounts

# Generate an API-first app with custom model
python manage.py scaffold generate api-first products --var model_name=Product

# Generate a service layer
python manage.py scaffold generate service orders --var service_name=OrderService

# Generate a full-stack UI app
python manage.py scaffold generate ui-backed dashboard --var model_name=Widget

# List available templates
python manage.py scaffold list

# Validate generated code
python manage.py scaffold validate --directory products/ --strict
```

**Built-in Templates**:
| Template | Description | Extends | Files |
|----------|-------------|---------|-------|
| `minimal` | Basic Django app with models, tests, migrations | - | 7 files |
| `api-first` | DRF API with serializers, viewsets, permissions | `minimal` | +9 files |
| `service` | Service layer for business logic | `minimal` | +4 files |
| `ui-backed` | Full-stack with views, forms, templates, static | `minimal` | +14 files |

**CI/CD Integration**:
```bash
#!/bin/bash
# CI pipeline example
python manage.py scaffold generate minimal accounts --non-interactive
python manage.py scaffold generate api-first products --var model_name=Product --non-interactive
python manage.py scaffold validate --strict
```

**Documentation**:
- [CLI User Guide](docs/scaffolding/cli-guide.md) - Complete command reference
- [Template Authoring Guide](docs/scaffolding/template-authoring.md) - Create custom templates
- [Architecture Overview](docs/scaffolding/architecture.md) - System design and patterns
- [Extension Guide](docs/scaffolding/extension-guide.md) - Advanced customization
- [Quickstart Tutorial](docs/scaffolding/quickstart.md) - Step-by-step walkthrough

**Features**:
- ✅ 4 built-in templates for common Django patterns
- ✅ Custom template support via `--template-dir`
- ✅ Jinja2-based templating with inheritance
- ✅ Automatic validation (Ruff, mypy, constitutional checks)
- ✅ Non-interactive mode for CI/CD pipelines
- ✅ Interactive prompts for missing variables
- ✅ Atomic rollback on errors
- ✅ Template discovery from multiple sources
- ✅ Comprehensive test coverage (>80%)
- ✅ Type-safe with mypy validation

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
- **Task Queue**: Celery 5.3+ with Redis broker
- **API**: Django REST Framework 3.14+
- **Observability**: django-prometheus, Prometheus metrics
- **Testing**: pytest 8.0+, pytest-django, pytest-cov
- **Type Safety**: mypy 1.8+, django-stubs
- **Code Quality**: ruff, black, pre-commit hooks

---

## Getting Started

### Quick Setup

**Option A: Docker (Recommended)**

```bash
git clone https://github.com/TeamReel/django-core.git
cd django-core
cp .env.example .env
docker-compose -f docker-compose.local.yml up
```

Visit [http://localhost:8000](http://localhost:8000) - you're ready!

**Option B: Local Python**

```bash
git clone https://github.com/TeamReel/django-core.git
cd django-core
python -m venv venv && source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements/local.txt
cp .env.example .env  # Edit with your database settings
python manage.py migrate
python manage.py runserver
```

📚 **[Full Quickstart Guide](docs/getting-started/quickstart.md)** | **[Prerequisites](docs/getting-started/prerequisites.md)**

---

## Development

### Running Quality Checks

```bash
pytest                        # Run tests
pytest --cov=src             # With coverage
mypy src/                    # Type checking
ruff check src/              # Linting
black src/                   # Formatting
pre-commit run --all-files   # All checks
```

📚 **[First Contribution](docs/getting-started/first-contribution.md)** | **[Testing Guide](docs/contributing/testing.md)** | **[Code Style](docs/contributing/code-style.md)**

---

## Project Structure

```
django-core/
├── src/                          # Django applications (accounts, permissions, audit, etc.)
├── tests/                        # Test suite (mirrors src/)
├── docs/                         # Documentation
├── kitty-specs/                  # Feature specifications
├── examples/                     # Example implementations
├── requirements/                 # Python dependencies
├── k8s/                          # Kubernetes manifests
└── docker-compose.*.yml          # Docker configurations
```

📚 **[Full Project Structure Guide](docs/getting-started/project-structure.md)**

---

## Deployment

Django Core-App provides comprehensive deployment templates for all environments:

### Quick Start

**Local Development** (<5 minutes):
```bash
cp .env.example .env
docker-compose -f docker-compose.local.yml up
```
Access: http://localhost:8000

**Staging Environment**:
```bash
docker build -t django-core:staging .
docker-compose -f docker-compose.staging.yml up -d
```
Full production parity with Nginx, PostgreSQL, Redis, and Celery.

**Production Deployment** (<30 minutes):
```bash
# Single-server VPS deployment
docker-compose -f docker-compose.prod.yml up -d
```
HTTPS with SSL termination, external PostgreSQL/Redis, zero-downtime updates.

**Kubernetes** (<2 minutes):
```bash
kubectl create secret generic django-core-secrets \
  --from-literal=SECRET_KEY="..." \
  --from-literal=DATABASE_URL="..." \
  --from-literal=REDIS_URL="..."

kubectl apply -f k8s/
```
Autoscaling (3-10 replicas), health checks, Prometheus metrics.

### Documentation

- **[Deployment Quickstart Guide](docs/deployment/quickstart.md)** - Step-by-step deployment for all environments
- **[Configuration Reference](docs/deployment/configuration-reference.md)** - Complete environment variable catalog
- **[Troubleshooting Guide](docs/deployment/troubleshooting.md)** - Solutions to 10+ common deployment issues
- **[Cloud Providers Guide](docs/deployment/cloud-providers.md)** - AWS, GCP, Azure deployment specifics
- **[Alternatives Guide](docs/deployment/alternatives.md)** - Traefik, Caddy, Helm, Kustomize options
- **[ADR-020: Deployment Strategy](docs/adr/020-deployment-automation-strategy.md)** - Architecture decision rationale

### Deployment Files

```
django-core/
├── Dockerfile                    # Multi-stage production build
├── .dockerignore                 # Build context optimization
├── docker-compose.local.yml      # Local development (hot-reload)
├── docker-compose.staging.yml    # Staging (Nginx + full stack)
├── docker-compose.prod.yml       # Production (external services)
├── .env.example                  # Environment variables template
├── k8s/                          # Kubernetes manifests
│   ├── configmap.yaml            # Non-sensitive configuration
│   ├── secret.yaml               # Credentials template
│   ├── deployment-web.yaml       # Django + Gunicorn (3+ replicas)
│   ├── deployment-celery-worker.yaml  # Task workers
│   ├── deployment-celery-beat.yaml    # Task scheduler (1 replica)
│   ├── service-web.yaml          # LoadBalancer service
│   └── hpa-web.yaml              # Horizontal Pod Autoscaler
├── nginx/                        # Nginx reverse proxy configs
│   ├── local.conf                # Simple HTTP proxy
│   ├── staging.conf              # HTTP + security headers
│   └── production.conf           # HTTPS + SSL termination
└── docs/deployment/              # Comprehensive deployment docs
```

### Technologies

- **Containerization**: Docker multi-stage builds, non-root user (UID 1000)
- **Orchestration**: Docker Compose (dev/staging/prod), Kubernetes (production clusters)
- **WSGI Server**: Gunicorn (4 workers, 30s timeout)
- **Reverse Proxy**: Nginx (TLS 1.2/1.3, HSTS, CSP, static file serving)
- **Observability**: B18 health checks (`/health/live`, `/health/ready`), Prometheus `/metrics`
- **Security**: B03 compliance (SECURE_SSL_REDIRECT, SESSION_COOKIE_SECURE, HSTS)
- **Task Scheduling**: B15 Celery worker + beat services

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

1. Follow the [First Contribution Guide](docs/getting-started/first-contribution.md)
2. Review [Spec Kitty Workflow](docs/contributing/spec-kitty-workflow.md) for feature development
3. Create a feature branch from `main`
4. Run quality checks: `pre-commit run --all-files`
5. Submit pull request following [PR Guidelines](docs/contributing/pr-guidelines.md)

📚 **[Contributing Guidelines](docs/contributing/index.md)** | **[Code Style](docs/contributing/code-style.md)** | **[Testing](docs/contributing/testing.md)**

---

## License

Proprietary - Team Reel

---

## Support

For questions or issues, contact the engineering team at TeamReel.
