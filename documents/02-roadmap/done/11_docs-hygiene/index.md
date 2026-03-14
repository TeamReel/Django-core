# Docs Hygiene — Roadmap

**Status:** ✅ Compleet (4/4 fases done)
**Aangemaakt:** 2026-03-12
**Vorige roadmaps:**
- `design-system-adoption/` (11/11 ✅)
- `frontend-tech-debt/` (12/12 ✅)
- `frontend-structural-debt/` (17/17 ✅)
- `frontend-final-cleanup/` (12/12 ✅)
- `frontend-hardening/` (12/12 ✅)
- `repo-hygiene/` (5/5 ✅)

---

## Context

Na 6 afgeronde roadmaps is de **frontend codebase** schoon (0 TS errors, 892 tests, 277 CSS Modules). Maar de **documentatie** loopt achter op de werkelijkheid: verouderde metrieken (179 vs 277 CSS Modules), gedocumenteerde features die niet bestaan (`usePullToRefresh`), dead code in de codebase, en archive-debris in git.

| Probleem | Huidige Staat | Target |
|----------|---------------|--------|
| Dead code bestanden | **4** (LegacyModal, LazyChart, etc.) | 0 |
| Archive-debris in git | **22** tracked (3 .py, 12 .csv, 7 .md) | 0 tracked |
| Verouderde metrieken | **4** docs met 179 i.p.v. 277 | Consistent |
| Niet-bestaande features in docs | **1** (`usePullToRefresh`) | 0 |
| Stale plannen | **2** (`season-hub-refactor`, `frontend-refactoring-phases`) | Gearchiveerd |
| Index inconsistenties | **3** (ontbrekende docs in map/tree) | 0 |
| Broken cross-references | **2** (verkeerde paden) | 0 |
| Misplaatste documenten | **1** (gamification in features/) | 0 |

---

## Fasering — Track D (Docs Hygiene)

**Doel:** Documentatie consistent met codebase, geen dead code, geen stale data

| Fase | Naam | Scope | Effort |
|------|------|-------|--------|
| **D1** | Dead Code & Archive Purge | 4 dead code files verwijderen, 22 archive-debris untracken, stale plans archiveren | 20 min |
| **D2** | Metric Consistency | CSS Modules 179→277 in 4 docs, header dates updaten, distribution tabel fixen | 15 min |
| **D3** | Docs vs Codebase Truth | `usePullToRefresh` fixen, broken cross-refs repareren, gamification verplaatsen | 15 min |
| **D4** | Index & Structure | index.md map + tree updaten, mobile-app-blueprint toevoegen, folder tree fixen | 10 min |

---

## Volgorde

```
D1 (dead code + archive) ──┐
       ↓                    │  Code changes first
D2 (metric consistency) ───┤
       ↓                    │  Then docs fixes
D3 (docs vs codebase) ────┤
       ↓                    │  Then structure
D4 (index + structure) ───┘
```

**Rationale:**
- **D1 eerst** — Dead code en archive opruimen voordat docs geüpdatet worden
- **D2 na D1** — Metrieken updaten op basis van schone codebase
- **D3 na D2** — Docs-inhoud fixen na metric updates
- **D4 laatst** — Index en structuur als finale pass

---

## Prioriteit

| Prio | Fases | Reden |
|------|-------|-------|
| **P0** | D1 | Dead code in productie, debris in git |
| **P1** | D2, D3 | Misleidende metrieken en phantom features |
| **P2** | D4 | Structuur/navigatie verbetering |

**Totaal:** ~1 uur
