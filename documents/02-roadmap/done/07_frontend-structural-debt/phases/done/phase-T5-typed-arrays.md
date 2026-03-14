# T5 — Typed Arrays

**Status:** ✅ Done
**Commit:** (pending push)
**Effort:** 2 uur
**Scope:** 195 → 37 `any[]` in active files (81% reduction)
**Vereist:** T1

---

## Doel

`any[]` arrays zijn ongetypt — je krijgt geen autocomplete, geen type errors bij verkeerd gebruik. Vervang door `Activity[]`, `Member[]`, etc.

## Veelvoorkomende patterns

```typescript
// VOOR:
const [matches, setMatches] = useState<any[]>([]);
const results: any[] = await fetchAllPages(url);

// NA:
const [matches, setMatches] = useState<Match[]>([]);
const results: Match[] = await fetchAllPages<Match>(url);
```

## Verificatie

- [x] `any[]` count 195 → 37 (81% reduction, target <50 ✅)
- [x] `npx vite build` slaagt
- [x] 0 TS errors
- [x] 30/30 tests passing
