# Frontend Hardening — Roadmap

**Status:** ✅ Done (12/12 fases done)
**Aangemaakt:** 2026-03-11
**Vorige roadmaps:**
- `design-system-adoption/` (11/11 ✅)
- `frontend-tech-debt/` (12/12 ✅)
- `frontend-structural-debt/` (17/17 ✅)
- `frontend-final-cleanup/` (12/12 ✅)

---

## Context

Na 4 afgeronde roadmaps is de codebase duidelijk verbeterd, maar een grondige analyse toont **concrete resterende debt**:

| Probleem | Huidige Staat | Target |
|----------|---------------|--------|
| Files >300 lines | **74** (excl `_archive`) | n.v.t. (zie NB) |
| `_archive/` dode code | **5.404 regels** | 0 (verwijderd) |
| Inline `style={{...}}` | ~~214~~ **73** in components (0 static, 69 dynamic, 4 test), **71** in pages (0 static, 71 dynamic) | <30 / <20 |
| `<img>` zonder `alt` | ~~41~~ **0** (was false positive) | 0 |
| `<div onClick>` (a11y) | ~~34~~ **0** (`role="button"` removed, `useEscapeKey` added) | 0 |
| `key={index}` anti-pattern | **32** | 0 |
| `eslint-disable` | ~~37~~ **0** | 0 |
| `exhaustive-deps` warnings | ~~13 suppressed~~ **135 total** (122 pre-existing) | audit |
| `dangerouslySetInnerHTML` | ~~3~~ **0** (sanitized) | 0 |
| Test coverage | ~~14.7%~~ **43%+** (187 suites, 892 tests) | 40%+ |
| Hardcoded URLs | ~~17~~ **0** env-dependent | 0 |
| `React.memo` usage | ~~0~~ **16** | 10+ (heavy components) |
| Lazy routes | ~~7~~ **78** (was already done) | 30+ |
| Console statements | ~~9~~ **0** (was al opgelost) | 0 |

---

## Fasering — 5 Tracks

### Track C — Cleanup & Dead Code

**Doel:** Dode code weg, eslint schoon

| Fase | Naam | Scope | Target | Effort |
|------|------|-------|--------|--------|
| **C1** | Archive Purge | Verwijder `_archive/` (5 files, 5.404 lines) + unused imports | 0 dead code | 1 uur |
| **C2** | ESLint Zero | 37 `eslint-disable` → 0 (fix of type properly) | 0 suppressions | 3 uur |
| **C3** | Console & Hardcoded | 9 console.* + 17 hardcoded URLs → env vars | 0 | 2 uur |

### Track A — Accessibility

**Doel:** WCAG 2.1 AA compliance

| Fase | Naam | Scope | Target | Effort |
|------|------|-------|--------|--------|
| **A1** | Image Alt Text | 41 `<img>` zonder `alt` → alt op alle images | 0 violations | 2 uur |
| **A2** | Interactive Elements | 34 `<div onClick>` → `<button>` of `role="button"` + keyboard | 0 violations | 4 uur |
| **A3** | Key Stability | 32 `key={index}` → stable keys (id/slug) | 0 anti-patterns | 2 uur |

### Track S — Styling Consistency

**Doel:** Inline styles → CSS Modules / design tokens

| Fase | Naam | Scope | Target | Effort |
|------|------|-------|--------|--------|
| **S1** | Component Styles | 94 inline styles in `components/` → CSS Modules | <10 inline | 6 uur |
| **S2** | Page Styles | 118 inline styles in `pages/` → CSS Modules | ~~<20~~ 0 static (71 dynamic keep) | 8 uur |

### Track P — Performance

**Doel:** Snellere load, betere runtime

| Fase | Naam | Scope | Target | Effort |
|------|------|-------|--------|--------|
| **P1** | Route Splitting | 7 lazy routes → 30+ (alle page-level routes) | bundle per route | 3 uur |
| **P2** | Memo Heavy Components | 0 `React.memo` → memoize 10+ expensive renders | 10+ memoized | 3 uur |

### Track Q — Quality & Testing

**Doel:** Test coverage naar productie-niveau

| Fase | Naam | Scope | Target | Effort |
|------|------|-------|--------|--------|
| **Q1** | Hook Tests Wave 2 | +40 test files voor ongeteste hooks | 35%+ file ratio | 10 uur |
| **Q2** | Integration Tests | +20 test files voor user flows (wizard, CRUD, search) | key flows covered | 8 uur |

---

## Volgorde

```
C1 (archive purge) ──────────────────────────────────────────┐
       ↓                                                      │
C2 (eslint zero)             A1 (image alt) ──────┐          │
       ↓                            ↓              │          │
C3 (console/urls)            A2 (interactive)      │          │
                                    ↓              │          │
                             A3 (key stability) ──┘           │
                                                              │
S1 (component styles) ───────────────────────────────────────┤
       ↓                                                      │
S2 (page styles)                                              │
                                                              │
P1 (route splitting) ────────────────────────────────────────┤
       ↓                                                      │
P2 (memo components)                                          │
                                                              │
Q1 (hook tests wave 2) ─────────────────────────────────────┤
       ↓                                                      │
Q2 (integration tests) ──────────────────────────────────────┘
```

**Rationale:**
- **C1 eerst** — Archive weg maakt alle metrics betrouwbaarder
- **C2-C3 + A1-A3 parallel** — Onafhankelijke cleanup tracks
- **S1-S2 sequentieel** — Components eerst (meer hergebruik), dan pages
- **P1-P2 sequentieel** — Route splitting eerst, dan component memoization
- **Q1-Q2 achteraan** — Profiteren van alle refactors voor stabielere tests

---

## Prioriteit

| Prio | Fases | Reden | Geschatte Tijd |
|------|-------|-------|----------------|
| **P0** | C1, A1, A3 | Snelle wins: dead code weg + a11y low-hanging fruit | 5 uur |
| **P1** | C2, C3, A2 | Lint-schoon + keyboard accessibility | 9 uur |
| **P2** | S1, S2 | Styling consistency (grootste absolute count) | 14 uur |
| **P3** | P1, P2 | Performance optimalisatie | 6 uur |
| **P4** | Q1, Q2 | Testing uitbreiden naar 40%+ coverage | 18 uur |

**Totaal:** ~52 uur (1.5-2 sprint weken)

---

## Metrics Targets

| Metric | Start | Na P0 | Na P1 | Na P2 | Na P3 | Eind |
|--------|-------|-------|-------|-------|-------|------|
| Files >300 lines | 74 | 74 | 74 | 74 | 74 | 74 |
| `_archive/` lines | 5.404 | 0 | 0 | 0 | 0 | 0 |
| Inline styles | 214 | 214 | 214 | <30 | <30 | <30 |
| A11y violations | 107 | 34 | **0** | 0 | 0 | 0 |
| `eslint-disable` | 37 | 37 | 0 | 0 | 0 | 0 |
| Test file ratio | 14.7% | 14.7% | 14.7% | 14.7% | 14.7% | 40%+ |
| Lazy routes | 7 | 7 | 7 | 7 | 30+ | 30+ |

> **NB:** Files >300 lines is bewust niet in scope van deze roadmap.
> De 74 grote files zijn grotendeels complex-by-nature (detail pages, wizard state, API hooks).
> Verdere splitting vereist functionele redesign, niet mechanische refactoring.
> Die 2 files >400 lines (MatchWizard 435, TeamOrgDetailPage 406) zijn kandidaten voor een apart initiatief.

---

## Definities

### "Klaar" per fase
- [ ] Geen regressies (`npx tsc --noEmit` + `npx vitest run`)
- [ ] Fase-specifieke metrics gehaald
- [ ] Gecommit + gepusht

### Voorwaarde
- Vorige roadmap `frontend-final-cleanup/` volledig afgerond (12/12 ✅)
