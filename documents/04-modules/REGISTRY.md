# Module Registry

## Overview
This registry tracks every module in the Django Core-App system.
**Rules:**
1. Every shipped module MUST be listed here.
2. Status MUST match the Roadmap.
3. Categories are fixed: Backend, Frontend, Data & ML, Platform, Integration, Operations.

## Registry

| ID | Name | Category | Status | Responsibility | Docs | Phase |
|----|------|----------|--------|----------------|------|-------|
| **B01** | Core Project Skeleton | Backend | ✅ Complete | Project structure, settings | [Link](backend/B01-core-project-skeleton.md) | 1 |
| **B02** | Constitutional Engine | Backend | ✅ Complete | Quality enforcement | [Link](backend/B02-constitutional-enforcement-engine.md) | 1 |
| **B03** | Core Security Baseline | Backend | ✅ Complete | CSP, headers, secrets | [Link](backend/B03-core-security-baseline.md) | 1 |
| **B04** | Core I18n Base | Backend | ✅ Complete | Locale middleware | [Link](backend/B04-core-internationalization-base.md) | 1 |
| **B05** | Accounts & Auth | Backend | ✅ Complete | User model, login | [Link](backend/B05-core-accounts-authentication.md) | 2 |
| **B06** | Organisations | Backend | ✅ Complete | Multi-tenancy | [Link](backend/B06-organizations.md) | 2 |
| **B07** | Projects | Backend | ✅ Complete | Workspace isolation | [Link](backend/B07-projects-workspaces.md) | 2 |
| **B08** | Permissions (RBAC) | Backend | ✅ Complete | Access control | [Link](backend/B08-hierarchical-access-control.md) | 2 |
| **B09** | Audit Logging | Backend | ✅ Complete | Security history | [Link](backend/B09-audit-logging.md) | 3 |
| **B10** | Settings & Flags | Backend | ✅ Complete | Dynamic config | [Link](backend/B10-settings-feature-flags.md) | 3 |
| **B11** | Transactions | Backend | ✅ Complete | Credits, ledger | [Link](backend/B11-core-transactions-credits.md) | 3 |
| **B12** | I18n Preferences | Backend | ✅ Complete | User/Org language | [Link](backend/B12-i18n-preferences.md) | 3 |
| **B13** | API Baseline | Backend | ✅ Complete | DRF setup | [Link](backend/B13-api-baseline.md) | 4 |
| **B14** | Web-UI Baseline | Backend | ✅ Complete | Django templates | [Link](backend/B14-web-ui-baseline.md) | 4 |
| **B15** | Tasks & Scheduling | Backend | ✅ Complete | Celery, Redis | [Link](backend/B15-tasks-scheduling.md) | 4 |
| **B16** | Notifications Base | Backend | ✅ Complete | Delivery channels | [Link](backend/B16-notifications-baseline.md) | 4 |
| **B17** | Contextual Notifs | Backend | ✅ Complete | In-app alerts | [Link](backend/B17-contextual-notification-service.md) | 4 |
| **B18** | Observability | Operations | ✅ Complete | Logging, metrics | [Link](operations/B18-observability.md) | 5 |
| **B19** | Deploy Templates | Operations | ✅ Complete | Docker, Railway | [Link](operations/B19-deploy-templates.md) | 5 |
| **B20** | Scaffolding CLI | Platform | ✅ Complete | Code generation | [Link](platform/B20-scaffolding-cli.md) | 5 |
| **B21** | Docs & Examples | Platform | ✅ Complete | Documentation | [Link](platform/B21-docs-examples.md) | 5 |
| **B22** | File & Media | Backend | 🚧 In Progress | Uploads, storage | [Link](backend/B22-file-media-management.md) | 9 |
| **B23** | Real-time Infra | Backend | 🚧 In Progress | WebSockets | [Link](backend/B23-realtime-infrastructure.md) | 9 |
| **B24** | Full-text Search | Backend | 🚧 In Progress | Search engine | [Link](backend/B24-fulltext-search.md) | 9 |
| **F01** | Design System | Frontend | ✅ Complete | Tokens, components | [Link](frontend/F01-frontend-design-system.md) | 6 |
| **F02** | Core Auth UI | Frontend | ✅ Complete | Login screens | [Link](frontend/F02-core-auth-identity-ui.md) | 6 |
| **F03** | Context Switcher | Frontend | ✅ Complete | Org/Project menu | [Link](frontend/F03-multi-tenancy-context-switcher.md) | 6 |
| **F04** | Notifications UI | Frontend | ✅ Complete | Notification bell | [Link](frontend/F04-notifications-hub-ui.md) | 6 |
| **F05** | Resource Display | Frontend | ✅ Complete | Tables, alerts | [Link](frontend/F05-resource-display-alerts.md) | 7 |
| **F06** | Page Templates | Frontend | ✅ Complete | Layouts | [Link](frontend/F06-reusable-page-templates.md) | 7 |
| **F07** | Theme Support | Frontend | ✅ Complete | Branding | [Link](frontend/F07-theme-support-brand-variants.md) | 7 |
| **F09** | Integration Guides | Frontend | ✅ Complete | API patterns | [Link](frontend/F09-frontend-backend-integration-guides.md) | 7 |
| **F10** | Demo Shell | Frontend | ✅ Complete | Demo container | [Link](frontend/F10-demo-shell.md) | 8 |
| **F10b** | Demo Database | Frontend | 🚧 In Progress | Seed data | [Link](frontend/F10b-database.md) | 8 |
| **F10b** | Demo Pages | Frontend | 📋 Planned | Module pages | - | 8 |
