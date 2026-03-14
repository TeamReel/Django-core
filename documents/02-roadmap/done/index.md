# Afgeronde Frontend Refactorings — Overzicht

**Totaal:** 17 roadmaps, ~184 fases uitgevoerd
**Periode:** 2025-Q4 — 2026-03-13

---

## Tijdlijn

| # | Roadmap | Fases | Status | Periode |
|--:|---------|------:|--------|---------|
| 01 | [Frontend Refactoring](01_frontend-refactoring/) | 40 | ✅ | 2025-Q4 |
| 02 | [Mobile-First App Design](02_mobile-design/) | 27 | ✅ | 2026-03-04 |
| 03 | [Create Wizard Optimization](03_wizard-optimization/) | 13 | ✅ | 2026-03-08 |
| 04 | [8pt Grid Alignment](04_8pt-grid-alignment/) | 7/7 | ✅ | 2026-03-08 |
| 05 | [Design System Adoption](05_design-system-adoption/) | 11/11 | ✅ | 2026-03-08 |
| 06 | [Frontend Technical Debt (Cleanup)](06_frontend-tech-debt/) | 12/12 | ✅ | 2026-03-08 |
| 07 | [Frontend Structural Debt](07_frontend-structural-debt/) | 17/17 | ✅ | 2026-03-08 |
| 08 | [Frontend Final Cleanup](08_frontend-final-cleanup/) | 12/12 | ✅ | 2026-03-10 |
| 09 | [Frontend Hardening](09_frontend-hardening/) | 12/12 | ✅ | 2026-03-11 |
| 10 | [Repo Hygiene](10_repo-hygiene/) | 5/5 | ✅ | 2026-03-12 |
| 11 | [Docs Hygiene](11_docs-hygiene/) | 4/4 | ✅ | 2026-03-12 |
| 12 | [Docs Refactor](12_docs-refactor/) | 5/5 | ✅ | 2026-03-12 |
| 13 | [Navigation Architecture](13_navigation-architecture/) | 10/10 | ✅ | 2026-03-12 |
| 14 | [Frontend Consistency](14_frontend-consistency/) | 12/12 | ✅ | 2026-03-12 |
| 15 | [Frontend UX Debt](15_frontend-ux-debt/) | 15/15 | ✅ | 2026-03-12 |
| 16 | [Frontend Technical Debt (Type Safety)](16_frontend-technical-debt/) | 15/15 | ✅ | 2026-03-13 |
| 17 | [Frontend Performance & Accessibility](17_frontend-performance-a11y/) | 9/9 | ✅ | 2026-03-13 |

---

## Per roadmap — wat is er gedaan?

### 01 — Frontend Refactoring
**Scope:** Schaalbaar, toekomstbestendig design system. 6 tracks: Token Foundation, Page Decomposition, Package Cleanup, UI Primitives, Design Token Scale, Inline Style Elimination, Mobile-First Polish.

### 02 — Mobile-First App Design
**Scope:** Premium, vloeiende mobile-first webapp. Bottom-up opbouw in 4 layers: Shell → Page shells → Navigation → Components → Polish.

### 03 — Create Wizard Optimization
**Scope:** De `+` knop in MobileBottomNav omvormen tot een universele, modulaire create-wizard voor content, wedstrijden, leden, teams en seizoenen.

### 04 — 8pt Grid Alignment *(7 fases)*
**Scope:** Alle frontend CSS uitlijnen op het 8pt grid (4px base unit) + design token gebruik afdwingen: spacing, typography, kleuren, Stylelint custom plugin.

### 05 — Design System Adoption *(11 fases)*
**Scope:** Design tokens uit `tokens.css` overal toepassen. ~89% van de codebase gebruikte nog hardcoded waarden → volledige adoptie van het token-systeem.

### 06 — Frontend Technical Debt — Cleanup *(12 fases)*
**Scope:** Inline styles in TSX/TS (`style={{}}`), 448 inline styles, 2.002 `: any` types, 374 console statements, 371 empty catch blocks → opgeruimd.

### 07 — Frontend Structural Debt *(17 fases)*
**Scope:** 1.117 `as any` casts, 508 raw `fetch()` calls in 132 files, 20 large files >300 regels, 25 interfaces met >10 props → gestructureerd.

### 08 — Frontend Final Cleanup *(12 fases)*
**Scope:** Na 3 roadmaps: 138 files >300 lines, 755 `any` types, 4% test coverage, 559 console statements, 31 eslint-disable → opgeruimd.

### 09 — Frontend Hardening *(12 fases)*
**Scope:** 74 files >300 lines, 5.404 regels dode code in `_archive/`, key={index} anti-patterns, exhaustive-deps warnings. Test coverage naar 43%+.

### 10 — Repo Hygiene *(5 fases)*
**Scope:** ~40 debris bestanden, ongebruikte dependencies, 82 binary assets in git, inconsistente module patterns → opgeruimd.

### 11 — Docs Hygiene *(4 fases)*
**Scope:** Verouderde metrieken, gedocumenteerde features die niet bestaan, dead code, archive-debris in git → opgeruimd.

### 12 — Docs Refactor *(5 fases)*
**Scope:** ~45 issues in 19 documenten: verouderde metrieken, phantom features, stale backend/media docs, auto-generated data docs → bijgewerkt.

### 13 — Navigation Architecture *(10 fases)*
**Scope:** 142 route definities (→ ~60-70), 51 hierarchy routes voor 5 pagina's, 17 redirect componenten, 0 type-safe routes → gerationaliseerd.

### 14 — Frontend Consistency *(12 fases)*
**Scope:** 30+ plekken error handling inconsistentie, 5+ API import patronen door elkaar, 120+ modal files zonder abstractie → consistent gemaakt.

### 15 — Frontend UX Debt *(15 fases)*
**Scope:** Double TopNavbar op 7 pages, debug JSON in productie, silent auth redirects, 22 hardcoded '/dashboard', alert() in productie, 40+ hardcoded /api/v1/ → opgelost.

### 16 — Frontend Technical Debt — Type Safety *(15 fases)*
**Scope:** 384 `<any>` generic params → 0, 68 useState explosie files → useReducer, 80 alert() → toast, 95 hardcoded `/api/v1/` → api client, window.location audit.

### 17 — Frontend Performance & Accessibility *(9 fases)*
**Scope:** Bundle splitting (30 JS + 22 CSS chunks, 6 Suspense boundaries, route preloading), accessibility (53 fixes in 30+ bestanden, skip-to-content link, focus trapping, Modal.tsx role swap, aria-live toasts). Nieuwe utilities: `a11y.ts`, `preloadRoute.ts`.

---

## Cumulatief resultaat

| Metric | Voor (cumulatief) | Na |
|--------|------------------:|---:|
| `any` types (alle vormen) | 2.000+ | **0** |
| Inline styles | 448 | **0** |
| Console statements | 559+ | **0** |
| Empty catch blocks | 371 | **0** |
| Raw `fetch()` calls | 508 | **0** |
| `alert()` calls | 80 | **2** (demo only) |
| Hardcoded `/api/v1/` | 95 | **0** |
| ESLint errors | 31+ | **0** |
| Files >300 lines | 138 | **<20** |
| Test coverage | 4% | **43%+** |
| Route definitions | 142 | **~65** |
| Design token adoption | 11% | **100%** |
| CSS Modules | partial | **277 modules** |
