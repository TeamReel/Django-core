# F2 — Large Components Splitting

**Status:** 🔲 Todo
**Effort:** 6 uur
**Scope:** 15 components >400 lines → presentational + container pattern

---

## Doel

Grote components splitsen in:
1. **Container** (logic, state, data fetching) — <100 lines
2. **Presentational** (UI rendering) — <200 lines
3. **Sub-components** (reusable pieces)

## Target Files

| File | Lines | Split Strategy |
|------|-------|----------------|
| ContentAvailabilityCard.tsx | 488 | CardContainer + CardContent + CardMetrics |
| TopNavbar.tsx | 482 | NavbarContainer + NavbarMenu + NavbarActions |
| MatchWizard.tsx | 460 | WizardContainer + WizardSteps (reuse existing) |
| ApprovalsPage.tsx | 458 | ApprovalsContainer + ApprovalsList + ApprovalsFilters |
| GalleryMatchTimeline.tsx | 453 | TimelineContainer + TimelineItems |
| SeasonContentTab.tsx | 453 | ContentTabContainer + ContentList |
| PeriodCreateModal.tsx | 449 | ModalContainer + PeriodForm + PeriodFields |
| SeasonProvider.tsx | 442 | Provider (keep) + seasonProviderUtils |
| UsersTable.tsx | 438 | TableContainer + TableRows + TableFilters |
| AIStudioPage.tsx | 436 | StudioContainer + StudioCanvas + StudioTools |
| TemplatesPage.tsx | 436 | TemplatesContainer + TemplatesList |
| TeamOrganisationDetailPage.tsx | 434 | DetailContainer + DetailTabs |
| TeamOverviewTab.tsx | 433 | OverviewContainer + OverviewCards |
| ThenVsNowModal.tsx | 431 | ModalContainer + ComparisonView |
| AddMemberModal.tsx | 423 | ModalContainer + MemberForm |

## Pattern

```
components/
  MyComponent.tsx              ← Keep as main export (orchestrator)
  MyComponent/
    index.ts                   ← Re-export
    MyComponentContent.tsx     ← Main UI
    MyComponentHeader.tsx      ← Header section
    MyComponentActions.tsx     ← Action buttons/menus
    useMyComponentState.ts     ← Local state hook (if needed)
```

## Verificatie

- [ ] 15 components gesplit
- [ ] Container components <100 lines
- [ ] Presentational components <200 lines
- [ ] `npx tsc --noEmit` passing
- [ ] `npx vitest run` passing

## Acceptatiecriteria

Na F2:
- **Files >400 lines:** 0 (van 15)
- **Files >300 lines:** 113 (van 128)
