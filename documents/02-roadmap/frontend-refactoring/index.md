# Frontend Refactoring — Phase Overview

**Status:** Actief
**Gestart:** 2025-Q4
**Laatste update:** 2026-03-02
**Master plan:** [frontend-refactoring-phases.md](../../05-demo/plans/frontend-refactoring-phases.md)

---

## Doel

Schaalbaar, toekomstbestendig design system voor premium mobile + desktop webapp.

## Tracks

| Track | Naam | Focus |
|-------|------|-------|
| **A** | Token Foundation | CSS custom properties, utility classes, CSS Modules |
| **B** | Page Decomposition | Grote bestanden (>500 regels) opsplitsen |
| **G** | Package Cleanup | getCsrfToken consolidatie, ThemeProvider dedup, 3 packages archiveren |
| **C** | UI Primitives | Herbruikbare atomic components in `components/ui/` |
| **D** | Design Token Scale | Van 18 → 100+ tokens |
| **E** | Inline Style Elimination | ~3300 → 0 inline styles |
| **F** | Mobile-First Polish | Premium mobile UX |

## Fase-overzicht

### ✅ Done (16 fasen)

| Nr | Track | Bestand / Focus | Reductie |
|----|-------|-----------------|----------|
| 1 | A | Token system | 18 CSS properties |
| 2a | A | Utility CSS classes | 130 classes, ~2000 inline styles geconverteerd |
| 2b | A | CSS Modules | 5 component-scoped modules |
| 3 | B | ProjectSeasonDetailPage | 4914 → 1530 (-69%) |
| 4 | B | ProjectSeasonMemberDetailPage | 3998 → 1375 (-66%) |
| 5 | B | ProjectCompetitionDetailPage | 2259 → 1182 (-48%) |
| 6 | B | OrganisationDetailPage (ronde 1) | 2541 → 1933 (-24%) |
| 7 | B | ClubOrganisationDetailPage (ronde 1) | 1981 → 1590 (-20%) |
| 8 | B | OrganisationDetailPage (deep) | 1933 → 311 (-84%) |
| 10 | B | PreferencesPage | 2309 → 896 (-61%) |
| 18 | B | ClubOrganisationDetailPage (deep) | 1590 → 303 (-81%) |
| 19 | B | App.tsx (routing) | 1597 → 103 (-94%) |
| 20 | B | AssetGenerationModal | 1532 → 990 (-35%) |
| 21 | B | useOrgData.ts | 1642 → 1208 (-26%) |
| 22 | B | useMatchDetailData.ts | 1606 → 1328 (-17%) |
| 23 | B | AssetsTab.tsx | 1531 → 713 (-53%) |

### 📋 Planned (23 fasen)

| Nr | Track | Bestand / Focus |
|----|-------|-----------------|
| 24 | B | UsersList.tsx (1540 regels) |
| 25 | B | ProjectSeasonDetailPage.tsx tabs (1530 regels) |
| 26 | B | MatchCreateModal.tsx (1510 regels) |
| 27 | G | Package cleanup (getCsrfToken + ThemeProvider + archiveer 3) |
| 28 | C+D | Core UI primitives (Modal, Card, Badge, DataTable) |
| 29 | C+D | Color token scale |
| 30 | B | useContentGeneration.tsx (1452 regels) |
| 31 | B | ContentLibraryPage.tsx (1440 regels) |
| 32 | B | TeamOrganisationDetailPage + ApprovalsPage |
| 33 | C+D | Layout primitives (Stack, Row, PageHeader) |
| 34 | C+D | Spacing + Typography tokens |
| 35 | B | MemberDetailPage + UserEditModal + Breadcrumbs |
| 36 | B | UserDetailPage + BatchGenerationModal |
| 37 | B | CreditsPage + UsersPage + CompetitionDetailPage |
| 38 | B | ConfirmStep + PreferencesData + EntityEdit + remaining |
| 39 | C+D | Feedback primitives (Toast, Alert, ConfirmDialog) |
| 40 | C+D | Motion + Elevation tokens |
| 41 | E | Inline styles: top 5 bestanden (~472 styles) |
| 42 | E | Inline styles: volgende 10 bestanden (~400 styles) |
| 43 | E | Inline styles: bulk sweep (~2400 styles) |
| 44 | F | Mobile: touch targets + safe areas |
| 45 | F | Mobile: gestures + responsive containers |
| 46 | F | Mobile: navigation + offline indicators |

## Effort

~18 sessies totaal.
