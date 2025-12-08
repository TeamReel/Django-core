---
work_package_id: "WP03"
subtasks:
  - "T019"
  - "T020"
  - "T021"
  - "T022"
  - "T023"
  - "T024"
  - "T025"
  - "T026"
  - "T027"
  - "T028"
  - "T029"
  - "T030"
  - "T031"
  - "T032"
title: "Core Auth Infrastructure"
phase: "Phase 0 - Foundation"
lane: "doing"
assignee: "Claude"
agent: "claude"
shell_pid: "35160"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-07T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP03 – Core Auth Infrastructure

## Objectives & Success Criteria

**Goal**: Implement AuthProvider, AuthContext, internal API client, error normalizer, and redirect helpers—the foundation for all auth flows.

**Success Criteria**:
- [ ] AuthProvider renders children with AuthContext available
- [ ] useAuth() returns complete auth state (user, status, isLoading, error, signOut)
- [ ] apiClient makes fetch calls with credentials: 'include', CSRF token header
- [ ] errorNormalizer parses B13 responses into { status, fieldErrors, formErrors }
- [ ] redirectHelper builds ?next= URLs correctly
- [ ] Session initialization calls /auth/me on mount
- [ ] 401/403 responses clear state and redirect to login
- [ ] Unit tests for apiClient, errorNormalizer, redirectHelper pass (80%+ coverage)
- [ ] Integration tests for AuthProvider pass (mount, session verification, error states)

**Independent Test**:
```bash
cd packages/auth
pnpm test -- --testPathPattern="__(tests|lib|hooks)"
# All core infrastructure tests pass
```

---

## Context & Constraints

**Prerequisites**:
- WP01 complete (package structure, TypeScript, Jest, Vite configured)
- WP02 complete (GET /auth/me endpoint functional)

**Related Documents**:
- `kitty-specs/023-core-auth-identity/data-model.md` - AuthState, User, AuthConfig, ApiError types
- `kitty-specs/023-core-auth-identity/plan.md` - Q1 (React Context + hooks), Q3 (apiClient + error handling), Q4 (AuthConfig props)
- `kitty-specs/023-core-auth-identity/contracts/b13-auth-me.md` - Session verification contract

**Architectural Decisions**:
- **State Management**: React Context + hooks (no Redux/Zustand)
- **API Client**: Internal utility wrapping fetch, not exported
- **Error Handling**: Normalize B13 envelope to { status, fieldErrors, formErrors }
- **Configuration**: Props-based on AuthProvider (no globals)

**Constraints**:
- HTTP-only cookies (credentials: 'include' in fetch)
- CSRF token from cookie, send in X-CSRFToken header
- 401/403 responses trigger automatic redirect to login with ?next=
- All functions must be testable (mock fetch in tests)

---

## Subtasks & Detailed Guidance

### Subtask T019 – Define TypeScript Types

**Purpose**: Establish type contracts for auth infrastructure.

**Steps**:
1. Create `packages/auth/src/types/AuthConfig.ts`:
```typescript
export interface AuthConfig {
  apiBaseUrl: string;
  endpoints: {
    signIn: string;
    signOut: string;
    requestPasswordReset: string;
    confirmPasswordReset: string;
    me: string;
    updateProfile: string;
  };
  routes: {
    login: string;
    defaultAfterLogin: string;
    afterLogout: string;
  };
  security?: {
    enableSessionPolling?: boolean;
    sessionPollingInterval?: number;
  };
}
```

2. Create `packages/auth/src/types/AuthState.ts`:
```typescript
import { User } from './User';
import { ApiError } from './ApiError';

export interface AuthState {
  user: User | null;
  status: 'authenticated' | 'unauthenticated' | 'loading' | 'error';
  isLoading: boolean;
  error: ApiError | null;
  lastVerified: number | null;
}
```

3. Create `packages/auth/src/types/User.ts`:
```typescript
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'superadmin' | 'admin' | 'user';
  email_verified: boolean;
  is_active: boolean;
}
```

4. Create `packages/auth/src/types/ApiError.ts`:
```typescript
export interface ApiError {
  status: number;
  fieldErrors: Record<string, string[]>;
  formErrors: string[];
}
```

5. Create `packages/auth/src/types/index.ts` (barrel export):
```typescript
export type { AuthConfig } from './AuthConfig';
export type { AuthState } from './AuthState';
export type { User } from './User';
export type { ApiError } from './ApiError';
```

**Files**:
- `packages/auth/src/types/AuthConfig.ts`
- `packages/auth/src/types/AuthState.ts`
- `packages/auth/src/types/User.ts`
- `packages/auth/src/types/ApiError.ts`
- `packages/auth/src/types/index.ts`

**Parallel?**: No (foundational, other tasks depend on types)

**Notes**: Types match data-model.md exactly. All exported for public consumption.

---

### Subtask T020 – Implement Internal apiClient Utility

**Purpose**: Centralize fetch logic with CSRF token handling and credentials.

**Steps**:
1. Create `packages/auth/src/lib/apiClient.ts`:
```typescript
import type { AuthConfig } from '../types';

export interface ApiClientConfig {
  baseUrl: string;
  csrfToken?: string;
}

export class ApiClient {
  private baseUrl: string;
  private csrfToken?: string;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl;
    this.csrfToken = config.csrfToken;
  }

  private getCsrfToken(): string | undefined {
    if (this.csrfToken) return this.csrfToken;

    // Extract CSRF token from cookie
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? match[1] : undefined;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T | null; error: any; status: number }> {
    const url = `${this.baseUrl}${endpoint}`;
    const csrfToken = this.getCsrfToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add CSRF token for state-changing methods
    if (csrfToken && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(options.method || 'GET')) {
      headers['X-CSRFToken'] = csrfToken;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Send HTTP-only cookies
      });

      let data = null;
      try {
        data = await response.json();
      } catch {
        // Response has no body (e.g., 204 No Content)
      }

      return {
        data,
        error: response.ok ? null : data,
        status: response.status,
      };
    } catch (error) {
      // Network error
      return {
        data: null,
        error: { message: 'Network error occurred' },
        status: 0,
      };
    }
  }

  get<T>(endpoint: string): Promise<{ data: T | null; error: any; status: number }> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, body: any): Promise<{ data: T | null; error: any; status: number }> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  patch<T>(endpoint: string, body: any): Promise<{ data: T | null; error: any; status: number }> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }
}
```

**Files**:
- `packages/auth/src/lib/apiClient.ts`

**Parallel?**: [P] Can develop alongside T021, T022

**Notes**:
- NOT exported from package index (internal only)
- CSRF token extracted from cookie, sent in header
- credentials: 'include' enables HTTP-only cookies
- Returns normalized { data, error, status }

---

### Subtask T021 – Implement errorNormalizer

**Purpose**: Convert B13 error envelope to F02's internal format.

**Steps**:
1. Create `packages/auth/src/lib/errorNormalizer.ts`:
```typescript
import type { ApiError } from '../types';

export function normalizeError(response: any, status: number): ApiError {
  // Handle network errors (status 0)
  if (status === 0) {
    return {
      status: 0,
      fieldErrors: {},
      formErrors: ['Network error. Please check your connection and try again.'],
    };
  }

  // Handle B13 error envelope
  if (response && typeof response === 'object' && response.errors) {
    const fieldErrors: Record<string, string[]> = {};
    const formErrors: string[] = [];

    // Parse errors object
    Object.entries(response.errors).forEach(([key, value]) => {
      if (key === 'non_field_errors') {
        formErrors.push(...(value as string[]));
      } else {
        fieldErrors[key] = value as string[];
      }
    });

    // Add message to formErrors if no specific errors
    if (Object.keys(fieldErrors).length === 0 && formErrors.length === 0 && response.message) {
      formErrors.push(response.message);
    }

    return {
      status,
      fieldErrors,
      formErrors,
    };
  }

  // Handle non-B13 errors (fallback)
  return {
    status,
    fieldErrors: {},
    formErrors: [response?.message || 'An error occurred. Please try again.'],
  };
}
```

**Files**:
- `packages/auth/src/lib/errorNormalizer.ts`

**Parallel?**: [P] Can develop alongside T020, T022

**Notes**:
- Converts B13 `{ success, errors: {field: [...]}, message }` to `{ status, fieldErrors, formErrors }`
- non_field_errors become formErrors
- Network errors (status 0) handled gracefully

---

### Subtask T022 – Implement redirectHelper

**Purpose**: Build login URLs with ?next= parameter and validate redirect targets.

**Steps**:
1. Create `packages/auth/src/lib/redirectHelper.ts`:
```typescript
export function buildLoginUrl(loginPath: string, currentPath: string): string {
  // Only add ?next= if currentPath is not the login page itself
  if (currentPath === loginPath) {
    return loginPath;
  }

  // Validate currentPath is relative (security: prevent open redirect)
  if (!currentPath.startsWith('/')) {
    return loginPath;
  }

  return `${loginPath}?next=${encodeURIComponent(currentPath)}`;
}

export function getNextParam(search: string = window.location.search): string | null {
  const params = new URLSearchParams(search);
  const next = params.get('next');

  // Validate next parameter is relative path (security)
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    return next;
  }

  return null;
}

export function redirect(url: string): void {
  window.location.href = url;
}
```

**Files**:
- `packages/auth/src/lib/redirectHelper.ts`

**Parallel?**: [P] Can develop alongside T020, T021

**Notes**:
- Open redirect prevention: only allow relative paths starting with /
- Reject // (protocol-relative URLs)
- encodeURIComponent for ?next= value

---

### Subtask T023 – Create AuthProvider Component

**Purpose**: Root component providing AuthContext to children.

**Steps**:
1. Create `packages/auth/src/components/AuthProvider.tsx`:
```typescript
import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { AuthConfig, AuthState, User } from '../types';
import { ApiClient } from '../lib/apiClient';
import { normalizeError } from '../lib/errorNormalizer';
import { buildLoginUrl, redirect } from '../lib/redirectHelper';

export interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  config: AuthConfig;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export interface AuthProviderProps {
  config: AuthConfig;
  children: React.ReactNode;
}

export function AuthProvider({ config, children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    status: 'loading',
    isLoading: true,
    error: null,
    lastVerified: null,
  });

  const apiClient = new ApiClient({ baseUrl: config.apiBaseUrl });

  const verifySession = useCallback(async () => {
    const { data, error, status } = await apiClient.get<User>(config.endpoints.me);

    if (status === 200 && data) {
      setState((prev) => ({
        ...prev,
        user: data,
        status: 'authenticated',
        isLoading: false,
        error: null,
        lastVerified: Date.now(),
      }));
    } else if (status === 401 || status === 403) {
      setState({
        user: null,
        status: 'unauthenticated',
        isLoading: false,
        error: null,
        lastVerified: null,
      });
    } else {
      setState({
        user: null,
        status: 'error',
        isLoading: false,
        error: normalizeError(error, status),
        lastVerified: null,
      });
    }
  }, [config.endpoints.me]);

  const signOut = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    await apiClient.post(config.endpoints.signOut, {});

    setState({
      user: null,
      status: 'unauthenticated',
      isLoading: false,
      error: null,
      lastVerified: null,
    });

    redirect(config.routes.afterLogout);
  }, [config.endpoints.signOut, config.routes.afterLogout]);

  const refreshUser = useCallback(async () => {
    await verifySession();
  }, [verifySession]);

  // Initial session verification on mount
  useEffect(() => {
    verifySession();
  }, [verifySession]);

  // Optional: Session polling
  useEffect(() => {
    if (
      config.security?.enableSessionPolling &&
      config.security.sessionPollingInterval &&
      state.status === 'authenticated'
    ) {
      const interval = setInterval(() => {
        verifySession();
      }, config.security.sessionPollingInterval);

      return () => clearInterval(interval);
    }
  }, [config.security, state.status, verifySession]);

  const value: AuthContextValue = {
    ...state,
    signOut,
    refreshUser,
    config,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

**Files**:
- `packages/auth/src/components/AuthProvider.tsx`

**Parallel?**: No (depends on T019-T022)

**Notes**:
- Calls /auth/me on mount to verify session
- Exposes signOut method
- Optional session polling if config.security.enableSessionPolling
- Children render immediately, isLoading tracks verification state

---

### Subtask T024 – Implement useAuth() Hook

**Purpose**: Access full AuthContext from any component.

**Steps**:
1. Create `packages/auth/src/hooks/useAuth.ts`:
```typescript
import { useContext } from 'react';
import { AuthContext } from '../components/AuthProvider';
import type { AuthContextValue } from '../components/AuthProvider';

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within <AuthProvider>');
  }

  return context;
}
```

**Files**:
- `packages/auth/src/hooks/useAuth.ts`

**Parallel?**: [P] Can implement alongside T025, T026

**Notes**: Throws clear error if used outside AuthProvider

---

### Subtask T025 – Implement useAuthStatus() Hook

**Purpose**: Access only auth status (for conditional rendering).

**Steps**:
1. Create `packages/auth/src/hooks/useAuthStatus.ts`:
```typescript
import { useAuth } from './useAuth';

export function useAuthStatus() {
  const { status, isLoading } = useAuth();
  return { status, isLoading };
}
```

**Files**:
- `packages/auth/src/hooks/useAuthStatus.ts`

**Parallel?**: [P] Can implement alongside T024, T026

**Notes**: Convenience hook for status checks without full context

---

### Subtask T026 – Implement useCurrentUser() Hook

**Purpose**: Access current user data.

**Steps**:
1. Create `packages/auth/src/hooks/useCurrentUser.ts`:
```typescript
import { useAuth } from './useAuth';

export function useCurrentUser() {
  const { user } = useAuth();
  return user;
}
```

**Files**:
- `packages/auth/src/hooks/useCurrentUser.ts`

**Parallel?**: [P] Can implement alongside T024, T025

**Notes**: Returns User | null

---

### Subtasks T027-T028 – Session Initialization and 401/403 Handling

**Purpose**: Already implemented in AuthProvider (T023).

**Notes**:
- T027 (session initialization) is the useEffect calling verifySession on mount
- T028 (401/403 handling) is in verifySession function setting status to 'unauthenticated'
- Mark as complete once T023 is done

---

### Subtask T029 – Write Unit Tests for apiClient

**Purpose**: Test fetch wrapper, CSRF token handling, credentials.

**Steps**:
1. Create `packages/auth/__tests__/lib/apiClient.test.ts`:
```typescript
import { ApiClient } from '../../src/lib/apiClient';

// Mock fetch
global.fetch = jest.fn();

describe('ApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.cookie = '';
  });

  it('includes credentials in fetch requests', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: 'test' }),
    });

    const client = new ApiClient({ baseUrl: 'http://api.example.com' });
    await client.get('/test');

    expect(fetch).toHaveBeenCalledWith(
      'http://api.example.com/test',
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('adds CSRF token header for POST requests', async () => {
    document.cookie = 'csrftoken=test-token';

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    const client = new ApiClient({ baseUrl: 'http://api.example.com' });
    await client.post('/test', { data: 'test' });

    expect(fetch).toHaveBeenCalledWith(
      'http://api.example.com/test',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-CSRFToken': 'test-token' }),
      })
    );
  });

  it('handles network errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const client = new ApiClient({ baseUrl: 'http://api.example.com' });
    const result = await client.get('/test');

    expect(result.status).toBe(0);
    expect(result.error).toEqual({ message: 'Network error occurred' });
  });
});
```

**Files**:
- `packages/auth/__tests__/lib/apiClient.test.ts`

**Parallel?**: [P] Can write alongside T030, T031

---

### Subtask T030 – Write Unit Tests for errorNormalizer

**Purpose**: Test B13 envelope parsing.

**Steps**:
1. Create `packages/auth/__tests__/lib/errorNormalizer.test.ts`:
```typescript
import { normalizeError } from '../../src/lib/errorNormalizer';

describe('normalizeError', () => {
  it('parses B13 error envelope with field errors', () => {
    const response = {
      success: false,
      message: 'Validation failed',
      errors: {
        email: ['This field is required'],
        password: ['Password too short'],
      },
    };

    const result = normalizeError(response, 400);

    expect(result.status).toBe(400);
    expect(result.fieldErrors).toEqual({
      email: ['This field is required'],
      password: ['Password too short'],
    });
    expect(result.formErrors).toEqual([]);
  });

  it('parses non_field_errors as formErrors', () => {
    const response = {
      success: false,
      errors: {
        non_field_errors: ['Invalid credentials'],
      },
    };

    const result = normalizeError(response, 401);

    expect(result.formErrors).toEqual(['Invalid credentials']);
    expect(result.fieldErrors).toEqual({});
  });

  it('handles network errors (status 0)', () => {
    const result = normalizeError(null, 0);

    expect(result.status).toBe(0);
    expect(result.formErrors[0]).toContain('Network error');
  });
});
```

**Files**:
- `packages/auth/__tests__/lib/errorNormalizer.test.ts`

**Parallel?**: [P] Can write alongside T029, T031

---

### Subtask T031 – Write Unit Tests for redirectHelper

**Purpose**: Test URL building and validation.

**Steps**:
1. Create `packages/auth/__tests__/lib/redirectHelper.test.ts`:
```typescript
import { buildLoginUrl, getNextParam } from '../../src/lib/redirectHelper';

describe('redirectHelper', () => {
  describe('buildLoginUrl', () => {
    it('adds ?next= parameter with current path', () => {
      const result = buildLoginUrl('/auth/login', '/dashboard');
      expect(result).toBe('/auth/login?next=%2Fdashboard');
    });

    it('does not add ?next= if current path is login page', () => {
      const result = buildLoginUrl('/auth/login', '/auth/login');
      expect(result).toBe('/auth/login');
    });

    it('rejects non-relative paths (security)', () => {
      const result = buildLoginUrl('/auth/login', 'https://evil.com');
      expect(result).toBe('/auth/login');
    });
  });

  describe('getNextParam', () => {
    it('extracts ?next= parameter', () => {
      const result = getNextParam('?next=%2Fdashboard');
      expect(result).toBe('/dashboard');
    });

    it('rejects absolute URLs (security)', () => {
      const result = getNextParam('?next=https://evil.com');
      expect(result).toBeNull();
    });

    it('rejects protocol-relative URLs (security)', () => {
      const result = getNextParam('?next=//evil.com');
      expect(result).toBeNull();
    });
  });
});
```

**Files**:
- `packages/auth/__tests__/lib/redirectHelper.test.ts`

**Parallel?**: [P] Can write alongside T029, T030

---

### Subtask T032 – Write Integration Tests for AuthProvider

**Purpose**: Test AuthProvider with mocked API responses.

**Steps**:
1. Create `packages/auth/__tests__/components/AuthProvider.test.tsx`:
```typescript
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, AuthContext } from '../../src/components/AuthProvider';
import type { AuthConfig } from '../../src/types';

const mockConfig: AuthConfig = {
  apiBaseUrl: 'http://api.test',
  endpoints: {
    signIn: '/auth/login',
    signOut: '/auth/logout',
    requestPasswordReset: '/auth/password-reset',
    confirmPasswordReset: '/auth/password-reset-confirm',
    me: '/auth/me',
    updateProfile: '/auth/profile',
  },
  routes: {
    login: '/auth/login',
    defaultAfterLogin: '/dashboard',
    afterLogout: '/',
  },
};

global.fetch = jest.fn();

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children', () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    });

    render(
      <AuthProvider config={mockConfig}>
        <div>Test Child</div>
      </AuthProvider>
    );

    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('verifies session on mount', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'user' as const,
      email_verified: true,
      is_active: true,
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockUser,
    });

    const TestComponent = () => {
      const context = React.useContext(AuthContext);
      return <div>{context?.status}</div>;
    };

    render(
      <AuthProvider config={mockConfig}>
        <TestComponent />
      </AuthProvider>
    );

    // Initially loading
    expect(screen.getByText('loading')).toBeInTheDocument();

    // Wait for session verification
    await waitFor(() => {
      expect(screen.getByText('authenticated')).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith(
      'http://api.test/auth/me',
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('sets unauthenticated status for 401 response', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    });

    const TestComponent = () => {
      const context = React.useContext(AuthContext);
      return <div>{context?.status}</div>;
    };

    render(
      <AuthProvider config={mockConfig}>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('unauthenticated')).toBeInTheDocument();
    });
  });
});
```

**Files**:
- `packages/auth/__tests__/components/AuthProvider.test.tsx`

**Parallel?**: No (depends on T023-T028)

---

## Risks & Mitigations

**Risk**: CSRF token extraction fails
**Mitigation**: Document Django's CSRF cookie name, test extraction, fallback to undefined

**Risk**: Fetch mocking complexity
**Mitigation**: Use jest.fn() for simple cases, MSW for realistic integration tests

**Risk**: Context re-renders
**Mitigation**: Use React.useMemo() for context value, useCallback for functions

**Risk**: Session verification race conditions
**Mitigation**: Use React.useRef to track in-flight requests, ignore stale responses

---

## Definition of Done Checklist

- [ ] All subtasks T019-T032 completed
- [ ] Types defined (AuthConfig, AuthState, User, ApiError)
- [ ] apiClient implemented with fetch + credentials + CSRF
- [ ] errorNormalizer parses B13 envelope correctly
- [ ] redirectHelper builds ?next= URLs and validates security
- [ ] AuthProvider renders, calls /auth/me on mount
- [ ] useAuth(), useAuthStatus(), useCurrentUser() hooks work
- [ ] Unit tests pass with 80%+ coverage:
  ```bash
  cd packages/auth
  pnpm test -- --coverage
  ```
- [ ] Integration tests pass (AuthProvider mount, session verification)
- [ ] Constitutional compliance:
  - [ ] Principle III: TypeScript strict mode, types throughout
  - [ ] Principle IV: Comprehensive unit + integration tests
  - [ ] Principle V: CSRF protection, credentials: 'include', secure redirect validation
- [ ] `tasks.md` updated with WP03 status change

---

## Review Guidance

**Acceptance Checkpoints**:
1. **Types**: Verify all types match data-model.md
2. **apiClient**: Test with curl to verify CSRF token sent:
   ```bash
   # Check network tab in browser dev tools
   # POST requests should have X-CSRFToken header
   ```
3. **AuthProvider**: Mount in test app, verify /auth/me called on load
4. **Test Coverage**: Run `pnpm test --coverage`, verify ≥80%

**Constitutional Compliance**:
- Principle III (Code Quality): TypeScript strict, all functions typed
- Principle IV (Testing): Unit + integration tests, deterministic
- Principle V (Security): CSRF token, credentials, redirect validation

---

## Activity Log

- 2025-12-07T00:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2025-12-08T18:48:31Z – system – shell_pid= – lane=doing – Started WP03: Core Auth Infrastructure - AuthProvider, Context, apiClient, error handling
