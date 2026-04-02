# Q020 — Card Border Consistency

| | |
|---|---|
| Status | ✅ DONE |
| Bron | Visual Design Review |
| Impact | 🟡 important |
| Effort | ~1 uur |

## Wat
Veel card-containers misten de `border: 1px solid var(--app-border)` die de Assets tab wél had. Hierdoor zagen sommige secties (Wedstrijden, Selectie, Profiel, Overview accordions) er "vlak" uit vergeleken met de nette omkaderde kaarten op de Assets tab en Dashboard.

## Patroon
Alle card-containers moeten dezelfde basis-styling hebben:
```css
background: var(--app-surface);
border: 1px solid var(--app-border);
border-radius: var(--radius-lg);
overflow: hidden;
```

## Checklist
- [x] `ListSection.module.css` → `.sectionBody` — border toegevoegd
- [x] `HubWedstrijdenTab.module.css` → `.compBody` — `border: none` → `border: 1px solid`
- [x] `MyTeamHubPage.module.css` → `.nextMatchRow` — border toegevoegd
- [x] `MyTeamHubPage.module.css` → `.seasonCompact` — border toegevoegd
- [x] `MyTeamHubPage.module.css` → `.accordionSection` — border toegevoegd
- [x] `ProfileHubPage.module.css` → `.section` — border toegevoegd
- [x] `MatchOverviewTab.module.css` → `.heroCard` — border toegevoegd
- [x] Verify
