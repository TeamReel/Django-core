# API Contracts Reference - Feature 033

**Feature Branch**: 033-demo-pages-for
**Last Updated**: 2025-12-17

---

## Overview

This feature **consumes** existing backend APIs (B01-B21) without creating new endpoints.

All API contracts are defined in **B13 (API Baseline)** via OpenAPI specifications.

---

## Backend API References

### Core Foundation (B01-B04)

- **B01 Health Check**: `GET /api/health/`
  - Response: System health status, service statuses, version info
  - OpenAPI: See B13 module

- **B02 Constitution**: `GET /api/constitution/rules/`
  - Response: List of constitution rules with violation counts
  - OpenAPI: See B13 module

- **B03 Security**: `GET /api/security/events/`
  - Response: Security events (failed logins, suspicious IPs, ASVS status)
  - OpenAPI: See B13 module

- **B04 i18n**: `GET /api/i18n/languages/`
  - Response: Available languages
  - OpenAPI: See B13 module

### Identity & Multi-tenancy (B05-B08)

- **B05 Authentication**:
  - `POST /api/auth/login/` - Login
  - `POST /api/auth/logout/` - Logout
  - `GET /api/users/me/` - Current user profile
  - OpenAPI: See B13 module

- **B06 Organisations**:
  - `GET /api/organisations/` - List organisations
  - `GET /api/organisations/:id/` - Organisation detail
  - OpenAPI: See B13 module

- **B07 Projects**:
  - `GET /api/projects/` - List projects (org-scoped via X-Organisation-ID header)
  - `GET /api/projects/:id/` - Project detail
  - OpenAPI: See B13 module

- **B08 Authorization**:
  - `GET /api/permissions/` - Current user permissions
  - OpenAPI: See B13 module

### Configuration & Audit (B09-B12)

- **B09 Audit**:
  - `GET /api/audit/` - List audit events (filterable by type, user, date)
  - OpenAPI: See B13 module

- **B10 Feature Flags**:
  - `GET /api/features/` - List feature flags (org-scoped)
  - OpenAPI: See B13 module

- **B11 Credits**:
  - `GET /api/credits/` - Credit account (org-scoped)
  - `GET /api/credits/transactions/` - Credit transactions (org-scoped)
  - OpenAPI: See B13 module

- **B12 Preferences**:
  - `GET /api/preferences/` - User preferences
  - `POST /api/preferences/` - Update preferences (theme, language)
  - OpenAPI: See B13 module

### Platform (B13-B18)

- **B13 API Baseline**:
  - `GET /api/docs/` - Swagger UI (embedded in demo page)
  - OpenAPI specs available at `/api/docs/swagger.json`

- **B15 Background Tasks**:
  - `GET /api/tasks/` - List tasks (pending, running, success, failed)
  - OpenAPI: See B13 module

- **B16/B17 Notifications**:
  - `GET /api/notifications/` - List notifications (filterable by type, read status)
  - `POST /api/notifications/:id/mark-read/` - Mark notification as read
  - OpenAPI: See B13 module

- **B18 Observability**:
  - `GET /api/observability/metrics/` - Real-time metrics (response times, error rates, connections)
  - OpenAPI: See B13 module

### Documentation (B19, B21)

- **B19 Deployment**:
  - `GET /api/deployment/status/` - Current environment, container status, health
  - OpenAPI: See B13 module

- **B21 Documentation**:
  - `GET /api/docs/metadata/` - Documentation metadata (MkDocs links, module status)
  - OpenAPI: See B13 module

---

## TypeScript Interface Contracts

Frontend pages use TypeScript interfaces matching backend response shapes.

**Example**:

```typescript
// From @django-core/api-client or local types
interface Organisation {
  id: string;
  name: string;
  slug: string;
  member_count: number;
  project_count: number;
  credits_balance: number;
  created_at: string;
  updated_at: string;
}

interface AuditEvent {
  id: string;
  event_type: string;
  actor_email: string;
  organisation_id: string | null;
  project_id: string | null;
  metadata: Record<string, any>;
  timestamp: string;
}
```

---

## Request Headers

### Authentication
- Session cookie (set by B05 on login, automatically included by browser)

### CSRF Protection
- `X-CSRFToken` header (injected by F09 API client for POST/PUT/DELETE requests)

### Context Propagation
- `X-Organisation-ID` header (set by F03 context switcher when org is selected)
- `X-Project-ID` header (set by F03 context switcher when project is selected)

---

## Error Response Format

All backend APIs use consistent error format (B13 standard):

```typescript
interface ApiError {
  error: string; // Human-readable message
  code: string; // Machine-readable error code
  details?: Record<string, any>; // Optional additional context
}
```

**HTTP Status Codes**:
- `200 OK` - Success
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Frontend API Client

Demo pages use **F09 Integration Patterns** API client utilities:

```typescript
import { useApi } from '@django-core/integration-patterns';

// Example: Fetch organisations
const { data, loading, error } = useApi<Organisation[]>('/api/organisations/');

// Example: POST with CSRF token
import { apiClient } from '@django-core/integration-patterns';
await apiClient.post('/api/preferences/', { theme: 'dark' });
```

**Features**:
- Automatic CSRF token injection
- Session cookie handling
- Error normalization
- Context header propagation (when F03 context is set)

---

## Polling Endpoints

### Observability Metrics
- Endpoint: `GET /api/observability/metrics/`
- Polling interval: 30 seconds
- Frontend implementation: `setInterval` in useEffect with cleanup

---

## OpenAPI Documentation

Full OpenAPI specifications available at:
- **Swagger UI**: [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/)
- **JSON spec**: [http://localhost:8000/api/docs/swagger.json](http://localhost:8000/api/docs/swagger.json)

---

## Next Steps

1. ✅ API contracts referenced
2. ⏭️ Create quickstart.md (developer onboarding)
3. ⏭️ Update agent context with planning decisions
