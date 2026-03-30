# Module Registry

## Overview
This registry tracks every module in the system.

**Rules:**
1. Every shipped module MUST be listed here.
2. Status MUST match the Roadmap.

## Registry

| ID | Name | Category | Status | Responsibility | Docs |
|----|------|----------|--------|----------------|------|
| **B03** | Security Baseline | Backend | ✅ Complete | CSP, headers, secrets | [Link](backend/B03-security-baseline.md) |
| **B05** | Accounts & Auth | Backend | ✅ Complete | User model, login | [Link](backend/B05-accounts.md) |
| **B06** | Organisations | Backend | ✅ Complete | Multi-tenancy | [Link](backend/B06-organizations.md) |
| **B07** | Projects | Backend | ✅ Complete | Workspace isolation | [Link](backend/B07-projects-workspaces.md) |
| **B08** | Permissions (RBAC) | Backend | ✅ Complete | Access control | [Link](backend/B08-permissions-rbac.md) |
| **B09** | Audit Logging | Backend | ✅ Complete | Security history | [Link](backend/B09-audit-logging.md) |
| **B10** | Settings & Flags | Backend | ✅ Complete | Dynamic config | [Link](backend/B10-settings-feature-flags.md) |
| **B11** | Transactions | Backend | ✅ Complete | Credits, ledger | [Link](backend/B11-transactions-credits.md) |
| **B12** | I18n Preferences | Backend | ✅ Complete | User/Org language | [Link](backend/B12-i18n-preferences.md) |
| **B15** | Tasks & Scheduling | Backend | ✅ Complete | Celery, Redis | [Link](backend/B15-tasks-scheduling.md) |
| **B16** | Notifications | Backend | ✅ Complete | Delivery channels | [Link](backend/B16-notifications.md) |
| **B17** | Contextual Notifs | Backend | ✅ Complete | In-app alerts | [Link](backend/B17-contextual-notifications.md) |
| **B18** | Observability | Operations | ✅ Complete | Logging, metrics | [Link](operations/B18-observability.md) |
| **B19** | Deployment | Operations | ✅ Complete | Docker, Railway | [Link](operations/B19-deployment.md) |
| **B20** | Scaffolding CLI | Platform | ✅ Complete | Code generation | [Link](platform/B20-scaffolding-cli.md) |
| **B22** | File & Media | Backend | ✅ Complete | Uploads, storage | [Link](backend/B22-files.md) |
| **B23** | Real-time Infra | Backend | ✅ Complete | WebSockets | [Link](backend/B23-real-time-websockets.md) |
| **B24** | Full-text Search | Backend | ✅ Complete | Search engine | [Link](backend/B24-search.md) |
| **B25** | Cache Layer | Backend | ✅ Complete | Caching patterns | — |
| **B26** | Project Access | Backend | ✅ Complete | Project-level ACL | — |
| **B30** | Activities & Periods | Backend | ✅ Complete | Events, seasons | — |
| **B31** | Content Templates | Backend | ✅ Complete | AI content generation | — |
| **B32** | Sport Configuration | Backend | ✅ Complete | Sport rules, positions | — |
| **B33** | Brand Identity | Backend | ✅ Complete | Design tokens, logos | — |
| **B34** | Generative Pipelines | Backend | ✅ Complete | AI generation factory | [Link](B34-generative-pipelines/production-checklist.md) |
| **B35** | Smart Asset Library | Backend | ✅ Complete | DAM, tagging | [Link](B35-smart-asset-library/index.md) |
| **B37** | Workflow Engine | Backend | ✅ Complete | State machine | [Link](B37-workflow-engine.md) |
| **B39** | Search Navigation | Backend | ✅ Complete | Hierarchical search | [Link](search/hierarchy.md) |
| **B40** | Fetch Guardrails | Backend | ✅ Complete | Frontend performance | — |
| **B41** | Navigation State | Backend | ✅ Complete | Recents & favorites | — |
| **B55** | Video Processing | Backend | ✅ Complete | Transcoding, thumbnails | — |
| **B62** | Activity Feed | Backend | ✅ Complete | Real-time feed | — |
| **B64** | Realtime Updates | Backend | ✅ Complete | WebSocket events | — |
| **B70** | Assets per Role | Backend | ✅ Complete | Role-based asset links | — |
| **F01** | Design System | Frontend | ✅ Complete | Tokens, components | [Link](frontend/F01-design-system.md) |
| **F02** | Auth UI | Frontend | ✅ Complete | Login screens | [Link](frontend/F02-auth-ui.md) |
| **F03** | Context Switcher | Frontend | ✅ Complete | Org/Project menu | [Link](frontend/F03-context-switcher.md) |
| **F04** | Notifications UI | Frontend | ✅ Complete | Notification bell | [Link](frontend/F04-notifications-hub.md) |
| **F05** | Navigation Model | Frontend | ✅ Complete | Sidebar, routing | [Link](frontend/F05-navigation-model.md) |

> Modules without docs link (—) are documented in code and via `05-demo/features/`.
