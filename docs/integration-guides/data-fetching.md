# Data Fetching Integration Guide

> Learn how to fetch, cache, and manage data from Core-App backend APIs
>
> **Audience**: Frontend developers integrating list/detail views, pagination, and caching
> **Related**: [Authentication Guide](./auth-api.md) | [Context Propagation](./context-propagation.md) | [ApiClient Interface](../../examples/integration-guides/contracts/api-client.ts) | [CachePolicy Interface](../../examples/integration-guides/contracts/cache.ts)

## Overview

Efficient data fetching requires coordination between authentication, context propagation, HTTP caching, and error handling. This guide demonstrates how to:

1. **Build an ApiClient** with automatic header injection (CSRF, auth, context)
2. **Handle pagination** for list endpoints (cursor vs offset)
3. **Implement caching** using HTTP Cache-Control headers
4. **Manage loading/error/empty states** with discriminated unions
5. **Navigate list→detail flows** with prefetching
6. **Invalidate caches** after mutations
7. **Avoid common pitfalls** (duplicate requests, N+1 queries, stale data)

## Prerequisites

- **Frontend**: TypeScript 5.x, React 18.x (for React examples)
- **Backend**: B13 (API Baseline with RESTful endpoints), B04 (i18n for error messages)
- **Authentication**: WP02 (AuthProvider for session management)
- **Context**: WP03 (ContextProvider for tenant headers)
- **Contracts**: Import `ApiClient`, `CachePolicy`, `RequestState`, `ApiResponse` from `@django-core/integration-guides-examples`

## ApiClient Setup

The ApiClient centralizes all HTTP communication and automatically injects required headers:

```typescript
// Vanilla TypeScript
import { createAuthProvider } from './auth-example/vanilla';
import { createContextProvider } from './context-example/vanilla';
import { createApiClient } from './api-client-example/fetch-client';

const auth = createAuthProvider({ baseURL: 'https://api.example.com' });
const context = createContextProvider({ baseURL: 'https://api.example.com' });
const apiClient = createApiClient({
  baseURL: 'https://api.example.com',
  authProvider: auth,
  contextProvider: context,
});

// All requests now include:
// - X-CSRFToken (from meta tag or cookie)
// - X-Organization-ID (from context, if set)
// - X-Project-ID (from context, if set)
// - credentials: 'include' (for httpOnly cookies)
```

### React Integration

```typescript
// In React application
import { createApiClient } from './api-client-example/fetch-client';
import { useAuth } from './auth-example/react';
import { useContext } from './context-example/react';

function ApiClientProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const context = useContext();

  const [apiClient] = React.useState(() =>
    createApiClient({
      baseURL: import.meta.env.VITE_API_BASE_URL,
      authProvider: auth,
      contextProvider: context,
    }),
  );

  return <ApiClientContext.Provider value={apiClient}>{children}</ApiClientContext.Provider>;
}
```

## Fetching a List

List endpoints typically return paginated collections:

```typescript
// Vanilla TypeScript
interface Project {
  id: string;
  name: string;
  slug: string;
  organizationId: string;
}

interface ProjectListResponse {
  results: Project[];
  count: number;
  next: string | null;
  previous: string | null;
}

async function fetchProjects(page: number = 1): Promise<ProjectListResponse> {
  const response = await apiClient.get<ProjectListResponse>('/api/projects', {
    params: { page, page_size: 20 },
  });

  return response.data;
}

// Usage
const projects = await fetchProjects(1);
console.log('Projects:', projects.results);
console.log('Total count:', projects.count);
```

### React Hook Pattern

```typescript
// Custom hook for list fetching
function useProjects(page: number = 1) {
  const apiClient = useApiClient();
  const [state, setState] = React.useState<RequestState<Project[]>>({ status: 'idle' });

  useEffect(() => {
    const loadProjects = async (): Promise<void> => {
      setState({ status: 'loading' });

      try {
        const response = await apiClient.get<ProjectListResponse>('/api/projects', {
          params: { page, page_size: 20 },
        });

        setState({
          status: 'success',
          data: response.data.results,
        });
      } catch (error) {
        setState({
          status: 'error',
          error: error instanceof Error ? error : new Error('Failed to load projects'),
        });
      }
    };

    void loadProjects();
  }, [apiClient, page]);

  return state;
}

// Component usage
function ProjectList() {
  const [page, setPage] = React.useState(1);
  const projectsState = useProjects(page);

  if (projectsState.status === 'loading') {
    return <div>Loading projects...</div>;
  }

  if (projectsState.status === 'error') {
    return <div>Error: {projectsState.error.message}</div>;
  }

  if (projectsState.status === 'success') {
    if (projectsState.data.length === 0) {
      return <div>No projects found</div>;
    }

    return (
      <div>
        {projectsState.data.map((project) => (
          <div key={project.id}>{project.name}</div>
        ))}
        <button onClick={() => setPage(page + 1)}>Next Page</button>
      </div>
    );
  }

  return null; // idle state
}
```

## Fetching a Detail

Detail endpoints return a single resource by ID:

```typescript
// Vanilla TypeScript
async function fetchProject(projectId: string): Promise<Project> {
  const response = await apiClient.get<Project>(`/api/projects/${projectId}`);
  return response.data;
}

// Usage with error handling
try {
  const project = await fetchProject('proj_123');
  console.log('Project:', project.name);
} catch (error) {
  if (error instanceof NotFoundError) {
    console.error('Project not found');
  } else if (error instanceof PermissionDeniedError) {
    console.error('You do not have access to this project');
  } else {
    console.error('Failed to load project:', error);
  }
}
```

### List→Detail Navigation

```typescript
// React pattern for list→detail flow
function ProjectListPage() {
  const projectsState = useProjects();
  const navigate = useNavigate();

  const handleProjectClick = (projectId: string): void => {
    navigate(`/projects/${projectId}`);
  };

  if (projectsState.status === 'success') {
    return (
      <div>
        {projectsState.data.map((project) => (
          <button key={project.id} onClick={() => handleProjectClick(project.id)}>
            {project.name}
          </button>
        ))}
      </div>
    );
  }

  return <div>Loading...</div>;
}

function ProjectDetailPage({ projectId }: { projectId: string }) {
  const projectState = useProject(projectId);

  if (projectState.status === 'success') {
    return (
      <div>
        <h1>{projectState.data.name}</h1>
        <p>Organization: {projectState.data.organizationId}</p>
      </div>
    );
  }

  return <div>Loading project...</div>;
}
```

## Pagination Patterns

Core-App backend supports both offset-based and cursor-based pagination:

### Offset-Based Pagination

```typescript
// Offset pagination (page numbers)
interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

async function fetchPage<T>(
  endpoint: string,
  page: number,
  pageSize: number = 20,
): Promise<PaginatedResponse<T>> {
  const response = await apiClient.get<PaginatedResponse<T>>(endpoint, {
    params: { page, page_size: pageSize },
  });

  return response.data;
}

// Usage
const page1 = await fetchPage<Project>('/api/projects', 1);
const page2 = await fetchPage<Project>('/api/projects', 2);
```

### Cursor-Based Pagination

```typescript
// Cursor pagination (for large datasets)
interface CursorPaginatedResponse<T> {
  results: T[];
  next_cursor: string | null;
  previous_cursor: string | null;
  has_more: boolean;
}

async function fetchWithCursor<T>(
  endpoint: string,
  cursor?: string,
): Promise<CursorPaginatedResponse<T>> {
  const response = await apiClient.get<CursorPaginatedResponse<T>>(endpoint, {
    params: cursor ? { cursor } : {},
  });

  return response.data;
}

// Infinite scroll pattern
async function loadMoreProjects(cursor?: string): Promise<Project[]> {
  const response = await fetchWithCursor<Project>('/api/projects', cursor);

  if (response.has_more && response.next_cursor) {
    // Load next page recursively
    const nextPage = await loadMoreProjects(response.next_cursor);
    return [...response.results, ...nextPage];
  }

  return response.results;
}
```

## HTTP Caching

Core-App backend includes Cache-Control headers in responses. Respect these headers for optimal performance:

```typescript
// Backend response includes:
// Cache-Control: max-age=300, stale-while-revalidate=60
// ETag: "abc123"

// ApiClient should:
// 1. Store response in cache with max-age duration
// 2. If cached data exists, return it immediately
// 3. If data is stale (older than max-age), revalidate with If-None-Match
// 4. If server returns 304 Not Modified, use cached data
```

### Cache Policy Implementation

```typescript
// Using CachePolicy interface
import { createCachePolicy } from './cache-example/swr-policy';

const cachePolicy = createCachePolicy({
  // Configure cache durations per endpoint pattern
  config: new Map([
    ['/api/projects', 5 * 60 * 1000], // 5 minutes
    ['/api/organisations', 10 * 60 * 1000], // 10 minutes
    ['/api/users/me', 2 * 60 * 1000], // 2 minutes
  ]),
});

// ApiClient integrates with cache policy
const apiClient = createApiClient({
  baseURL: 'https://api.example.com',
  authProvider: auth,
  contextProvider: context,
  cachePolicy, // Optional cache policy
});

// Fetch with caching
const response = await apiClient.get<Project[]>('/api/projects');
// First call: fetches from backend, stores in cache
// Second call (within 5 minutes): returns cached data
```

### Cache Invalidation

Invalidate caches after mutations to ensure data consistency:

```typescript
// After creating a project
const newProject = await apiClient.post<Project>('/api/projects', {
  name: 'New Project',
  organizationId: 'org_123',
});

// Invalidate project list cache
cachePolicy.invalidate({ pattern: '/api/projects*' });

// After updating a project
await apiClient.put<Project>(`/api/projects/${projectId}`, updatedData);

// Invalidate specific project + list
cachePolicy.invalidate({ pattern: `/api/projects/${projectId}`, exact: true });
cachePolicy.invalidate({ pattern: '/api/projects*' });

// After deleting a project
await apiClient.delete(`/api/projects/${projectId}`);

// Invalidate all related caches
cachePolicy.invalidate({ pattern: `/api/projects/${projectId}`, exact: true });
cachePolicy.invalidate({ pattern: '/api/projects*' });
```

## Loading/Error/Empty States

Use discriminated unions (RequestState) to manage UI states:

```typescript
// RequestState type (from contracts/types.ts)
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

// React component pattern
function ProjectList() {
  const projectsState = useProjects();

  // Exhaustive pattern matching
  switch (projectsState.status) {
    case 'idle':
      return null; // Initial state, not yet fetched

    case 'loading':
      return <Spinner />;

    case 'error':
      return (
        <ErrorMessage>
          Failed to load projects: {projectsState.error.message}
          <button onClick={refetch}>Retry</button>
        </ErrorMessage>
      );

    case 'success':
      if (projectsState.data.length === 0) {
        return <EmptyState message="No projects found" />;
      }

      return (
        <div>
          {projectsState.data.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      );
  }
}
```

## Request Cancellation

Use AbortController to cancel in-flight requests when component unmounts:

```typescript
// React hook with cancellation
function useProjects(page: number = 1) {
  const apiClient = useApiClient();
  const [state, setState] = React.useState<RequestState<Project[]>>({ status: 'idle' });

  useEffect(() => {
    const abortController = new AbortController();

    const loadProjects = async (): Promise<void> => {
      setState({ status: 'loading' });

      try {
        const response = await apiClient.get<ProjectListResponse>('/api/projects', {
          params: { page, page_size: 20 },
          signal: abortController.signal, // Pass abort signal
        });

        setState({
          status: 'success',
          data: response.data.results,
        });
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        setState({
          status: 'error',
          error: error instanceof Error ? error : new Error('Failed to load projects'),
        });
      }
    };

    void loadProjects();

    // Cleanup: abort request on unmount or page change
    return () => abortController.abort();
  }, [apiClient, page]);

  return state;
}
```

## Retry Patterns

Implement exponential backoff for transient errors:

```typescript
// Retry with exponential backoff
async function fetchWithRetry<T>(
  fetcher: () => Promise<T>,
  maxRetries: number = 3,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fetcher();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      // Don't retry on client errors (4xx)
      if (error instanceof ClientError) {
        throw error;
      }

      // Calculate backoff delay: 1s, 2s, 4s
      const delay = Math.pow(2, attempt) * 1000;

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

// Usage
const projects = await fetchWithRetry(() => apiClient.get<Project[]>('/api/projects'));
```

## Anti-Patterns ⚠️

### 1. Duplicate Requests (Race Conditions)

**Problem**: Multiple components fetch the same data simultaneously
```typescript
// ❌ WRONG - duplicate requests
function ComponentA() {
  const projects = useProjects(); // Fetches /api/projects
}

function ComponentB() {
  const projects = useProjects(); // Fetches /api/projects again!
}
```

**Solution**: Use shared cache or request deduplication
```typescript
// ✅ CORRECT - deduplicate with cache
const cachePolicy = createCachePolicy({
  dedupeInterval: 2000, // Dedupe requests within 2 seconds
});

// Or use SWR library which deduplicates automatically
import useSWR from 'swr';

function useProjects() {
  const { data, error } = useSWR('/api/projects', fetcher);
  // SWR automatically deduplicates requests across components
}
```

### 2. N+1 Query Problem

**Problem**: Fetching details for each list item individually
```typescript
// ❌ WRONG - N+1 queries
function ProjectList() {
  const projects = useProjects(); // 1 request

  return (
    <div>
      {projects.data.map((project) => (
        <ProjectDetail key={project.id} projectId={project.id} />
        // N requests (one per project)
      ))}
    </div>
  );
}

function ProjectDetail({ projectId }: { projectId: string }) {
  const project = useProject(projectId); // Separate request per project!
  return <div>{project.data.name}</div>;
}
```

**Solution**: Include related data in list response or use batch endpoints
```typescript
// ✅ CORRECT - backend includes related data
interface ProjectListResponse {
  results: Array<{
    id: string;
    name: string;
    organization: { id: string; name: string }; // Related data included
  }>;
}

// Or use batch endpoint
const projectIds = ['proj_1', 'proj_2', 'proj_3'];
const projects = await apiClient.post<Project[]>('/api/projects/batch', { ids: projectIds });
```

### 3. Missing Loading States

**Problem**: No loading indicator while fetching
```typescript
// ❌ WRONG - no loading state
function ProjectList() {
  const projects = useProjects();

  if (projects.status === 'error') {
    return <div>Error</div>;
  }

  return (
    <div>
      {projects.data?.map((project) => <div key={project.id}>{project.name}</div>)}
    </div>
  );
  // What happens during loading? Empty list flickers!
}
```

**Solution**: Always handle loading state explicitly
```typescript
// ✅ CORRECT - explicit loading state
function ProjectList() {
  const projects = useProjects();

  if (projects.status === 'loading') {
    return <Spinner />;
  }

  if (projects.status === 'error') {
    return <ErrorMessage error={projects.error} />;
  }

  if (projects.status === 'success') {
    return (
      <div>
        {projects.data.map((project) => <div key={project.id}>{project.name}</div>)}
      </div>
    );
  }

  return null;
}
```

### 4. Not Handling Empty States

**Problem**: No empty state when list is empty
```typescript
// ❌ WRONG - confusing empty list
function ProjectList() {
  const projects = useProjects();

  if (projects.status === 'success') {
    return (
      <div>
        {projects.data.map((project) => <div key={project.id}>{project.name}</div>)}
      </div>
    );
    // What if projects.data.length === 0? Shows nothing!
  }
}
```

**Solution**: Explicitly handle empty lists
```typescript
// ✅ CORRECT - clear empty state
function ProjectList() {
  const projects = useProjects();

  if (projects.status === 'success') {
    if (projects.data.length === 0) {
      return (
        <EmptyState
          title="No projects yet"
          description="Create your first project to get started"
          action={<button>Create Project</button>}
        />
      );
    }

    return (
      <div>
        {projects.data.map((project) => <div key={project.id}>{project.name}</div>)}
      </div>
    );
  }
}
```

### 5. Ignoring Cache Invalidation

**Problem**: Stale data after mutations
```typescript
// ❌ WRONG - cache not invalidated
async function createProject(data: CreateProjectData) {
  const newProject = await apiClient.post<Project>('/api/projects', data);
  // Cache still shows old project list!
  return newProject;
}
```

**Solution**: Invalidate cache after mutations
```typescript
// ✅ CORRECT - invalidate related caches
async function createProject(data: CreateProjectData) {
  const newProject = await apiClient.post<Project>('/api/projects', data);

  // Invalidate all project-related caches
  cachePolicy.invalidate({ pattern: '/api/projects*' });

  return newProject;
}
```

### 6. Not Using Optimistic Updates

**Problem**: User waits for server response before seeing UI change
```typescript
// ❌ WRONG - slow perceived performance
async function toggleFavorite(projectId: string) {
  // User clicks, waits for server response...
  await apiClient.post(`/api/projects/${projectId}/favorite`);
  // ...then UI updates
  refetch(); // Slow!
}
```

**Solution**: Update UI optimistically, rollback on error
```typescript
// ✅ CORRECT - instant perceived performance
async function toggleFavorite(projectId: string, currentFavorite: boolean) {
  // Update UI immediately
  setFavorite(!currentFavorite);

  try {
    await apiClient.post(`/api/projects/${projectId}/favorite`);
  } catch (error) {
    // Rollback on error
    setFavorite(currentFavorite);
    showErrorNotification('Failed to update favorite');
  }
}
```

### 7. Fetching on Every Render

**Problem**: Unnecessary re-fetches on component re-renders
```typescript
// ❌ WRONG - fetches on every render
function ProjectList() {
  const [projects, setProjects] = React.useState<Project[]>([]);

  // No dependency array - runs on EVERY render!
  React.useEffect(() => {
    fetchProjects().then(setProjects);
  });

  return <div>{projects.map((p) => <div key={p.id}>{p.name}</div>)}</div>;
}
```

**Solution**: Use dependency array correctly
```typescript
// ✅ CORRECT - only fetch once on mount
function ProjectList() {
  const [projects, setProjects] = React.useState<Project[]>([]);

  React.useEffect(() => {
    fetchProjects().then(setProjects);
  }, []); // Empty array - only run once

  return <div>{projects.map((p) => <div key={p.id}>{p.name}</div>)}</div>;
}
```

## Pre-Deployment Integration Checklist

- [ ] ApiClient initialized with AuthProvider and ContextProvider
- [ ] CSRF token injected in all mutating requests (POST/PUT/DELETE)
- [ ] Context headers (X-Organization-ID, X-Project-ID) included when context set
- [ ] All API calls use discriminated union RequestState for loading/error/success
- [ ] Empty states handled explicitly (not just empty lists)
- [ ] Loading states shown during data fetching
- [ ] Error states show user-friendly messages with retry buttons
- [ ] Request cancellation implemented via AbortController
- [ ] Cache policy configured with appropriate durations per endpoint
- [ ] Cache invalidation happens after mutations
- [ ] HTTP Cache-Control headers respected from backend
- [ ] Pagination implemented (offset or cursor based on endpoint)
- [ ] Retry logic uses exponential backoff (max 3 attempts)
- [ ] N+1 queries avoided (use batch endpoints or include related data)
- [ ] Duplicate requests deduplicated (via cache or library)
- [ ] Optimistic updates implemented for instant perceived performance
- [ ] Team reviewed for data fetching patterns (anti-patterns avoided)
- [ ] E2E tests verify list→detail navigation
- [ ] Product validated pagination and caching behavior

## Related Resources

- [ApiClient Interface](../../examples/integration-guides/contracts/api-client.ts)
- [CachePolicy Interface](../../examples/integration-guides/contracts/cache.ts)
- [WP02: Authentication Guide](./auth-api.md)
- [WP03: Context Propagation Guide](./context-propagation.md)
- [Fetch API Client Example](../../examples/integration-guides/api-client-example/fetch-client.ts)
- [SWR Cache Policy Example](../../examples/integration-guides/cache-example/swr-policy.ts)
- [Core-App B13 API Baseline](../../../backend-modules/b13-api-baseline.md)
