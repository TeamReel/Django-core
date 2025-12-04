# Module Reference

Documentation for each Core module, including purpose, models, API endpoints, and configuration.

## Core Modules

| Module | Description | Status |
|--------|-------------|--------|
| [Accounts](accounts.md) | User authentication and management | ✓ |
| [Organisations](organisations.md) | Multi-tenant organisation management | ✓ |
| [Projects](projects.md) | Project and workspace management | ✓ |
| [Permissions](permissions.md) | Hierarchical role-based access control | ✓ |
| [Audit](audit.md) | Audit logging and event tracking | ✓ |
| [Tasks](tasks.md) | Background task scheduling (Celery) | ✓ |
| [Notifications](notifications.md) | Notification delivery system | ✓ |
| [Transactions](transactions.md) | Credits and transaction ledger | ✓ |
| [Settings](settings.md) | Configuration and feature flags | ✓ |
| [I18n Preferences](i18n.md) | Internationalization preferences | ✓ |
| [Security Baseline](security-baseline.md) | Security infrastructure | ✓ |
| [API](api.md) | REST API foundation (DRF) | ✓ |

## Module Documentation Structure

Each module document follows a consistent structure:

1. **Overview** - Purpose and key concepts
2. **Configuration** - Settings and environment variables
3. **Models** - Database entities and relationships
4. **API Endpoints** - REST endpoints (with Swagger links)
5. **Usage Examples** - Common patterns and code samples
6. **Related Features** - Links to ADRs and related modules

## Extension Points

For information on extending Core modules in downstream projects, see [Architecture → Extension Points](../architecture/extension-points.md).
