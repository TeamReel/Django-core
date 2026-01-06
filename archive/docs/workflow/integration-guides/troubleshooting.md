# Troubleshooting Guide

Diagnose and resolve common integration issues when connecting frontend to Core-App backend.

## CSRF Failures

### Symptoms
- Network shows request blocked with "CSRF token invalid"
- Backend returns 403 Forbidden with "CSRF verification failed"
- Login form fails with CSRF error

### Diagnostic Steps

1. **Check CSRF token presence**
   ```javascript
   // Open browser console
   document.querySelector('meta[name="csrf-token"]')?.content
   // Should return a token string like "xyz123..."

   // Or check cookies
   document.cookie
   // Should include csrftoken=... (if set-cookie header included it)
   ```

2. **Verify header in request**
   - Open DevTools Network tab
   - Click on a POST/PUT/DELETE request
   - Look for `X-CSRFToken` header
   - Compare with value from meta tag

3. **Check backend is sending CSRF token**
   - Open DevTools Network tab
   - Click on login GET request
   - Look at Response Headers
   - Should include `Set-Cookie: csrftoken=...`

### Solutions

**If CSRF token missing:**
```typescript
// Ensure ApiClient extracts from meta tag
function getCsrfToken(): string {
  const meta = document.querySelector('meta[name="csrf-token"]');
  if (!meta) {
    console.warn('CSRF token meta tag not found');
    return '';
  }
  return meta.getAttribute('content') || '';
}

// Add to request headers
const csrfToken = getCsrfToken();
if (csrfToken) {
  headers['X-CSRFToken'] = csrfToken;
}
```

**If CSRF header not sent:**
- Check ApiClient request interceptor is configured
- Verify `addRequestInterceptor()` called before making requests
- Check method is POST/PUT/DELETE/PATCH (not GET)

**If backend not sending token:**
- Check middleware is installed: `django.middleware.csrf.CsrfViewMiddleware`
- Check response includes `Set-Cookie: csrftoken` header
- Verify origin/referer headers are correct

### Prevention
- Use ApiClient which handles CSRF automatically
- Test with curl: `curl -i http://localhost:8000/api/auth/login`
- Verify meta tag in HTML: `<meta name="csrf-token" content="...">`

---

## 401 Authorization Loops

### Symptoms
- Login succeeds, but immediately redirected back to login
- 401 errors on every API request after login
- Token visible in cookie but requests still fail

### Diagnostic Steps

1. **Check authentication state**
   ```javascript
   // In browser console after login
   document.cookie // Should show session/auth cookie
   fetch('/api/auth/me') // Should return user object
   ```

2. **Verify token is sent with requests**
   - DevTools Network tab
   - Click on failing request
   - Headers section should show `Authorization: Bearer token` or session cookie

3. **Check backend session configuration**
   ```bash
   # Backend logs should show:
   # POST /api/auth/login 200 (successful)
   # GET /api/resource 401 (token validation failed)
   ```

### Solutions

**Token not persisted:**
```typescript
// ✅ Use httpOnly cookies (backend should set these)
// No frontend code needed - browser handles automatically

// ✅ OR use sessionStorage if token in response body
const response = await fetch('/api/auth/login', ...);
const { token } = await response.json();
sessionStorage.setItem('token', token);

// Include in subsequent requests
const headers = {
  'Authorization': `Bearer ${sessionStorage.getItem('token')}`
};
```

**Token not sent with requests:**
```typescript
// ✅ Include credentials with fetch
fetch('/api/resource', {
  credentials: 'include', // Include cookies
  headers: {
    'Authorization': `Bearer ${token}` // Or use Bearer token
  }
});

// ✅ Or use ApiClient with interceptor
apiClient.addRequestInterceptor((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});
```

**Token expired:**
```typescript
// ✅ Implement refresh logic
apiClient.addResponseInterceptor((response) => {
  if (response.status === 401) {
    // Try to refresh token
    return refreshToken().then(() => {
      // Retry original request
      return apiClient.request(config);
    }).catch(() => {
      // Refresh failed, logout
      authProvider.logout();
    });
  }
  return response;
});
```

### Prevention
- Configure backend to send httpOnly cookies with secure flag
- Test login manually: `curl -i -c cookies.txt http://localhost:8000/api/auth/login -d "..."`
- Check token expiry time and refresh before expiry
- Implement 401 response handler to refresh or logout

---

## Context Drift (Multi-Tenancy Issues)

### Symptoms
- Requests going to wrong organization/project
- API returns data for different org than selected
- Headers show correct org but data is wrong
- Multi-tab sync not working

### Diagnostic Steps

1. **Check context provider state**
   ```javascript
   // Access context (depends on implementation)
   console.log(contextProvider.currentOrganization); // Should show selected org
   console.log(contextProvider.currentProject); // Should show selected project
   ```

2. **Verify headers in requests**
   - DevTools Network tab
   - Click on any API request
   - Headers should show:
     - `X-Organization-ID: org_123`
     - `X-Project-ID: proj_456`

3. **Check backend is using headers**
   ```bash
   # Backend logs should show:
   # GET /api/resources organization=org_123 project=proj_456

   # If backend is querying wrong org, context header not received
   ```

### Solutions

**Context not persisting across page reload:**
```typescript
// ✅ Save context to localStorage
async function setOrganization(org: Organization) {
  this.currentOrganization = org;
  // Persist for next session
  localStorage.setItem('currentOrg', JSON.stringify(org));
}

// Restore on app startup
function restoreContext() {
  const savedOrg = localStorage.getItem('currentOrg');
  if (savedOrg) {
    this.currentOrganization = JSON.parse(savedOrg);
  }
}
```

**Headers not injected in requests:**
```typescript
// ✅ Add to ApiClient request interceptor
apiClient.addRequestInterceptor((config) => {
  if (contextProvider.currentOrganization) {
    config.headers['X-Organization-ID'] = contextProvider.currentOrganization.id;
  }
  if (contextProvider.currentProject) {
    config.headers['X-Project-ID'] = contextProvider.currentProject.id;
  }
  return config;
});
```

**Multi-tab sync not working:**
```typescript
// ✅ Listen for storage events from other tabs
window.addEventListener('storage', (event) => {
  if (event.key === 'currentOrg' && event.newValue) {
    const newOrg = JSON.parse(event.newValue);
    contextProvider.setOrganization(newOrg);
    // Refresh UI with new context
  }
});
```

**Context persists after logout:**
```typescript
// ✅ Clear context on logout
async function logout() {
  await apiClient.request('/api/auth/logout', 'POST');

  // Clear context
  contextProvider.clearContext();
  localStorage.removeItem('currentOrg');
  localStorage.removeItem('currentProject');

  redirect('/login');
}
```

### Prevention
- Implement storage event listeners for multi-tab sync
- Validate context on app startup
- Clear context on logout and 403 responses
- Test with multiple tabs open and switching context
- Use contextProvider pattern for centralized management

---

## Stale Cache Issues

### Symptoms
- Old data shown after creating/updating items
- New items don't appear in list
- Edit succeeds but page still shows old values
- Refresh fixes the issue (temporarily)

### Diagnostic Steps

1. **Check cache state**
   ```javascript
   // Access cache (depends on implementation)
   console.log(cachePolicy.getEntryAge('/api/projects')); // Age in seconds
   console.log(cachePolicy.getStats()); // Cache hit/miss stats
   ```

2. **Monitor cache hits and misses**
   - DevTools Network tab
   - Create/update item
   - Check if request is sent or 304 cached response returned

3. **Check cache invalidation**
   ```bash
   # After mutation, should see cache miss
   # Next request should say "Size: 123 B" not "(from cache)"
   ```

### Solutions

**Cache not invalidated after mutation:**
```typescript
// ❌ WRONG - no invalidation
async function createProject(data: CreateProjectData) {
  return await apiClient.post('/api/projects', data);
  // Cache still has old list
}

// ✅ CORRECT - invalidate cache
async function createProject(data: CreateProjectData) {
  const newProject = await apiClient.post<Project>(
    '/api/projects',
    data,
  );

  // Invalidate all project-related caches
  cachePolicy.invalidate({ pattern: '/api/projects*' });

  return newProject;
}
```

**Cache TTL too long:**
```typescript
// ✅ Use appropriate cache durations
const cachePolicy = new SwrCachePolicy({
  staticTypes: {
    LONG: { duration: 3600 }, // 1 hour for stable data
    MEDIUM: { duration: 600 }, // 10 minutes for frequently updated
    SHORT: { duration: 60 },   // 1 minute for dynamic data
    MINIMAL: { duration: 10 }, // 10 seconds for highly volatile
  },
});

// Use based on data type
cachePolicy.set('/api/projects', data, { type: 'MEDIUM' });
```

**Forget to invalidate related caches:**
```typescript
// ✅ Invalidate list AND detail cache
async function updateProject(id: string, data: UpdateProjectData) {
  const updated = await apiClient.put<Project>(
    `/api/projects/${id}`,
    data,
  );

  // Invalidate both list and detail
  cachePolicy.invalidate(`/api/projects`); // List
  cachePolicy.invalidate(`/api/projects/${id}`); // Detail

  return updated;
}
```

### Prevention
- Always invalidate cache after mutations (POST, PUT, DELETE)
- Use pattern-based invalidation: `cachePolicy.invalidate({ pattern: '/api/projects*' })`
- Consider using optimistic updates for instant feedback
- Monitor cache statistics for debugging

---

## Request Timeout & Slow Requests

### Symptoms
- Requests hang indefinitely
- "Request timeout" errors
- Slow network tab shows pending requests
- User experience degraded

### Diagnostic Steps

1. **Check network latency**
   - DevTools Network tab
   - Look at "Time" column for each request
   - Sort by duration to find slow requests

2. **Check request status**
   ```javascript
   // Monitor request
   fetch('/api/resources')
     .then(r => {
       console.log('Response received after Xms');
       return r.json();
     })
     .catch(e => {
       console.log('Request failed:', e.message);
     });
   ```

3. **Check backend is responding**
   ```bash
   # Test backend directly
   curl -i http://localhost:8000/api/resources
   # Should respond within 1-2 seconds

   # If slow, check backend logs for slow queries
   ```

### Solutions

**Requests without timeout:**
```typescript
// ✅ Add timeout to fetch
async function fetchWithTimeout(url: string, timeout = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Or use ApiClient timeout
apiClient.setDefaultTimeout(30000); // 30 seconds
```

**No loading state during slow requests:**
```typescript
// ✅ Show loading indicator for slow requests
async function fetchProjects() {
  const timeout = 500; // Show spinner after 500ms
  const timeoutId = setTimeout(() => setLoading(true), timeout);

  try {
    const projects = await apiClient.request('/api/projects');
    return projects;
  } finally {
    clearTimeout(timeoutId);
    setLoading(false);
  }
}
```

**Slow pagination/list requests:**
```typescript
// ✅ Reduce page size or add filtering
const params = {
  limit: 25, // Reduce from 100
  offset: 0,
  search: 'filter', // Add search to reduce results
};

await apiClient.request('/api/projects', { params });
```

### Prevention
- Implement request timeouts (30s default)
- Show loading indicator for requests > 500ms
- Paginate large lists (25-50 items per page)
- Test with slow network (DevTools throttling)
- Monitor slow requests in production

---

## CORS and Preflight Failures

### Symptoms
- Network shows OPTIONS request blocked
- "No 'Access-Control-Allow-Origin' header" error
- Preflight request returns 403 or 404
- Works in Postman but not in browser

### Diagnostic Steps

1. **Check browser console error**
   ```
   Access to XMLHttpRequest at 'http://backend:8000/api/resource' from origin
   'http://localhost:3000' has been blocked by CORS policy
   ```

2. **Inspect OPTIONS preflight request**
   - DevTools Network tab
   - Look for OPTIONS request before your actual request
   - Check Response Headers:
     - `Access-Control-Allow-Origin: *` or specific origin
     - `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
     - `Access-Control-Allow-Headers: Content-Type, X-CSRFToken, X-Organization-ID`

3. **Check backend configuration**
   ```bash
   # Test preflight with curl
   curl -i -X OPTIONS http://localhost:8000/api/resource \
     -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST"

   # Should return 200 with CORS headers
   ```

### Solutions

**Backend not sending CORS headers:**
```python
# Django: Install django-cors-headers
pip install django-cors-headers

# In settings.py
INSTALLED_APPS = [
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
]

# Configure allowed origins
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'https://app.example.com',
]

# Allow specific headers
CORS_ALLOW_HEADERS = [
    'content-type',
    'x-csrftoken',
    'x-organization-id',
    'x-project-id',
    'authorization',
]
```

**Custom headers not allowed:**
```python
# Backend: Explicitly allow custom headers
CORS_ALLOW_HEADERS = list(default_headers) + [
    'x-organization-id',
    'x-project-id',
    'x-csrftoken',
]
```

**Frontend sending custom headers without declaring them:**
```typescript
// ✅ Backend must allow these headers in CORS policy
const headers = {
  'X-Organization-ID': org.id,
  'X-Project-ID': project.id,
  'X-CSRFToken': csrfToken,
};

// Backend CORS_ALLOW_HEADERS must include these
```

**Preflight request fails (returns non-200):**
```typescript
// ✅ Check OPTIONS endpoint is accessible
// Backend should allow OPTIONS on all endpoints
// Django: Should be handled by middleware automatically

// If custom OPTIONS handler:
if request.method == 'OPTIONS':
    return Response('OK', status=200)
```

### Prevention
- Test CORS with curl before integration
- Configure CORS headers in backend middleware
- Allow all custom headers your frontend uses (CSRF, context, auth)
- Test OPTIONS preflight separately
- Check browser console for CORS errors immediately
- Use CORS debugging tools (browser extensions)

---

## Partial API Responses (HTTP 206)

### Symptoms
- Backend returns 206 Partial Content
- Only partial data received
- App shows incomplete information
- Need to make follow-up requests

### Diagnostic Steps

1. **Check response headers**
   - DevTools Network tab
   - Response should show `206 Partial Content` or `200 OK`
   - Look for `Content-Range` header

2. **Check response body**
   ```javascript
   fetch('/api/large-file')
     .then(r => {
       console.log('Status:', r.status); // 206?
       console.log('Headers:', r.headers); // Content-Range?
       return r.json();
     });
   ```

### Solutions

**Handle 206 responses:**
```typescript
// ✅ Handle partial content responses
apiClient.addResponseInterceptor((response) => {
  if (response.status === 206) {
    // Partial content received
    const contentRange = response.headers.get('content-range');
    console.log('Partial response:', contentRange);

    // Implement retry or follow-up logic
    // Range: bytes=0-999/5000 means bytes 0-999 of 5000 total

    const [range, total] = contentRange.split('/');
    const [start, end] = range.split('=')[1].split('-');

    // Fetch remaining if needed
    if (parseInt(end) < parseInt(total) - 1) {
      // More data available, fetch next chunk
    }
  }
  return response;
});
```

**Implement chunked/streaming responses:**
```typescript
// ✅ Handle streaming for large files
async function downloadLargeFile(url: string) {
  const response = await fetch(url);

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const reader = response.body?.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;
    chunks.push(value);
    console.log(`Downloaded ${chunks.length} chunks`);
  }

  return new Blob(chunks);
}
```

### Prevention
- Test with large files/datasets
- Implement proper 206 handling for large responses
- Use streaming or chunking for files > 1MB
- Document expected response sizes

---

## Token Refresh During Requests

### Symptoms
- Initial request gets 401 (token expired)
- Token refreshes successfully
- But original request doesn't retry
- OR multiple requests refresh simultaneously

### Diagnostic Steps

1. **Check token expiry**
   ```javascript
   // Decode JWT (if using JWT)
   const decoded = JSON.parse(atob(token.split('.')[1]));
   console.log('Expires:', new Date(decoded.exp * 1000));
   ```

2. **Monitor refresh logic**
   - DevTools Network tab
   - Look for `/api/auth/refresh` request
   - Check if original request retried after refresh

3. **Check interceptor order**
   ```javascript
   // Response interceptor should:
   // 1. Detect 401
   // 2. Call refresh
   // 3. Retry original request
   ```

### Solutions

**Implement refresh-before-expiry:**
```typescript
// ✅ Proactive refresh before expiry
async function setupProactiveRefresh() {
  setInterval(() => {
    const token = getToken();
    if (!token) return;

    // Refresh if expires in < 1 minute
    const decoded = JSON.parse(atob(token.split('.')[1]));
    const expiresIn = decoded.exp * 1000 - Date.now();

    if (expiresIn < 60000) {
      refreshToken();
    }
  }, 30000); // Check every 30 seconds
}
```

**Queue requests during refresh:**
```typescript
// ✅ Queue requests while refreshing
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;
const requestQueue: Array<() => void> = [];

apiClient.addResponseInterceptor(async (response) => {
  if (response.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshToken()
        .then(() => {
          // Retry queued requests
          requestQueue.forEach(fn => fn());
          requestQueue.length = 0;
        })
        .finally(() => {
          isRefreshing = false;
        });
    }

    // Queue this request for retry
    return new Promise((resolve) => {
      requestQueue.push(() => {
        // Retry with new token
        resolve(apiClient.request(config));
      });
    });
  }

  return response;
});
```

**Prevent multiple simultaneous refreshes:**
```typescript
// ✅ Only one refresh at a time
let refreshPromise: Promise<string> | null = null;

async function getValidToken(): Promise<string> {
  const token = getToken();
  const decoded = JSON.parse(atob(token.split('.')[1]));

  // If expiring soon, refresh
  if (decoded.exp * 1000 - Date.now() < 60000) {
    if (!refreshPromise) {
      refreshPromise = refreshToken()
        .finally(() => {
          refreshPromise = null;
        });
    }
    await refreshPromise;
  }

  return getToken();
}
```

### Prevention
- Implement proactive refresh (before expiry)
- Queue requests during refresh
- Prevent simultaneous refresh calls
- Set token TTL sensibly (30min-1hour)
- Test refresh flow manually

---

## Multi-Window Context Conflicts

### Symptoms
- User switches organization in one tab
- Other tabs still using old organization
- API requests inconsistent across tabs
- Different users in different tabs

### Diagnostic Steps

1. **Check context persistence**
   ```javascript
   // Open two tabs
   // Tab 1: Switch organization
   // Tab 2: Check what org is selected

   // Should be the same!
   console.log(contextProvider.currentOrganization);
   ```

2. **Monitor storage events**
   ```javascript
   window.addEventListener('storage', (event) => {
     console.log('Storage changed:', event.key, event.newValue);
   });
   ```

3. **Check context headers in Network tab**
   - Make request in Tab 1
   - Make request in Tab 2
   - Both should have same X-Organization-ID header

### Solutions

**Sync context across tabs:**
```typescript
// ✅ Listen for storage events
class ContextProvider {
  private currentOrg: Organization | null = null;

  constructor() {
    // Listen for changes from other tabs
    window.addEventListener('storage', (event) => {
      if (event.key === 'currentOrg') {
        if (event.newValue) {
          this.currentOrg = JSON.parse(event.newValue);
          // Notify listeners of change
          this.notifyListeners();
        }
      }
    });
  }

  setOrganization(org: Organization) {
    this.currentOrg = org;
    // Store so other tabs can see
    localStorage.setItem('currentOrg', JSON.stringify(org));
    this.notifyListeners();
  }
}
```

**Handle context conflicts:**
```typescript
// ✅ Detect and resolve conflicts
async function handleContextChange(newOrg: Organization) {
  try {
    // Validate user still has access
    const response = await apiClient.request(
      `/api/organizations/${newOrg.id}/validate`
    );

    if (!response.ok) {
      throw new Error('ACCESS_DENIED');
    }

    // Update context
    contextProvider.setOrganization(newOrg);
  } catch (error) {
    // Clear invalid context
    contextProvider.clearContext();
    showNotification('Your access has been revoked');
  }
}
```

**Use SharedWorker for reliable sync:**
```typescript
// ✅ Use SharedWorker for robust multi-tab coordination
// (Advanced - only if localStorage events unreliable)
const contextWorker = new SharedWorker('context-worker.js');

contextWorker.port.onmessage = (event) => {
  const { org, project } = event.data;
  contextProvider.setOrganization(org);
  contextProvider.setProject(project);
};

// When context changes, notify worker
contextProvider.on('change', (context) => {
  contextWorker.port.postMessage(context);
});
```

### Prevention
- Implement storage event listeners for context changes
- Validate context on app startup and after restore
- Test with multiple tabs open
- Use SharedWorker for mission-critical sync
- Document context sync behavior

---

## Summary: Common Issues & Fixes

| Issue | Root Cause | Quick Fix |
|-------|-----------|----------|
| CSRF failures | Token not extracted | Check meta tag, verify header in request |
| 401 loops | Token not sent/expired | Use httpOnly cookies, implement refresh |
| Context drift | Headers not injected | Add to ApiClient interceptor |
| Stale cache | No invalidation | Invalidate after mutations |
| Slow requests | No timeout | Add timeout, show spinner |
| CORS failures | Headers not configured | Configure backend CORS middleware, allow custom headers |
| 206 responses | Partial content | Implement retry or chunking |
| Token refresh | Multiple refreshes | Queue requests, proactive refresh |
| Multi-tab conflicts | No sync | Listen to storage events |

## Getting Help

If you're still stuck:

1. **Check the main guides** for your issue:
   - [Authentication Guide](auth-api.md)
   - [Context Propagation Guide](context-propagation.md)
   - [Data Fetching Guide](data-fetching.md)

2. **Check Anti-Patterns** for what NOT to do:
   - [Anti-Patterns Guide](anti-patterns.md)

3. **Use DevTools Network tab:**
   - Check request/response headers
   - Verify cookies and tokens
   - Monitor timing and status codes

4. **Enable backend logging:**
   - Check Django logs for context, tokens, CSRF
   - Verify middleware is installed

5. **Test with curl:**
   ```bash
   # Test CSRF
   curl -i http://localhost:8000/api/auth/login -c cookies.txt

   # Test auth
   curl -i -H "X-CSRFToken: token" http://localhost:8000/api/resource

   # Test context
   curl -i -H "X-Organization-ID: org_123" http://localhost:8000/api/resource
   ```
