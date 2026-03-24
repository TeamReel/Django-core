# Q010 — Selectie tab tekst afgekapt op mobiel

| | |
|---|---|
| Status | 📋 TODO |
| Bron | UI Review F27 iteratie 2 — Playwright 24-03-2026 |
| Impact | 🟡 important |
| Effort | ~1 uur |

## Wat

De horizontale tab-bar op de Team Hub pagina (Overview, Wedstrijden, Assets, Selectie) past niet op 375px breed. De laatste tab "Selectie" wordt weergegeven als **"Sele"** — afgekapt zonder ellipsis of scroll-indicatie.

## Oplossing

Maak de tab-bar horizontaal scrollbaar met scroll-snap:

```css
.tabBar {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* Firefox */
  scroll-snap-type: x mandatory;
}

.tabBar::-webkit-scrollbar {
  display: none;
}

.tabItem {
  white-space: nowrap;
  scroll-snap-align: start;
}
```

## Checklist
- [ ] Tab-bar horizontaal scrollbaar op mobiel
- [ ] Alle tab-labels volledig leesbaar
- [ ] Actieve tab gecentreerd of zichtbaar na scroll
- [ ] Touch targets ≥ 44×44px op alle tabs
- [ ] Edge indicators (fade/shadow) om scroll aan te geven
- [ ] Verify op 375px met alle tabs
