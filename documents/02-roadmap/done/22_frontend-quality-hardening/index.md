# Roadmap #22 — Frontend Quality Hardening

> **Status:** ✅ Afgerond
> **Start:** 2026-03-17
> **Afgerond:** 2026-03-18
> **Scope:** `demo/src/` — CSS tokens, TypeScript strictness, a11y, inline styles
> **Bron:** Automatische code/UX audit (1.723 hardcoded colors, 180× `any`, 53 files zonder focus-visible)

---

## Doel

Frontend technische schuld systematisch wegwerken zodat:
1. **Dark mode betrouwbaar werkt** — alle kleuren via tokens, geen hardcoded hex/rgba
2. **TypeScript strict** — geen `any` in productie-code
3. **WCAG 2.1 AA** — alle interactieve elementen krijgen `:focus-visible`
4. **CSS schoon** — oversized modules opgesplitst, inline styles → CSS modules

**Kernprincipe:** Geen nieuwe features, puur kwaliteitsverbetering. Batch-sgewijs, file-voor-file.

---

## Huidige staat

### Audit resultaten

| Probleem | Aantal | Ernst |
|----------|--------|-------|
| Hardcoded hex kleuren in CSS | 1.380 | 🔴 Hoog |
| Hardcoded rgba() in CSS | 343 | 🔴 Hoog |
| TypeScript `any` in prod code | 180 | 🟠 Hoog |
| CSS modules > 150 regels | 25 bestanden | 🟠 Medium |
| Bestanden zonder `:focus-visible` | 53 (van 291) | 🟠 Medium |
| Inline styles (niet-dynamisch) | ~6 bestanden | 🟡 Laag |
| Dashboard `navigate()` calls | 40 (in sheets OK) | 🟡 Laag |

### Wat werkt ✅
- Geen TSX-bestanden > 500 regels
- Alle `IconButton` hebben `aria-label`
- Geen stray `console.log` in productie
- Barrel exports zijn allemaal in gebruik
- Keyboard `role="button"` + `tabIndex` consistent op dashboard cards

---

## Fasering

### H0 — Token Migratie: Top 5 CSS-bestanden
> **Effort:** 4-6 uur | **Impact:** ~450 hardcoded values weg

De 5 bestanden met de meeste hardcoded kleuren migreren naar design tokens.

| Bestand | Hex | RGBA | Totaal |
|---------|-----|------|--------|
| `CreateWizard.module.css` | 154 | 16 | **170** |
| `TopNavbar.module.css` | 38 | — | **38** |
| `MatchWizardV2.module.css` | 36 | — | **36** |
| `AIStudioPage.module.css` | 25 | 18 | **43** |
| `ApprovalsPage.module.css` | ~20 | ~5 | **~25** |

**Aanpak per bestand:**
1. Zoek alle `#hex` en `rgba()` values
2. Map naar bestaande `--app-*` / `--color-*` tokens
3. Vervang, test dark mode
4. Commit per bestand

### H1 — TypeScript `any` Eliminatie: Top 10 bestanden
> **Effort:** 3-4 uur | **Impact:** ~80 van 180 `any` types weg

| Bestand | `any` count |
|---------|-------------|
| `useFeatureFlagsData.ts` | 12 |
| `useMatchDerived.ts` | 8 |
| `useUserEditData.ts` | 8 |
| `orgModalHandlers.ts` | 7 |
| `useUsersListFetchers.ts` | 7 |
| `ProjectSeasonDetailPage.tsx` | 7 |
| `useTeamsListData.ts` | 7 |
| `NotificationRoutingLogsPage.tsx` | 6 |
| `SeasonOverviewTab.tsx` | 6 |
| `ContentProgressCard.tsx` | 5 |

**Aanpak:** Per bestand interfaces definiëren voor API responses, `any` → concreet type.

### H2 — Focus-Visible & A11y Pass
> **Effort:** 2-3 uur | **Impact:** 53 bestanden WCAG-compliant

Alle CSS modules die `:hover` hebben maar geen `:focus-visible` krijgen keyboard focus states.

**Prioriteit (interactieve componenten):**
- `TopNavbar.module.css`
- `Sidebar.module.css`
- `SearchBar.module.css`
- `MobileTabBar.module.css`
- `MediaAssetCard.module.css`
- `MatchWizard.module.css`

**Aanpak:** Batch-script: zoek alle `:hover` regels, voeg naast elke `:hover` een `:focus-visible` toe met `outline: 2px solid var(--app-focus-ring); outline-offset: 2px;`.

### H3 — CSS Module Splitting: Top 3 megabestanden
> **Effort:** 3-4 uur | **Impact:** 3 bestanden van >800 LOC → meerdere ~150 LOC modules

| Bestand | LOC | Strategie |
|---------|-----|-----------|
| `CreateWizard.module.css` | 1.453 | Split per step: `ContentStep.module.css`, `MatchStep.module.css`, `ReviewStep.module.css`, `SuccessStep.module.css` |
| `TopNavbar.module.css` | 873 | Split: `TopNavbarMobile.module.css`, `TopNavbarDropdown.module.css` |
| `ApprovalsPage.module.css` | 794 | Split: `ApprovalsJobList.module.css` (already exists?), `ApprovalsFilters.module.css` |

### H4 — Inline Styles → CSS Modules
> **Effort:** 1-2 uur | **Impact:** 6 bestanden schoon

Niet-dynamische inline styles verplaatsen naar CSS module classes:
- `NavbarQuickReviewModal.tsx` (13 inline styles)
- `ContentBreakdownCard.tsx` (8 inline styles)
- `MediaReadinessCard.tsx` (8 inline styles)
- `MemberContentProgressCard.tsx` (5 inline styles)
- `AssetsOverviewCard.tsx` (4 inline styles)

### H5 — Token Migratie: Resterende 20 bestanden
> **Effort:** 6-8 uur | **Impact:** ~1.200 hardcoded values weg

Alle overige CSS modules met hardcoded kleuren migreren. Batch van 4-5 bestanden per commit.

---

## Acceptatiecriteria

- [x] 0 hardcoded hex kleuren in CSS modules (of <50 met gedocumenteerde uitzonderingen)
- [x] 0 `any` types in productie-code (test bestanden uitgezonderd)
- [x] Alle interactieve elementen hebben `:focus-visible` states
- [x] Geen CSS module > 300 regels (stretch goal: 150)
- [x] Alle inline styles zijn dynamisch (JS/API-driven)
- [x] TypeScript `--noEmit` compileert zonder fouten
- [x] Dark mode visueel getest na elke token migratie batch

---

## Niet in scope

- **Nieuwe features** — puur quality-of-life
- **Backend wijzigingen** — alleen frontend
- **Dashboard `navigate()` calls** — meeste zijn bewust in sheets (secundaire deep links)
- **Test `any` types** — low priority, apart oppakken
