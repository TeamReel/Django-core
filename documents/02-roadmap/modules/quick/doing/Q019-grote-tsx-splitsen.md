# Q019 — Grote TSX componenten opsplitsen (>500 LOC)

| | |
|---|---|
| Status | 📋 TODO |
| Bron | Code Review / Codebase Audit |
| Impact | 🟡 important |
| Effort | ~4 uur |

## Wat
Naast MyTeamHubPage (apart item Q017) zijn er nog 2 TSX-bestanden boven de 500-regellimiet. Deze moeten opgesplitst worden in sub-componenten.

## Bestanden
| Component | Regels |
|-----------|--------|
| `MediaCollectionSheet.tsx` | 643 |
| `directory/index.tsx` | 510 |

## Checklist
- [ ] `MediaCollectionSheet.tsx` → extract sub-componenten
- [ ] `directory/index.tsx` → extract secties
- [ ] Alle onder 500 LOC
- [ ] `npx tsc --noEmit` + `npx vite build` schoon
- [ ] Verify visueel
