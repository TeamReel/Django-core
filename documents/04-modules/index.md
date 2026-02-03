# Module Documentation

## Overview
This directory contains detailed documentation for the implemented modules in the repository.
These documents are generated based on the **actual source code** (`src/`) and represent the current reality of the system.

## Backend Modules (`src/`)

### Core Foundation
*   **[B03: Security Baseline](backend/B03-security-baseline.md)**
    *   CSP, Security Headers, Secrets Management.
*   **[B05: Accounts & Authentication](backend/B05-accounts.md)**
    *   User identity, Login/Register, Email Verification.
*   **[B06: Organizations](backend/B06-organizations.md)**
    *   Multi-tenancy, Tenant management, Membership.
*   **[B07: Projects & Workspaces](backend/B07-projects-workspaces.md)**
    *   Resource scoping, Project-level permissions.
*   **[B08: Permissions & RBAC](backend/B08-permissions-rbac.md)**
    *   Role-based access control, hierarchical permissions.

### System Services
*   **[B09: Audit Logging](backend/B09-audit-logging.md)**
    *   Immutable activity history (Who, What, When).
*   **[B10: Settings & Feature Flags](backend/B10-settings-feature-flags.md)**
    *   Dynamic configuration and feature toggles.
*   **[B11: Transactions & Credits](backend/B11-transactions-credits.md)**
    *   Usage tracking, ledger, balance management.
*   **[B12: I18n Preferences](backend/B12-i18n-preferences.md)**
    *   Language/locale preferences per User/Org.
*   **[B15: Tasks & Scheduling](backend/B15-tasks-scheduling.md)**
    *   Async background processing (Celery).
*   **[B16: Notifications](backend/B16-notifications.md)**
    *   Multi-channel delivery (Email, In-App).
*   **[B17: Contextual Notifications](backend/B17-contextual-notifications.md)**
    *   Real-time in-app alerts and toasts.
*   **[B22: Files & Media](backend/B22-files.md)**
    *   File uploads and metadata management.
*   **[B23: Real-time WebSockets](backend/B23-real-time-websockets.md)**
    *   Bidirectional communication and live updates.
*   **[B24: Full-Text Search](backend/B24-search.md)**
    *   Search across Projects, Files, and resources.
*   **[B24: Hierarchical Search Navigation](search/hierarchy.md)**
    *   Entity-centric navigation trees from search results. Pluggable resolver pattern for domain-specific hierarchies.
*   **[B35: Smart Asset Library](backend/B35-media-library.md)**
    *   AI-powered media management and search.

## Frontend Modules (`packages/`)

### UI Foundation
*   **[F01: Design System](frontend/F01-design-system.md)**
    *   Design tokens, UI components, theming.
*   **[F02: Auth UI](frontend/F02-auth-ui.md)**
    *   Login/Register forms and session management.
*   **[API Client](frontend/api-client.md)**
    *   Type-safe API wrapper with CSRF handling.

### Navigation & Interaction
*   **[F03: Context Switcher](frontend/F03-context-switcher.md)**
    *   Organisation/Project navigation.
*   **[F04: Notifications Hub](frontend/F04-notifications-hub.md)**
    *   In-app notification bell and list.

## Platform Tools

*   **[B20: Scaffolding CLI](platform/B20-scaffolding-cli.md)**
    *   Code generation for Django apps and models.

## Operations
Security (B03)** protects everything. CSP, HTTPS, CSRF protection.
2.  **Identity (B05)** is the entry point. A user logs in.
3.  **Organisations (B06)** provide the context. The user selects a tenant.
4.  **Projects (B07)** provide the workspace. The user works on resources within a project.
5.  **Permissions (B08)** control access. Who can do what, where.
6.  **Audit (B09)** watches everything. Every action is recorded.
7.  **Settings (B10)** control the behavior. Feature flags enable/disable UI elements.
8.  **Transactions (B11)** track usage. Credits are deducted for billable actions.
9.  **Tasks (B15)** handle the heavy lifting. Sending emails or processing files happens in the background.
10. **Frontend (F01-F04)** provides the UI. React components consume the Backend API
## How It Fits Together

1.  **Identity (B05)** is the entry point. A user logs in.
2.  **Organisations (B06)** provide the context. The user selects a tenant.
3.  **Projects (B07)** provide the workspace. The user works on resources within a project.
4.  **Audit (B09)** watches everything. Every action is recorded.
5.  **Settings (B10)** control the behavior. Feature flags enable/disable UI elements.
6.  **Tasks (B15)** handle the heavy lifting. Sending emails or processing files happens in the background.
