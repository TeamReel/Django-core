# API Client

## 1. Purpose & Responsibility
The **API Client** is a TypeScript wrapper around the Backend REST API. It handles CSRF tokens, error normalization, and type-safe requests.

**Responsibilities:**
*   **CSRF Protection:** Automatically includes CSRF tokens for mutating requests.
*   **Error Handling:** Normalizes error responses (400/401/500) into a consistent shape.
*   **Type Safety:** Provides TypeScript types for API request/response shapes.

## 2. Domain-Agnostic Rationale
Direct `fetch()` calls are verbose and error-prone. This client abstracts:
*   CSRF token extraction from cookies.
*   JSON serialization.
*   Error parsing.

## 3. Key Concepts

### 3.1 fetchWithCSRF (`src/fetchWithCSRF.ts`)
Wrapper around `fetch()` that auto-includes CSRF token:
```typescript
fetchWithCSRF('/api/auth/login/', { method: 'POST', body: {...} });
```

### 3.2 Error Normalizer (`src/errorNormalizer.ts`)
Converts Django REST Framework errors into a standard format:
```typescript
{ field: 'email', message: 'This email is already in use.' }
```

## 4. Public Interfaces (Exports)

**Package:** `@django-core/api-client`

```typescript
import { fetchWithCSRF, normalizeError } from '@django-core/api-client';
```

## 5. Integrations & Dependencies
*   **Consumed By:** All frontend packages that call the Backend API.
*   **Backend API:** All `src/**/api/` endpoints.

## 6. Status & Phase History
*   **Phase:** 6 (Frontend Foundations)
*   **Status:** ✅ Complete
*   **Source Code:** `packages/api-client/`
