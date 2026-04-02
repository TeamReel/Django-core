# R4 — Wizard Cleanup

| | |
|---|---|
| Status | 📋 TODO |
| Impact | 🟡 important |
| Effort | ~6 uur |
| Risico | Middel — OnboardingWizard is first-visit flow |

## Wat

Migreer de `OnboardingWizard` naar het shared Wizard system (`WizardProvider` + `WizardShell`) en ruim wizard-gerelateerde inconsistenties op.

## Huidige situatie

### Shared Wizard system (goed)
- `WizardContext.tsx` — state management (step nav, validation, shared data)
- `WizardShell.tsx` — visual container (BottomSheet wrapper, header, progress bar)
- `WizardStep.tsx` — conditional step rendering
- `WizardFooter.tsx` — Next/Back/Submit buttons
- `WizardTransition.tsx` — slide animaties

**Gebruikt door**: `CreateWizard`, `MatchWizardV2`, `MatchSheetFlow` — werkt goed.

### OnboardingWizard (inconsistent)
- **Bestand**: `demo/src/components/OnboardingWizard.tsx`
- **Probleem**: Gebruikt `BottomSheet` direct i.p.v. shared Wizard system
- **Steps**: 3 (Welcome, Quick Create, Matches) — handmatige `currentStep` state
- **Geen**: progress bar, step validatie, animaties, shared data
- **Gerenderd in**: `MainLayout.tsx` (lazy import, bij eerste bezoek)

## Doel

OnboardingWizard migreren naar:
```tsx
<WizardProvider steps={['welcome', 'quick-create', 'matches']}>
  <WizardShell title="Welkom bij TeamReel" onComplete={handleComplete}>
    <WizardStep name="welcome"><WelcomeStep /></WizardStep>
    <WizardStep name="quick-create"><QuickCreateStep /></WizardStep>
    <WizardStep name="matches"><MatchesStep /></WizardStep>
  </WizardShell>
</WizardProvider>
```

## Aanpak

1. Refactor `OnboardingWizard.tsx`:
   - Vervang `BottomSheet` + handmatige state → `WizardProvider` + `WizardShell`
   - Behoud bestaande step componenten (inline of extract)
   - Voeg progress bar toe (3 stappen)
   - Voeg slide-animaties toe via `WizardTransition`
2. Test in `MainLayout.tsx` — first-visit flow moet blijven werken
3. Optioneel: check of `WizardShell` aanpassingen nodig zijn voor onboarding context

## Afhankelijkheden

- Geen harde afhankelijkheden op R1-R3
- Nice-to-have: R1 eerst (minder wizard code in codebase)

## Checklist

- [ ] Refactor `OnboardingWizard.tsx` → shared Wizard system
- [ ] Behoud lazy loading in `MainLayout.tsx`
- [ ] Progress bar zichtbaar (3 stappen)
- [ ] Slide-animaties bij step transitions
- [ ] Escape-key sluit wizard
- [ ] `npx tsc --noEmit` slaagt
- [ ] `npx vite build` slaagt
- [ ] Test: eerste bezoek → onboarding flow verschijnt en werkt
- [ ] Test: na onboarding → wizard verschijnt niet meer
