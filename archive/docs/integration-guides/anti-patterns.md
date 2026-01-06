# Anti-Patterns Guide

Common mistakes when integrating frontend with Core-App backend, organized by category with "do this instead" solutions.

## Security Anti-Patterns

### ❌ Storing Tokens in localStorage

**Why it's wrong:**
- XSS vulnerabilities can steal tokens
- localStorage is accessible to JavaScript
- No automatic expiry management
- Tokens persist across browser sessions

**Do this instead:**
```typescript
// ✅ Use httpOnly cookies (set by backend)
// - Inaccessible to JavaScript (XSS safe)
// - Automatically sent with requests
// - Managed by browser

// If you must store in JavaScript:
// ✅ Use sessionStorage (cleared on tab close)
// ✅ Mark credentials: 'include' to send cookies
fetch('/api/data', {
  credentials: 'include', // Include cookies in request
});
```

**See also**: [Auth Guide - Token Storage](auth-api.md#anti-patterns)

---

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

Form-based attacks can hijack state-changing operations.

**Do this instead:**
```typescript
// ✅ ALWAYS include CSRF token in mutating requests
const csrfToken = getCsrfTokenFromMeta(); // From <meta name="csrf-token">
fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'X-CSRFToken': csrfToken,
  },
  body: JSON.stringify({ email, password }),
});

// Or use ApiClient which handles this automatically
await apiClient.post('/api/auth/login', { email, password }); // CSRF added
```

**See also**: [Auth Guide - CSRF Protection](auth-api.md#getting-the-csrf-token)

---

### ❌ Logging Credentials or Tokens

**Why it's wrong:**
- Tokens end up in logs, monitoring systems, error tracking
- Credentials exposed in network logs
- Breach of user privacy and security
- Logs may be stored or transmitted in plaintext

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

// Or use structured logging
logger.info('Login attempt', {
  email: credentials.email,
  timestamp: new Date(),
  // password, token fields intentionally omitted
});
```

---

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
    errorCode: error.code,
    timestamp: new Date(),
  });
}
```

---

## Authentication Anti-Patterns

### ❌ Not Distinguishing 401 vs 403

**Why it's wrong:**
```typescript
// ❌ WRONG: Same handling for both
if (response.status === 401 || response.status === 403) {
  window.location.href = '/login';
}
```

- **401**: User is not authenticated (session expired)
- **403**: User is authenticated but lacks permission

Redirecting to login on 403 confuses users who are already logged in.

**Do this instead:**
```typescript
// ✅ RIGHT: Different handling
if (response.status === 401) {
  // Session expired, clear context
  authProvider.logout();
  redirect('/login');
} else if (response.status === 403) {
  // Permission denied
  showNotification('You do not have permission to access this resource');
  redirect('/');
}
```

---

## Context Propagation Anti-Patterns

### ❌ Context in Local Variables

**Why it's wrong:**
Context stored in local variables is lost on navigation or refresh.

```typescript
// ❌ WRONG - context lost on reload
let currentOrg;

function switchOrg(org: Organization) {
  currentOrg = org; // lost on page reload!
}
```

**Do this instead:**
```typescript
// ✅ CORRECT - use centralized provider with persistence
await contextProvider.setOrganization(org);
// Automatically persisted to localStorage by provider
```

---

### ❌ Missing Context Headers

**Why it's wrong:**
```typescript
// ❌ WRONG - context ignored
fetch('/api/resources', {
  headers: { 'X-CSRFToken': token },
  // X-Organization-ID missing!
});

// Request hits multi-tenant backend without context
// Backend may return error or wrong data
```

**Do this instead:**
```typescript
// ✅ CORRECT - integrate context into ApiClient
await apiClient.request('/api/resources');
// Headers injected automatically:
// X-Organization-ID: org_123
// X-Project-ID: proj_456
// X-CSRFToken: token
```

---

### ❌ Silent Failures on Context Loss

**Why it's wrong:**
```typescript
// ❌ WRONG - continues with invalid context
try {
  await apiClient.request('/api/resources');
} catch (error) {
  // Ignores 403 Forbidden (access denied)
  console.error(error);
}
```

User continues working with revoked context unaware.

**Do this instead:**
```typescript
// ✅ CORRECT - validate and clear on access denial
try {
  await apiClient.request('/api/resources');
} catch (error) {
  if (error.status === 403) {
    // Context no longer valid
    contextProvider.clearContext();
    redirectToOrgSelection();
    showNotification('Your access to this organization has been revoked');
  } else {
    showNotification('Request failed: ' + error.message);
  }
}
```

---

### ❌ Multi-Tab Context Conflicts

**Why it's wrong:**
User switches context in one tab, other tabs unaware.

```typescript
// ❌ WRONG - tabs out of sync
// Tab 1: User switches to Acme Corp
contextProvider.setOrganization(acmeOrg);

// Tab 2: Still using old context (OldCorp)
// Subsequent API calls to /api/resources return OldCorp data
// But UI expects AcmeCorp!
```

**Do this instead:**
```typescript
// ✅ CORRECT - sync context via storage events
window.addEventListener('storage', (event) => {
  if (event.key === 'currentOrg') {
    const newOrg = JSON.parse(event.newValue || '{}');
    contextProvider.setOrganization(newOrg);
    // Refresh UI with new context
  }
});
```

**Note**: Context provider should automatically handle this in the provider implementation.

---

### ❌ Context Validation Not Validated

**Why it's wrong:**
```typescript
// ❌ WRONG - no validation
const proj = { id: 'proj_789', organizationId: 'org_999' };
await contextProvider.setProject(proj);
// Doesn't check if user has access to this project!

// Subsequent API calls fail silently
```

**Do this instead:**
```typescript
// ✅ CORRECT - validate via API call
const response = await apiClient.request(
  `/api/organizations/${org.id}/projects/${project.id}/validate`,
);

if (!response.ok) {
  throw new ContextError('ACCESS_DENIED');
}

await contextProvider.setProject(project);
```

---

### ❌ Context Not Cleared on Logout

**Why it's wrong:**
```typescript
// ❌ WRONG - context remains
async function logout() {
  await apiClient.request('/api/auth/logout', 'POST');
  // Context still set!
  // Subsequent requests include org/project headers
  // API returns old org data
}
```

**Do this instead:**
```typescript
// ✅ CORRECT - clear context on logout
async function logout() {
  try {
    await apiClient.request('/api/auth/logout', 'POST');
  } finally {
    // Always clear context, even if logout fails
    contextProvider.clearContext();
    redirect('/login');
  }
}
```

---

## Data Fetching Anti-Patterns

### ❌ Duplicate Requests (Race Conditions)

**Why it's wrong:**
Multiple components fetch the same data simultaneously.

```typescript
// ❌ WRONG - duplicate requests
function ComponentA() {
  const projects = useProjects(); // Fetches /api/projects
}

function ComponentB() {
  const projects = useProjects(); // Fetches /api/projects again!
}

// Network tab shows: 2 identical requests to /api/projects
```

**Do this instead:**
```typescript
// ✅ CORRECT - deduplicate with cache
const cachePolicy = createCachePolicy({
  dedupeInterval: 2000, // Dedupe requests within 2 seconds
});

// Or use SWR library
import useSWR from 'swr';

function useProjects() {
  const { data, error } = useSWR('/api/projects', fetcher);
  // SWR automatically deduplicates requests across components
  // Only 1 request sent regardless of component count
}
```

**See also**: [Data Fetching Guide - Duplicate Requests](data-fetching.md#1-duplicate-requests-race-conditions)

---

### ❌ N+1 Query Problem

**Why it's wrong:**
Fetching details for each list item individually.

```typescript
// ❌ WRONG - N+1 queries
function ProjectList() {
  const projects = useProjects(); // 1 request: GET /api/projects

  return (
    <div>
      {projects.data.map((project) => (
        <ProjectDetail key={project.id} projectId={project.id} />
        // N requests: GET /api/projects/:id for each project
      ))}
    </div>
  );
}

// Network tab shows: 1 + N requests (slow!)
```

**Do this instead:**
```typescript
// ✅ CORRECT - include related data in list response
interface ProjectListResponse {
  results: Array<{
    id: string;
    name: string;
    organization: { id: string; name: string }; // Related data included
  }>;
}

// Or use batch endpoint
const projectIds = ['proj_1', 'proj_2', 'proj_3'];
const projects = await apiClient.post<Project[]>(
  '/api/projects/batch',
  { ids: projectIds },
);

// Network tab shows: 1 or 2 requests instead of N+1
```

---

### ❌ Missing Loading States

**Why it's wrong:**
No loading indicator while fetching.

```typescript
// ❌ WRONG - no loading state
function ProjectList() {
  const projects = useProjects();

  if (projects.status === 'error') {
    return <div>Error</div>;
  }

  return (
    <div>
      {projects.data?.map((project) => (
        <div key={project.id}>{project.name}</div>
      ))}
    </div>
  );
  // What happens during loading? Empty list flickers!
}
```

**Do this instead:**
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
        {projects.data.map((project) => (
          <div key={project.id}>{project.name}</div>
        ))}
      </div>
    );
  }

  return null;
}
```

---

### ❌ Not Handling Empty States

**Why it's wrong:**
No empty state when list is empty.

```typescript
// ❌ WRONG - confusing empty list
function ProjectList() {
  const projects = useProjects();

  if (projects.status === 'success') {
    return (
      <div>
        {projects.data.map((project) => (
          <div key={project.id}>{project.name}</div>
        ))}
      </div>
    );
    // What if projects.data.length === 0? Shows blank screen!
  }
}
```

**Do this instead:**
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
        {projects.data.map((project) => (
          <div key={project.id}>{project.name}</div>
        ))}
      </div>
    );
  }
}
```

---

### ❌ Ignoring Cache Invalidation

**Why it's wrong:**
Stale data after mutations.

```typescript
// ❌ WRONG - cache not invalidated
async function createProject(data: CreateProjectData) {
  const newProject = await apiClient.post<Project>(
    '/api/projects',
    data,
  );
  // Cache still shows old project list!
  // New project doesn't appear until user refreshes
  return newProject;
}
```

**Do this instead:**
```typescript
// ✅ CORRECT - invalidate related caches
async function createProject(data: CreateProjectData) {
  const newProject = await apiClient.post<Project>(
    '/api/projects',
    data,
  );

  // Invalidate all project-related caches
  cachePolicy.invalidate({ pattern: '/api/projects*' });

  return newProject;
}

// Or invalidate specifically
cachePolicy.invalidate('/api/projects'); // List
cachePolicy.invalidate(`/api/projects/${newProject.id}`); // Detail
```

---

### ❌ Not Using Optimistic Updates

**Why it's wrong:**
User waits for server response before seeing UI change.

```typescript
// ❌ WRONG - slow perceived performance
async function toggleFavorite(projectId: string) {
  // User clicks, waits for server response...
  await apiClient.post(`/api/projects/${projectId}/favorite`);
  // ...then UI updates
  refetch(); // Slow!
}
```

**Do this instead:**
```typescript
// ✅ CORRECT - update UI optimistically, rollback on error
async function toggleFavorite(
  projectId: string,
  currentFavorite: boolean,
) {
  // Update UI immediately
  setFavorite(!currentFavorite);

  try {
    await apiClient.post(`/api/projects/${projectId}/favorite`);
    // Success: cache invalidated, state updated
  } catch (error) {
    // Rollback on error
    setFavorite(currentFavorite);
    showErrorNotification('Failed to update favorite');
  }
}
```

---

### ❌ Fetching on Every Render

**Why it's wrong:**
Unnecessary re-fetches on component re-renders.

```typescript
// ❌ WRONG - fetches on every render
function ProjectList() {
  const [projects, setProjects] = React.useState<Project[]>([]);

  // This runs on EVERY render, not just mount
  React.useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then(setProjects);
  }); // Missing dependency array!
}
```

**Do this instead:**
```typescript
// ✅ CORRECT - fetch only on mount or when dependencies change
function ProjectList() {
  const [projects, setProjects] = React.useState<Project[]>([]);

  // Fetch only once on mount
  React.useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then(setProjects);
  }, []); // Empty dependency array = fetch once

  return (
    <div>
      {projects.map((project) => (
        <div key={project.id}>{project.name}</div>
      ))}
    </div>
  );
}

// Or use a data fetching library that handles this
function ProjectList() {
  const { data: projects } = useSWR('/api/projects', fetcher);
  // Automatic deduplication and cache management
}
```

---

## Summary

| Category | Count | Key Points |
|----------|-------|-----------|
| Security | 4 | CSRF, token storage, error exposure, credential logging |
| Authentication | 1 | 401 vs 403 handling |
| Context | 6 | Provider usage, headers, validation, sync, logout |
| Data Fetching | 7 | Deduplication, N+1, states, cache, optimistic, render |
| **Total** | **18** | Cross-cutting concerns and integration pitfalls |

## Reference

For detailed implementation examples, see:
- [Authentication Guide](auth-api.md#anti-patterns)
- [Context Propagation Guide](context-propagation.md#anti-patterns)
- [Data Fetching Guide](data-fetching.md#anti-patterns)
