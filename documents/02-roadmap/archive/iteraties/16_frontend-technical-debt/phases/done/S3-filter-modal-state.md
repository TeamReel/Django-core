# S3 — Filter & Modal State Consolidation

**Track:** S — State Management
**Status:** 📋 Todo
**Geschatte effort:** 5 uur

---

## Doel

Filter- en modal-state hooks met 19-25 useState calls consolideren.

## Scope

| Bestand | useState calls | Actie |
|---------|---------------:|-------|
| `pages/identity/useOrgFilters.ts` | **25** | → `OrgFiltersState` reducer |
| `pages/config/useCascadingEntitySelection.ts` | **24** | → `CascadingSelectionState` reducer |
| `pages/identity/useUserDetailData.tsx` | **24** | → `UserDetailState` reducer |
| `pages/config/useProfileModals.ts` | **21** | → `ProfileModalsState` reducer |
| `pages/identity/useOrgModals.ts` | **19** | → `OrgModalsState` reducer |

**Totaal:** 113 useState → 5 useReducer

## Aanpak

1. Filter hooks: groepeer filter values in single state object
2. Modal hooks: boolean map (`{ [modalName]: boolean }`) i.p.v. individuele useState
3. Definieer reducer per hook
4. Test filter/modal interacties

## Acceptatiecriteria

- [ ] Alle 5 hooks gebruiken `useReducer` of geconsolideerde state
- [ ] Modal state via map pattern (niet per-modal useState)
- [ ] Filter state in single object
- [ ] Geen regressies
- [ ] Tests groen
