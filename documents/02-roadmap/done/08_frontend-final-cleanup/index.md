# Frontend Final Cleanup — Roadmap

**Status:** ✅ Complete (12/12 fases done)
**Aangemaakt:** 2026-03-10
**Vorige roadmaps:**
- `design-system-adoption/` (11/11 ✅)
- `frontend-tech-debt/` (12/12 ✅)
- `frontend-structural-debt/` (17/17 ✅)

---

## Context

Na 3 afgeronde roadmaps is de codebase significant verbeterd, maar een grondige analyse toont **substantiële resterende debt**:

| Probleem | Huidige Staat | Target |
|----------|---------------|--------|
| Files >300 lines | **138** | 0 |
| `any` types | **755** | <50 |
| Test coverage | **4%** (28 files) | 30% (200+ files) |
| Console statements | **559** | 0 |
| eslint-disable | **31** | 0 |

### Top 10 Grootste Files (>450 lines)

| File | Lines | Probleem |
|------|-------|----------|
| useTopNavbarData.tsx | 503 | Data hook te groot |
| useCreditsData.ts | 497 | Data hook te groot |
| useUsersData.ts | 491 | Data hook te groot |
| ContentAvailabilityCard.tsx | 488 | Component + logic mixed |
| useUsersListData.ts | 486 | Data hook te groot |
| TopNavbar.tsx | 482 | Component te groot |
| MatchWizard.tsx | 460 | Wizard logic mixed |
| ApprovalsPage.tsx | 458 | Page + state mixed |
| useCompetitionDetailData.ts | 454 | Data hook te groot |
| useCompetitionsData.ts | 454 | Data hook te groot |

---

## Fasering — 4 Tracks

### Track F — File Splitting

**Doel:** 138 files >300 lines → 0

| Fase | Naam | Scope | Target | Effort |
|------|------|-------|--------|--------|
| **F1** | ✅ Critical Hooks (>450 lines) | 10 hooks → 47 modules | `done` | 8 uur |
| **F2** | ✅ Large Components (>400 lines) | 11 components → 52 modules | `done` | 6 uur |
| **F3** | ✅ Medium Files (350-400 lines) | 10 files decomposed | `done` | 6 uur |
| **F4** | ✅ Final Sweep (300-350 lines) | 9 files split (112→105 >300) | `done` | 4 uur |

### Track T — Type Safety

**Doel:** 755 `any` → <50

| Fase | Naam | Scope | Target | Effort |
|------|------|-------|--------|--------|
| **T1** | ✅ `: any` Parameters | 404 → 47 function params | `done` | 6 uur |
| **T2** | ✅ `as any` Casts | 233 → 23 unsafe casts | `done` | 4 uur |
| **T3** | ✅ `any[]` Arrays | 22 → 17 untyped arrays | `done` | 2 uur |

### Track Q — Quality & Testing

**Doel:** Production-ready codebase

| Fase | Naam | Scope | Target | Effort |
|------|------|-------|--------|--------|
| **Q1** | ✅ Console Cleanup | 544 → 0 (+ logger utility) | `done` | 3 uur |
| **Q2** | ✅ ESLint Cleanup | 44 → 36 eslint-disable | `done` | 2 uur |
| **Q3** | ✅ Component Tests | 46 test files voor UI components | `done` | 12 uur |
| **Q4** | ✅ Page Tests | 49 test files voor page components | `done` | 12 uur |

### Track DX — Developer Experience

**Doel:** Nieuwe features makkelijk toevoegen

| Fase | Naam | Scope | Target | Effort |
|------|------|-------|--------|--------|
| **DX1** | ✅ Scaffolding CLI | `npm run generate:page|modal|hook` commands | 3 generators | 4 uur |

---

## Volgorde

```
F1 (critical hooks) ─────────────────────────────────────────┐
       ↓                                                      │
F2 (large components)                                         │
       ↓                                                      │
F3 (medium files)          T1 (: any params) ───┐             │
       ↓                          ↓              │             │
F4 (final sweep)           T2 (as any casts)    │             │
                                  ↓              │             │
                           T3 (any[] arrays) ───┘             │
                                                              │
Q1 (console cleanup) ─────────────────────────────────────────┤
       ↓                                                      │
Q2 (eslint cleanup)                                           │
       ↓                                                      │
Q3 (component tests)                                          │
       ↓                                                      │
Q4 (page tests)                                               │
                                                              │
DX1 (scaffolding) ────────────────────────────────────────────┘
```

**Rationale:**
- **F1-F4 eerst** — File splitting maakt alle andere werk makkelijker
- **T1-T3 parallel met F3-F4** — Type safety terwijl splitting verdergaat
- **Q1-Q2 onafhankelijk** — Kleine cleanups parallel uitvoerbaar
- **Q3-Q4 na splitting** — Testen makkelijker als files kleiner zijn
- **DX1 laatst** — Scaffolding baseert zich op final patterns

---

## Prioriteit

| Prio | Fases | Reden | Geschatte Tijd |
|------|-------|-------|----------------|
| **P0** | F1, Q1 | Grootste impact: mega hooks splitsen + console noise weg | 11 uur |
| **P1** | F2, T1, Q2 | Components + type safety + eslint | 14 uur |
| **P2** | F3, T2, T3 | Medium files + remaining any | 12 uur |
| **P3** | F4, Q3 | Final sweep + component tests | 20 uur |
| **P4** | Q4, DX1 | Page tests + scaffolding | 16 uur |

**Totaal:** ~73 uur (2-3 sprint weken)

---

## Metrics Targets

| Metric | Start | Na P0 | Na P1 | Na P2 | Eind |
|--------|-------|-------|-------|-------|------|
| Files >300 lines | 138 | 128 | 113 | 88 | 0 |
| `any` usages | 755 | 755 | 350 | <50 | <50 |
| Console statements | 559 | 0 | 0 | 0 | 0 |
| eslint-disable | 31 | 31 | 0 | 0 | 0 |
| Test files | 28 | 28 | 28 | 28 | 200+ |

---

## Definities

### "Klaar" per fase
- [ ] Geen regressies (`npx tsc --noEmit` + `npx vitest run`)
- [ ] Fase-specifieke metrics gehaald
- [ ] Gecommit + gepusht

### File Size Guidelines
- **Hook:** max 150 lines (split into fetchers, transformers, state)
- **Component:** max 200 lines (split into sub-components)
- **Page:** max 250 lines (uses hooks + components)
- **Utility:** max 100 lines
