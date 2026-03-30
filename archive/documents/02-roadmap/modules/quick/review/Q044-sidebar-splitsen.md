# Q044 — Sidebar Component Splitsen

| | |
|---|---|
| Status | 🔍 REVIEW |
| Bron | Code Review |
| Impact | 🟢 nice-to-have |
| Effort | ~2 uur |

## Wat
`Sidebar.tsx` (~347 regels) combineert Panel A rendering, Panel B rendering, route detection, queue counting en collapse/expand logic. Opsplitsen verbetert onderhoudbaarheid.

## Aanpak
1. Extract `SidebarPanelA.tsx` — primaire navigatie
2. Extract `SidebarPanelB.tsx` — contextuele tabs
3. Sidebar.tsx wordt wrapper (~80 regels)

## Checklist
- [ ] Extract sub-componenten
- [ ] Verify: `pnpm exec tsc --noEmit` → 0 errors
- [ ] Verify: `pnpm exec vite build` → success
- [ ] Visueel testen: sidebar werkt correct
