# U2 — Login ?next= Redirect

**Status:** ✅ Done
**Effort:** 30 min

## Scope
LoginPage en RegisterPage: na redirect naar login de originele URL onthouden via `?next=` param en na login daarheen navigeren.

## Changes

### PermissionGuards.tsx
- Alle 4 guards (AdminOnlyRoute, OrgAdminRoute, SecurityRoute, ProtectedRoute) sturen nu `?next=<pathname>` mee bij redirect naar `/login`

### LoginPage.tsx
- `useSearchParams` toegevoegd
- Na login: navigeert naar `searchParams.get('next') || routes.dashboard()`

### RegisterPage.tsx
- Zelfde pattern als LoginPage — leest `?next=` param na signup

## Result
- 3 files gewijzigd, 0 TypeScript errors
- Gebruikers komen na login terug op de pagina waar ze vandaan kwamen
