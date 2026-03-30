# Docs Refactor 05-demo — Roadmap

**Status:** ✅ Compleet (5/5 fases done)
**Aangemaakt:** 2026-03-12
**Vorige roadmaps:**
- `design-system-adoption/` (11/11 ✅)
- `frontend-tech-debt/` (12/12 ✅)
- `frontend-structural-debt/` (17/17 ✅)
- `frontend-final-cleanup/` (12/12 ✅)
- `frontend-hardening/` (12/12 ✅)
- `repo-hygiene/` (5/5 ✅)
- `docs-hygiene/` (4/4 ✅)

---

## Context

Na de docs-hygiene roadmap (D1-D4) zijn structurele inconsistenties opgelost. Maar een diepere audit toont **~45 issues** verdeeld over 19 documenten: verouderde metrieken, phantom features, stale backend/media docs, en auto-generated data docs die nooit zijn geregenereerd.

| Categorie | Issues | Docs |
|-----------|--------|------|
| Frontend design metrics | ~25 plekken met verkeerde nummers | 8 docs |
| Frontend structurele fouten | 6 phantom components/hooks, fout CSS import diagram | 4 docs |
| Backend feature docs | Stale app counts, missing fields, refactored references | 3 docs |
| Media & infrastructure docs | Stale pricing, future date, wrong model IDs | 5 docs |
| Data & plans docs | Auto-generated staleness, non-existent models, stale packages | 7 docs |

---

## Fasering — Track E (Docs Refactor)

| Fase | Naam | Scope | Effort |
|------|------|-------|--------|
| **E1** | Frontend Metrics Sweep | Alle nummers fixen in 8 frontend-design docs + CSS > 500L debt | 20 min |
| **E2** | Frontend Content Fixes | CSS import chain, phantom components, architecture diagrams | 15 min |
| **E3** | Backend Feature Docs | application-architecture, generation-queue, members-batch-actions | 15 min |
| **E4** | Media & Infrastructure | ai-providers, ai-models-pricing, media-templates, lineup-architecture, railway | 15 min |
| **E5** | Data, Plans & Index | Stale markers, seeding-guide models, package-audit, final index pass | 10 min |

**Totaal:** ~75 min
