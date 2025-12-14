# Authentication API Integration Guide

## Overview

This guide shows how to integrate authentication with the Django Core-App backend, covering login/logout flows, CSRF protection, session management, and error handling. By following this guide, you'll implement the `AuthProvider` interface pattern that enables secure, framework-agnostic authentication across your frontend.

**Who should use this guide:**
- Frontend developers integrating with Core-App authentication
- Anyone implementing the `AuthProvider` interface pattern
- Teams using React, Vue, Angular, or vanilla TypeScript

**Related guides:**
- [Context Propagation](./context-propagation.md) - How to propagate org/project context
- [Data Fetching](./data-fetching.md) - Patterns for API calls with auth + context
- [Error Handling](./error-handling.md) - Comprehensive error strategy
- [Checklist](./checklist.md) - Pre-deployment validation

---

## Prerequisites

**Backend Requirements:**
- Django Core-App with B05 authentication module enabled
- Authentication endpoints: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session`
- CSRF protection enabled (Django middleware configures X-CSRFToken header)
- Session cookies (httpOnly, Secure flags set in production)

**Frontend Requirements:**
- TypeScript 5.x (supports strict mode type checking)
- React 18.x (for examples; patterns work with any framework)
- Access to `AuthProvider` contract from `@django-core/integration-guides-examples`

**Environment Setup:**
```bash
npm install @django-core/integration-guides-examples
# or
pnpm add @django-core/integration-guides-examples
```

---

## Login Flow

### Complete Flow Diagram

```
User enters credentials
         ↓
Extract CSRF token from meta tag or cookie
         ↓
POST /api/auth/login with:
  - email, password
  - X-CSRFToken header
  - credentials: 'include' (to send cookies)
         ↓
Backend validates credentials
         ↓
Response (201 Created):
  - Set-Cookie: sessionid=... (httpOnly, Secure)
  - JSON: { id, email, name, permissions }
         ↓
Store user in local state
Update UI: show authenticated layout
```

### Getting the CSRF Token

**Option 1: From HTML meta tag (recommended)**
```typescript
function getCsrfTokenFromMeta(): string {
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  if (!token) throw new Error('CSRF token not found in meta tag');
  return token;
}
```

**Option 2: From cookies**
```typescript
function getCsrfTokenFromCookie(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  if (!match) throw new Error('CSRF token not found in cookies');
  return match[1];
}
```

### Vanilla TypeScript Login Example

```typescript
interface LoginRequest {
  email: string;
  password: string;
}

async function login(credentials: LoginRequest): Promise<User> {
  const csrfToken = getCsrfTokenFromMeta();

  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
    body: JSON.stringify(credentials),
    credentials: 'include', // CRITICAL: Send cookies with request
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Login failed: ${error.detail || response.statusText}`);
  }

  const user = await response.json();
  return user;
}
```

### React Context Example

```typescript
import { createContext, useState, ReactNode } from 'react';

const AuthContext = createContext<AuthProvider | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RequestState<User>>({ status: 'idle' });

  const login = async (credentials: Credentials) => {
    setState({ status: 'loading' });
    try {
      const user = await loginFetch(credentials);
      setState({ status: 'success', data: user });
    } catch (error) {
      setState({ status: 'error', error: error as Error });
    }
  };

  return (
    <AuthContext.Provider value={{ state, login, logout, refresh, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
```

---

## Logout Flow

### Complete Flow Diagram

```
User clicks logout button
         ↓
POST /api/auth/logout with X-CSRFToken
         ↓
Backend:
  - Invalidate session
  - Return 204 No Content
         ↓
Frontend (optimistic):
  - Clear user state immediately
  - Redirect to login page
  - Handle errors gracefully
```

### Implementation

```typescript
async function logout(): Promise<void> {
  // Optimistic: clear state immediately
  setState({ status: 'idle' });

  try {
    const csrfToken = getCsrfTokenFromMeta();
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'X-CSRFToken': csrfToken,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      // Server-side logout failed, but we cleared local state
      // Log for debugging
      console.error('Logout failed on server:', response.statusText);
      // Still redirect - user is logged out locally
    }

    // Redirect to login
    window.location.href = '/login';
  } catch (error) {
    // Network error, but we cleared local state
    console.error('Logout request failed:', error);
    // Still redirect
    window.location.href = '/login';
  }
}
```

---

## Error Handling

### 401 Unauthorized (Unauthenticated)

**When it happens:**
- Session expired
- Token invalid or missing
- User never logged in

**What to do:**
1. Clear user state
2. Attempt token refresh (if implementation supports it)
3. If refresh fails, redirect to login page
4. Show message: "Your session has expired. Please log in again."

```typescript
function handle401(error: ApiError) {
  // Clear auth state
  setState({ status: 'idle' });

  // Attempt refresh (see Token Refresh section)
  try {
    refresh().then(() => {
      // Retry the request
    });
  } catch {
    // Refresh failed, redirect to login
    window.location.href = '/login';
  }
}
```

### 403 Forbidden (Permission Denied)

**When it happens:**
- User authenticated but lacks permission for resource/action
- User's role changed since login

**What to do:**
1. DO NOT redirect to login (user is already authenticated)
2. Show permission-denied UI
3. Log event for observability
4. Optional: Offer to navigate to accessible resources

```typescript
function handle403(error: ApiError) {
  // Show permission denied UI
  showNotification('You do not have permission to access this resource.', 'error');

  // Log for debugging
  console.warn('Permission denied:', {
    resource: error.response?.resource,
    requiredPermission: error.response?.required_permission,
    timestamp: new Date().toISOString(),
  });

  // Navigate to home or previous page
  history.back();
}
```

---

## Token Refresh (Background Session Management)

### Proactive Token Refresh

```typescript
// Check token expiry before it happens
function isTokenExpiring(expiresAt: Date): boolean {
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  return expiresAt <= fiveMinutesFromNow;
}

// Background refresh
async function refreshIfNeeded(user: User) {
  if (user.sessionExpiresAt && isTokenExpiring(user.sessionExpiresAt)) {
    await refresh();
  }
}

// Call periodically
setInterval(() => {
  if (state.status === 'success' && state.data) {
    refreshIfNeeded(state.data);
  }
}, 60000); // Check every minute
```

### Manual Refresh Implementation

```typescript
async function refresh(): Promise<User> {
  try {
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Refresh failed');
    }

    const user = await response.json();
    setState({ status: 'success', data: user });
    return user;
  } catch (error) {
    setState({ status: 'idle' });
    throw error;
  }
}
```

---

## Retry Patterns

### Retry with Exponential Backoff

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry 4xx errors (except 401 which will attempt refresh)
      if ((error as ApiError).statusCode && (error as ApiError).statusCode! >= 400 && (error as ApiError).statusCode! < 500 && (error as ApiError).statusCode !== 401) {
        throw error;
      }

      // Wait before next attempt
      if (attempt < maxAttempts - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// Usage
const user = await retryWithBackoff(() => login(credentials));
```

### Request Cancellation

```typescript
const abortController = new AbortController();

// Start request
const loginPromise = fetch('/api/auth/login', {
  signal: abortController.signal,
  // ... other options
});

// User clicks cancel button
abortController.abort();
```

---

## Anti-Patterns

### ❌ Storing Tokens in localStorage

**Why it's wrong:**
- XSS vulnerabilities can steal tokens
- localStorage is accessible to JavaScript
- No automatic expiry management

**Do this instead:**
```typescript
// ✅ Use httpOnly cookies (set by backend)
// - Inaccessible to JavaScript (XSS safe)
// - Automatically sent with requests
// - Managed by browser

// If you must store in JavaScript:
// ✅ Use sessionStorage (cleared on tab close)
// ✅ Mark credentials: 'include' to send cookies
```

### ❌ Skipping CSRF Protection

**Why it's wrong:**
```typescript
// ❌ WRONG: No CSRF token
fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password }),
  // Missing: 'X-CSRFToken' header
});
```

**Do this instead:**
```typescript
// ✅ ALWAYS include CSRF token
const csrfToken = getCsrfTokenFromMeta();
fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'X-CSRFToken': csrfToken,
  },
  body: JSON.stringify({ email, password }),
});
```

### ❌ Logging Credentials or Tokens

**Why it's wrong:**
- Tokens end up in logs, monitoring systems, error tracking
- Credentials exposed in network logs
- Breach of user privacy and security

**Do this instead:**
```typescript
// ❌ WRONG
console.log('Login request:', credentials);
console.log('User data:', user);

// ✅ RIGHT: Redact sensitive fields
function redactSensitive(obj: any) {
  const { password, token, sessionid, ...safe } = obj;
  return safe;
}

console.log('Login request:', redactSensitive(credentials));
console.log('User data:', redactSensitive(user));
```

### ❌ Not Distinguishing 401 vs 403

**Why it's wrong:**
```typescript
// ❌ WRONG: Same handling for both
if (response.status === 401 || response.status === 403) {
  window.location.href = '/login';
}
```

**Do this instead:**
```typescript
// ✅ RIGHT: Different handling
if (response.status === 401) {
  // Session expired
  redirect('/login');
} else if (response.status === 403) {
  // Permission denied
  show('You do not have permission');
}
```

### ❌ Exposing Error Details to Users

**Why it's wrong:**
- Reveals system architecture
- Helps attackers craft targeted attacks
- Bad user experience

**Do this instead:**
```typescript
// ❌ WRONG
catch (error) {
  alert(error.message); // "User not found" reveals database structure
}

// ✅ RIGHT
catch (error) {
  // Generic message to user
  showNotification('Login failed. Please check your email and password.');

  // Detailed logging server-side for debugging
  logger.error('Login failed', {
    email: credentials.email,
    error: error.message,
    timestamp: new Date(),
  });
}
```

---

## Integration Checklist

Before deploying your authentication:

- [ ] CSRF token extracted from meta tag or cookie in all mutating requests
- [ ] Session cookies marked httpOnly and Secure (production)
- [ ] Login flow tested with valid and invalid credentials
- [ ] Logout clears user state and redirects
- [ ] 401 errors trigger refresh attempt, then redirect if refresh fails
- [ ] 403 errors show permission-denied UI (no redirect)
- [ ] No credentials or tokens logged to console or monitoring
- [ ] Token refresh happens proactively before expiry
- [ ] Retry logic uses exponential backoff (max 3 attempts)
- [ ] Request cancellation possible via AbortController
- [ ] AuthProvider interface implemented (all methods present)
- [ ] Examples type-check with `tsc --strict`
- [ ] Error messages generic to users, detailed server-side
- [ ] Both vanilla TS and React examples provided and working

---

## See Also

- [AuthProvider Contract](../../examples/integration-guides/contracts/auth.ts)
- [Vanilla Example](../../examples/integration-guides/auth-example/vanilla.ts)
- [React Example](../../examples/integration-guides/auth-example/react.tsx)
- [Core-App B05 Authentication Module](../../../backend-modules/b05-authentication.md)
