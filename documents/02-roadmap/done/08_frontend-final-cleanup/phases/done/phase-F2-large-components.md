# F2 — Large Components Splitting

**Status:** ✅ Done
**Effort:** 6 uur
**Scope:** 11 components split → 52 new modules

---

## Resultaat

11 components gesplit, 4 justified exceptions (al goed gestructureerd of pattern vereist cohesie).

### Gesplitst (11 components → 52 modules)

| Component | Resultaat |
|-----------|-----------|
| GalleryMatchTimeline | → TimelineContainer + TimelineEvent + TimelineControls + types |
| ContentAvailabilityCard | → CardHeader + CardMetrics + CardActions + types |
| ApprovalsPage | → ApprovalsList + ApprovalsFilters + ApprovalsHeader + types |
| SeasonContentTab | → ContentList + ContentFilters + ContentActions + types |
| PeriodCreateModal | → PeriodForm + PeriodFields + types |
| ThenVsNowModal | → ComparisonView + ComparisonControls + types |
| AddMemberModal | → MemberForm + MemberFields + types |
| TeamOverviewTab | → OverviewCards + OverviewStats + types |
| TemplatesPage | → folder with sub-components |
| AIStudioPage | → folder with sub-components |
| MatchesList | → folder with sub-components |

### Justified Exceptions (4 files)

| Component | Reden |
|-----------|-------|
| TopNavbar | Helpers al geëxtraheerd, core logic vereist cohesie |
| MatchWizard | Wizard step pattern vereist centrale orchestratie |
| SeasonProvider | Provider pattern, state moet samen blijven |
| TeamOrganisationDetailPage | Tabs al geëxtraheerd naar sub-components |

## Verificatie

- [x] 11 components gesplit
- [x] 4 exceptions justified (al goed gestructureerd)
- [x] `npx tsc --noEmit` passing
- [x] `npx vitest run` 167/167 passing

## Acceptatiecriteria

Na F2:
- **Components >400 lines:** 0 ✅
- **Files >300 lines:** ~113 (target voor F3/F4)
