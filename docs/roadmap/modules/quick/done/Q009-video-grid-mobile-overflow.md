# Q009 — Video grid overflow op mobiel (375px)

| | |
|---|---|
| Status | 📋 TODO |
| Bron | UI Review F27 iteratie 2 — Playwright 24-03-2026 |
| Impact | 🔴 critical |
| Effort | ~2 uur |

## Wat

De video grid (4-koloms, `repeat(4, 1fr)`) loopt **109px** voorbij het scherm op 375px breed. Het 4e kaartje "Actiefoto" is **volledig onzichtbaar** — gebruikers weten niet dat het bestaat.

### Metingen bij 375px

| Kaart | Breedte | Zichtbaar |
|-------|---------|-----------|
| Intro | 94px | ✓ |
| Celebration | 133px | ✓ |
| Then vs Now | 67px | ✓ |
| Actiefoto | 119px | ✗ (buiten viewport) |

**Grid width**: 328px, **Scroll width**: 437px

### Bijkomend probleem
"Then vs Now" label wraps naar 3 regels verticaal ("Then\nvs\nNow") — onleesbaar op 67px breed.

## Oplossing

Wijzig `.gridVideos` naar **2×2 grid op mobiel** (< 640px), 4-koloms op groter:

```css
.gridVideos {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-2);
}

@media (min-width: 640px) {
  .gridVideos {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

Alternatief: horizontaal scrollbare strip met `overflow-x: auto`.

## Checklist
- [ ] Video grid → 2×2 op mobiel, 4-koloms op ≥640px
- [ ] `min-width: 0` op `.assetCard` (voorkomt content-gebaseerde overflow)
- [ ] Labels leesbaar op alle viewports
- [ ] Alle 4 kaarten zichtbaar en tappable op 375px
- [ ] Touch targets ≥ 44×44px
- [ ] Verify op 375px, 390px, 428px
- [ ] Dark mode check
