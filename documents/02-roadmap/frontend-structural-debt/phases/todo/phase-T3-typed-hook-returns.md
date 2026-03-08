# T3 — Typed Hook Returns

**Status:** 🔲 Todo
**Effort:** 3 uur
**Scope:** ~40 hooks in `hooks/` + page-level `use*Data` hooks
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

- [ ] Alle hooks in `hooks/` hebben expliciete return types
- [ ] Top 20 page-level hooks (`use*Data.ts`) getypt
- [ ] `npx vite build` slaagt
