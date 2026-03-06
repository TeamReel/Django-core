# Phase W3 — Wizard Error States

**Track:** W (Wizard & Overlays) | **Layer:** 3
**Status:** Done | **Previously:** B3

Error/retry handling per wizard-stap.

## Implementation Notes
- Error state tracking in useMatchWizardData: matchesError (from useActivities), templatesError, squadError, saveError
- Error banners per step with AlertTriangle icon + descriptive message + retry button
- Step 1 (match): shows error if useActivities fails, retry reloads page
- Step 2 (content): templates error banner above content cards, retry calls fetchTemplates
- Step 3 (lineup): squad error banner replaces loading/empty state, retry calls fetchSquad
- Step 4 (review): save error compact banner above generate button
- Retry buttons: 44px min-height touch target, active scale(0.95), tap-highlight removed
- Error banners: red border + subtle red background tint (color-mix), mobile-friendly padding
- Dutch error messages: "Kon wedstrijden niet laden", "Sjablonen laden mislukt", etc.
