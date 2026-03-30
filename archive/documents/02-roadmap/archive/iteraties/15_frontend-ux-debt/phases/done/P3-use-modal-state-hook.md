# P3 — useModalState Hook

**Status:** ✅ Done
**Effort:** ~1 uur

## Wat

Nieuwe `useModalState` hook aangemaakt met twee exports:
1. `useModalState<T>()` — enkele modal met optioneel item payload
2. `useCrudModals<T>()` — combineert detail + edit + create modals in één hook

Geadopteerd in 5 directory pages die exact hetzelfde 5× useState modal pattern hadden.

## Hook API

```typescript
// Single modal
const { isOpen, item, open, close } = useModalState<MyType>();

// CRUD triad
const modals = useCrudModals<MyType>();
modals.detail.open(item);  // opens detail modal with item
modals.edit.open(item);    // opens edit modal with item
modals.create.open();      // opens create modal (no item)
modals.detail.close;       // close handler (stable ref)
modals.detail.isOpen;      // boolean
modals.detail.item;        // T | null
```

## Geadopteerde bestanden (5)

| Bestand | Type param | Pattern verwijderd |
|---------|------------|-------------------|
| `pages/identity/directory/CompetitionsList.tsx` | `Period` | 5× useState → useCrudModals |
| `pages/identity/directory/SeasonsList.tsx` | `Period` | 5× useState → useCrudModals |
| `pages/identity/directory/FederationsList.tsx` | `Organisation` | 5× useState → useCrudModals |
| `pages/identity/directory/MatchesList.tsx` | `Activity` | 5× useState → useCrudModals |
| `pages/identity/OrganisationsPage.tsx` | `Organisation` | 5× useState → useCrudModals |

### Per bestand: ~25 useState lines → 1 line + cleaner open/close refs

## Verificatie
- 0 TypeScript errors across all 6 files (hook + 5 adopters)
