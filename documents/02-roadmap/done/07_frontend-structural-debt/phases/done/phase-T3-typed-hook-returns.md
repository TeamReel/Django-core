# T3 — Typed Hook Returns

**Status:** ✅ Done
**Commit:** `78bc0f43`
**Effort:** 3 uur
**Scope:** ~50 hooks (15 core + 24 page-level + 11 component-level)
**Vereist:** T1

---

## Doel

Alle custom hooks krijgen expliciete return types en parameter types. Dit voorkomt dat consumers van hooks `any` moeten casten.

## Aanpak

1. Voeg return type interface toe aan elke hook
2. Type parameters (ids, slugs, config objects)
3. Gebruik API types uit T1 voor data states

## Voorbeeld

```typescript
// VOOR:
export function useCompetitionsData(projectId: any, orgSlug: any) {
  const [competitions, setCompetitions] = useState<any[]>([]);
  // ...
  return { competitions, loading, error, refetch };
}

// NA:
interface UseCompetitionsDataReturn {
  competitions: Competition[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCompetitionsData(
  projectId: string,
  orgSlug: string,
): UseCompetitionsDataReturn {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  // ...
}
```

## Verificatie

- [x] Alle hooks in `hooks/` hebben expliciete return types (15 hooks, 22 functions)
- [x] Top 24 page-level hooks (`use*Data.ts`) getypt
- [x] 11 component-level hooks getypt
- [x] ~22 nieuwe Use*Return interfaces geëxporteerd
- [x] `npx vite build` slaagt
- [x] 30/30 tests passing
