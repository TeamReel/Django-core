# H2 — Verify & Polish

| | |
|---|---|
| Fase | H2 |
| Status | TODO |
| Effort | ~1 uur |
| Bestanden | Playwright tests, MemberSummarySheet styling tweaks |
| Afhankelijkheid | H0 + H1 |

---

## Doel

Visuele en functionele verificatie van het nieuwe asset-overzicht op meerdere viewports. Polish van spacing, alignment en interacties.

---

## Playwright test-flow

### Test 1: Asset overzicht volledigheid
1. Navigeer naar Team Hub → Selectie tab (mobiel 375×812)
2. Tap op een lid met assets
3. Verifieer dat MemberSummarySheet opent
4. Verifieer 2 sectie-headers zichtbaar: "Foto's" en "Video's"
5. Verifieer 6 asset-kaarten zichtbaar (2 + 4)
6. Screenshot: `verify-summary-sheet-sections.png`

### Test 2: Asset card tap → juiste tab
1. Tap op "Intro" kaart in Video's sectie
2. Verifieer dat MemberDetailPanel opent op "Intro" tab
3. Tap ✕ → verifieer terug naar MemberSummarySheet
4. Tap op "Actiefoto" kaart
5. Verifieer dat MemberDetailPanel opent op "Actiefoto" tab
6. Screenshot per stap

### Test 3: Back-navigatie flow
1. Open MemberSummarySheet
2. Tap asset-kaart → MemberDetailPanel opent
3. Tap ✕ op panel → MemberSummarySheet verschijnt weer
4. Tap ✕ op sheet → terug naar Selectie tab
5. Verifieer complete round-trip

### Test 4: Responsive viewports
1. Check op 375px (iPhone SE)
2. Check op 390px (iPhone 14)
3. Check op 428px (iPhone 14 Pro Max)
4. Verifieer geen horizontal overflow
5. Verifieer alle kaarten zichtbaar zonder scrollen (of minimaal scrollen)
6. Screenshots per viewport

### Test 5: Edge cases
1. Open lid zonder assets → alle kaarten tonen "missing" state
2. Open lid met alleen fullbody → close-up toont afgeleid-status
3. Open lid zonder legacy foto → Then vs Now toont hint
4. Verifieer counters kloppen: "0/2", "0/4"

---

## Polish items

### Spacing
- [ ] Secties hebben consistent `var(--space-4)` gap
- [ ] Section headers aligned met card grid edges
- [ ] Video kaarten niet te smal op 375px (min ~70px breed per kaart)

### Visuele consistentie
- [ ] Done-kaarten: groene border consistent met bestaande stijl
- [ ] Missing-kaarten: dashed border, placeholder icon gecentreerd
- [ ] Labels leesbaar op alle kaartformaten
- [ ] Geen tekst-overflow op smalle kaarten

### Interactie
- [ ] Tap feedback: actieve state (scale of achtergrondkleur)
- [ ] Disabled state voor niet-admin gebruikers
- [ ] Focus-visible ring op alle kaarten

### Toegankelijkheid
- [ ] Screen reader: sectie-labels + kaart-labels vormen logische structuur
- [ ] Touch targets: alle kaarten ≥44×44px
- [ ] Contrast: labels en counters voldoen aan WCAG AA

---

## Build verificatie

```bash
cd demo
npx tsc --noEmit          # TypeScript clean
npx vite build            # Production build clean
```

---

## Checklist

- [ ] Playwright test 1: Sectie headers + 6 kaarten zichtbaar
- [ ] Playwright test 2: Tap → juiste tab
- [ ] Playwright test 3: Back-navigatie round-trip
- [ ] Playwright test 4: 3 viewport sizes
- [ ] Playwright test 5: Edge cases (leeg lid, geen legacy)
- [ ] Polish: spacing, visuele consistentie, interactie
- [ ] Toegankelijkheid: touch targets, focus-visible, screen reader
- [ ] TypeScript + Vite build clean
- [ ] Screenshots documenteren in fase-verslag
