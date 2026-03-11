# Q1 — Hook Tests Wave 2

**Status:** 🔲 Todo
**Effort:** 10 uur
**Scope:** +40 test files voor ongeteste hooks → 35%+ file coverage ratio

---

## Doel

Test coverage uitbreiden naar alle important hooks die nog niet getest zijn.

## Current State

- 123 test files / 836 prod files = 14.7%
- Hooks zijn de business logic layer — highest value to test
- Veel hooks hebben complexe state management + API calls

## Target Hooks (ongetest)

### Data Fetching Hooks (~15 files)
| Hook | Location | Complexity |
|------|----------|------------|
| `useUsersData` | `pages/identity/` | Hoog |
| `useUserDetailData` | `pages/identity/` | Hoog |
| `useTeamDetailData` | `pages/identity/` | Hoog |
| `useOrgDataFetching` | `pages/identity/` | Hoog |
| `useMatchDataFetching` | `pages/activities/` | Hoog |
| `useMatchSelections` | `pages/identity/` | Medium |
| `useContentLibraryData` | `pages/content/` | Hoog |
| `useStudioData` | `pages/aistudio/` | Medium |
| `usePreferencesData` | `pages/config/` | Medium |
| `useFeatureFlagsData` | `pages/config/` | Medium |
| `useContentTemplatesData` | `pages/config/` | Medium |
| `useSquadPageData` | `pages/periods/` | Hoog |
| `useSeasonDetailPageData` | `pages/periods/` | Hoog |
| `useClubsData` | `pages/identity/directory/` | Medium |
| `useTeamsListData` | `pages/identity/directory/` | Medium |

### State Management Hooks (~10 files)
| Hook | Location | Test Focus |
|------|----------|------------|
| `useAppSelection` | `hooks/` | Context switches, persistence |
| `useDirectoryFilters` | `hooks/` | Filter state, URL sync |
| `useBreadcrumbsData` | `components/` | Breadcrumb computation |
| `useCascadingEntitySelection` | `pages/config/` | Cascading dropdowns |
| `useUserEditData` | `pages/identity/` | Form state |
| `useLinkUserModal` | `pages/identity/` | Modal state |
| `useSeasonSquadAddMemberData` | `pages/identity/` | Multi-step form |
| `useAssetGenModal` | `components/AssetGenerationModal/` | Generation flow |

### Utility Hooks (~15 files)
- Remaining small hooks across `hooks/`, `components/`, `pages/`
- Focus on hooks with branching logic or side effects

## Aanpak

1. Gebruik pattern uit bestaande hook tests (mock fetch, test state transitions)
2. Focus op: initial state, loading state, success state, error state
3. Test state mutations (filter changes, pagination, selections)
4. Mock alle API calls via `installFetchMock()`

## Verificatie

- [ ] +40 nieuwe test files
- [ ] File coverage ratio ≥ 35%
- [ ] Alle bestaande tests blijven groen
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` all green
