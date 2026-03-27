# S3 — Props → Context/Composition

**Status:** ✅ Done
**Effort:** 4 uur
**Scope:** 15 interfaces with >15 props → 0 (all ≤15 top-level props)

---

## Doel

Interfaces met 15-42 props zijn een teken van prop drilling. Data die door meerdere lagen wordt doorgegeven hoort in een Context of via composition.

## Ergste gevallen

| Interface | Props | Bestand |
|-----------|-------|---------|
| `SeasonDetailModalsProps` | 42 | `SeasonDetailModals.tsx` |
| `SeasonHierarchyTabProps` | 25 | `SeasonHierarchyTab.tsx` |
| `MatchCreateModalProps` | 24 | `matchCreateTypes.ts` |
| `UserEditAccessTabProps` | 24 | `UserEditAccessTab.tsx` |
| `TeamOverviewTabProps` | 23 | `TeamOverviewTab.tsx` |
| `UsersListFiltersProps` | 20 | `UsersListFilters.tsx` |
| `OrgOverviewTabProps` | 19 | `OrgOverviewTab.tsx` |
| `CompetitionHierarchyTabProps` | 19 | `CompetitionHierarchyTab.tsx` |

## Strategie per case

### Pattern A: Shared data → Context
```typescript
// VOOR: 42 props doorsturen
<SeasonDetailModals season={season} matches={matches} members={members}
  loading={loading} error={error} onRefresh={refetch} ... />

// NA: Context
const { season, matches, members } = useSeasonDetailContext();
```

### Pattern B: Related props → Object prop
```typescript
// VOOR: 6 losse modal props
<Component isOpen={isOpen} onClose={onClose} title={title}
  onSubmit={onSubmit} error={error} loading={loading} />

// NA: 1 object prop
<Component modal={{ isOpen, onClose, title, onSubmit, error, loading }} />
```

### Pattern C: Composition
```typescript
// VOOR: mega-component met alles
<SeasonDetail everything={...} />

// NA: samenstelling
<SeasonDetailProvider>
  <SeasonOverviewTab />
  <SeasonSquadTab />
  <SeasonMatchesTab />
</SeasonDetailProvider>
```

## Verificatie

- [x] Geen interface met >15 props
- [x] Contexts correct cleanup (unmount)
- [x] `npx vite build` slaagt
