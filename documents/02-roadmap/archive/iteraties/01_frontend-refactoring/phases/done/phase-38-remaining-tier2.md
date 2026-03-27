# Phase 38 — Remaining Tier 2 Decomposition

**Track:** B (Page Decomposition — Tier 2)
**Status:** 📋 Planned

## Bestanden

| Bestand | Regels | Aanpak |
|---------|--------|--------|
| ConfirmStep.tsx | 1164 | Extract preview sections, parameter forms |
| usePreferencesData.tsx | 1082 | Extract types, section configs |
| EntityEditModal.tsx | 1078 | Extract form fields |
| useSidebarData.ts | 1058 | Extract menu builders |
| ProjectSeasonSquadPage.tsx | 1020 | Extract squad grid, member cards |
| AssetGenerationModal.tsx | 990 | Verder splitsen (was 1532 → 990) |

## Checklist

- [ ] ConfirmStep: preview sections + parameter forms geëxtraheerd
- [ ] usePreferencesData: types + configs geëxtraheerd
- [ ] EntityEditModal: form fields geëxtraheerd
- [ ] useSidebarData: menu builders geëxtraheerd
- [ ] SquadPage: squad grid + member cards geëxtraheerd
- [ ] AssetGenerationModal: verdere decomposition
- [ ] Alle bestanden < 500 regels
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
