# F3 — Medium Files Splitting (350-400 lines)

**Status:** 🔲 Todo
**Effort:** 6 uur
**Scope:** ~25 files 350-400 lines → <300 lines each

---

## Doel

Files in de 350-400 range splitsen. Deze zijn niet kritiek maar dragen bij aan maintenance burden.

## Target Files

| File | Lines | Type |
|------|-------|------|
| contentGenerationApi.ts | 434 | API module |
| types.ts | 433 | Type definitions |
| useBreadcrumbsData.ts | 432 | Data hook |
| assetTemplatesMember.ts | 430 | Template config |
| directoryHelpers.ts | 428 | Utilities |
| useMatchSelections.ts | 427 | Data hook |
| useUsersListFetchers.ts | 426 | Fetcher hook |
| MatchesList.tsx | 426 | Component |
| IntegrationPatternsPage.tsx | 422 | Page |
| IdentityTab.tsx | 421 | Tab component |
| useUserDetailData.tsx | 420 | Data hook |
| useAssetGenModal.ts | 419 | Modal hook |
| batchExecution.ts | 416 | Utility |
| usePreferencesData.tsx | 413 | Data hook |
| index.tsx (multiple) | 413, 404 | Barrel exports |
| SecurityPage.tsx | 412 | Page |
| useSquadPageData.ts | 408 | Data hook |
| client.ts | 405 | API client |
| useContentTemplatesData.ts | 405 | Data hook |
| useFeatureFlagsData.ts | 402 | Data hook |
| useAssetGeneration.ts | 401 | Hook |
| ContentOverviewCard.tsx | 401 | Component |
| Skeleton.tsx | 399 | Component |
| (more 350-400 line files) | ... | ... |

## Strategy per Type

### Data Hooks
Split into: `fetchers.ts`, `transformers.ts`, `state.ts`

### Components
Split into: container + presentational sub-components

### Utilities
Group related functions into separate files by domain

### Type Files
Organize by entity: `activity.types.ts`, `project.types.ts`, etc.

## Verificatie

- [ ] ~25 files gesplit
- [ ] All new files <150 lines (hooks) / <200 lines (components)
- [ ] `npx tsc --noEmit` passing
- [ ] `npx vitest run` passing

## Acceptatiecriteria

Na F3:
- **Files 350-400 lines:** 0 (van ~25)
- **Files >300 lines:** 88 (van 113)
