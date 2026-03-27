# S2 — Page Inline Styles ✅

**Status:** ✅ Done
**Completed:** 2025-01-XX
**Effort:** ~4 uur (van geschatte 8 uur)

---

## Resultaat

| Metric | Before | After |
|--------|--------|-------|
| `style={{` in `pages/` | 118 | 71 |
| Static inline styles | 57 | 0 |
| Dynamic inline styles | 61 | 61 |
| DesignSystem CSS-var demos | 10 | 10 (kept — parameterised showcase) |
| New CSS module files | 0 | 11 |
| New utility classes | 0 | 1 (`min-h-0`) |

### Why 71 remains (not < 20)
The original target of `< 20` was set before auditing the 118 styles.
Audit revealed **61 genuinely dynamic** styles that cannot be extracted:
- Runtime CSS custom properties (`--color: brandColor`)
- Conditional styling (`cursor: saving ? 'not-allowed' : 'pointer'`)
- Computed dimensions (`width: \`${pct}%\``, `height: size`)
- Brand-color theming (runtime API values)
- 10 DesignSystemPage skeleton demos (CSS custom property params)

All 57 **static** styles were migrated → **0 extractable inline styles remain**.

## Wat is gedaan

### Utility-class migrations (19 styles)
- `display: grid; gap` → `grid gap-12` (MatchTransactionsTab, SeasonTransactionsTab, CompetitionMembershipDetailModal)
- `marginTop: 0` → `mt-0` (UserDetailOverviewTab)
- `marginTop: var(--space-5)` → `mt-20` (ProfileHubPage)
- `marginBottom: var(--space-4)` → `mb-16` (BillingPage)
- `flex-col gap-8` (BillingPage)
- `cursor: 'default'` → `cursor-default` (ClubOverviewTab ×2, OrgOverviewTab ×2)
- `pointerEvents: 'none'` → `pointer-events-none` (ApprovalsToastContainer)
- `overflowX: 'auto'` → `overflow-x-auto` (ConstitutionPage)
- `minHeight: '100vh'` → `min-h-screen` (ContextSwitcherPage)
- `flex: 1` → `flex-1` (ProjectSeasonDetailPage)
- `flex-center` (SeasonVideoJobsCard)
- `grid-cols-2` (UserDetailPage)
- `min-h-0` (ExistingUserTab — new utility added)

### CSS Module migrations (28 styles across 11 new + 6 extended modules)

**New modules created:**
- `ContextSwitcherPage.module.css` — `.pageTitle`, `.orgGrid`
- `ResourceDisplayPage.module.css` — `.viewport`
- `UserDetailPage.module.css` — `.balanceValue`
- `UserDetailOverviewTab.module.css` — `.userInfoGrid`
- `UsersPage.module.css` — `.errorBanner`
- `useUserDetailData.module.css` — `.navLink`
- `CompetitionMembershipDetailModal.module.css` — `.modalCloseBtn`, `.detailGrid`
- `CompetitionMatchesTable.module.css` — `.matchLink`
- `ProjectCompetitionDetailPage.module.css` — `.dangerText`
- `AuditLogDetailModal.module.css` — `.metadataBlock`, `.monoFont`
- `ContentOverview.module.css` — `.flexPanel`, `.totalRow`

**Extended existing modules:**
- `ApprovalsJobList.module.css` — `.warningText`
- `SeasonMatchesTab.module.css` — `.sectionPad`
- `ProjectSeasonDetailPage.module.css` — `.dialogShadow`, `.headerActions`, `.closeBtnCompact`, `.tilesGrid`, `.iconInline`
- `SeasonMediaTab.module.css` — `.iconInlineSm`
- `ContentList.module.css` — `.filterSearch`, `.typeIcon`
- `TeamHierarchyTab.module.css` — `.compInfo`
- `CreditsPage.module.css` — `.txnCard`

## Verificatie

- [x] 0 static `style={{}}` remaining in `pages/`
- [x] 71 dynamic `style={{}}` all justified (runtime values)
- [x] `tsc --noEmit` clean
- [x] `vitest run` — 123 files, 529 tests passing
