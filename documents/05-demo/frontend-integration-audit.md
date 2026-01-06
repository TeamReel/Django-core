# Frontend-Backend Integration Audit Report

**Date:** 2026-01-06
**Scope:** Demo Shell (`demo/src`) vs Backend Models
**Status:** 🟡 Partially Integrated

## Executive Summary
This audit validates which populated backend tables are actually visible or consumable in the frontend application. It maps specific frontend components to backend API endpoints to verify data flow.

## 🟢 Fully Connected
*Tables where data is populated AND a corresponding UI component fetches/displays it.*

| Model | Endpoint | Primary Consumer (file) | Interaction Pattern | Status |
| :--- | :--- | :--- | :--- | :--- |
| **projects.Project** | `/api/v1/projects/` | `ProjectsPage.tsx` | **Fetch on Mount.** Lists all projects for the organization. Also used in `ProjectDetailPage` for single retrieval. | ✅ **verified** |
| **notifications.Notification** | `/api/v1/user-notifications/` | `NotificationsPage.tsx` | **Paginated List.** Fetches unread/read items. Uses `mark-all-read` endpoint for bulk actions. | ✅ **verified** |
| **transactions.Transaction** | `/api/v1/transactions/` | `CreditsPage.tsx` | **Filterable List.** Fetches history with filters for `source_type`, `user`, and `date_range`. | ✅ **verified** |
| **notif.Preference** | `/api/v1/contextual-notifications/preferences/` | `PreferencesPage.tsx` | **Configuration Form.** Loads current user settings (GET) and saves changes (POST) for specific event types. | ✅ **verified** |
| **organisations.Membership** | `/api/v1/organisations/:slug/members/` | `OrganisationDetailPage.tsx` | **List View.** Fetches list of members to display in the organization settings. | ✅ **verified** |
| **observability.SystemMetric** | `/api/observability/metrics/` | `ObservabilityPage.tsx` | **Polling Loop (30s).** Real-time fetching of p95 latency, error rates, and active connections. | ✅ **verified** |
| **platform.Health** | `/api/observability/demo-health/` | `HealthCheckPage.tsx` | **Diagnostic Check.** Fetch on mount to validate DB, Cache, and Service status. | ✅ **verified** |

## 🟡 Partially Connected / Mocked Overrides
*Tables present but where the UI "fakes" the interaction or limits visibility.*

| Model | Endpoint / Logic | Consumer | Issue Detail |
| :--- | :--- | :--- | :--- |
| **credits.CreditsBalance** | `context.organisation.slug === 'datalab'` | `DashboardPage.tsx` | **Hardcoded Alert.** The dashboard checks if the org slug is 'datalab' to show a warning, ignoring the actual `transactions.BalancePolicy`. The `CreditsPage` DOES show the real balance, but the high-visibility alert is fake. |
| **audit.AuditEvent** | `/api/v1/audit/?project_id=X` | `ProjectDetailPage.tsx` | **Scope Restricted.** only fetches audit logs *scoped to a specific project*. There is no UI to view the Organization-level audit logs (login events, membership changes), despite 4,000+ records existing. |

## 🔴 Disconnected (Data Exists, No UI)
*Tables we populated in the backend that currently have **NO** verified frontend page.*

| Model | Record Count | Missing Endpoint Usage | Impact |
| :--- | :--- | :--- | :--- |
| **activities.Activity** | 425 | `/api/v1/activities/` | **Invisible.** No "Activity Feed" component exists to show user actions (e.g. "Brian joined project X"). |
| **trans.BalancePolicy** | 6 | `/api/v1/transactions/policies/` | **Invisible.** Admins cannot see or configure the low-credit threshold settings. |
| **notif.OrgPolicy** | 6 | `/api/v1/contextual-notifications/policies/` | **Invisible.** Admins cannot configure which notifications are forced ON/OFF for the whole org. |

## Recommendations

1.  **Un-mock Dashboard Credits:** Update `DashboardPage.tsx` to use the `useCreditBalance` hook instead of hardcoded slug checks.
2.  **Add Organisation Audit Log:** Create a generic `AuditLogTable` component and add it to `OrganisationDetailPage.tsx` fetching `/api/v1/audit/?organization=X`.
3.  **Create Activity Feed:** Implement an `ActivityFeed` widget on the Dashboard using `/api/v1/activities/` to make the seeded data visible.
