# FE-modal-refactor-a11y-fixes

| | |
|---|---|
| Status | � REVIEW |
| Bron | Code Review R1–R6 |
| Impact | 🟡 important |
| Effort | ~2 uur |

## Wat
A11y, dark mode en code quality fixes die uit de R1–R6 modal/wizard refactoring review komen. Allemaal kleine CSS/TS fixes, geen architectuurwijzigingen.

## Checklist

### A11y — focus-visible (WCAG 2.1 AA)
- [x] `MemberRoleEditModal.module.css` — `:focus-visible` op `.cancelButton` en `.saveButton`
- [x] `FollowUpModals.module.css` — `:focus-visible` op `.chip`
- [x] `FollowUpModals.module.css` — `:focus-visible` op `.btnGhost`
- [x] `OnboardingWizard.module.css` — `:focus-visible` op `.skipButton`

### A11y — touch targets (44×44px)
- [x] `MemberRoleEditModal.module.css` — `min-height: 44px` op `.cancelButton` en `.saveButton`
- [x] `FollowUpModals.module.css` — `min-height: 44px` op `.chip`

### A11y — reduced motion
- [x] `FollowUpModals.module.css` — `@media (prefers-reduced-motion: reduce)` voor chip transition + btnPrimary transform

### Dark mode
- [x] `FollowUpModals.module.css` — `--color-blue-50` vervangen door semantische token in `.chip[data-selected]`

### TypeScript
- [x] `CompetitionDetailModals.tsx` — 3× `as unknown as` casts verwijderd (direct assertion)

### Cleanup
- [x] `MemberRoleEditModal.module.css` — redundante `var(--color-white, var(--color-white))` gefixed
- [x] `FollowUpModals.module.css` — `.grid3col` responsive breakpoint (mobile-first 2col → 3col)
- [x] `MemberRoleEditModal.tsx` — taal consistentie (alles NL)

### Verify
- [x] `npx tsc --noEmit`
- [x] `npx vite build`
