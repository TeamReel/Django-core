# S1 — Component Inline Styles

**Status:** ✅ Done
**Effort:** 3 uur
**Scope:** 98 `style={{...}}` in `components/` → 73 (69 dynamic + 4 test)

---

## Wat is gedaan

### Audit
- 98 inline styles geïnventariseerd en gecategoriseerd
- **23 STATIC** — hardcoded, geen runtime dependency
- **66 DYNAMIC** — computed/prop-based, blijven als inline (of CSS custom property)
- **5 TEST** — in `.test.tsx`, genegeerd
- **4 removed via JSDoc/redundancy**

### Migraties

#### Utility class replacements (8 inline styles)
- 3× `marginTop: var(--space-1)` → `mt-4` (MatchWizard, MatchWizardSteps, ReviewStep)
- 1× `marginBottom: var(--space-3)` → `mb-12` (AssetsTabTeamLevel)
- 4× `lineHeight: 1.4` → new `.leading-body` utility (MatchWizard, MatchWizardSteps, ContentTypeStep)
- 1× `textAlign: right` → `text-right` (ProgressBar)
- 1× `alignItems: center` → removed (redundant on `.flex-row`)
- 1× `marginRight + inline-flex` → `inline-flex mr-4` (Badge)

#### CSS Module migrations (15 inline styles → 7 new/extended modules)
- **AppShell** (new module) — 2 styles: shell + main bg/color
- **DirectoryFilterBar** (new module) — 2 styles: filterBar layout + actions flex
- **AssetGenResultsWidgets** (extended) — 2 styles: retryEmoji fontSize + retryWarning color
- **AssetsTabSeasonLevel** (extended) — 1 style: kitsGridWide grid template
- **BrandIdentityPage** (new module) — 2 styles: loadingWrap padding + spinner animation
- **ContentStreakWidget** (extended) — 1 style: trophyIcon margin/valign
- **FlowStubStep** (extended CreateWizard module) — 1 style: stubButton full styling
- **AssetsOverviewCard** (extended) — 3 styles: shimmer width variants
- **Modal** — 1 style: removed redundant alignItems
- **Avatar** (new module) — 1 style: image cover

#### Bonus: OfflineBanner (CSS extraction)
- Extracted 9 static properties from mixed static/dynamic inline → new CSS module
- Kept only 1 dynamic property (`backgroundColor`) as inline

### Resultaat
| Metric | Start | Eind |
|--------|-------|------|
| Total `style={{` in components/ | 98 | 73 |
| Static inline styles | 23 | 0 |
| Dynamic inline styles | 66 | 69 (incl. OfflineBanner reduced) |
| Test inline styles | 5 | 4 |

## Verificatie

- [x] 0 static inline styles remaining
- [x] All 69 remaining are dynamic (computed/prop-based/CSS custom property)
- [x] `tsc --noEmit` clean
- [x] `vitest run` all green (529 tests)
