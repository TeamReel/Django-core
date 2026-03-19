# F21 — My Team: Mobile Tab Restructuur

| | |
|---|---|
| Code | F21 |
| Status | ✅ DONE |
| Prioriteit | 🟡 important |
| Geschatte effort | ~12 uur |
| Bron | Playwright mobile review (maart 2026) |

## Probleem

De My Team-pagina heeft **6 tabs** op mobile (375px): Overview, Wedstrijden, Media, Selectie, Beheer, Club. Dat is te veel — tabs worden afgesneden en "Club" is eigenlijk een apart navigatieniveau (met eigen sub-tabs). "Beheer" overlapt functioneel met Overview.

## Gewenste situatie

- **4 tabs** op mobile: Overview, Wedstrijden, Media, Selectie
- **Club** wordt een apart scherm (bereikbaar via team-header of breadcrumb)
- **Beheer**-functies worden geïntegreerd in Overview (sectie of uitklapbaar)
- Scroll-indicator als er meer tabs zijn dan het scherm toont

## Screenshots (uit review)

Zie Playwright-sessie maart 2026 — 6 tabs op 375px, "Club" en "Beheer" zichtbaar.

## Fasering

| Fase | Naam | Effort | Omschrijving |
|------|------|--------|-------------|
| H0 | Club pagina apart scherm | ~3 uur | Club-content verplaatsen naar eigen route/pagina |
| H1 | Tab-restructuur + Beheer merge | ~4 uur | Tabs reduceren naar 4, Beheer in Overview |
| H2 | Overview compact + scroll indicator | ~3 uur | Overview-layout optimaliseren, tab scroll hint |
| H3 | Polish & Test | ~2 uur | Responsive testen, a11y, edge cases |

## Acceptatiecriteria

- [ ] Mobile (375px) toont maximaal 4 tabs
- [ ] Club-info bereikbaar via apart scherm
- [ ] Beheer-functies beschikbaar vanuit Overview
- [ ] Geen horizontal overflow op mobile
- [ ] Scroll-indicator zichtbaar als tabs niet passen
- [ ] Touch targets ≥ 44×44px
- [ ] Keyboard navigatie werkt correct
- [ ] E2E test voor tab-navigatie op mobile
