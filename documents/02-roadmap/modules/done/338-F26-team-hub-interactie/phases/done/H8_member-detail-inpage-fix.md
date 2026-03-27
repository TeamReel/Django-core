# H8 — Member Detail In-Page (iOS Stijl)

| | |
|---|---|
| Fase | H8 |
| Status | 📋 TODO |
| Effort | ~4 uur |
| Afhankelijkheid | H5 (done) |

## Wat

Wanneer je op een member klikt en dan "Bewerken" tapt, navigeert de app weg van de hub naar een andere pagina. Dit moet in-page blijven als een iOS-style slide-in panel.

### Problemen

1. **"Bewerken" navigeert weg** — Na tap op member → summary sheet → "Bewerken" gaat de app naar een andere URL. De gebruiker verliest de hub-context.
2. **MemberDetailPanel overlay voelt als andere pagina** — Het `memberPanelOverlay` bedekt de hele hub, waardoor het niet meer als in-page voelt.
3. **Geen terug-animatie** — Bij sluiten van het detail panel is er geen slide-out animatie.

### Gewenste UX
- Member tap → MemberSummarySheet (bestaand, werkt goed)
- "Bewerken" → MemberDetailPanel als **rechts-inschuivend panel** (hub dimmed op achtergrond)
- Hub zichtbaar achter het panel (dimmed overlay)
- Sluiten → slide-out animatie → terug op hub, zelfde scrollpositie
- **Geen URL-wijziging** bij openen/sluiten
- Alle bewerkingen (rol, foto's, assets) binnen het panel, niet via navigatie

## Technische aanpak

### Huidige flow
1. Tap member → `setSelectedMember(m)` → `MemberSummarySheet` opent ✅
2. Tap "Bewerken" → `setSelectedMember(null)` + `setDetailMemberId(mid)` → `MemberDetailPanel` opent
3. `MemberDetailPanel` rendert in `memberPanelOverlay` div als `role="dialog"`

### Fixes
1. **Check MemberDetailPanel** — of het intern `navigate()` aanroept → blokkeren
2. **CSS animatie** — `memberPanelOverlay` met `slideInRight` animatie + dimmed achtergrond
3. **Tab-trap** — focus binnen het panel houden (voor a11y)
4. **Scroll lock** — hub scroll locken terwijl panel open is

### Bestanden
- `demo/src/pages/identity/MyTeamHubPage.tsx` — overlay rendering + state
- `demo/src/pages/identity/MyTeamHubPage.module.css` — `.memberPanelOverlay` styling
- `demo/src/pages/periods/MemberDetailPanel.tsx` — check voor interne navigatie

## Checklist

- [ ] Check of MemberDetailPanel intern navigatie triggert → blokkeren
- [ ] CSS: `.memberPanelOverlay` als slide-in van rechts met dimmed achtergrond
- [ ] Animatie: slideInRight (openen) + slideOutRight (sluiten)
- [ ] Hub zichtbaar achter panel (dimmed, niet interactief)
- [ ] Scroll positie behouden na sluiten
- [ ] Focus trap binnen het detail panel
- [ ] URL mag niet wijzigen
- [ ] Test: complete flow member → summary → bewerken → panel → sluiten
- [ ] TypeScript 0 errors, Vite build success
