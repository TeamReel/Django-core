# Production Reality Audit (Railway)

**Date:** January 5, 2026
**Scope:** Live Production Environment (Railway)
**Status:** Verified via HTTP Probes

## Overview

This audit documents the *actual* behavior of the deployed production environment, serving as the source of truth over the repository code. It identifies what is deployed, what is reachable, and where the implementation diverges from the codebase.

---

## A) Production Endpoints Discovery

The following base URLs were discovered and verified via HTTP probes:

*   **Frontend:** `https://demo.teamreel.app` (Status: 200 OK)
*   **Backend API:** `https://api.teamreel.app` (Status: 200 OK on health endpoints)

### API Surface Status
| Endpoint | Status | Notes |
| :--- | :--- | :--- |
| `/health/live` | **200 OK** | System is healthy |
| `/api/schema/` | **200 OK** | OpenAPI schema available |
| `/api/docs/` | **200 OK** | Swagger UI available |
| `/api/v1/` | **500 Error** | Root endpoint is failing (Configuration error) |
| `/api/` | **404 Not Found** | Legacy root correctly removed |

---

## B) Production Page-to-API Map

Mapping of frontend pages to their actual production API behavior based on network traffic analysis.

| Page / Feature | Production API Call | Result | Status |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST /api/v1/auth/token/` | **400 Bad Request** | ✅ **Verified** (Endpoint exists, rejected dummy data) |
| **Organisations** | `GET /api/v1/organisations/` | **401 Unauthorized** | ✅ **Verified** (Protected) |
| **Projects** | `GET /api/v1/projects/` | **401 Unauthorized** | ✅ **Verified** (Protected) |
| **Audit Log** | `GET /api/v1/activity/` | **401 Unauthorized** | ✅ **Standardized** |
| **Files** | `GET /api/files/` | **404 Not Found** | ❌ **BROKEN** (Frontend calls legacy path) |
| **Tasks** | `GET /api/v1/tasks/` | **200 OK** | ⚠️ **PUBLICLY EXPOSED** (No auth required) |
| **Search** | `GET /api/v1/search/` | **401 Unauthorized** | ✅ **Verified** (Protected) |

---

## C) Module Verification Table

| Module ID | Name | Probe Used | Production Result | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **B05** | Auth | `POST /api/v1/auth/token/` | **VERIFIED** (400) | Functional. |
| **B06** | Organisations | `GET /api/v1/organisations/` | **VERIFIED** (401) | Protected. |
| **B07** | Projects | `GET /api/v1/projects/` | **VERIFIED** (401) | Protected. |
| **B09** | Audit Logging | `GET /api/v1/activity/` | **VERIFIED** (401) | V1 route exists. |
| **B10** | Settings | `GET /api/v1/settings/` | **VERIFIED** (401) | Protected. |
| **B15** | Tasks | `GET /api/v1/tasks/` | **VERIFIED** (200) | **SECURITY RISK:** Endpoint is public. |
| **B16** | Notifications | `GET /api/v1/notifications/` | **VERIFIED** (401) | Protected. |
| **B22** | Files | `GET /api/v1/files/` | **VERIFIED** (401) | V1 route exists (Frontend uses wrong one). |
| **B24** | Search | `GET /api/v1/search/` | **VERIFIED** (401) | Protected. |
| **B25** | Cache | `GET /api/v1/system/cache/metrics/` | **VERIFIED** (401) | Protected. |

---

## D) Delta Summary (Repo vs. Production)

1.  **Frontend/Backend Mismatch (Files):**
    *   **Repo/Frontend:** Calls `/api/files/`.
    *   **Production:** Exposes `/api/v1/files/`.
    *   **Result:** File management in the demo is broken (404s).

2.  **Legacy Route Persistence (Audit):**
    *   **Repo:** `src/config/urls.py` includes `path("api/v1/activity/", include("audit.urls"))`.
    *   **Production:** `/api/v1/activity/` is active and protected. Legacy `/api/audit/` is removed.
    *   **Goal:** Should be consolidated to `/api/v1/activity/` (which also exists).

3.  **Security Misconfiguration (Tasks):**
    *   **Repo:** `src/tasks/views.py` sets `permission_classes = []`.
    *   **Production:** `/api/v1/tasks/` is publicly accessible without authentication.

4.  **API Root Failure:**
    *   **Production:** `/api/v1/` returns 500. This prevents API exploration via the browser.

---

## E) Recommendations

### 1. Fix Demo Integration (High Priority)
*   Update `examples/demo-shell/src/pages/files/index.tsx` to use `/api/v1/files/` instead of `/api/files/`.
*   Update `examples/demo-shell/src/pages/config/AuditLogPage.tsx` to use `/api/v1/activity/`.

### 2. Security Hardening (Critical)
*   **Secure B15 Tasks:** Add `IsAuthenticated` or `IsAdminUser` permission to `TasksListView` in `src/tasks/views.py`. It should not be public.

### 3. API Cleanup
*   **Remove Legacy Routes:** Remove `path("api/observability/", ...)` from `src/config/urls.py` to force usage of V1 endpoints.
*   **Fix API Root:** Investigate why `api_root` view at `/api/v1/` is throwing 500 (likely a reverse resolution error or missing view name).
