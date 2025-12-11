# ADR-004: API Integration with @django-core/api-client

**Status:** Accepted

**Date:** 2024-12-11

**Deciders:** @django-core/frontend-team

---

## Context

The context switcher needs to fetch data from backend APIs:
- List of organisations the user has access to
- List of projects within an organisation
- Current context from backend session (optional)
- Save context to backend session (optional)

We need a solution that:
1. Handles HTTP requests reliably
2. Supports authentication (cookies, tokens)
3. Provides consistent error handling
4. Works with Django REST Framework backend
5. Integrates with the design system's patterns
6. Minimizes bundle size

## Decision

We will use **`@django-core/api-client`** for all API interactions, with fetch-based HTTP requests and cookie-based authentication.

### Architecture

```typescript
import { createApiClient } from '@django-core/api-client';

const apiClient = createApiClient({
  baseURL: '/api',
  withCredentials: true,
});

// Use in provider
<ContextSwitcherProvider
  config={{
    routerAdapter,
    apiClient, // Optional - created internally if not provided
  }}
>
```

### API Contract

**GET /api/organisations/**

Returns list of organisations:

```json
{
  "organisations": [
    {
      "id": "org_123",
      "name": "Acme Corp",
      "slug": "acme-corp",
      "logo": "https://example.com/logo.png",
      "metadata": {
        "isPinned": false
      }
    }
  ]
}
```

**GET /api/organisations/:orgId/projects/**

Returns list of projects:

```json
{
  "projects": [
    {
      "id": "proj_456",
      "name": "Website Redesign",
      "slug": "website-redesign",
      "organisationId": "org_123",
      "metadata": {
        "isArchived": false
      }
    }
  ]
}
```

## Rationale

### Why @django-core/api-client?

**Consistency:**
- Same API client used across all Django Core packages
- Shared configuration and patterns
- Centralized error handling

**Built for Django:**
- Cookie-based authentication (Django's default)
- CSRF token handling
- REST Framework conventions

**Type-Safe:**
- Full TypeScript support
- Request/response types
- Compile-time safety

**Small Bundle:**
- Thin wrapper around native `fetch`
- No heavy dependencies (unlike Axios)
- Tree-shakeable

**Modern:**
- Uses native `fetch` API
- Works in all modern browsers
- Compatible with edge runtimes (Vercel, Cloudflare)

### Cookie-Based Authentication

```typescript
const apiClient = createApiClient({
  baseURL: '/api',
  withCredentials: true, // ✅ Include cookies in requests
});

// Requests automatically include session cookie
await apiClient.get('/organisations/');
```

**Benefits:**
- **Secure**: HttpOnly cookies prevent XSS attacks
- **Simple**: No token management in frontend
- **Django-native**: Works out-of-box with Django sessions
- **CSRF protection**: Handled automatically

### Error Handling

Consistent error handling across all API calls:

```typescript
interface ApiError {
  message: string;
  status: number;
  data?: any;
}

try {
  const orgs = await apiClient.get<OrganisationsResponse>('/organisations/');
  setOrganisations(orgs.organisations);
} catch (error) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    } else if (error.status === 403) {
      // Show permission error
      setError('You do not have permission to access this organisation');
    } else {
      // Generic error
      setError('Failed to load organisations');
    }
  }

  // Call error callback
  config.onContextError?.(error);
}
```

### Caching Strategy

The context switcher does **not** implement its own caching. Applications should use React Query, SWR, or similar:

```typescript
// External caching (recommended)
import { useQuery } from '@tanstack/react-query';

function useOrganisations() {
  return useQuery({
    queryKey: ['organisations'],
    queryFn: () => apiClient.get<OrganisationsResponse>('/organisations/'),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Context switcher uses cached data
<ContextSwitcherProvider
  config={{
    routerAdapter,
    apiBaseUrl: '/api',
  }}
>
```

**Rationale:**
- Caching is application-specific (different TTLs, invalidation rules)
- React Query/SWR are better at caching than we could build
- Keeps context switcher focused and lightweight
- Users can choose their preferred caching solution

## Implementation

### API Client Creation

```typescript
// Internal default client
const apiClient = createApiClient({
  baseURL: config.apiBaseUrl || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Or user-provided client
const apiClient = config.apiClient || createDefaultApiClient(config);
```

### Fetching Organisations

```typescript
async function loadOrganisations(): Promise<Organisation[]> {
  try {
    const response = await apiClient.get<OrganisationsResponse>(
      '/organisations/'
    );

    return response.organisations;
  } catch (error) {
    console.error('Failed to load organisations:', error);
    throw error;
  }
}
```

### Fetching Projects

```typescript
async function loadProjects(orgId: string): Promise<Project[]> {
  try {
    const response = await apiClient.get<ProjectsResponse>(
      `/organisations/${orgId}/projects/`
    );

    return response.projects;
  } catch (error) {
    console.error('Failed to load projects:', error);
    throw error;
  }
}
```

### Optional: Save Context to Backend

```typescript
async function saveContextToBackend(
  orgId: string,
  projectId: string | null
): Promise<void> {
  try {
    await apiClient.post('/context/', {
      organisationId: orgId,
      projectId,
    });
  } catch (error) {
    // Non-blocking - context still works even if save fails
    console.warn('Failed to save context to backend:', error);
  }
}
```

## Consequences

### Positive

- **Consistent patterns**: Same API client across all packages
- **Type-safe**: Full TypeScript support
- **Small bundle**: Thin wrapper, minimal overhead
- **Django-friendly**: Cookie auth, CSRF handling
- **Secure**: HttpOnly cookies, automatic CSRF protection
- **Flexible**: Users can provide custom client

### Negative

- **Dependency**: Requires `@django-core/api-client`
- **Django-specific**: Optimized for Django, might need customization for other backends
- **No built-in caching**: Applications must handle caching

### Mitigations

**Custom API Client:**

Users can provide their own client:

```typescript
import axios from 'axios';

const customClient = {
  get: (url) => axios.get(url).then((r) => r.data),
  post: (url, data) => axios.post(url, data).then((r) => r.data),
};

<ContextSwitcherProvider
  config={{
    routerAdapter,
    apiClient: customClient, // ✅ Use custom client
  }}
>
```

**Non-Django Backends:**

Adapter pattern for different backend types:

```typescript
// Express backend
const apiClient = createApiClient({
  baseURL: '/api',
  headers: {
    Authorization: `Bearer ${getAuthToken()}`,
  },
});

// GraphQL backend
const apiClient = {
  get: async (url) => {
    const query = urlToQuery(url);
    const response = await graphqlClient.query({ query });
    return response.data;
  },
};
```

## Alternatives Considered

### 1. Axios

**Rejected because:**
- Larger bundle (~13KB vs ~2KB)
- More features than needed (interceptors, transformers)
- Not as modern as `fetch`
- Doesn't work in edge runtimes without polyfills

### 2. Native fetch Directly

**Rejected because:**
- No type safety
- Manual error handling in every call
- Manual CSRF token handling
- No centralized configuration
- Code duplication across packages

### 3. GraphQL (Apollo/urql)

**Rejected because:**
- Backend is REST-based, not GraphQL
- Much larger bundle (~40KB+ for Apollo)
- Overkill for simple CRUD operations
- Steeper learning curve

### 4. tRPC

**Rejected because:**
- Requires TypeScript backend
- Not compatible with Django REST Framework
- Adds significant complexity
- Overkill for simple API calls

### 5. SWR/React Query Built-in

**Rejected because:**
- Forces specific caching library on users
- Increases bundle size significantly
- Users should choose their own caching solution
- Context switcher should remain focused

## Related ADRs

- [ADR-002: State Management](./002-state-management.md) - How fetched data is stored
- [ADR-001: Router Adapter Pattern](./001-router-adapter-pattern.md) - How URLs are synchronized

## Backend Integration

### Django REST Framework Views

```python
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response


class OrganisationViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Organisation.objects.filter(
            members__user=self.request.user
        ).distinct()

    def list(self, request):
        organisations = self.get_queryset()
        serializer = OrganisationSerializer(organisations, many=True)
        return Response({'organisations': serializer.data})

    @action(detail=True, methods=['get'])
    def projects(self, request, pk=None):
        organisation = self.get_object()
        projects = Project.objects.filter(
            organisation=organisation,
            members__user=request.user
        ).distinct()

        serializer = ProjectSerializer(projects, many=True)
        return Response({'projects': serializer.data})
```

### CORS Configuration

```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://app.example.com',
]

CORS_ALLOW_CREDENTIALS = True

# CSRF trusted origins
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://app.example.com',
]
```

## References

- [@django-core/api-client Documentation](../../api-client/README.md)
- [Django REST Framework Documentation](https://www.django-rest-framework.org/)
- [Fetch API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [HTTP Cookie Authentication](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
