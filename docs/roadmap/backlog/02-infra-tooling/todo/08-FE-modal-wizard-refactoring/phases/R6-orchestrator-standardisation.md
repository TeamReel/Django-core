# R6 — Orchestrator Pattern Standaardiseren

| | |
|---|---|
| Status | 📋 TODO |
| Impact | 🟢 nice-to-have |
| Effort | ~6 uur |
| Risico | Laag — pattern refactoring, geen functionaliteitswijziging |

## Wat

Standaardiseer het modal state management pattern over alle pagina's. Momenteel zijn er 3+ verschillende patterns in gebruik.

## Huidige patterns (inconsistent)

### Pattern A: Hook + Barrel orchestrator
```tsx
// useOrgModals.ts — state hook
const useOrgModals = () => {
  const [detailModal, setDetailModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  // ...
  return { detailModal, editModal, openDetail, openEdit, ... };
};

// OrgModals.tsx — barrel orchestrator
const OrgModals = ({ modals }) => (
  <>
    <OrganisationDetailModal {...modals.detailModal} />
    <OrganisationEditModal {...modals.editModal} />
  </>
);
```
**Gebruikt door**: `OrgModals`, `UserDetailModals`, `HubPageModals`

### Pattern B: Inline state in page
```tsx
// SomePage.tsx
const [showModal, setShowModal] = useState(false);
const [selectedItem, setSelectedItem] = useState(null);
// ... 10+ state variables for different modals
```
**Gebruikt door**: Veel pagina's, leidt tot prop-drilling

### Pattern C: `useCrudModals` hook
```tsx
const { detail, edit, create } = useCrudModals();
// detail.open(item), detail.close(), detail.isOpen, detail.item
```
**Gedefinieerd in**: `hooks/useModalState.ts`
**Zou standaard moeten zijn, maar weinig gebruikt**

## Doel: Unified pattern

Elke pagina met modals volgt:

1. **State**: `useCrudModals()` of `useModalState()` uit `hooks/useModalState.ts`
2. **Orchestrator**: `<PageModals>` barrel component die alle modals rendert
3. **Props**: Orchestrator ontvangt hooks output, geen prop-drilling door page tree
4. **Naamgeving**: `{PageName}Modals.tsx` + `use{PageName}Modals.ts` (als custom state nodig)

## Scope

### Al goed (geen actie nodig)
- `OrgModals` + `useOrgModals` ✅
- `UserDetailModals` ✅
- `HubPageModals` + `HubPageSheets` ✅
- `NavbarModals` ✅
- `ApprovalsModals` ✅

### Te migreren
| Pagina | Huidige situatie | Actie |
|--------|-----------------|-------|
| `ProjectSeasonDetailPage` | Inline state (5+ modals) | Extract → `SeasonDetailModals` + hook |
| `ProjectCompetitionDetailPage` | Inline state | Extract → `CompetitionModals` + hook |
| `ConfigPages` (Usage/Templates/Audit) | Inline state per pagina | Extract → orchestrators |
| `MatchDetailPage` | Mixed inline + `MatchDetailModals` | Standaardiseer naar pattern A |

## Checklist

- [ ] Documenteer het unified pattern in `demo/src/docs/` of als comment in `useModalState.ts`
- [ ] Migreer `ProjectSeasonDetailPage` modals → orchestrator
- [ ] Migreer `ProjectCompetitionDetailPage` modals → orchestrator
- [ ] Migreer config page modals → orchestrators
- [ ] Migreer `MatchDetailPage` → consistent pattern
- [ ] Verifieer dat `useCrudModals` / `useModalState` overal correct werkt
- [ ] `npx tsc --noEmit` slaagt
- [ ] `npx vite build` slaagt
- [ ] Geen functionele wijzigingen — alleen structuur
