# Repo Hygiene — Roadmap

**Status:** ✅ Done (5/5 fases done)
**Aangemaakt:** 2026-03-12
**Vorige roadmaps:**
- `design-system-adoption/` (11/11 ✅)
- `frontend-tech-debt/` (12/12 ✅)
- `frontend-structural-debt/` (17/17 ✅)
- `frontend-final-cleanup/` (12/12 ✅)
- `frontend-hardening/` (12/12 ✅)

---

## Context

Na 5 afgeronde roadmaps is de **code quality** uitstekend (ESLint zero, 892 tests, typed, accessible, lazy routes, memoized). Maar een grondige audit toont **repo-hygiene debt**: ~40 debris bestanden, ongebruikte dependencies, binary assets in git, en inconsistente module patterns.

| Probleem | Huidige Staat | Target |
|----------|---------------|--------|
| Temp/debug files in `demo/` | **20** tracked | 0 |
| Ongebruikte dependencies | **5** packages | 0 |
| Verkeerd geplaatste deps | **1** (`react-window`) | 0 |
| One-off scripts in repo root | **17** tracked + **7** untracked | 0 |
| Binary assets tracked in git | **82** files (`asc/`) | 0 tracked |
| `.gitignore` gaps | **3** missing patterns | 0 |
| Incomplete barrel exports | **1** (`hooks/index.ts`) | Consistent |
| Fragiele module patterns | **1** (`useCompetitionsData`) | Clean |

---

## Fasering — Track R (Repo Hygiene)

**Doel:** Schone repo, geen debris, correcte dependencies, consistent patterns

| Fase | Naam | Scope | Target | Effort |
|------|------|-------|--------|--------|
| **R1** ✅ | Frontend Debris | 20 temp/debug files in `demo/` verwijderen | 0 debris in demo/ | 30 min |
| **R2** ✅ | Dependency Cleanup | 5 unused deps weg, 1 dep verplaatsen | 0 unused deps | 30 min |
| **R3** ✅ | Root Script Purge | 17 tracked + 7 untracked one-off scripts weg | 0 scripts in root | 30 min |
| **R4** ✅ | Gitignore & Binary Assets | 82 binary files untracken, .gitignore updaten | 0 binaries tracked | 30 min |
| **R5** ✅ | Hook Barrel & Patterns | Barrel export + module pattern consistency | Consistent patterns | 1 uur |

---

## Volgorde

```
R1 (frontend debris) ─────┐
       ↓                   │
R2 (dependency cleanup)    │
       ↓                   │
R3 (root script purge) ───┤
       ↓                   │
R4 (gitignore & binaries) ┤
       ↓                   │
R5 (barrel & patterns) ───┘
```

**Rationale:**
- **R1 eerst** — Frontend debris weg voordat deps opgeruimd worden
- **R2 na R1** — Package.json cleanup na file cleanup
- **R3 onafhankelijk** — Root scripts staan los van frontend
- **R4 na R3** — Gitignore update nadat tracked files weg zijn
- **R5 laatst** — Module patterns vereisen dat alles clean is

---

## Prioriteit

| Prio | Fases | Reden | Geschatte Tijd |
|------|-------|-------|----------------|
| **P0** | R1, R3 | ⚠️ R3 bevat bestanden met hardcoded credentials | 1 uur |
| **P1** | R2, R4 | Unused deps + binary bloat weg | 1 uur |
| **P2** | R5 | DX verbetering, geen productie-impact | 1 uur |

**Totaal:** ~3 uur

---

## Scores (voor vs. na)

| Aspect | Vóór | Na |
|--------|:----:|:--:|
| Code quality | 9/10 | 9/10 |
| Test coverage | 9/10 | 9/10 |
| Best practices | 8/10 | 8/10 |
| **Repo hygiene** | **4/10** | **9/10** |

---

## Definities

### "Klaar" per fase
- [ ] Geen regressies (`npx tsc --noEmit` + `npx vitest run`)
- [ ] Fase-specifieke targets gehaald
- [ ] Gecommit + gepusht

### Voorwaarde
- Vorige roadmap `frontend-hardening/` volledig afgerond (12/12 ✅)
