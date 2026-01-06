# Pre-Deployment Integration Checklist

Use this checklist to ensure your frontend is properly integrated with the Core-App backend before deploying to staging or production.

## Authentication Setup

- [ ] **CSRF Protection Enabled**
  - [ ] Backend returns CSRF token in Set-Cookie header (httpOnly, secure, sameSite=strict)
  - [ ] Frontend extracts CSRF token from meta tag or cookie
  - [ ] All mutating requests (POST, PUT, DELETE, PATCH) include `X-CSRFToken` header
  - [ ] Tested with browser DevTools: verify header sent with each request

- [ ] **Token Storage**
  - [ ] Tokens stored in httpOnly cookies (NOT localStorage)
  - [ ] Session cookies configured with Secure, SameSite=Strict flags
  - [ ] Credentials included in fetch requests: `fetch(..., { credentials: 'include' })`
  - [ ] Tested: no token visible in localStorage or sessionStorage

- [ ] **Login Flow**
  - [ ] Login endpoint accepts email + password
  - [ ] Successful login returns 200 with user data
  - [ ] Failed login returns 401 with clear error message
  - [ ] CSRF token refreshed on login
  - [ ] User redirected to dashboard after successful login
  - [ ] Browser DevTools Network tab shows CSRF token in request headers

- [ ] **Logout Flow**
  - [ ] Logout endpoint clears session
  - [ ] All context cleared on logout (organization, project)
  - [ ] User redirected to login page after logout
  - [ ] Cookies cleared by browser
  - [ ] Context state reset in application

- [ ] **401 & 403 Handling**
  - [ ] 401 responses trigger redirect to login
  - [ ] 403 responses show "permission denied" error (not login redirect)
  - [ ] Retry-after header respected if present
  - [ ] User is not logged out on 403

- [ ] **Token Refresh**
  - [ ] Proactive refresh configured (e.g., before expiry)
  - [ ] Manual refresh interceptor handles expired tokens
  - [ ] Requests queued during refresh and retried
  - [ ] Failed refresh triggers logout

## Context Propagation (Multi-Tenancy)

- [ ] **Organization Context**
  - [ ] Organization selected on login or context switcher
  - [ ] Current organization stored in context provider
  - [ ] `X-Organization-ID` header included in all API requests
  - [ ] Organization ID persisted across page reloads
  - [ ] Switching organizations updates context and headers

- [ ] **Project Context**
  - [ ] Project can be selected within organization
  - [ ] Current project stored in context provider
  - [ ] `X-Project-ID` header included in API requests (when applicable)
  - [ ] Project persisted across page reloads
  - [ ] Switching projects updates context and headers

- [ ] **Context Validation**
  - [ ] Context cleared if server returns 403 (access denied)
  - [ ] Context validated on app startup
  - [ ] Stale context automatically refreshed
  - [ ] User prompted to select organization if context invalid

- [ ] **Multi-Tab Sync**
  - [ ] Context changes in one tab reflected in others
  - [ ] Storage events trigger context updates
  - [ ] No out-of-sync requests between tabs
  - [ ] Tested: open app in two tabs, switch organization, verify both tabs update

- [ ] **Context on Logout**
  - [ ] Organization context cleared on logout
  - [ ] Project context cleared on logout
  - [ ] No context headers sent after logout

## Data Fetching & Caching

- [ ] **API Client Setup**
  - [ ] ApiClient instance created and configured
  - [ ] Request interceptors set up (auth, context, CSRF)
  - [ ] Response interceptors handle errors
  - [ ] Error interceptors catch and normalize failures
  - [ ] Request deduplication enabled

- [ ] **List Fetching**
  - [ ] List endpoints called with proper pagination parameters
  - [ ] Loading state shown during fetch
  - [ ] Error state shown on failure
  - [ ] Empty state shown when list is empty
  - [ ] Duplicate requests prevented (via cache or deduplication)

- [ ] **Detail Fetching**
  - [ ] Detail endpoint called with proper ID
  - [ ] List→detail navigation preserves list state
  - [ ] Back navigation returns to list
  - [ ] Detail page handles 404 (not found)

- [ ] **Pagination**
  - [ ] Pagination method matches backend (offset-based or cursor-based)
  - [ ] Page size matches backend expectations
  - [ ] First page loads without explicit page parameter
  - [ ] Subsequent pages correctly paginated
  - [ ] Last page detected correctly
  - [ ] Page resets on filter changes

- [ ] **HTTP Caching**
  - [ ] Cache-Control headers respected (max-age, stale-while-revalidate)
  - [ ] ETag values stored and sent as If-None-Match
  - [ ] 304 Not Modified responses handled correctly
  - [ ] Cache policy configured for appropriate endpoints

- [ ] **Loading/Error/Empty States**
  - [ ] Loading spinner shown during fetch
  - [ ] Error message shows on failure
  - [ ] Error shows correct HTTP status code context
  - [ ] Empty state shown when list has 0 items
  - [ ] Retry button available on error

- [ ] **Request Cancellation**
  - [ ] AbortController implemented for cancellable requests
  - [ ] Navigation cancels in-flight requests
  - [ ] Component unmount cancels in-flight requests
  - [ ] No race conditions from cancelled requests

- [ ] **Retry Patterns**
  - [ ] Retries configured for transient errors (5xx, network errors)
  - [ ] Exponential backoff implemented (e.g., 1s, 2s, 4s, 8s max)
  - [ ] Max retry count enforced
  - [ ] Permanent errors (4xx) not retried
  - [ ] User can manually retry on error

## Cache Invalidation

- [ ] **Cache Invalidation Strategy**
  - [ ] Cache cleared after CREATE operations
  - [ ] Cache cleared after UPDATE operations
  - [ ] Cache cleared after DELETE operations
  - [ ] Related caches invalidated (e.g., list after item update)
  - [ ] Pattern-based invalidation supported (e.g., `/api/projects/*`)

- [ ] **Optimistic Updates**
  - [ ] UI updates immediately after mutation
  - [ ] Cache updated optimistically
  - [ ] Rollback on error with user notification
  - [ ] Original state restored on failed request

## Security

- [ ] **Credentials & Tokens**
  - [ ] No tokens logged to console
  - [ ] No credentials sent in URL parameters
  - [ ] No sensitive data in localStorage
  - [ ] Error messages don't expose internal details

- [ ] **CORS & Preflight**
  - [ ] Backend includes `Access-Control-Allow-Origin` header
  - [ ] OPTIONS preflight requests succeed (OPTIONS method allowed)
  - [ ] Custom headers (X-CSRFToken, X-Organization-ID) declared in CORS policy
  - [ ] Credentials sent with requests in dev and prod

- [ ] **Content Security Policy**
  - [ ] CSP headers configured to allow API domain
  - [ ] No inline scripts or event handlers
  - [ ] Script sources whitelisted

## Testing & Validation

- [ ] **Type Safety**
  - [ ] TypeScript strict mode enabled
  - [ ] All API responses typed correctly
  - [ ] No `any` types in API code
  - [ ] Request and response types match backend spec

- [ ] **API Type Matching**
  - [ ] Frontend types match backend response structure
  - [ ] Missing/extra fields handled gracefully
  - [ ] Backend schema changes don't break frontend
  - [ ] Tested with API contract validation

- [ ] **Error Handling**
  - [ ] All error responses have error handling
  - [ ] Network errors handled (timeout, connection refused)
  - [ ] Parsing errors handled (malformed JSON)
  - [ ] Rate limit errors (429) handled with retry-after
  - [ ] Server errors (5xx) handled with retry

- [ ] **Integration Testing**
  - [ ] E2E tests cover happy paths
  - [ ] Error scenarios tested (401, 403, 404, 500)
  - [ ] Multi-step flows tested (login → select org → fetch data)
  - [ ] Context switching tested

## Performance

- [ ] **Bundle Size**
  - [ ] HTTP client code < 20KB gzipped
  - [ ] Cache policy code < 15KB gzipped
  - [ ] No unused dependencies included

- [ ] **Network Performance**
  - [ ] Duplicate requests eliminated
  - [ ] Cache hits verified in DevTools Network tab
  - [ ] 304 Not Modified responses verified
  - [ ] Pagination prevents over-fetching

- [ ] **Request Latency**
  - [ ] Typical API calls < 500ms
  - [ ] Slow requests shown with loading indicator
  - [ ] Timeout configured (e.g., 30 seconds)

## Documentation

- [ ] **API Documentation**
  - [ ] All API endpoints documented
  - [ ] Request/response examples provided
  - [ ] Error codes documented
  - [ ] Authentication requirements clear

- [ ] **Code Comments**
  - [ ] Complex logic commented
  - [ ] CSRF and security measures documented
  - [ ] Cache behavior documented
  - [ ] Rate limiting behavior documented

- [ ] **Runbook**
  - [ ] How to debug CSRF failures documented
  - [ ] How to debug 401/403 errors documented
  - [ ] How to check context headers documented
  - [ ] How to clear cache documented

## Deployment Steps

**Before staging:**
1. All checkboxes above marked complete
2. Integration tests passing
3. TypeScript strict mode with 0 errors
4. ESLint passing with 0 warnings
5. Code review approved

**Before production:**
1. Staging environment tested end-to-end
2. API contract validated against prod backend
3. Performance testing completed
4. Security audit passed
5. Monitoring alerts configured (auth failures, slow requests, errors)

## See Also

- [Authentication Guide](auth-api.md)
- [Context Propagation Guide](context-propagation.md)
- [Data Fetching Guide](data-fetching.md)
- [Anti-Patterns Guide](anti-patterns.md)
- [Troubleshooting Guide](troubleshooting.md)
