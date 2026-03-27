# T1 — Provider Types

**Status:** ✅ Done
**Track:** T — Type Safety
**Effort:** 15 min
**Dependencies:** Geen
**Voltooid:** 2026-03-12

---

## Doel

Fix `any` types in provider helpers.

## Probleembestanden

### seasonProviderHelpers.ts

```tsx
// Lines 96-97
orgForPermissions: any,
permissionContext: { currentOrganisation: any }
```

## Oplossing

Geïmporteerd `Organisation` en `PermissionContext` types:

```tsx
import type { Organisation } from '../types';
import type { PermissionContext } from '../utils/permissions';

// In interface:
orgForPermissions: Organisation | null;
permissionContext: PermissionContext;
```

## Verificatie

- [x] `any` types vervangen door proper types
- [x] `tsc --noEmit` clean
- [x] `vitest run` all green (984 tests)
