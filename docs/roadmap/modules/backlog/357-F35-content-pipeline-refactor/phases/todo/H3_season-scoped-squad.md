# H3 — Season-Scoped Squad Everywhere

> **Effort:** ~6 uur | **Impact:** Consistente seizoen-filtering in alle lineup flows

## Probleem

De `useLineupSheet` (dashboard) en `useSquadData` (MatchWizardV2) halen **alle project members** op:
```ts
api.listAll('/projects/${projectId}/members/', { pageSize: 100 })
```

Alleen `useMatchDataFetching` (match detail) stuurt `params.period = seasonUuid` mee. Spelers van vorig seizoen verschijnen in de lineup selector.

## Aanpak

### Frontend: Seizoen-filter in alle squad fetchers

- [ ] `useLineupSheet.ts` — Filter op seizoen
  - Haal `period_id` uit match context: `match.period_id` of `match.metadata.period_id`
  - Stuur `params: { period: periodId }` mee naar `/projects/{id}/members/`
  - Fallback: als period leeg, fetch alle members (backward compat)

- [ ] `useSquadData.ts` (MatchWizardV2) — Zelfde filter
  - Match heeft `period_id` → gebruik als filter
  - MatchWizardContext moet `periodId` doorsturen

- [ ] `useMatchWizardData.ts` (legacy wizard) — Zelfde filter
  - Consistent patroon als de anderen

### Backend: Period filter optimalisatie

- [ ] Controleer `ProjectMembershipViewSet.get_queryset()`:
  - Filter `?period=uuid` moet werken (checken of al geïmplementeerd)
  - Als niet: voeg `period` filter toe aan filterset
  - Inclusief `period__isnull=True` members als fallback optie

### Tests

- [ ] Test: squad fetch met period filter retourneert alleen seizoen-leden
- [ ] Test: wizard toont geen oud-spelers
- [ ] Test: fallback zonder period retourneert alle members

## Done criteria

- [ ] Dashboard lineup sheet filtert op seizoen van de wedstrijd
- [ ] MatchWizardV2 filtert op seizoen van de wedstrijd
- [ ] Legacy wizard filtert op seizoen
- [ ] Geen spelers van vorige seizoenen in lineup selector
- [ ] Members zonder period (general) verschijnen nog wel als fallback
