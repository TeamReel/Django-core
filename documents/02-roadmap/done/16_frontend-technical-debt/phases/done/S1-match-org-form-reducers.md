# S1 — Match & Org Form State Reducers

**Track:** S — State Management
**Status:** 📋 Todo
**Geschatte effort:** 6 uur

---

## Doel

De 3 zwaarste form-state hooks migreren van useState-explosie naar useReducer.

## Scope

| Bestand | useState calls | Actie |
|---------|---------------:|-------|
| `pages/activities/useMatchFormState.ts` | **50** | → `useReducer` met `MatchFormState` + `MatchFormAction` |
| `pages/identity/useOrgFormState.ts` | **39** | → `useReducer` met `OrgFormState` + `OrgFormAction` |
| `pages/identity/useMatchFormState.ts` | **38** | → `useReducer` met typed state + actions |

**Totaal:** 127 useState → 3 useReducer met typed state/action

## Aanpak

1. Groepeer gerelateerde useState calls in state interface
2. Definieer action types (discriminated union)
3. Schrijf reducer functie
4. Vervang individuele `useState` + `setState` calls
5. Test alle form flows end-to-end

## Acceptatiecriteria

- [ ] Alle 3 hooks gebruiken `useReducer`
- [ ] State interface + Action types gedefinieerd
- [ ] Reducer is pure function (testbaar)
- [ ] Alle bestaande form flows werken identiek
- [ ] Tests groen
