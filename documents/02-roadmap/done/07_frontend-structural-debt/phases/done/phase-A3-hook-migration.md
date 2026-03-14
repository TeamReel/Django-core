# A3 — Hook Migration to API Client

**Status:** ✅ Done
**Commit:** (pending push)
**Effort:** 6 uur
**Scope:** 536 → 12 raw `fetch()` calls (98% reduction)
**Vereist:** A2

---

## Doel

Migreer alle `use*Data` hooks en page-level fetch calls van raw `fetch()` naar de typed domain API modules.

## Huidige situatie

```typescript
// VOOR (132 bestanden doen dit):
const res = await fetch(`${apiBaseUrl}/api/v1/activities/?project_id=${pid}`, {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
});
if (!res.ok) throw new Error('Failed');
const data = await res.json();
const items = data?.data?.results || data?.results || [];
```

## Na migratie

```typescript
// NA:
const { results } = await activitiesApi.list(pid);
```

## Aanpak per batch

1. **Hooks in `hooks/`** (~20 files) — meest hergebruikt, hoogste impact
2. **Page-level `use*Data.ts`** hooks (~40 files)
3. **Inline fetch in components** (~30 files)
4. **Modal/wizard fetch** (~20 files)
5. **Remaining** (~22 files)

## Verificatie

- [x] Raw `fetch()` count 536 → 12 (98% reduction, target <20 ✅)
- [x] 192 → 10 files with raw fetch (infra only)
- [x] Error handling consistent via api client
- [x] `npx vite build` slaagt
- [x] 0 TS errors
- [x] 30/30 tests passing
