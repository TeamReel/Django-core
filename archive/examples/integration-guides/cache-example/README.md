# Cache Policy Example

SWR (Stale-While-Revalidate) based cache policy implementation with HTTP Cache-Control header support.

## Features

- ✅ Respects HTTP Cache-Control `max-age` from backend
- ✅ Stale-While-Revalidate pattern (returns cached data, revalidates in background)
- ✅ Pattern-based cache invalidation (exact, prefix, wildcard)
- ✅ ETag support for conditional requests (If-None-Match)
- ✅ Configurable cache duration per endpoint pattern
- ✅ Cache statistics for debugging
- ✅ Simple FIFO eviction when max entries exceeded

## Quick Start

### Basic Usage

```typescript
import { createCachePolicy } from './swr-policy';
import { createApiClient } from '../api-client-example/fetch-client';

// Create cache policy with custom durations
const cachePolicy = createCachePolicy({
  config: new Map([
    ['/api/projects', 5 * 60 * 1000],       // 5 minutes
    ['/api/organisations', 10 * 60 * 1000], // 10 minutes
    ['/api/users/me', 2 * 60 * 1000],       // 2 minutes (profile changes often)
  ]),
});

// Use with ApiClient
const apiClient = createApiClient({
  baseURL: 'https://api.example.com',
  authProvider: auth,
  contextProvider: context,
  cachePolicy,
});

// First call: fetches from backend
const projects = await apiClient.get<Project[]>('/api/projects');
// Response includes Cache-Control header: "max-age=300, stale-while-revalidate=60"

// Second call (within 5 minutes): returns cached data immediately
const projectsCached = await apiClient.get<Project[]>('/api/projects');
// No network request made!

// Third call (after 5 minutes): revalidates with If-None-Match header
// If backend returns 304 Not Modified, uses cached data
// If backend returns 200 OK, updates cache
const projectsRefreshed = await apiClient.get<Project[]>('/api/projects');
```

### Default Cache Durations

```typescript
const defaultConfig = new Map([
  // Static/rarely changing - 30 minutes
  ['/api/permissions', 30 * 60 * 1000],
  ['/api/roles', 30 * 60 * 1000],

  // Organizations and projects - 10 minutes
  ['/api/organisations', 10 * 60 * 1000],
  ['/api/projects', 10 * 60 * 1000],

  // List endpoints - 5 minutes
  ['/api/tasks', 5 * 60 * 1000],
  ['/api/users', 5 * 60 * 1000],

  // Detail endpoints - 3 minutes
  ['/api/projects/*', 3 * 60 * 1000],
  ['/api/tasks/*', 3 * 60 * 1000],

  // User profile - 2 minutes
  ['/api/users/me', 2 * 60 * 1000],
]);
```

## Cache Invalidation

Invalidate caches after mutations to ensure consistency:

### Exact Match

```typescript
// Invalidate a specific resource
await apiClient.delete(`/api/projects/proj_123`);
cachePolicy.invalidate({ pattern: '/api/projects/proj_123', exact: true });
```

### Prefix Match

```typescript
// Invalidate all projects-related caches
await apiClient.post('/api/projects', { name: 'New Project' });
cachePolicy.invalidate({ pattern: '/api/projects' });
// Clears: /api/projects, /api/projects/123, /api/projects/456, etc.
```

### Wildcard Match

```typescript
// Invalidate using wildcard pattern
cachePolicy.invalidate({ pattern: '/api/projects*' });
// Clears: /api/projects, /api/projects/123, /api/projects/456, etc.

// Invalidate multiple patterns
cachePolicy.invalidate({ pattern: '/api/tasks*' });
```

### Clear All

```typescript
// Clear entire cache
cachePolicy.clearAll();
```

## Stale-While-Revalidate Pattern

The cache policy implements SWR for optimal UX:

```
Timeline:
  0ms: Request /api/projects
  0ms: ├─ Backend returns: Cache-Control: max-age=300, stale-while-revalidate=60
  0ms: └─ Cache stores with TTL=300s, revalidate at 240s (80% of TTL)

  100ms: Request /api/projects (cached)
  100ms: ├─ Cached data fresh (240s remaining)
  100ms: └─ Return cached data immediately (no network request)

  300ms: Request /api/projects (cache expired, but still in SWR window)
  300ms: ├─ Cache expired (TTL exceeded)
  300ms: ├─ Within stale-while-revalidate window (60s)
  300ms: ├─ Send revalidation request with If-None-Match header
  300ms: └─ Return cached data immediately (user doesn't wait for revalidation)

  310ms: Request /api/projects (revalidation completed)
  310ms: ├─ Backend returned 304 Not Modified
  310ms: └─ Update cache TTL, return cached data
```

## Debugging

### View Cache Statistics

```typescript
import { logCacheStats } from './swr-policy';

const stats = cachePolicy.getStats();
console.log(`Cache has ${stats.size} entries`);

for (const entry of stats.entries) {
  console.log(`${entry.path}: ${entry.isStale ? 'STALE' : 'FRESH'}`);
}

// Or use convenience function
logCacheStats(cachePolicy);
// Output:
// ✅ FRESH /api/projects (age: 2500ms)
// ⚠️ REVALIDATE /api/organisations (age: 240000ms)
// ❌ STALE /api/tasks (age: 320000ms)
```

### Monitor Cache Invalidations

```typescript
import { CachePolicyMonitor } from './swr-policy';

// Enable monitoring
const monitor = new CachePolicyMonitor(cachePolicy, (pattern) => {
  console.log(`Cache invalidated: ${pattern}`);
});

// Subsequent invalidations will be logged:
cachePolicy.invalidate({ pattern: '/api/projects*' });
// Console: 🗑️ Cache invalidation: PATTERN "/api/projects*"

// Stop monitoring
monitor.stop();
```

### Get Entry Age

```typescript
const ageMs = cachePolicy.getEntryAge('/api/projects');

if (ageMs === null) {
  console.log('Not cached');
} else if (ageMs < 1000) {
  console.log('Very fresh (< 1 second old)');
} else if (ageMs < 60000) {
  console.log(`Fresh (${Math.round(ageMs / 1000)} seconds old)`);
} else {
  console.log(`Stale (${Math.round(ageMs / 60000)} minutes old)`);
}
```

## React Integration

### Custom Hook

```typescript
import { createCachePolicy } from './swr-policy';
import { useApiClient } from '../api-client-example/react';

const cachePolicy = createCachePolicy();

function useProjects() {
  const apiClient = useApiClient();
  const [state, setState] = React.useState<RequestState<Project[]>>({ status: 'idle' });

  React.useEffect(() => {
    const loadProjects = async () => {
      setState({ status: 'loading' });

      try {
        const response = await apiClient.get<ProjectListResponse>('/api/projects');

        setState({
          status: 'success',
          data: response.data.results,
          fromCache: response.fromCache,
        });
      } catch (error) {
        setState({
          status: 'error',
          error: error instanceof Error ? error : new Error('Failed to load projects'),
        });
      }
    };

    void loadProjects();
  }, [apiClient]);

  return state;
}

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
        {projects.fromCache && <Badge>From Cache</Badge>}
        {projects.data.map((p) => <div key={p.id}>{p.name}</div>)}
      </div>
    );
  }

  return null;
}
```

### Manual Invalidation

```typescript
function CreateProjectForm() {
  const apiClient = useApiClient();

  const handleSubmit = async (data: CreateProjectData) => {
    try {
      const newProject = await apiClient.post<Project>('/api/projects', data);

      // Invalidate project list cache
      cachePolicy.invalidate({ pattern: '/api/projects' });

      // Invalidate organization cache (if affected)
      cachePolicy.invalidate({ pattern: '/api/organisations*' });

      showSuccessNotification('Project created');
      navigateTo(`/projects/${newProject.id}`);
    } catch (error) {
      showErrorNotification('Failed to create project');
    }
  };

  return <Form onSubmit={handleSubmit} />;
}
```

## API Reference

### SwrCachePolicy

```typescript
class SwrCachePolicy implements CachePolicy {
  constructor(options?: SwrCachePolicyOptions);

  shouldCache(path: string, method: string, cacheControl?: string): boolean;
  getCacheDuration(path: string, cacheControl?: string): number;
  shouldRevalidate(path: string, cachedAt: number, expiresIn: number): boolean;

  get<T>(path: string): { data: T; etag?: string } | undefined;
  set<T>(path: string, data: T, options?: CacheSetOptions): void;

  invalidate(options: CacheInvalidationOptions): void;
  clearAll(): void;

  getStats(): CacheStatistics;
  getEntryAge(path: string): number | null;
}
```

### Factory Function

```typescript
function createCachePolicy(options?: SwrCachePolicyOptions): CachePolicy;
```

### Options

```typescript
interface SwrCachePolicyOptions {
  // Map of endpoint patterns to cache duration (milliseconds)
  config?: Map<string, number> | Record<string, number>;

  // Maximum number of cached entries (default: 100)
  // Oldest entries evicted via FIFO when limit reached
  maxEntries?: number;
}
```

## Configuration Examples

### Aggressive Caching (Mobile)

```typescript
const mobileConfig = new Map([
  ['/api/projects', 15 * 60 * 1000],       // 15 minutes
  ['/api/organisations', 30 * 60 * 1000],  // 30 minutes
  ['/api/users/me', 5 * 60 * 1000],        // 5 minutes
]);

const cachePolicy = createCachePolicy({ config: mobileConfig });
```

### Conservative Caching (Collaborative Apps)

```typescript
const conservativeConfig = new Map([
  ['/api/projects', 30 * 1000],        // 30 seconds
  ['/api/organisations', 60 * 1000],   // 60 seconds
  ['/api/users/me', 10 * 1000],        // 10 seconds
]);

const cachePolicy = createCachePolicy({ config: conservativeConfig });
```

### Per-Environment Configuration

```typescript
const getCacheConfig = () => {
  if (import.meta.env.PROD) {
    return new Map([
      ['/api/projects', 10 * 60 * 1000],
      ['/api/organisations', 15 * 60 * 1000],
    ]);
  }

  // Development: shorter cache durations
  return new Map([
    ['/api/projects', 2 * 60 * 1000],
    ['/api/organisations', 3 * 60 * 1000],
  ]);
};

const cachePolicy = createCachePolicy({ config: getCacheConfig() });
```

## Best Practices

### ✅ DO

- Invalidate cache after mutations (POST/PUT/DELETE)
- Use pattern matching for related resources
- Respect backend Cache-Control headers
- Monitor cache via `getStats()` in development
- Use generous durations for static data (roles, permissions)
- Use short durations for user profiles (they change frequently)

### ❌ DON'T

- Cache POST/PUT/DELETE requests
- Forget to invalidate after mutations
- Cache authentication endpoints
- Use cache for highly dynamic data without monitoring
- Assume cache invalidation happens automatically
- Ignore stale-while-revalidate window (it helps UX)

## Performance Impact

Cache policy provides significant performance benefits:

```
Without caching:
  - List page load: 500ms (network request)
  - Navigate to detail: 200ms (separate request)
  - Return to list: 500ms (duplicate request)
  Total: 1200ms

With caching (SWR):
  - List page load: 500ms (network request)
  - Navigate to detail: 200ms (separate request)
  - Return to list: 0ms (cached data returned immediately)
  Total: 700ms (42% faster)
```

## Troubleshooting

### Cache Not Being Used

- Check `shouldCache()` returns true for your path
- Verify path exactly matches config (patterns are case-sensitive)
- Check `getStats()` to see if entry is in cache

### Cache Never Invalidates

- Verify `invalidate()` pattern matches exactly
- Use wildcard pattern if unsure: `pattern: '/api/projects*'`
- Check that invalidation happens immediately after mutation

### Memory Growing Over Time

- Check `maxEntries` setting (default 100)
- Monitor cache size with `getStats().size`
- Clear unused caches with `clearAll()`
- Consider reducing cache durations

### Stale Data Being Used

- Check cache duration configuration
- Backend should include proper Cache-Control headers
- Use `getEntryAge()` to check cache freshness
- Manually invalidate if needed
