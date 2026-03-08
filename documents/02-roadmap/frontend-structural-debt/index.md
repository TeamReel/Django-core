# Frontend Structural Debt — Roadmap

**Status:** 🔲 Nieuw (0/18 fases)
**Aangemaakt:** 2026-03-08
**Vorige roadmaps:**
- `design-system-adoption/` (11/11 ✅)
- `frontend-tech-debt/` (12/12 ✅)

---

## Context

De vorige twee roadmaps hebben de **oppervlakte** opgeknapt: ~4.800 CSS-waarden getokenized, dark mode gaps gedicht, console-spam verwijderd, empty catches gefixt. Maar de **structurele** problemen zijn onaangeraakt — die veroorzaken bugs, maken features bouwen traag, en maken onboarding van nieuwe devs moeilijk.

## Audit Resultaten (8 maart 2026)

| Categorie | Aantal | Ernst |
|-----------|--------|-------|
| **`as any` casts** | 1.117 | 🔴 Hoog — TypeScript bescherming uitgeschakeld |
| **`: any` parameters** | 159 | 🔴 Hoog — untyped functie-argumenten |
| **`any[]` arrays** | 290 | 🔴 Hoog — untyped collecties |
| **`<any>` generics** | 143 | 🟡 Medium — generics zonder type |
| **Raw `fetch()` calls** | 508 in 132 files | 🔴 Hoog — geen shared API layer |
| **`!important` overrides** | 269 in 20 files | 🟡 Medium — cascade conflicts |
| **Large files (>300 regels)** | 20 bestanden | 🔴 Hoog — onleesbaar, ononderhoudbaar |
| **Props drilling (>10 props)** | 25 interfaces | 🟡 Medium — component coupling |
| **`inline style={{}}`** | 854 | 🟡 Medium — veel nog niet tokenizable (dynamisch) |
| **`eslint-disable`** | 30 | 🟢 Laag |
| **`@ts-ignore`** | 2 | 🟢 Laag |
| **`_archive` imports (dead code)** | 6 files importeren uit `_archive/` | 🟡 Medium |
| **Test coverage** | 2 test files op 640 TS/TSX | 🔴 Kritiek |
| **Type definition files** | 2 in `types/`, rest verspreid | 🟡 Medium |

### Top 10 Probleembestanden

| Bestand | Regels | `any` count | Probleem |
|---------|--------|-------------|----------|
| `_archive/ProjectDetailPage.identity.tsx` | 3.250 | 129 | God-file, maar `_archive` |
| `_archive/IntegrationStatusTabs.tsx` | 1.552 | — | `_archive` |
| `useMatchWizardData.ts` | 788 | — | Te groot voor één hook |
| `SeasonSquadTab.tsx` | 579 | — | Component + data mixed |
| `SeasonMediaTab.tsx` | 575 | — | Component + data mixed |
| `useContentGeneration.tsx` | 555 | — | Complex state machine |
| `useTeamTabData.ts` | 533 | 33 | Data hook + any-heavy |
| `MatchWizardV2.tsx` | 532 | — | Wizard + logic mixed |
| `useCompetitionsData.ts` | 491 | 19 | Oversized data hook |
| `NavbarModals.tsx` | 491 | — | Te veel modals in 1 file |

---

## Fasering — 5 Tracks

### Track T — Type Safety (any → typed)

**Doel:** Van 1.709 `any` naar <200 (88% reductie)

| Fase | Naam | Scope | Geschat | Effort |
|------|------|-------|---------|--------|
| **T1** | API Response Types | Shared interfaces voor alle API endpoints (Activity, Project, Period, Member, Organisation, etc.) | ~25 interfaces | 3 uur |
| **T2** | `as any` → Typed Casts | Top 20 files: replace `as any` met correcte types (na T1) | ~600 casts | 4 uur |
| **T3** | Typed Hook Returns | Alle `use*Data` hooks: return types + param types | ~40 hooks | 3 uur |
| **T4** | Function Param Types | `: any` parameters → typed (callback props, event handlers) | ~160 params | 2 uur |
| **T5** | `any[]` → Typed Arrays | Array params/state met correcte item types | ~290 arrays | 2 uur |

### Track A — API Architecture

**Doel:** 508 raw `fetch()` → 1 shared API client

| Fase | Naam | Scope | Geschat | Effort |
|------|------|-------|---------|--------|
| **A1** | Core API Client | Uitbreiden `apiFetch.ts` → typed `apiClient.get<T>()`, `.post<T>()`, `.patch<T>()`, `.delete()` met error handling, auth, base URL | 1 module | 3 uur |
| **A2** | Domain API Modules | `api/projects.ts`, `api/activities.ts`, `api/members.ts`, etc. — typed wrappers rond apiClient | ~10 modules | 4 uur |
| **A3** | Hook Migration | `use*Data` hooks: raw fetch → domain API calls (batch per domain) | ~132 files | 6 uur |

### Track S — Splitting & Structure

**Doel:** Geen file >300 regels, geen component >200 regels

| Fase | Naam | Scope | Geschat | Effort |
|------|------|-------|---------|--------|
| **S1** | Archive Cleanup | Verwijder `_archive/` imports, isoleer of delete `_archive/` files | 6 importers + 4 archive files | 1 uur |
| **S2** | God-File Splitting | Top 10 grote bestanden opsplitsen in focused modules (<300 regels) | 10 files → ~40 files | 6 uur |
| **S3** | Props → Context/Composition | Interfaces met >15 props → React Context of composition pattern | ~15 interfaces | 4 uur |
| **S4** | Modal Extraction | `NavbarModals.tsx`, `SeasonDetailModals.tsx` etc. → 1 modal per file | ~5 mega-modal files | 2 uur |

### Track CSS — CSS Cleanup

**Doel:** 0 `!important`, inline styles alleen voor dynamische waarden

| Fase | Naam | Scope | Geschat | Effort |
|------|------|-------|---------|--------|
| **CSS1** | `!important` Elimination | 269 `!important` → proper specificity via cascade layers | 269 in 20 files | 3 uur |
| **CSS2** | Static Inline → CSS Modules | `style={{}}` met vaste waarden → CSS module classes | ~400 (van 854) | 4 uur |

### Track Q — Quality & Testing

**Doel:** Minimaal 1 test per shared hook + API module

| Fase | Naam | Scope | Geschat | Effort |
|------|------|-------|---------|--------|
| **Q1** | Test Infrastructure | Vitest + React Testing Library setup, test utilities, mock API | Setup | 2 uur |
| **Q2** | Hook Tests | Tests voor top 15 hooks (useCompetitionsData, useSeasonsData, etc.) | ~15 test files | 6 uur |
| **Q3** | API Module Tests | Tests voor domain API modules (na A2) | ~10 test files | 4 uur |

---

## Volgorde

```
T1 (API types) → A1 (API client) → A2 (domain modules)
       ↓                                    ↓
      T2 (as any)                     A3 (hook migration)
       ↓                                    ↓
      T3 (hook returns)              S1 (archive cleanup)
       ↓                                    ↓
      T4 (param types)              S2 (god-file splitting)
       ↓                                    ↓
      T5 (typed arrays)             S3 (props→context)
                                           ↓
                                    S4 (modal extraction)

Parallel track:
  CSS1 (!important) → CSS2 (inline→modules)
  Q1 (test setup) → Q2 (hook tests) → Q3 (API tests)
```

**Rationale:**
- **T1 eerst** — types zijn de basis voor alles. Zonder shared types kun je geen API client of hooks typen.
- **A1→A2 parallel met T2** — zodra types bestaan, bouw je de API layer en fix je casts tegelijk.
- **A3 na A2** — hooks migreren naar de nieuwe API pas als die er is.
- **S1 vroeg** — archive cleanup is klein en verwijdert dead code.
- **S2-S4 na A3** — splitting is makkelijker als hooks al clean zijn.
- **CSS & Q parallel** — onafhankelijk van TS-werk.

## Prioriteit

| Prio | Fases | Waarom |
|------|-------|--------|
| **P0 — Nu** | T1, A1, Q1 | Foundation: types + API client + test setup |
| **P1 — Week 1** | T2, A2, S1 | Biggest impact: 600 `as any` weg + API modules + dead code |
| **P2 — Week 2** | T3, T4, A3, CSS1 | Complete type safety + hook migration + CSS cleanup |
| **P3 — Week 3** | T5, S2, S3, Q2 | Arrays + splitting + first tests |
| **P4 — Week 4** | S4, CSS2, Q3 | Polish: modals + inline styles + API tests |

## Definities

### "Klaar" per fase
- [ ] Geen regressies (`npx vite build` + bestaande tests)
- [ ] Fase-specifieke metrics gehaald (zie per fase-doc)
- [ ] Gecommit + gepusht

### Metrics targets

| Metric | Nu | Na roadmap |
|--------|-----|------------|
| `any` usages | 1.709 | <200 |
| Raw `fetch()` | 508 | <20 (alleen in apiClient zelf) |
| `!important` | 269 | 0 |
| Files >300 lines | 20 | 0 |
| Props >15 | 8 interfaces | 0 |
| Test files | 2 | 30+ |
| Static `style={{}}` | ~400 | <50 |
