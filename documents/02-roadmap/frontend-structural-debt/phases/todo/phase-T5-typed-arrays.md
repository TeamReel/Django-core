# T5 — Typed Arrays

**Status:** 🔲 Todo
**Effort:** 2 uur
**Scope:** ~290 `any[]` usages
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

- [ ] `any[]` count < 50 (van 290)
- [ ] `npx vite build` slaagt
