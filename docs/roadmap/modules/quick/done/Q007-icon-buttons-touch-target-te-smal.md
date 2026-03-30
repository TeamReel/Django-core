# Q007 — Icon buttons touch target te smal (MemberDetailPanel + header)

| | |
|---|---|
| Status | 📋 TODO |
| Bron | E2E Test (Playwright MCP, 2026-03-22) |
| Impact | 🟡 important |
| Effort | ~1 uur |

## Wat

Twee icon-buttons op de MyTeamHubPage (mobile 375×812) hebben een **touch target breder van minder dan
44px** — onder de iOS HIG en WCAG 2.1 SC 2.5.5 minimumnorm.

### Bevinding 1 — MemberDetailPanel close-knop

**Gemeten waarden (375×812):**
- `className: _closeBtn_vf5rk_131`
- `top: 68px` ✅ nu zichtbaar boven bottom nav (Q006-fix werkte!)
- `width: 28px` 🔴 te smal
- `height: 44px` ✅
- `aria-label`: **ontbreekt** 🔴

De knop is nu zichtbaar (Q006 gefixed), maar nog steeds te smal om comfortabel te tappen en mist een
toegankelijkheidslabel.

### Bevinding 2 — "Deel deze pagina" (Share) button in team header

**Gemeten waarden (375×812):**
- `aria-label: "Deel deze pagina"`
- `top: 125px`, `left: 128px`
- `width: 36px` 🔴 te smal
- `height: 44px` ✅

De share-knop naast het "Actief" pill in de team header is 36px breed — 8px onder het minimum.

## Repro

1. Open MyTeamHubPage op 375×812 → header zichtbaar → share-knop (36px)
2. Selectie-tab → lid aantikken → "Bekijk profiel" → close-knop MemberDetailPanel (28px, geen label)

## Checklist

- [ ] `_closeBtn_vf5rk_131`: minimale breedte naar `44px` (`min-width: var(--touch-target, 44px)`)
- [ ] `_closeBtn_vf5rk_131`: voeg `aria-label="Sluiten"` toe
- [ ] Share-knop in team header: `min-width: 44px` (of padding symmetrisch maken zodat totale tappable area ≥44px)
- [ ] Verifieer beide fixes op 375×812 viewport
- [ ] Verifieer geen visuele regressie op 1280×720
