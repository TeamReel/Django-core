# Data Model: Frontend-Backend Integration Guides

**Feature**: 030-frontend-backend-integration
**Date**: 2025-12-14
**Status**: Complete

## Overview

This is a **documentation feature**, not a traditional application with persistent data models. However, the guides define **interface patterns** and **conceptual entities** that downstream products will implement. This document catalogs those patterns as if they were data entities to ensure consistency and completeness.

---

## Core Interface Patterns (Conceptual Entities)

### 1. AuthProvider

**Purpose**: Manages authentication state and operations

**Attributes**:
| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `user` | `User \| null` | Yes | Currently authenticated user or null if not authenticated |
| `isAuthenticated` | `boolean` | Yes | Derived from user state, true if user is non-null |
| `isLoading` | `boolean` | Yes | True during authentication operations (login, logout, refresh) |

**Operations**:
| Operation | Signature | Description |
|-----------|-----------|-------------|
| `login` | `(credentials: Credentials) => Promise<void>` | Authenticates user with provided credentials |
| `logout` | `() => Promise<void>` | Ends user session and clears authentication state |
| `refreshToken` | `() => Promise<void>` | Refreshes authentication token before expiry |

**Relationships**:
- **Uses** → `ApiClient` (for login/logout API calls)
- **Consumed by** → Application components (via hooks or props)

**State Transitions**:
```
[Not Authenticated] --login()--> [Loading] --success--> [Authenticated]
                                      |--failure--> [Not Authenticated + Error]
[Authenticated] --logout()--> [Loading] --> [Not Authenticated]
[Authenticated] --refreshToken()--> [Loading] --> [Authenticated]
```

**Validation Rules**:
- `user` must be null when `isAuthenticated` is false
- `isLoading` must be true during async operations
- `logout()` must clear all user state
- `login()` must validate credentials before setting user

**Example Implementation Storage**:
- Cookies (httpOnly for tokens)
- Memory (user object)
- Not localStorage (anti-pattern for tokens)

---

### 2. ContextProvider

**Purpose**: Maintains and propagates organization/project context across the application

**Attributes**:
| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `currentOrg` | `Organization \| null` | Yes | Selected organization or null if none selected |
| `currentProject` | `Project \| null` | Yes | Selected project or null if none selected |

**Operations**:
| Operation | Signature | Description |
|-----------|-----------|-------------|
| `setOrg` | `(orgId: string) => Promise<void>` | Sets current organization, validates access, clears project |
| `setProject` | `(projectId: string) => Promise<void>` | Sets current project within organization |
| `clearContext` | `() => void` | Clears all context (on logout or error) |

**Relationships**:
- **Uses** → `ApiClient` (for context validation API calls)
- **Consumed by** → `ApiClient` (injects context into all requests)
- **Related to** → `AuthProvider` (context must match authenticated user)

**State Transitions**:
```
[No Context] --setOrg(id)--> [Org Selected, No Project]
[Org Selected] --setProject(id)--> [Org + Project Selected]
[Org + Project Selected] --setOrg(newId)--> [New Org Selected, No Project]
[Any State] --clearContext()--> [No Context]
```

**Validation Rules**:
- `currentProject` must be null if `currentOrg` is null
- `setProject()` must fail if `currentOrg` is null
- `setOrg()` must validate user has access to organization
- `setProject()` must validate project belongs to current organization
- Context must be cleared on user logout

**Storage Strategy**:
- localStorage (orgId, projectId) for persistence
- sessionStorage (fallback for tab-specific context)
- Validation on load (ensure IDs still valid)

**Propagation Mechanism**:
- API client reads currentOrg/currentProject
- Injects as headers: `X-Organization-Id`, `X-Project-Id`
- Or as query params: `?org_id=...&project_id=...` (backend convention)

---

### 3. ApiClient

**Purpose**: Standardizes authenticated, context-aware HTTP requests to Core-App backend

**Attributes**:
| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `baseURL` | `string` | Yes | Base URL for all API requests (e.g., `https://api.example.com`) |
| `authProvider` | `AuthProvider` | Yes | Reference to auth provider for token injection |
| `contextProvider` | `ContextProvider` | Yes | Reference to context provider for org/project injection |

**Operations**:
| Operation | Signature | Description |
|-----------|-----------|-------------|
| `get` | `<T>(url: string, options?: RequestOptions) => Promise<Response<T>>` | HTTP GET request |
| `post` | `<T>(url: string, body: any, options?: RequestOptions) => Promise<Response<T>>` | HTTP POST request |
| `put` | `<T>(url: string, body: any, options?: RequestOptions) => Promise<Response<T>>` | HTTP PUT request |
| `delete` | `<T>(url: string, options?: RequestOptions) => Promise<Response<T>>` | HTTP DELETE request |

**RequestOptions Type**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `headers` | `Record<string, string>` | No | Additional headers to merge with defaults |
| `params` | `Record<string, string>` | No | Query parameters to append to URL |
| `signal` | `AbortSignal` | No | Signal for request cancellation |
| `skipAuth` | `boolean` | No | Skip authentication header injection (for public endpoints) |
| `skipContext` | `boolean` | No | Skip context header injection (rare) |

**Response Type**:
| Field | Type | Description |
|-------|------|-------------|
| `data` | `T` | Parsed response body |
| `status` | `number` | HTTP status code |
| `headers` | `Headers` | Response headers |

**Error Handling**:
- 401 → Trigger `authProvider.refreshToken()` and retry, or redirect to login
- 403 → Throw `PermissionDeniedError` for application handling
- 4xx → Throw `ClientError` with user-friendly message
- 5xx → Throw `ServerError` with retry suggestion
- Network errors → Throw `NetworkError` with offline detection

**Retry Logic**:
- Transient errors (5xx, network): Exponential backoff (1s, 2s, 4s max 3 retries)
- Auth errors (401): Single retry after token refresh
- Client errors (4xx): No retry

**CSRF Protection**:
- Read CSRF token from cookie (`csrftoken`) or meta tag
- Include in `X-CSRFToken` header for non-GET requests

**Context Injection**:
- Automatically inject `X-Organization-Id: <orgId>` if `contextProvider.currentOrg` is set
- Automatically inject `X-Project-Id: <projectId>` if `contextProvider.currentProject` is set
- Skip injection if `options.skipContext === true`

---

### 4. CachePolicy

**Purpose**: Defines caching behavior for API responses

**Attributes**:
| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| None (interface only) | - | - | Implemented by consumers |

**Operations**:
| Operation | Signature | Description |
|-----------|-----------|-------------|
| `shouldCache` | `(request: Request) => boolean` | Determines if request should be cached |
| `getCacheDuration` | `(response: Response) => number` | Returns cache duration in milliseconds |
| `shouldRevalidate` | `(cachedAt: Date) => boolean` | Determines if cached data should be revalidated |
| `invalidate` | `(pattern: string) => void` | Invalidates cached entries matching pattern |

**Implementation Strategies** (examples will show):
1. **HTTP-based**: Read `Cache-Control` headers, respect `ETag`, send `If-None-Match`
2. **Time-based**: Cache for fixed duration (e.g., 5 minutes)
3. **Hybrid**: Combine HTTP headers with application-level rules

**Cache Key Strategy**:
- URL + method + org/project context
- Example: `GET:/api/projects?org_id=123`

**Invalidation Patterns**:
- Exact match: `/api/projects/456`
- Prefix match: `/api/projects/*`
- Context-based: `org:123/*` (all cached data for org 123)

**Validation Rules**:
- `shouldCache()` must return false for POST/PUT/DELETE requests
- `getCacheDuration()` must return 0 for uncacheable responses
- `invalidate()` must be called after mutations
- Cached data must include original request context (org/project IDs)

---

### 5. RequestState (Type Definition)

**Purpose**: Standardizes async operation state representation

**Type Definition**:
```typescript
type RequestState<T, E = Error> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: E };
```

**Usage**:
- Component state for API calls
- Provides exhaustive type checking
- Supports discriminated unions

**State Transitions**:
```
[idle] --fetch()--> [loading] --success--> [success with data]
                           |--failure--> [error with error object]
[success] --refetch()--> [loading] --> [success | error]
[error] --retry()--> [loading] --> [success | error]
```

**UI Mapping**:
- `idle` → No action taken yet (initial state)
- `loading` → Show spinner, disable actions
- `success` → Display data
- `error` → Show error message, offer retry

---

## Supporting Types

### User
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  permissions: string[];
}
```

### Organization
```typescript
interface Organization {
  id: string;
  name: string;
  slug: string;
}
```

### Project
```typescript
interface Project {
  id: string;
  name: string;
  organizationId: string;
}
```

### Credentials
```typescript
interface Credentials {
  email: string;
  password: string;
}
```

### Error Types
```typescript
class PermissionDeniedError extends Error {
  constructor(message: string);
}

class ClientError extends Error {
  constructor(message: string, public statusCode: number);
}

class ServerError extends Error {
  constructor(message: string, public statusCode: number);
}

class NetworkError extends Error {
  constructor(message: string);
}
```

---

## Data Flow Diagrams

### Authentication Flow
```
User Input (email/password)
  ↓
AuthProvider.login(credentials)
  ↓
ApiClient.post('/auth/login', credentials)
  ↓ (Success)
Store user in AuthProvider.user
  ↓
Application updates UI
```

### Context Propagation Flow
```
User selects Organization
  ↓
ContextProvider.setOrg(orgId)
  ↓
ApiClient.get('/orgs/:id') [validates access]
  ↓ (Success)
Store org in ContextProvider.currentOrg
  ↓
All subsequent ApiClient requests include X-Organization-Id header
```

### Data Fetching with Caching Flow
```
Component requests data
  ↓
Check CachePolicy.shouldCache(request)
  ↓ (Cached)
Check CachePolicy.shouldRevalidate(cachedAt)
  ↓ (Fresh)
Return cached data
  ↓ (Stale or Not Cached)
ApiClient.get(url)
  ↓ (Success)
Store in cache with CachePolicy.getCacheDuration(response)
  ↓
Return data to component
```

---

## Entity Lifecycle

### AuthProvider Lifecycle
1. **Initialization**: Check for existing session (cookie, token in memory)
2. **Active Session**: User authenticated, token valid
3. **Token Refresh**: Near expiry, refresh token proactively
4. **Logout**: Clear all auth state, invalidate tokens
5. **Re-authentication**: Session expired, redirect to login

### ContextProvider Lifecycle
1. **Initialization**: Load context from storage (localStorage)
2. **Validation**: Verify stored orgId/projectId still valid for user
3. **Active Context**: Context set, injected into all requests
4. **Context Switch**: User changes org/project, clear stale data
5. **Context Clear**: Logout or error, remove all context

### ApiClient Lifecycle
1. **Instantiation**: Receive authProvider, contextProvider references
2. **Request Interception**: Inject auth tokens, context headers
3. **Response Handling**: Parse, cache, transform, throw errors
4. **Retry Logic**: Automatic retry for transient failures
5. **Cleanup**: Cancel in-flight requests on component unmount

---

## Constraints and Invariants

### Global Invariants
- `AuthProvider.user` must be null if not authenticated
- `ContextProvider.currentProject` must be null if `currentOrg` is null
- `ApiClient` must never expose auth tokens in logs or errors
- All auth tokens must use httpOnly cookies or secure storage (not localStorage)
- Context must be validated on every page load

### Per-Interface Invariants
- **AuthProvider**: `isLoading` must be true during async operations
- **ContextProvider**: Context must match authenticated user's access
- **ApiClient**: All non-GET requests must include CSRF token
- **CachePolicy**: POST/PUT/DELETE responses must never be cached
- **RequestState**: Must be one of 4 states (idle, loading, success, error)

---

## Scale and Performance Notes

### Expected Data Volumes
- **AuthProvider**: Single user object (~1KB)
- **ContextProvider**: Single org + project (~2KB total)
- **ApiClient cache**: Depends on CachePolicy, assume 10MB browser limit
- **Example code**: 15-20 TypeScript files (~500-800 LOC total)

### Performance Targets
- **Auth operations**: <500ms (login, logout, refresh)
- **Context switch**: <200ms (validation + storage update)
- **Cache lookup**: <10ms (in-memory)
- **Cache invalidation**: <50ms (pattern matching)

### Scalability Considerations
- CachePolicy must support cache eviction (LRU, size limits)
- ApiClient should support request deduplication (multiple components fetch same data)
- Context validation should batch check (don't validate on every request)

---

## Testing Considerations

### AuthProvider Tests
- Login success/failure scenarios
- Token refresh before expiry
- Logout clears all state
- Session persistence across page reload
- CSRF token handling

### ContextProvider Tests
- Org selection validates access
- Project selection requires org
- Context cleared on logout
- Storage persistence and restoration
- Invalid context handling

### ApiClient Tests
- Auth header injection
- Context header injection
- 401/403 error handling
- Retry logic for transient errors
- CSRF token inclusion
- Request cancellation

### CachePolicy Tests
- shouldCache() respects request method
- getCacheDuration() reads HTTP headers
- shouldRevalidate() respects staleness
- invalidate() clears matching entries

---

## Future Considerations

### Potential Extensions (Release 2+)
- **NotificationProvider**: Interface for notifications integration
- **ResourceDisplayProvider**: Interface for usage/quota display
- **WebSocketClient**: Real-time updates pattern
- **OfflineQueue**: Offline-first request queuing

### Breaking Change Strategy
- All interfaces versioned in guides (e.g., "AuthProvider v1.0")
- Breaking changes documented in CHANGELOG
- Migration guides for major versions
- Deprecated patterns marked in anti-patterns section

---

## Summary

This data model documents the **interface patterns** that downstream products will implement when integrating with Core-App. While not traditional database entities, these patterns have well-defined attributes, operations, relationships, and lifecycle states that guide implementation consistency across teams.

**Next Steps**: Generate TypeScript type definitions in `contracts/` directory based on these patterns.
