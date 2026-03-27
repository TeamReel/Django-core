# Frontend UX Debt — User Flow & Architecture Roadmap

**Status:** ✅ Compleet (15/15 fases done)
**Aangemaakt:** 2026-03-12
**Vorige roadmaps:**
- `design-system-adoption/` (11/11 ✅)
- `frontend-tech-debt/` (12/12 ✅)
- `frontend-structural-debt/` (17/17 ✅)
- `navigation-architecture/` (10/10 ✅)
- `frontend-consistency/` (12/12 ✅)
- `frontend-hardening/` (12/12 ✅)

---

## Context

Na 6 afgeronde roadmaps is de codebase clean en consistent, maar een **UX audit** en **user flow analyse** (maart 2026) toonden concrete bugs en architectuurproblemen:

| Categorie | Aantal | Ernst |
|-----------|--------|-------|
| **Double TopNavbar** | 7 pages | 🔴 Hoog — oude AppShell wrapper |
| **Debug JSON in productie** | 1 page | 🔴 Hoog — RegisterPage toont raw JSON |
| **Auth guards → silent redirect** | 3 guards | 🟠 Medium |
| **No ?next= na login** | LoginPage | 🟠 Medium |
| **Hardcoded '/dashboard'** | 22 plekken | 🟠 Medium |
| **alert() in productie** | 3 plekken | 🟠 Medium |
| **Duplicate fetch pattern** | 15+ pages | 🟠 Medium |
| **useState explosion** | 3+ pages | 🟠 Medium |
| **Hardcoded /api/v1/** | 40+ files | 🟠 Medium |
| **Structural any types** | 11 files | 🟡 Laag |
| **Broken back nav** | error pages | 🟡 Laag |

---

## Fasering — 5 Tracks

### Track Q — Quick Fixes (bugs, zero regressions)

| Fase | Naam | Scope | Effort | Status |
|------|------|-------|--------|--------|
| **Q1** | Remove Old AppShell Wrapper | 7 pages: dubbele TopNavbar verwijderen | 30 min | ✅ Done |
| **Q2** | RegisterPage Debug Cleanup | Debug JSON dump verwijderen | 15 min | ✅ Done |
| **Q3** | Error Page Back Navigation | window.history.back() → navigate met fallback | 15 min | ✅ Done |
| **Q4** | Dashboard Route Centralisation | 22 hardcoded '/dashboard' → routes.dashboard() | 30 min | ✅ Done |

### Track U — UX Correctness

| Fase | Naam | Scope | Effort | Status |
|------|------|-------|--------|--------|
| **U1** | Auth Guards → /403 | 3 guards: silent redirect → ForbiddenPage met context | 1 uur | ✅ Done |
| **U2** | Login ?next= Redirect | LoginPage: capture intended URL, replay na login | 30 min | ✅ Done |
| **U3** | Alert → Error State | 3 plekken: alert() → inline error UI of toast | 30 min | ✅ Done |

### Track P — Pattern Hooks

| Fase | Naam | Scope | Effort | Status |
|------|------|-------|--------|--------|
| **P1** | useAsync Hook | Creëer hook + adopteer in eerste 5 pages | 2 uur | ✅ Done |
| **P2** | useAsync Volledige Adoptie | Resterende 10+ pages migreren | 2 uur | ✅ Done |
| **P3** | useModalState Hook | Creëer hook + adopteer in list pages met modal pairs | 1 uur | ✅ Done |

### Track T — Type Safety

| Fase | Naam | Scope | Effort | Status |
|------|------|-------|--------|--------|
| **T1** | Core Type Fixes | matchDetailTypes, userDetailTypes, project.ts, season.ts any → typed | 2 uur | ✅ Done |
| **T2** | Utility Type Fixes | apiEnvelope.ts, orgDataHelpers.ts, creditsTypes.ts any → typed | 1 uur | ✅ Done |

### Track A — Architecture

| Fase | Naam | Scope | Effort | Status |
|------|------|-------|--------|--------|
| **A1** | API Client Adoption | Top-10 files: hardcoded fetch → api client pattern | 3 uur | ✅ Done |

### Track B — Backend Performance

| Fase | Naam | Scope | Effort | Status |
|------|------|-------|--------|--------|
| **B1** | Database Index Optimalisatie | 3 db_index + 12 composite indexes op ~45 models | 2 uur | 🔲 Todo |

---

## Volgorde

```
Q1-Q4 (quick fixes) → U1-U3 (UX) → P1-P3 (pattern hooks) → T1-T2 (types) → A1 (architecture) → B1 (backend)
```

**Rationale:**
- **Q1-Q4** eerst — Zichtbare bugs fixen, zero regressions, direct merkbaar
- **U1-U3** daarna — Auth flow en error handling correct maken
- **P1-P3** — Shared hooks die code reduplicatie structureel aanpakken
- **T1-T2** — Type safety in core files
- **A1** als laatst — Meest invasieve change
- **B1** backend perf — Database indexes op basis van audit

## Totale Effort

| Track | Fases | Uren |
|-------|-------|------|
| **Q** — Quick Fixes | 4 | 1.5 |
| **U** — UX Correctness | 3 | 2 |
| **P** — Pattern Hooks | 3 | 5 |
| **T** — Type Safety | 2 | 3 |
| **A** — Architecture | 1 | 3 |
| **B** — Backend Performance | 1 | 2 |
| **Totaal** | **15** | **~16.5 uur** |
