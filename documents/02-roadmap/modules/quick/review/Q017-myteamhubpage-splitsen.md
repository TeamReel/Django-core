# Q017 — MyTeamHubPage opsplitsen (1216 LOC TSX + 1017 LOC CSS)

| | |
|---|---|
| Status | � REVIEW |
| Bron | Code Review / Codebase Audit |
| Impact | 🟡 important |
| Effort | ~4 uur |

## Wat
`MyTeamHubPage.tsx` is 1216 regels (limiet: 500) en het bijbehorende CSS module is 1017 regels (richtlijn: ~150). Dit is het grootste component in de hele frontend en maakt onderhoud, bugfixes, en code-review lastig. Moet opgesplitst worden in sub-componenten.

## Aanpak
- Analyseer welke secties logisch los te trekken zijn (tabs, headers, dialogs, data-fetching)
- Extract sub-componenten met eigen CSS modules
- Behoud bestaande functionaliteit en routing

## Checklist
- [ ] Analyseer huidige structuur en secties
- [ ] Extract minimaal 3-4 sub-componenten
- [ ] Splits CSS module mee per sub-component
- [ ] Alle sub-componenten < 500 LOC TSX, < 150 LOC CSS
- [ ] `npx tsc --noEmit` + `npx vite build` schoon
- [ ] Verify visueel (geen regressie)
