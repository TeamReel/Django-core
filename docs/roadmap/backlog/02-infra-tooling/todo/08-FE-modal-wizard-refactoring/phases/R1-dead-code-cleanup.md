# R1 — Dead Code Cleanup

| | |
|---|---|
| Status | 📋 TODO |
| Impact | 🟢 nice-to-have |
| Effort | ~4 uur |
| Risico | Laag — verwijderen van ongebruikte code |

## Wat

Verwijder alle dead code modals, wizards en helper-bestanden die niet meer in productie worden gebruikt.

## Te verwijderen

### MatchWizard v1 (10+ bestanden)

Volledig vervangen door `MatchWizardV2`. Geen productie-imports gevonden.

| Bestand | Reden |
|---------|-------|
| `demo/src/components/MatchWizard.tsx` | Legacy wizard, niet meer geïmporteerd |
| `demo/src/components/MatchWizard/index.ts` | Barrel re-export van v1 |
| `demo/src/components/MatchWizard/useMatchWizardData.ts` | v1 data hook |
| `demo/src/components/MatchWizard/matchWizardFetchers.ts` | v1 API fetchers |
| `demo/src/components/MatchWizard/matchWizardGeneration.ts` | v1 generation logic |
| `demo/src/components/MatchWizard/matchWizardSaving.ts` | v1 save logic |
| `demo/src/components/MatchWizard/ContentStep.tsx` | v1 step component |
| `demo/src/components/MatchWizard/MatchStep.tsx` | v1 step component |
| `demo/src/components/MatchWizard/MatchWizardLineupStep.tsx` | v1 lineup step |
| `demo/src/components/MatchWizard/MatchWizardSteps.tsx` | v1 step definitions |
| `demo/src/__tests__/integration/MatchWizard.integration.test.tsx` | Test voor v1 |

**Let op**: `matchWizardTypes.ts` heeft 2 productie-imports (`MatchCard.tsx`, `SeasonMatchesTab.tsx`). Types moven naar gedeelde types file of inline in de consumers.

### AddMemberWizard example

| Bestand | Reden |
|---------|-------|
| `demo/src/components/Wizard/examples/AddMemberWizard.tsx` | Example, nooit geïntegreerd |
| `demo/src/components/Wizard/examples/` (hele map) | Alleen als hier geen andere bestanden staan |

### Dubbele MatchModals

`MatchDetailModals.tsx` en `match-detail/MatchModals.tsx` bevatten identieke `ContentPreviewModal` en `SavedAssetPreviewModal`. Consolideer naar één locatie.

| Actie | Detail |
|-------|--------|
| Bron behouden | `demo/src/pages/activities/match-detail/MatchModals.tsx` (moderner, prop-based) |
| Verwijderen | `demo/src/pages/activities/MatchDetailModals.tsx` |
| Migreren | `MatchDetailPage.tsx` laten importeren uit `match-detail/MatchModals.tsx` |

## Checklist

- [ ] Verwijder MatchWizard v1 bestanden
- [ ] Verplaats/inline `matchWizardTypes` imports in `MatchCard.tsx` en `SeasonMatchesTab.tsx`
- [ ] Verwijder `Wizard/examples/` map
- [ ] Consolideer MatchModals naar 1 locatie
- [ ] Update imports in `MatchDetailPage.tsx`
- [ ] `npx tsc --noEmit` slaagt
- [ ] `npx vite build` slaagt
- [ ] Handmatig: match detail page, dashboard match flow, content preview werken
