# ApiClient Example

Fetch-based ApiClient implementation with automatic header injection (CSRF, auth, context) and error normalization.

## Features

- ✅ Automatic CSRF token injection (from meta tag or cookie)
- ✅ Authorization header injection (from AuthProvider)
- ✅ Context header injection (X-Organization-ID, X-Project-ID)
- ✅ Request deduplication via optional CachePolicy
- ✅ Typed error exceptions (BadRequestError, UnauthorizedError, NotFoundError, etc.)
- ✅ AbortSignal support for request cancellation
- ✅ Graceful cookie handling (client-side and SSR-safe)

## Quick Start

### Basic Usage

```typescript
import { createAuthProvider } from '../auth-example/vanilla';
import { createContextProvider } from '../context-example/vanilla';
import { createApiClient } from './fetch-client';

// Initialize providers
const auth = createAuthProvider({ baseURL: 'https://api.example.com' });
const context = createContextProvider({ baseURL: 'https://api.example.com' });

// Create ApiClient
const apiClient = createApiClient({
  baseURL: 'https://api.example.com',
  authProvider: auth,
  contextProvider: context,
});

// Make requests
const projects = await apiClient.get<Project[]>('/api/projects');
const project = await apiClient.post<Project>('/api/projects', {
  name: 'New Project',
  organizationId: 'org_123',
});
```

### With Cache Policy

```typescript
import { createCachePolicy } from '../cache-example/swr-policy';

const cachePolicy = createCachePolicy({
  config: new Map([
    ['/api/projects', 5 * 60 * 1000],       // 5 minutes
    ['/api/organisations', 10 * 60 * 1000], // 10 minutes
  ]),
});

const apiClient = createApiClient({
  baseURL: 'https://api.example.com',
  authProvider: auth,
  contextProvider: context,
  cachePolicy,
});

// First call: fetches from backend
const projects = await apiClient.get<Project[]>('/api/projects');

// Second call (within 5 min): returns cached data
const projectsCached = await apiClient.get<Project[]>('/api/projects');
```

### React Integration

```typescript
import { createApiClient } from './fetch-client';
import { useAuth } from '../auth-example/react';
import { useContext as useContextProvider } from '../context-example/react';

function ApiProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const context = useContextProvider();

  const [apiClient] = React.useState(() =>
    createApiClient({
      baseURL: import.meta.env.VITE_API_BASE_URL,
      authProvider: auth,
      contextProvider: context,
    }),
  );

  return (
    <ApiClientContext.Provider value={apiClient}>{children}</ApiClientContext.Provider>
  );
}

function useApiClient() {
  const context = React.useContext(ApiClientContext);
  if (!context) {
    throw new Error('useApiClient must be used within ApiProvider');
  }
  return context;
}

// Usage
function ProjectList() {
  const apiClient = useApiClient();
  const [projects, setProjects] = React.useState<Project[]>([]);

  React.useEffect(() => {
    apiClient.get<Project[]>('/api/projects').then((response) => {
      setProjects(response.data);
    });
  }, [apiClient]);

  return <div>{projects.map((p) => <div key={p.id}>{p.name}</div>)}</div>;
}
```

## Error Handling

The ApiClient normalizes HTTP errors to typed exceptions:

```typescript
import {
  BadRequestError,
  UnauthorizedError,
  PermissionDeniedError,
  NotFoundError,
  RateLimitError,
  ServerError,
} from './fetch-client';

try {
  const project = await apiClient.get<Project>(`/api/projects/${projectId}`);
} catch (error) {
  if (error instanceof NotFoundError) {
    console.error('Project not found');
  } else if (error instanceof PermissionDeniedError) {
    console.error('You do not have permission to view this project');
  } else if (error instanceof UnauthorizedError) {
    console.error('Session expired - please log in again');
  } else if (error instanceof BadRequestError) {
    console.error('Invalid request:', error.details);
  } else if (error instanceof RateLimitError) {
    console.error('Rate limited - please wait before trying again');
  } else if (error instanceof ServerError) {
    console.error('Server error - please try again later');
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Request Cancellation

Use AbortController to cancel requests on component unmount:

```typescript
function useProject(projectId: string) {
  const apiClient = useApiClient();
  const [project, setProject] = React.useState<Project | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const abortController = new AbortController();
    setLoading(true);

    apiClient
      .get<Project>(`/api/projects/${projectId}`, {
        signal: abortController.signal,
      })
      .then((response) => {
        setProject(response.data);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Failed to load project:', error);
        }
      })
      .finally(() => {
        setLoading(false);
      });

    return () => abortController.abort();
  }, [apiClient, projectId]);

  return { project, loading };
}
```

## CSRF Protection

The ApiClient automatically injects CSRF tokens:

```typescript
// From meta tag (preferred)
<meta name="csrf-token" content="abc123" />

// ApiClient will inject:
headers['X-CSRFToken'] = 'abc123';

// Or from cookie (fallback)
// ApiClient will extract from document.cookie
```

## Context Headers

When context is set, ApiClient automatically injects context headers:

```typescript
// Set organization context
context.setOrganization('org_123');

// Subsequent requests include:
headers['X-Organization-ID'] = 'org_123';

// Set project context
context.setProject('proj_456');

// Subsequent requests include:
headers['X-Organization-ID'] = 'org_123';
headers['X-Project-ID'] = 'proj_456';
```

## HTTP Caching

The ApiClient respects HTTP Cache-Control headers from backend:

```typescript
// Backend returns:
// Cache-Control: max-age=300, stale-while-revalidate=60
// ETag: "abc123"

// ApiClient with CachePolicy will:
// 1. Store response with 300s TTL
// 2. Return cached data for subsequent requests (within 300s)
// 3. Revalidate with If-None-Match: "abc123" after 240s (80% of TTL)
// 4. Use cached data if backend returns 304 Not Modified
```

## API Reference

### FetchApiClient

```typescript
class FetchApiClient implements ApiClient {
  constructor(options: FetchClientOptions);

  readonly baseURL: string;
  readonly authProvider: AuthProvider;
  readonly contextProvider: ContextProvider;
  readonly cachePolicy?: CachePolicy;

  async get<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>>;
  async post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>>;
  async put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>>;
  async patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>>;
  async delete<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>>;
}
```

### Error Classes

- `ApiError` - Base error class (status code included)
- `BadRequestError` - 400 (includes validation details)
- `UnauthorizedError` - 401 (auth required or expired)
- `PermissionDeniedError` - 403 (auth successful but permission denied)
- `NotFoundError` - 404 (resource not found)
- `RateLimitError` - 429 (rate limit exceeded)
- `ServerError` - 5xx (server error)

## Best Practices

### ✅ DO

- Import error classes and handle specific errors
- Use AbortController for request cancellation
- Invalidate cache after mutations
- Log detailed errors with error codes
- Test with different authentication states

### ❌ DON'T

- Ignore UnauthorizedError (means session expired)
- Make duplicate requests (use CachePolicy)
- Forget to clean up requests on unmount
- Assume error is always JSON (could be HTML)
- Log sensitive data from error responses

## Testing

```typescript
import { vi } from 'vitest';

describe('FetchApiClient', () => {
  it('should inject CSRF token', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      json: () => Promise.resolve({ data: 'test' }),
    });

    global.fetch = mockFetch;

    const apiClient = createApiClient({
      baseURL: 'https://api.example.com',
      authProvider: mockAuth,
      contextProvider: mockContext,
    });

    await apiClient.get('/api/projects');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-CSRFToken': expect.any(String),
        }),
      }),
    );
  });
});
```

## Troubleshooting

### CSRF Token Not Injected

- Check that `<meta name="csrf-token" content="..." />` is in HTML head
- Or check that `document.cookie` includes `csrftoken` cookie
- Or manually set via `cachePolicy.buildHeaders()`

### Context Headers Missing

- Verify organization/project is set: `context.getOrganizationId()`
- Check that context is persisted correctly
- Verify context provider initialized before ApiClient

### Requests Hanging

- Check browser Network tab for stalled requests
- Verify backend API is responding
- Check that AbortController is properly cleaned up

### Always Getting Cached Data

- Verify cache policy is not too aggressive
- Check cache statistics: `cachePolicy.getStats()`
- Manually invalidate: `cachePolicy.invalidate({ pattern: '/api/projects*' })`
