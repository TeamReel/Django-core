# S2 — God-File Splitting

**Status:** 🔲 Todo
**Effort:** 6 uur
**Scope:** 20 files >300 regels → <300 regels elk

---

## Doel

Grote bestanden zijn moeilijk te begrijpen, reviewen, en onderhouden. Elke file moet een duidelijke single responsibility hebben en <300 regels zijn.

## Top 10 te splitsen

| Bestand | Regels | Split-strategie |
|---------|--------|----------------|
| `useMatchWizardData.ts` | 788 | Data fetching / state / selectors |
| `SeasonSquadTab.tsx` | 579 | UI / data hook / modals |
| `SeasonMediaTab.tsx` | 575 | UI / data hook / upload logic |
| `useContentGeneration.tsx` | 555 | State machine / API calls / polling |
| `useTeamTabData.ts` | 533 | Opsplitsen per data domain |
| `MatchWizardV2.tsx` | 532 | Steps → aparte components |
| `sidebarPanelBWork.ts` | 519 | Per sidebar section |
| `TeamSelectieTab.tsx` | 505 | UI / data / drag-drop |
| `useCompetitionsData.ts` | 491 | Fetching / mutations / selectors |
| `NavbarModals.tsx` | 491 | 1 modal per file (→ S4) |

## Pattern per split

### Data hooks (>400 regels)
```
useTeamTabData.ts (533)
  → useTeamTabData.ts        (orchestrator, <100)
  → useTeamMembers.ts        (member fetching)
  → useTeamMatches.ts        (match fetching)
  → useTeamSeasons.ts        (season fetching)
  → teamTabTypes.ts          (shared types)
```

### Components (>400 regels)
```
SeasonSquadTab.tsx (579)
  → SeasonSquadTab.tsx        (main layout, <200)
  → useSeasonSquadData.ts     (data hook)
  → SquadMemberCard.tsx       (individual member card)
  → SquadFilters.tsx          (filter controls)
```

## Verificatie

- [ ] Geen file >300 regels (behalve `_archive/`)
- [ ] Imports correct na splits
- [ ] `npx vite build` slaagt
- [ ] Functionaliteit ongewijzigd
