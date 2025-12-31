# Django Core-App Documentation

Welcome to the Django Core-App documentation. This platform provides reusable, product-agnostic infrastructure for Django-based applications.

## Quick Links

<div class="grid cards" markdown>

- :material-rocket-launch: **[Getting Started](getting-started/index.md)**

  Set up your development environment and make your first contribution.

- :material-sitemap: **[Architecture](architecture/index.md)**

  Understand system design, layering, and extension points.

- :material-book-open-variant: **[Guides](guides/index.md)**

  Learn how to use Core APIs effectively.

- :material-puzzle: **[Modules](modules/index.md)**

  Reference documentation for each Core module.

- :material-star: **[Features](features/index.md)**

  Documentation for specific features and sub-systems.

- :material-shield-check: **[Security](security/index.md)**

  Security checklists and audit reports.

- :material-test-tube: **[Testing](testing/index.md)**

  Testing guides, checklists, and status.

- :material-code-tags: **[Examples](examples/index.md)**

  Working code examples demonstrating Core patterns.

- :material-account-group: **[Contributing](contributing/index.md)**

  Contribution guidelines and workflow documentation.

</div>

## What is Django Core-App?

Django Core-App is a modular platform providing:

- **Authentication & Authorization** - JWT-based auth with hierarchical RBAC
- **Multi-tenancy** - Organisation and project management
- **Background Tasks** - Celery-based async processing with observability
- **Audit Logging** - Comprehensive event tracking
- **API Foundation** - Django REST Framework with consistent patterns

## Core Principles

1. **Product-Agnostic** - No product-specific logic; extend via downstream projects
2. **Security First** - Secure defaults, centralized auth, audit trails
3. **Observable** - Structured logging, metrics, health checks
4. **Developer Friendly** - Clear documentation, consistent APIs, easy setup

## Getting Help

- **Troubleshooting**: [Common issues and solutions](troubleshooting/index.md)
- **Architecture Decisions**: [ADRs explaining design choices](adr/)
- **API Reference**: [Swagger UI](/api/docs/)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/django-core.git
cd django-core

# Set up environment
cp .env.example .env
docker-compose up -d

# Run migrations and start
python manage.py migrate
python manage.py runserver
```

For detailed setup instructions, see [Getting Started → Quickstart](getting-started/quickstart.md).
