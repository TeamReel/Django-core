# Frontend-Backend Integration: Quick Start

Welcome to the Core-App frontend integration guides. This page helps you navigate all guides and find what you need.

> **New to integration?** Start with [Where Do I Start?](#where-do-i-start)

---

## Where Do I Start?

### 1. I'm implementing authentication (login, logout, CSRF)
→ Read: **[Authentication Guide](auth-api.md)**

**Key topics:**
- Login flow with CSRF protection
- 401 vs 403 error handling
- Token refresh and session management
- Retry patterns and exponential backoff

**Time estimate:** 30-45 minutes

---

### 2. I'm implementing multi-tenancy (org/project context)
→ Read: **[Context Propagation Guide](context-propagation.md)**

**Key topics:**
- Setting organization and project context
- Injecting context into API requests
- Persisting context across reloads
- Handling context loss and validation

**Dependencies:** Complete [Authentication Guide](auth-api.md) first

**Time estimate:** 30-45 minutes

---

### 3. I'm implementing data fetching (lists, details, caching)
→ Read: **[Data Fetching Guide](data-fetching.md)**

**Key topics:**
- List and detail fetching patterns
- Pagination (offset vs cursor)
- HTTP caching (Cache-Control, ETag, 304)
- Loading/error/empty states
- Cache invalidation and optimistic updates

**Dependencies:** Complete [Authentication Guide](auth-api.md) first

**Time estimate:** 45-60 minutes

---

## Quick Navigation

### Learning Resources

| Guide | Purpose | Read Time |
|-------|---------|-----------|
| **[Authentication Guide](auth-api.md)** | Login, CSRF, session management, token refresh | 30-45 min |
| **[Context Propagation Guide](context-propagation.md)** | Multi-tenancy, organization/project context | 30-45 min |
| **[Data Fetching Guide](data-fetching.md)** | Lists, pagination, caching, error handling | 45-60 min |
| **[Anti-Patterns Guide](anti-patterns.md)** | What NOT to do (18 common mistakes) | 20-30 min |
| **[Pre-Deployment Checklist](checklist.md)** | Validation before staging/production | 15-20 min |
| **[Troubleshooting Guide](troubleshooting.md)** | Diagnose and fix integration issues | 10 min per issue |

---

## Common Workflows

### "I'm building a new feature page"

1. **Check authentication** → Is user logged in?
   - Use `AuthProvider.hasPermission()` or similar
   - See: [Authentication Guide](auth-api.md#error-handling)

2. **Set organization context** → What org is the user working in?
   - Use `ContextProvider.setOrganization()`
   - See: [Context Propagation Guide](context-propagation.md#setting-organization-context)

3. **Fetch data** → Load page data from API
   - Use `ApiClient.get()` with proper pagination
   - See: [Data Fetching Guide](data-fetching.md#fetching-a-list)

4. **Handle states** → Show loading, error, empty
   - Implement all 3 states (loading, error, empty)
   - See: [Data Fetching Guide](data-fetching.md#loadingerrorempty-states)

5. **Add mutations** → Allow create/update/delete
   - Invalidate cache after mutations
   - Use optimistic updates for speed
   - See: [Data Fetching Guide](data-fetching.md#cache-invalidation)

6. **Validate before deploy** → Check integration checklist
   - Go through all items in [Pre-Deployment Checklist](checklist.md)
   - Estimated time: 20-30 minutes

---

### "Something isn't working, how do I debug?"

1. **Identify the problem:**
   - Is it authentication? → [Auth Guide Anti-Patterns](auth-api.md#anti-patterns)
   - Is it context/multi-tenancy? → [Context Guide Anti-Patterns](context-propagation.md#anti-patterns)
   - Is it data fetching? → [Data Fetching Guide Anti-Patterns](data-fetching.md#anti-patterns)
   - Is it general? → [Troubleshooting Guide](troubleshooting.md)

2. **Use DevTools:**
   - Network tab: Check request headers, response codes
   - Console: Check for errors, warnings
   - Storage tab: Check cookies, localStorage, sessionStorage

3. **Find your issue:**
   - [CSRF Failures](troubleshooting.md#csrf-failures)
   - [401 Authorization Loops](troubleshooting.md#401-authorization-loops)
   - [Context Drift](troubleshooting.md#context-drift-multi-tenancy-issues)
   - [Stale Cache](troubleshooting.md#stale-cache-issues)
   - [Slow Requests](troubleshooting.md#request-timeout--slow-requests)
   - [Token Refresh](troubleshooting.md#token-refresh-during-requests)
   - [Multi-Tab Conflicts](troubleshooting.md#multi-window-context-conflicts)

---

### "What mistakes should I avoid?"

→ Read: **[Anti-Patterns Guide](anti-patterns.md)**

**Common mistakes by category:**
- **Security** (4): localStorage tokens, CSRF, logging credentials, error exposure
- **Authentication** (1): Not distinguishing 401 vs 403
- **Context** (6): Local variables, missing headers, silent failures, multi-tab conflicts, validation, logout
- **Data Fetching** (7): Duplicate requests, N+1, missing states, cache issues, slow renders

---

## Implementation Checklist

### Before Starting

- [ ] Read [Authentication Guide](auth-api.md)
- [ ] Set up AuthProvider (login, logout, token refresh)
- [ ] Read [Context Propagation Guide](context-propagation.md)
- [ ] Set up ContextProvider (org, project, headers)
- [ ] Read [Data Fetching Guide](data-fetching.md)
- [ ] Set up ApiClient (requests, caching, error handling)

### During Development

- [ ] Use ApiClient for all API calls
- [ ] Implement all 3 states (loading, error, empty)
- [ ] Add proper error handling
- [ ] Invalidate cache after mutations
- [ ] Test in multiple browser tabs
- [ ] Test error scenarios (401, 403, 404, 500)

### Before Staging

- [ ] Go through [Pre-Deployment Checklist](checklist.md)
- [ ] Review [Anti-Patterns](anti-patterns.md) for mistakes
- [ ] Integration tests passing
- [ ] TypeScript strict mode with 0 errors
- [ ] ESLint with 0 errors/warnings

### Before Production

- [ ] Staging end-to-end testing complete
- [ ] Performance testing done
- [ ] Security audit passed
- [ ] Monitoring configured (auth, slow requests, errors)

---

## Code Examples

### Simple List Page

```typescript
import { ApiClient } from '@django-core/api-client';
import { AuthProvider } from '@django-core/auth';
import { ContextProvider } from '@django-core/context';

export function ProjectsList() {
  const auth = useContext(AuthContext); // WP02
  const context = useContext(ContextProvider); // WP03
  const [projects, setProjects] = useState<RequestState<Project[]>>({
    status: 'idle',
  });

  // Fetch on mount or when context changes
  useEffect(() => {
    async function load() {
      setProjects({ status: 'loading' });

      try {
        // ApiClient automatically adds:
        // - CSRF token (WP02)
        // - X-Organization-ID, X-Project-ID headers (WP03)
        // - Authorization header (WP02)
        const response = await apiClient.get<ProjectsResponse>(
          '/api/projects',
          {
            params: { limit: 25, offset: 0 }, // WP04
          },
        );

        setProjects({
          status: 'success',
          data: response.results,
        });
      } catch (error) {
        setProjects({
          status: 'error',
          error: error as ApiError,
        });
      }
    }

    // Only load if user is authenticated and context set
    if (auth.isAuthenticated && context.currentOrganization) {
      load();
    }
  }, [context.currentOrganization?.id]); // Re-fetch if org changes

  // Show loading state
  if (projects.status === 'loading') {
    return <Spinner />;
  }

  // Show error state
  if (projects.status === 'error') {
    return (
      <ErrorMessage
        error={projects.error}
        onRetry={() => {
          /* refetch */
        }}
      />
    );
  }

  // Show empty state
  if (!projects.data || projects.data.length === 0) {
    return (
      <EmptyState
        title="No projects yet"
        action={<button>Create Project</button>}
      />
    );
  }

  // Show data
  return (
    <div>
      {projects.data.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
```

### Create with Cache Invalidation

```typescript
async function createProject(formData: CreateProjectInput) {
  try {
    setLoading(true);

    // Create project via API
    const newProject = await apiClient.post<Project>(
      '/api/projects', // CSRF automatic
      formData,
    );

    // Invalidate list cache so fresh data loads next time
    cachePolicy.invalidate({ pattern: '/api/projects*' });

    // Show success
    showNotification('Project created!');

    // Navigate to detail page
    navigate(`/projects/${newProject.id}`);
  } catch (error) {
    showNotification('Failed to create project');
  } finally {
    setLoading(false);
  }
}
```

### Error Handling

```typescript
apiClient.addErrorInterceptor((error) => {
  if (error.status === 401) {
    // Session expired - refresh and retry
    return refreshToken()
      .then(() => apiClient.request(error.config))
      .catch(() => {
        // Refresh failed - logout
        authProvider.logout();
        navigate('/login');
      });
  }

  if (error.status === 403) {
    // Permission denied
    showNotification('You do not have permission for this action');
  }

  if (error.status === 404) {
    // Not found
    showNotification('This resource does not exist');
    navigate('/');
  }

  throw error; // Re-throw for caller to handle
});
```

---

## TypeScript Types

The integration guides assume you have these types available:

```typescript
// From contracts package (WP01)
interface RequestState<T> {
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: T;
  error?: ApiError;
}

interface User {
  id: string;
  email: string;
  name: string;
}

interface Organization {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  organizationId: string;
}

// Error types
class BadRequestError extends Error {
  status = 400;
}

class UnauthorizedError extends Error {
  status = 401;
}

class PermissionDeniedError extends Error {
  status = 403;
}

class NotFoundError extends Error {
  status = 404;
}

class RateLimitError extends Error {
  status = 429;
  retryAfter?: number;
}

class ServerError extends Error {
  status = 500;
}
```

---

## Decision Tree: "Which guide should I read?"

```
Are you implementing authentication (login, logout)?
├─ YES → Read: Authentication Guide
└─ NO ↓

Are you implementing multi-tenancy (org/project switching)?
├─ YES → Read: Context Propagation Guide
└─ NO ↓

Are you implementing list/detail pages or data fetching?
├─ YES → Read: Data Fetching Guide
└─ NO ↓

Are you getting an error or things don't work?
├─ YES → Read: Troubleshooting Guide
└─ NO ↓

Do you want to know what mistakes to avoid?
├─ YES → Read: Anti-Patterns Guide
└─ NO ↓

Are you about to deploy to staging/production?
├─ YES → Read: Pre-Deployment Checklist
└─ NO ↓

Ready to implement!
```

---

## API Reference

For complete API documentation, see:

### Authentication
- `AuthProvider.login(email, password)` → Token-based login
- `AuthProvider.logout()` → End session
- `AuthProvider.hasPermission(permission)` → Check authorization
- `AuthProvider.refreshToken()` → Refresh expired token

See: [Authentication Guide](auth-api.md)

### Context
- `ContextProvider.setOrganization(org)` → Set current org
- `ContextProvider.setProject(project)` → Set current project
- `ContextProvider.clearContext()` → Clear org/project
- `ContextProvider.currentOrganization` → Get current org
- `ContextProvider.currentProject` → Get current project

See: [Context Propagation Guide](context-propagation.md)

### API Client
- `ApiClient.get<T>(path, options)` → GET request
- `ApiClient.post<T>(path, body, options)` → POST request
- `ApiClient.put<T>(path, body, options)` → PUT request
- `ApiClient.delete<T>(path, options)` → DELETE request
- `ApiClient.addRequestInterceptor(fn)` → Add request middleware
- `ApiClient.addResponseInterceptor(fn)` → Add response middleware
- `ApiClient.addErrorInterceptor(fn)` → Add error handler

See: [Data Fetching Guide](data-fetching.md)

### Cache Policy
- `CachePolicy.get<T>(path)` → Get from cache
- `CachePolicy.set<T>(path, data, ttl)` → Set in cache
- `CachePolicy.invalidate(pattern)` → Remove from cache
- `CachePolicy.clearAll()` → Clear entire cache
- `CachePolicy.shouldCache(path, method)` → Check if cacheable
- `CachePolicy.getCacheDuration(path)` → Get TTL for path

See: [Data Fetching Guide](data-fetching.md)

---

## Common Questions

**Q: Do I need to implement all three guides?**

A: Typically yes. Most features need:
1. Authentication (WP02) - login and session management
2. Context Propagation (WP03) - multi-tenancy
3. Data Fetching (WP04) - loading data from backend

However, if your app is single-tenant (no org switching), you can skip WP03.

---

**Q: Can I use different HTTP client library than ApiClient?**

A: Yes, but you'll need to implement the same patterns:
- CSRF token injection
- Context header injection (X-Organization-ID, X-Project-ID)
- Authorization header injection
- Error normalization
- Request/response interceptors
- 401/refresh token handling

The ApiClient examples handle all of this for you.

---

**Q: How do I test this integration?**

A: See the example test patterns in each guide. Key test scenarios:
- Login flow (success and 401)
- Context switching (validates context, syncs across tabs)
- Data fetching (loads, errors, empty, cache)
- Mutations (create, update, delete with cache invalidation)
- Error scenarios (timeout, 403, network errors)

---

**Q: What if my backend doesn't match the patterns?**

A: The guides assume:
- CSRF tokens sent via Set-Cookie (not body)
- httpOnly cookies for session storage
- JSON request/response format
- Standard HTTP status codes (200, 401, 403, 404, 500)
- X-Organization-ID and X-Project-ID headers for multi-tenancy

If your backend uses different patterns, adapt the code examples to your API.

---

**Q: How do I debug integration issues?**

A: Follow the [Troubleshooting Guide](troubleshooting.md):
1. Identify the issue (auth, context, caching)
2. Check DevTools Network tab for request/response
3. Verify headers are correct
4. Check backend logs
5. Use the diagnostic steps for your specific issue

---

## Next Steps

1. **Start with Authentication** → [Authentication Guide](auth-api.md)
2. **Add Multi-Tenancy** → [Context Propagation Guide](context-propagation.md)
3. **Implement Data Fetching** → [Data Fetching Guide](data-fetching.md)
4. **Learn from Mistakes** → [Anti-Patterns Guide](anti-patterns.md)
5. **Prepare for Deployment** → [Pre-Deployment Checklist](checklist.md)
6. **Get Unstuck** → [Troubleshooting Guide](troubleshooting.md)

---

## Resources

### Guides
- [Authentication API](auth-api.md)
- [Context Propagation API](context-propagation.md)
- [Data Fetching Guide](data-fetching.md)

### Reference
- [Anti-Patterns (18 mistakes to avoid)](anti-patterns.md)
- [Troubleshooting (8 common issues)](troubleshooting.md)
- [Pre-Deployment Checklist](checklist.md)

### Examples
- `examples/integration-guides/auth-example/` - Auth implementation
- `examples/integration-guides/context-example/` - Context implementation
- `examples/integration-guides/api-client-example/` - API client implementation
- `examples/integration-guides/cache-example/` - Cache policy implementation

---

Happy integrating! 🚀

Got stuck? See [Troubleshooting Guide](troubleshooting.md) or review [Anti-Patterns Guide](anti-patterns.md).
