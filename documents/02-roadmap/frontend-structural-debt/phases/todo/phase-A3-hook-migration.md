# A3 — Hook Migration to API Client

**Status:** 🔲 Todo
**Effort:** 6 uur
**Scope:** ~132 files met raw `fetch()` → domain API calls
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

- [ ] Raw `fetch()` count < 20 (alleen in apiClient zelf + edge cases)
- [ ] `apiBaseUrl` imports verdwenen uit hooks/pages
- [ ] Error handling consistent via ApiError
- [ ] `npx vite build` slaagt
