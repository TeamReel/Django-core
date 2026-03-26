# Q002 — Team Hub: tab bar overflow op mobile

| | |
|---|---|
| Status | 📋 TODO |
| Bron | UI/UX Review (Playwright) |
| Impact | 🟡 important |
| Effort | ~1 uur |

## Wat
Op de Team Hub pagina is de horizontale tab bar breder dan het scherm op 375px.
De 4e tab ("Selectie") wordt afgesneden. Tabs 5-6 (Beheer, Club) zijn niet bereikbaar
zonder te scrollen, maar er is geen visuele indicatie dat er meer tabs zijn.

**Gewenst**: Horizontaal scrollende tabs met fade-indicator of scroll-hint aan de rechterkant.

## Checklist
- [ ] Maak MobileTabBar horizontaal scrollbaar (`overflow-x: auto`)
- [ ] Voeg fade-gradient of scroll-hint toe aan rechterrand
- [ ] Hide scrollbar visueel (`scrollbar-width: none`)
- [ ] Snap-scroll naar actieve tab bij mount
- [ ] Tests
- [ ] Verify op 375px viewport
