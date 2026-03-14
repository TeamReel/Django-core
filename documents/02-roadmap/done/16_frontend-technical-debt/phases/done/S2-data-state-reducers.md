# S2 — Data State Reducers

**Track:** S — State Management
**Status:** 📋 Todo
**Geschatte effort:** 6 uur

---

## Doel

Data-fetching state hooks met 25+ useState calls migreren naar useReducer.

## Scope

| Bestand | useState calls | Actie |
|---------|---------------:|-------|
| `pages/periods/useCompetitionDetailData/state.ts` | **35** | → `CompetitionDetailState` reducer |
| `pages/identity/useUsersData/state.ts` | **27** | → `UsersDataState` reducer |
| `pages/identity/useUserEditData.ts` | **26** | → `UserEditState` reducer |
| `components/useMatchWizardData.ts` | **26** | → `MatchWizardState` reducer |

**Totaal:** 114 useState → 4 useReducer

## Aanpak

1. Categoriseer state per concern: loading, data, UI, errors
2. Definieer state interface met logische grouping
3. Definieer action types (SET_DATA, SET_LOADING, SET_ERROR, etc.)
4. Implementeer reducer
5. Verify: geen regressie in data flows

## Acceptatiecriteria

- [ ] Alle 4 hooks gebruiken `useReducer`
- [ ] State logisch gegroepeerd (niet 1:1 useState → reducer field)
- [ ] Reducer pure functions, unit-testbaar
- [ ] Geen regressies in data flows
- [ ] Tests groen
