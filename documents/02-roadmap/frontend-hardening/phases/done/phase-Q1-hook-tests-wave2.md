# Q1 — Hook Tests Wave 2

**Status:** ✅ Done
**Effort:** ~8 uur
**Scope:** +41 test files voor ongeteste hooks → 43% file coverage ratio

---

## Resultaat

- **41 nieuwe test files**, 272+ nieuwe tests
- **Totaal:** 362 test suites, 801 tests — all passing
- **File coverage ratio:** 69 test files / ~160 testable files ≈ 43%+
- `tsc --noEmit` clean
- `vitest run` all green

## Batch 1 — Quick-Win Hooks (12 files, ~81 tests)

| # | File | Tests | Hook |
|---|------|-------|------|
| 1 | `hooks/useEscapeKey.test.ts` | 5 | Keyboard escape handler |
| 2 | `hooks/useHapticFeedback.test.ts` | 8 | Vibration API wrapper |
| 3 | `hooks/useIsMobile.test.ts` | 5 | Media query detection |
| 4 | `hooks/useLocalStorage.test.ts` | 6 | localStorage state sync |
| 5 | `hooks/useMatchPhase.test.ts` | 13 | Match phase computation |
| 6 | `hooks/useNavigateBack.test.ts` | 5 | Navigation history |
| 7 | `hooks/useNavItems.test.ts` | 6 | Sidebar nav configuration |
| 8 | `hooks/useOnlineStatus.test.ts` | 5 | Online/offline detection |
| 9 | `hooks/useQueryParams.test.ts` | 15 | URL query param management |
| 10 | `hooks/useUserRole.test.ts` | 4 | User role derivation |
| 11 | `hooks/useApiBase.test.ts` | 2 | API base URL resolution |
| 12 | `pages/identity/useOrgModals.test.ts` | 7 | Modal state management |

## Batch 2 — API & State Hooks (14 files, ~94 tests)

| # | File | Tests | Hook |
|---|------|-------|------|
| 1 | `pages/identity/useOrgFilters.test.ts` | 7 | Organisation filter state |
| 2 | `hooks/usePersistedContext.test.ts` | 4 | localStorage persistence |
| 3 | `hooks/useCreateContext.test.ts` | 7 | Context creation pattern |
| 4 | `pages/identity/useTeamSelectieData.test.ts` | 8 | Team selection data |
| 5 | `pages/identity/useMatchFormState.test.ts` | 7 | Match form management |
| 6 | `hooks/useContentTypes.test.ts` | 4 | Content type fetching |
| 7 | `hooks/useTransactions.test.ts` | 6 | Transaction data |
| 8 | `hooks/useSports.test.ts` | 7 | Sports configuration |
| 9 | `hooks/useGenerationHistory.test.ts` | 8 | AI generation history |
| 10 | `hooks/useSmartMatch.test.ts` | 10 | Smart match algorithm |
| 11 | `hooks/usePolling.test.ts` | 7 | Polling mechanism |
| 12 | `hooks/useFeatureFlag.test.ts` | 8 | Feature flag evaluation |
| 13 | `hooks/useQueueCounts.test.ts` | 4 | Queue count fetching |
| 14 | `hooks/useMatchesData/derived.test.ts` | 7 | Match data derivation |

## Batch 3 — Complex Hooks (15 files, ~97 tests)

| # | File | Tests | Hook |
|---|------|-------|------|
| 1 | `__tests__/pages/useSettingsPage.test.ts` | 8 | Settings page state |
| 2 | `__tests__/pages/identity/useOrgDerived.test.ts` | 10 | Org derived computations |
| 3 | `__tests__/pages/periods/useSeasonSquadTabState.test.ts` | 8 | Squad tab state |
| 4 | `__tests__/pages/identity/useResolvedOrgId.test.ts` | 5 | Org ID resolution |
| 5 | `__tests__/pages/identity/useOverviewMembers.test.ts` | 5 | Overview members fetch |
| 6 | `__tests__/pages/identity/useTeamMatches.test.ts` | 5 | Team matches fetch |
| 7 | `__tests__/pages/identity/useMediaProgress.test.ts` | 4 | Media progress tracking |
| 8 | `__tests__/pages/identity/ContentGenerationModal/useContentOptions.test.ts` | 8 | Content generation options |
| 9 | `__tests__/components/useSidebarRecents.test.ts` | 8 | Sidebar recent items |
| 10 | `__tests__/pages/identity/useMemberBatchAction.test.ts` | 10 | Member batch operations |
| 11 | `__tests__/pages/identity/useMatchSubmit.test.ts` | 6 | Match creation submit |
| 12 | `__tests__/pages/identity/ContentGenerationModal/useVideoJobPolling.test.ts` | 6 | Video job polling |
| 13 | `__tests__/pages/identity/useBrandData.test.ts` | 5 | Brand data resolution |
| 14 | `__tests__/pages/identity/useOrgActions.test.ts` | 6 | Org CRUD actions |
| 15 | `__tests__/pages/identity/ContentGenerationModal/useSaveHandlers.test.ts` | 5 | Save handler flows |

## Mock Patterns Established

- `vi.mock` factories with inline `vi.fn()` (avoids hoisting issues)
- Standard mocks: `@django-core/auth-ui`, `@django-core/context-switcher`, `@/api`, `@/api/client`, `react-router-dom`, `@/utils/logger`
- Explicit mock return value resets in `beforeEach` (vi.clearAllMocks doesn't reset mockReturnValue)
- Avoid fake timers with async fetch (jsdom incompatibility)

## Verificatie

- [x] +41 nieuwe test files (target: +40)
- [x] File coverage ratio 43%+ (target: 35%+)
- [x] Alle bestaande tests blijven groen
- [x] `tsc --noEmit` clean
- [x] `vitest run` all green (362 suites, 801 tests)
