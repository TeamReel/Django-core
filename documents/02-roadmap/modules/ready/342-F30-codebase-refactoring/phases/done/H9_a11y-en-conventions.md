# H9 — Accessibility & Conventions Cleanup

> **Effort:** ~3 uur | **Impact:** WCAG 2.1 AA compliance, screen reader support, code conventie naleving

## Context

Frontend audit (maart 2026) toont diverse a11y- en conventie-violations:

## To do

### A11y: Emoji in UI tekst verwijderen (~0,5 uur)
Convention: "No emoji characters in UI text" — gebruik CSS indicators of Unicode symbolen.

| Bestand | Regel | Emoji | Vervanging |
|---------|-------|-------|------------|
| `pages/periods/ProjectSeasonMemberDetailPage.tsx` | 225 | ⏳ | CSS spinner of `aria-busy="true"` |
| `pages/periods/MemberThenVsNowTab.tsx` | 63 | ⏳ | CSS indicator |
| `pages/periods/MemberAssetsTab.tsx` | 171, 247, 284, 355 | ⏳ Bezig... | CSS loading indicator + tekst |
| `pages/periods/MemberActionPhotoTab.tsx` | 117 | ⏳ Bezig... | CSS loading indicator + tekst |

### A11y: Icon-buttons aria-label toevoegen (~0,5 uur)
Convention: `title` alleen is onvoldoende — screen readers negeren `title` op buttons.

| Bestand | Regel | Huidige | Fix |
|---------|-------|---------|-----|
| `pages/activities/MatchDetailPage.tsx` | 158 | `title="Bewerken"` | + `aria-label="Bewerken"` |
| `pages/activities/MatchDetailPage.tsx` | 168 | `title="Meer"` | + `aria-label="Meer"` |
| `pages/periods/ProjectSeasonDetailPage.tsx` | 96 | `title="Meer"` | + `aria-label="Meer"` |
| `pages/identity/ClubOrganisationDetailPage.tsx` | 159 | `title="Meer"` | + `aria-label="Meer"` |
| `pages/identity/OrganisationDetailPage.tsx` | 113 | `title="Meer"` | + `aria-label="Meer"` |

### A11y: Keyboard handler op clickable div (~0,5 uur)

| Bestand | Regel | Element | Fix |
|---------|-------|---------|-----|
| `pages/identity/HubSelectieTab.tsx` | 369 | `<div onClick>` backdrop | + `role="presentation"` of `aria-hidden="true"` |

### Conventions: eslint-disable opruimen (~1 uur)
12 `eslint-disable` comments — onderzoek of de onderliggende issue opgelost kan worden.

| Bestand | Regel | Rule | Aanpak |
|---------|-------|------|--------|
| `hooks/useMatchDayMode.ts` | 83 | `react-hooks/exhaustive-deps` | Deps array fixen of ref gebruiken |
| `hooks/useKeyboardShortcuts.ts` | 94 | `react-hooks/exhaustive-deps` | Deps fixen |
| `hooks/useFormFields.ts` | 42 | `react-hooks/exhaustive-deps` | Deps fixen |
| `hooks/useAsync.ts` | 78 | `react-hooks/exhaustive-deps` | Ref pattern |
| `hooks/useActivityFeed.ts` | 182 | `react-hooks/exhaustive-deps` | Deps fixen |
| `components/NavbarNotificationsModal.tsx` | 101 | `react-hooks/exhaustive-deps` | Deps fixen |
| `pages/identity/UserDetailIdentityTab.tsx` | 25 | `no-explicit-any` | Fix in H8 (type consolidatie) |
| `pages/identity/UserDetailModals.tsx` | 15 | `no-explicit-any` | Fix in H7 (ModalUser workaround) |
| `pages/periods/MemberDetailPanel.tsx` | 127 | `react-hooks/exhaustive-deps` | Deps fixen |
| `pages/config/usePreferencesState.ts` | 93 | `react-hooks/exhaustive-deps` | Deps fixen |
| `pages/periods/ProjectSeasonMemberDetailPage.tsx` | 109 | `react-hooks/exhaustive-deps` | Deps fixen |
| `components/ui/NavigationSheet.tsx` | 103 | `react-hooks/exhaustive-deps` | Deps fixen |

### Conventions: @ts-ignore opruimen (~0,5 uur)

| Bestand | Regel | Fix |
|---------|-------|-----|
| `components/ProjectAccessControl/MemberList.tsx` | 2 | Workspace dependency import fixen |

### Conventions: useUserDetailData hook splitsen (~nog niet, deferred)
~700 regels, limiet is 400. Opsplitsen is complex (veel state sharing) — aparte taak.

## Done criteria

- [ ] 0 emoji characters in UI tekst (⏳ etc.)
- [ ] Alle icon-only buttons hebben `aria-label`
- [ ] Alle clickable non-button elements hebben `role` + keyboard handler
- [ ] `eslint-disable` comments gereduceerd van 12 → ≤ 4 (2 worden gefixed in H7/H8)
- [ ] 0 `@ts-ignore` comments (behalve in test-bestanden)
- [ ] `npx tsc --noEmit` + `npx vite build` slagen
