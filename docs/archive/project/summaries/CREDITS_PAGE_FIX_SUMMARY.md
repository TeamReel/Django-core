# Credits Page & Auth Fix Summary

## Issue
The user reported that the Credits page was not working ("credits pagina werkt nu niet").
Logs showed repeated `401 Unauthorized` errors for:
- `/api/v1/organisations/` (ContextSwitcher)
- `/api/v1/auth/me/` (AuthProvider)

Despite these errors, the user was not being redirected to the login page, leading to a broken UI state where the page loaded but data fetching failed.

## Root Cause
The application was entering a state where the backend rejected requests (401), but the frontend `AuthProvider` state was not effectively clearing the session or triggering a redirect in time, or other components (`ContextSwitcherProvider`, `CreditsPage`) were encountering 401s without propagating them to the auth system.

## Fixes
1.  **`examples/demo-shell/src/main.tsx`**:
    - Updated `onContextError` in `ContextSwitcherProvider` configuration.
    - Added a check for `error.code === 401` or `error.status === 401`.
    - Forces a redirect to `/login` via `window.location.href` if a 401 occurs during context loading.

2.  **`examples/demo-shell/src/pages/config/CreditsPage.tsx`**:
    - Updated transaction fetching logic (both main list and balance preview).
    - Added a check for `response.error.code === 401`.
    - Forces a redirect to `/login` via `window.location.href` if a 401 occurs during data fetching.

## Verification
1.  Navigate to the Credits page.
2.  If the session is valid, data should load.
3.  If the session expires (or backend returns 401), the application should now immediately redirect to the login page instead of showing a broken state.
