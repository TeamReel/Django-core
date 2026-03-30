# D3 — Docs vs Codebase Truth

**Status:** Todo
**Geschatte tijd:** 15 min
**Verificatie:** Geen docs refereren niet-bestaande code; alle cross-refs kloppen

---

## Scope

### 1. usePullToRefresh — phantom feature

`mobile-patterns.md` (~regel 125) documenteert een `usePullToRefresh` hook alsof deze bestaat.
De hook is **nergens geïmplementeerd**.

**Fix:** Markeer als "Planned" met een duidelijke "(nog niet geïmplementeerd)" notitie, of verwijder de code-voorbeelden en vervang door een roadmap-verwijzing.

### 2. Broken cross-references

2 roadmap-modules linken naar het **verkeerde pad**:

| Document | Linkt naar | Correct pad |
|----------|-----------|-------------|
| `02-roadmap/modules/planned/300-B60-gamification-engine.md` | `05-demo/mobile-ux-gamification-analyse.md` | `05-demo/features/mobile-ux-gamification-analyse.md` |
| `02-roadmap/modules/planned/301-F16-performance-monitoring-and-budgets.md` | `05-demo/mobile-ux-gamification-analyse.md` | `05-demo/features/mobile-ux-gamification-analyse.md` |

### 3. Gamification analyse verplaatsen

`features/mobile-ux-gamification-analyse.md` is een analyse/plan, geen feature-beschrijving.
**Verplaats** van `features/` naar `plans/`.
Update cross-refs in de 2 roadmap-modules (combineert met punt 2).

---

## Acceptatiecriteria

- [ ] `usePullToRefresh` gemarkeerd als planned/future
- [ ] Beide cross-refs in roadmap-modules wijzen naar correct pad
- [ ] `mobile-ux-gamification-analyse.md` staat in `plans/`
- [ ] `features/` bevat alleen geïmplementeerde features
