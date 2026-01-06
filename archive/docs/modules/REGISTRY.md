# Module Registry

**Canonical Source of Truth for All Core Modules**

This registry tracks every module in the Django Core-App system.
**Rules:**
1. Every shipped module MUST be listed here.
2. Status MUST match the Roadmap.
3. Categories are fixed: Backend, Frontend, Data & ML, Platform, Integration, Operations.

## Registry

| ID | Name | Category | Status | Responsibility | Docs | Demo |
|----|------|----------|--------|----------------|------|------|
| **B01** | Core Project Skeleton | Backend | ✅ Complete | Project structure, settings, dependencies | [Link](../system/architecture.md) | N/A |
| **B02** | Constitutional Engine | Platform | ✅ Complete | Quality enforcement, linting, testing rules | [Link](../platform/constitution.md) | Dashboard |
| **B03** | Core Security Baseline | Backend | ✅ Complete | CSP, headers, secret management | [Link](../platform/constitution.md) | N/A |
| **B04** | Core I18n Base | Backend | ✅ Complete | Locale middleware, translation files | [Link](i18n-guide.md) | N/A |
| **B05** | Accounts & Auth | Backend | ✅ Complete | User model, login, registration, MFA | [Link](accounts.md) | /login |
| **B06** | Organisations | Backend | ✅ Complete | Multi-tenancy, org management | [Link](organisations.md) | /orgs |
| **B07** | Projects | Backend | ✅ Complete | Workspace isolation | [Link](projects.md) | /projects |
| **B08** | Permissions (RBAC) | Backend | ✅ Complete | Role-based access control | [Link](permissions.md) | Settings |
| **B09** | Audit Logging | Backend | ✅ Complete | Security & action history | [Link](audit.md) | /audit |
| **B10** | Settings & Flags | Backend | ✅ Complete | Dynamic config, feature flags | [Link](settings.md) | Settings |
| **B11** | Transactions | Backend | ✅ Complete | Credits, ledger, billing foundation | [Link](transactions.md) | /billing |
| **B12** | I18n Preferences | Backend | ✅ Complete | User/Org language settings | [Link](i18n-preferences-guide.md) | Settings |
| **B13** | API Baseline | Backend | ✅ Complete | DRF setup, schema, versioning | [Link](api.md) | /api/docs |
| **B14** | Web-UI Baseline | Backend | ✅ Complete | Django templates, admin theme | [Link](web-ui-baseline.md) | /admin |
| **B15** | Tasks & Scheduling | Backend | ✅ Complete | Celery, Redis, periodic tasks | [Link](tasks.md) | Dashboard |
| **B16** | Notifications Base | Backend | ✅ Complete | Delivery channels (Email, SMS) | [Link](notifications.md) | N/A |
| **B17** | Contextual Notifs | Backend | ✅ Complete | In-app alerts, activity stream | [Link](notifications-feature/baseline.md) | Navbar |
| **B18** | Observability | Operations | ✅ Complete | Logging, metrics, tracing | [Link](observability/overview.md) | /health |
| **B19** | Deploy Templates | Operations | ✅ Complete | Docker, Railway, K8s configs | [Link](../operations/deployment/README.md) | N/A |
| **B20** | Scaffolding CLI | Platform | ✅ Complete | Code generation tools | [Link](../development/getting-started/cli.md) | N/A |
| **B21** | Docs & Examples | Platform | ✅ Complete | Documentation system | [Link](../index.md) | /docs |
| **F01** | Design System | Frontend | ✅ Complete | Tokens, components, theme | [Link](design-system.md) | Storybook |
| **F10** | Demo Shell | Frontend | 🚧 In Progress | Integrated demo environment | [Link](../demo/README.md) | / |

*(Note: This registry is a living document. Add new modules as they are specified.)*
