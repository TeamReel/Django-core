# H1 — Tab-restructuur + Beheer merge

> **Effort:** ~4 uur | **Impact:** Reduceert mobile tabs van 5 naar 4

## Doel

Reduceer de mobile tabs van 5 (na H0) naar 4 door Beheer-functies te integreren in Overview.

## To do

- [ ] Analyseer welke Beheer-functies er zijn (team settings, rollen, uitnodigingen)
- [ ] Ontwerp hoe Beheer-items in Overview passen (sectie onderaan, of uitklapbaar paneel)
- [ ] Conditional rendering: alleen tonen als gebruiker admin/beheerder is
- [ ] Beheer-tab verwijderen uit mobile tab-bar
- [ ] Desktop: Beheer-tab mag blijven (of ook mergen — beslissing in H1)
- [ ] Update tab-component om responsive te zijn (4 tabs mobile, 5-6 desktop)

## Design beslissing

Beheer in Overview als "Instellingen"-sectie onderaan, met rechten-check. Alleen zichtbaar voor team-admins.

## Done criteria

- [ ] Mobile toont 4 tabs: Overview, Wedstrijden, Media, Selectie
- [ ] Beheer-functies beschikbaar vanuit Overview
- [ ] Rechten-check werkt correct
- [ ] Desktop layout niet verstoord
