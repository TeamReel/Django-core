# API Response Parsing Fix Summary

## Issue
The user reported that "no organisations, projects etc. are visible anymore" ("Er zijn geen organisaties, projecten etcetera meer te zien").
Logs showed that the API was returning a successful response (`status: "success"`), but the frontend components were failing to extract the data, resulting in empty lists.

## Root Cause
The backend API is returning data wrapped in a B13-style envelope:
```json
{
  "status": "success",
  "data": {
    "results": [ ... ],
    "next": "...",
    "previous": null
  }
}
```
The frontend code was expecting the `results` array to be at the top level of the response (standard DRF pagination) or directly in the response body. It was accessing `response.results` instead of `response.data.results`.

## Fixes
Updated the response parsing logic in the following files to handle the nested `data` envelope:

1.  **`examples/demo-shell/src/pages/identity/ProjectsPage.tsx`**
2.  **`examples/demo-shell/src/pages/identity/OrganisationsPage.tsx`**
3.  **`examples/demo-shell/src/pages/identity/UsersPage.tsx`**
4.  **`packages/context-switcher/src/api/organisationsApi.ts`** (Fixes Context Switcher)
5.  **`packages/context-switcher/src/api/projectsApi.ts`** (Fixes Context Switcher)

The fix uses a fallback pattern to support both formats:
```typescript
const results = data.data?.results || data.results || [];
```

## Verification
1.  Reload the application.
2.  The Context Switcher (top bar) should now populate with organisations and projects.
3.  The Projects page (`/projects`) should list projects.
4.  The Organisations page (`/organisations`) should list organisations.
5.  The Users page (`/users`) should list users.
