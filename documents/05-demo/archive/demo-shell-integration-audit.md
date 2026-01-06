# Demo Shell Integration Audit

**Date:** January 5, 2026
**Scope:** Demo Shell (Frontend) & Core Backend Integration
**Status:** Analysis & Evidence

## Overview

This document provides an evidence-based analysis of how the `demo-shell` (the integrated webapp) uses the implemented modules. It maps the runtime architecture, frontend routes, API calls, and module coverage based on the repository state.

---

## A) Runtime Architecture (Railway/Docker)

The demo is deployed as two separate services defined by their respective Dockerfiles.

### 1. Backend Service
*   **Source:** `Dockerfile`
*   **Build:** Python 3.12, installs dependencies from `requirements/production.txt`.
*   **Runtime:**
    *   **Process:** Gunicorn via `scripts/start.py`.
    *   **Port:** Exposes 8080.
    *   **Healthcheck:** `http://localhost:8080/health/`.
    *   **Static Files:** Collected during build (`collectstatic`).
*   **Configuration:** `DJANGO_SETTINGS_MODULE=config.settings.production`.

### 2. Frontend Service
*   **Source:** `Dockerfile.frontend`
*   **Build:** Node 20, uses `pnpm` to build shared packages (`/packages`) and the demo app (`/examples/demo-shell`).
*   **Runtime:**
    *   **Process:** Static file server (`serve`).
    *   **Command:** `serve -s dist -l tcp://0.0.0.0:$PORT`.
    *   **Environment:** `VITE_API_BASE_URL` is injected at **build time** (ARG).

---

## B) Demo-Shell Page Map

The frontend application (`examples/demo-shell`) uses `react-router-dom`.

| Route | Component | Purpose |
| :--- | :--- | :--- |
| `/login`, `/register` | `LoginPage`, `RegisterPage` | Authentication & Onboarding |
| `/dashboard` | `DashboardPage` | Landing & Context Overview |
| `/organisations` | `OrganisationsPage` | List Organisations (B06) |
| `/organisations/:id` | `OrganisationDetailPage` | Org Details & Members |
| `/projects` | `ProjectsPage` | List Projects (B07) |
| `/feature-flags` | `FeatureFlagsPage` | Feature Flags Management (B10) |
| `/audit-log` | `AuditLogPage` | System Audit Log (B09) |
| `/files` | `FilesPage` | File Management (B22) |
| `/integration-status` | `IntegrationStatusPage` | System Health/Status |
| `/health` | `HealthCheckPage` | Platform Health (B18) |
| `/docs/*` | `DocsPage` | Documentation Viewer |

---

## C) API Integration Map

Mapping of frontend API calls to backend routes.

| Frontend Component | API Call (Evidence) | Backend Route | Status |
| :--- | :--- | :--- | :--- |
| **Auth** | `packages/auth` (via `api-client`) | `/api/v1/auth/token/` | ✅ Wired |
| **Organisations** | `fetch('${baseUrl}/api/v1/organisations/')` | `/api/v1/organisations/` | ✅ Wired |
| **Projects** | `fetch` (via `projectsApi.ts`) | `/api/v1/projects/` | ✅ Wired |
| **Feature Flags** | `fetch('${baseUrl}/api/v1/settings/feature-flags/...')` | `/api/v1/settings/` | ✅ Wired |
| **Audit Log** | `fetch('${baseUrl}/api/v1/activity/')` | `/api/v1/activity/` | ✅ Wired |
| **Files** | `fetch('${baseUrl}/api/v1/files/')` | `/api/v1/files/` | ✅ Wired |
| **Health** | `fetch('/health/live')` | `/health/live` | ✅ Wired |

---

## D) Module Coverage

Analysis based on `REGISTRY.md` vs. Code Usage.

| Module ID | Name | Demo Used? | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **B01-B04** | Core Infra | **Yes** | Implicit | Foundation for all requests. |
| **B05** | Accounts & Auth | **Yes** | `LoginPage`, `useAuth` | Fully integrated. |
| **B06** | Organisations | **Yes** | `OrganisationsPage` | Fully integrated. |
| **B07** | Projects | **Yes** | `ProjectsPage` | Fully integrated. |
| **B08** | Permissions | **Yes** | `PermissionGuards.tsx` | Frontend checks role/permissions. |
| **B09** | Audit Logging | **Yes** | `AuditLogPage` | Hits `/api/v1/activity/`. |
| **B10** | Settings & Flags | **Yes** | `FeatureFlagsPage` | Hits `/api/v1/settings/`. |
| **B15** | Tasks | **No** | - | API exists at `/api/v1/tasks/`, no UI. |
| **B16** | Notifications | **No** | `NotificationsPage` | Page is static docs only. |
| **B18** | Observability | **Partial** | `HealthCheckPage` | Hits health endpoints, not metrics. |
| **B22** | File & Media | **No** | `FilesPage` | **Fixed.** Uses `/api/v1/files/`. |
| **B24** | Search | **No** | `SearchPage` | Likely mock or incomplete. |
| **F10** | Demo Shell | **Yes** | `examples/demo-shell` | The container itself. |

---

## E) Gaps & Recommendations

### Top Gaps
1.  **Missing Tasks UI (B15):** Backend has full Celery/Redis task system (`/api/v1/tasks/`), but no UI exists to view/trigger tasks.
2.  **Missing Notifications UI (B16):** `NotificationsPage` is a placeholder.

### Prioritized Next Actions
1.  **Implement Tasks Dashboard:** Create UI for `/api/v1/tasks/`.
2.  **Wire up Notifications:** Connect UI to `/api/v1/notifications/`.
