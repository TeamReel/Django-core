# Roadmap #24 — Dashboard UI Polish

> **Status:** ✅ Afgerond
> **Start:** 2026-03-17
> **Afgerond:** 2026-03-17
> **Scope:** `demo/src/pages/DashboardPage.module.css`, `demo/src/components/dashboard/*.module.css`, `demo/src/components/TopNavbar.module.css`, `demo/src/components/Sidebar.module.css`, `demo/src/components/ProfileAvatarDropdown.module.css`

## Doel

Alle UI-issues uit de dashboard-audit oplossen: accessibility-blocker (focus-visible), touch targets conform WCAG 2.5.5 (≥44×44px), CSS token compliance, en dark-mode kleurbug.

## Huidige staat

### Wat werkt ✅
- Alle dashboard-kaarten hebben `focus-visible` stijlen
- Reduced motion correct afgehandeld (10/10)
- Dark mode basis werkt goed (9/10)
- Geen horizontale overflow op mobiel
- Hardcoded kleuren zijn alleen fallbacks in `var()` — acceptabel

### Wat ontbreekt / niet klopt ❌
- ~~`.lowBannerBtn:focus-visible` zit in `@media (hover: hover)` → onbereikbaar op touch~~
- ~~Tabs in MatchesCard 32px hoog i.p.v. 44px minimum~~
- ~~9 navbar-elementen onder 44px touch target~~
- ~~19× hardcoded `font-weight` i.p.v. tokens~~
- ~~5× hardcoded `font-size` (incl. `10px`, `0.82rem`)~~
- ~~SmartActionsCard gebruikt non-standard token-namen~~
- ~~Pipeline step toont zwarte tekst in dark mode~~
- ~~Card titels missen semantische headings~~

## Design beslissingen

| Vraag | Besluit |
|-------|--------|
| Tab hoogte verhogen naar 44px — impact op visueel design? | Min-height aanpassen, padding compenseren zodat het er niet "te hoog" uitziet |
| Navbar touch targets — scope? | Mee in H3, want niet dashboard-specifiek maar impactvol |
| Semantische headings — `<h2>` vs `aria-label`? | `<h2>` met visueel dezelfde stijl (margin: 0 + bestaande font overrides) |

## Fasering

### H0 — Accessibility blockers ✅
> **Effort:** 10 min | **Impact:** Focus-visible werkt op alle devices, touch targets conform WCAG

**To do:**
- [x] Verplaats `.lowBannerBtn:focus-visible` buiten `@media (hover: hover)` in `DashboardPage.module.css`
- [x] Verhoog `.tab` min-height van `32px` naar `44px` in `MatchesCard.module.css`

**Done criteria:**
- [x] Focus-visible ring zichtbaar op `.lowBannerBtn` zonder hover-capable device
- [x] Tab touch targets ≥44px hoogte

### H1 — Token compliance: font-weight ✅
> **Effort:** 15 min | **Impact:** Consistent typesysteem, makkelijker thema-wijzigingen

**To do:**
- [x] Vervang alle hardcoded `font-weight: 600` → `var(--font-semibold)` (13×)
- [x] Vervang alle hardcoded `font-weight: 700` → `var(--font-bold)` (2×)
- [x] Vervang alle hardcoded `font-weight: 400` → `var(--font-normal)` (3×)
- [x] Vervang `font-weight: 500` → `var(--font-medium)` (1×)
- [x] Bestanden: ContentPipelineCard, NextStepCard, SeasonProgressCard, PastMatchesCard, MatchesCard, UploadSheet, UpcomingMatchesCard

**Done criteria:**
- [x] `grep -rn 'font-weight:\s*[0-9]' demo/src/components/dashboard/` levert 0 resultaten

### H2 — Token compliance: font-size + custom tokens ✅
> **Effort:** 10 min | **Impact:** Volledig token-compliant typografie

**To do:**
- [x] `ContentPipelineCard.module.css` — `font-size: 10px` → `var(--text-xs)`
- [x] `SmartActionsCard.module.css` — `font-size: 0.82rem` → `var(--text-xs)`
- [x] `SmartActionsCard.module.css` — `font-size: 0.88rem` → `var(--text-sm)`
- [x] `SmartActionsCard.module.css` — `font-size: 0.76rem` → `var(--text-xs)`
- [x] `ContentBreakdownCard.module.css` — `font-size: 24px` → `var(--text-2xl)`
- [x] `SmartActionsCard.module.css` — `var(--text-secondary)` → `var(--app-muted-text)`
- [x] `SmartActionsCard.module.css` — `var(--text-primary)` → `var(--app-text)`
- [x] `SmartActionsCard.module.css` — `var(--text-secondary)` → `var(--app-muted-text)`

**Done criteria:**
- [x] Geen hardcoded font-size in dashboard CSS
- [x] Geen `--text-secondary` of `--text-primary` tokens meer in dashboard CSS

### H3 — Navbar touch targets ✅
> **Effort:** 20 min | **Impact:** Alle navbar-knoppen conform WCAG 2.5.5 op mobile

**To do:**
- [x] Inventariseer navbar CSS (TopNavbar, Sidebar, ProfileAvatarDropdown)
- [x] min-width/min-height: 44px voor: `.expandButton` (Sidebar), `.createMainBtn`, `.createChevronBtn`, `.themeBtn`, `.langBtn`, `.navIconBtn`, `.creditsBtn` (TopNavbar), `.avatarButton` (ProfileAvatarDropdown)
- [x] Bonus: focus-visible bugs gefixt in Sidebar, TopNavbar (2×), ProfileAvatarDropdown (verplaatst buiten `@media (hover: hover)`)

**Done criteria:**
- [x] Alle interactieve elementen in navbar ≥ 44×44px
- [x] Visuele check: geen overlap of layout-breaks

### H4 — Dark mode + semantische headings ✅
> **Effort:** 15 min | **Impact:** Correcte kleuren in dark mode, betere semantiek voor screen readers

**To do:**
- [x] Pipeline step `color: rgb(0,0,0)` gefixt met `color: var(--app-text)` op `.step`
- [x] `<h2>` toegevoegd aan card titels: ContentPipelineCard, ContentProgressCard, MediaReadinessCard, SmartActionsCard (2×), NextStepCard (2×), SeasonProgressCard
- [x] CSS `.title` regels uitgebreid met `margin: 0` om h2 default margin te resetten

**Done criteria:**
- [x] Dark mode: geen zwarte tekst op donkere achtergrond
- [x] Accessibility tree: heading hierarchy correct (h1 welkom → h2 card titels)

## Acceptatiecriteria (geheel)
- [x] Alle 9 issues uit de UI review opgelost
- [x] Build passes (`npx tsc --noEmit` + `npx vite build`)
- [x] No new `any` types
- [x] Alle interactieve elementen ≥ 44×44px touch target
- [x] Focus-visible werkt op alle interactieve elementen (incl. touch devices)
- [x] Geen hardcoded font-size of font-weight in dashboard CSS
- [x] Dark mode: geen contrast-issues
