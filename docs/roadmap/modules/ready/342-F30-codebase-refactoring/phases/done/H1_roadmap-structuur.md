# H1 — Roadmap Structuur Fixen

> **Effort:** ~2 uur | **Impact:** Eenduidige project-status, geen verwarring over wat actief/klaar/gedaan is

## To do

### Duplicaten oplossen
- [ ] `338-F26-team-hub-interactie/` — staat in zowel `ready/` als `active/`. Bepaal canonical locatie (vermoedelijk `active/`), verwijder de andere
- [ ] `315-B64-realtime-updates/` — staat in zowel `active/` als `done/`. Verplaats naar `done/` als het af is, verwijder uit `active/`

### Nummerconflicten fixen
- [ ] In `done/` bestaan twee 341-F29 modules:
  - `341-F29-home-page-premium/` 
  - `341-F29-member-summary-sheet-refactor/`
  - Hernummer één van beide (member-summary-sheet-refactor → `342` of volgend vrij nummer)

### Q-items juist plaatsen
- [ ] Verplaats voltooide Q-items uit `done/` root (Q001-Q014 + review-member-summary-sheet.md) naar `modules/quick/done/` of laat in `done/` maar maak consistent
- [ ] Verplaats Q-items die in `backlog/` staan (Q001-Q013, Q014) naar `modules/quick/` als ze <4 uur zijn
- [ ] Maak `modules/quick/done/` folder aan voor afgeronde Q-items

### Backlog opschonen
- [ ] Review de 65 genummerde backlog items — markeer items die achterhaald zijn als `later/` of verwijder
- [ ] Controleer of alle backlog items nog een geldig `index.md` hebben

### Stale structuur opruimen
- [ ] `documents/02-roadmap/done/` folder (buiten modules/) — is dit een legacy locatie? Zo ja, verplaats inhoud naar `modules/done/` en verwijder
- [ ] `documents/02-roadmap/deployment-phases/` — evalueer of dit nog relevant is
- [ ] Verwijder `.gitkeep` uit `active/` als er nu echte items in staan

### Index bijwerken
- [ ] Update `documents/02-roadmap/index.md` met actueel overzicht van alle modules per status

## Done criteria

- [ ] Elke module bestaat op exact één locatie (geen duplicaten)
- [ ] Geen nummerconflicten (uniek nummer per module)
- [ ] Q-items staan consistent in `quick/` (actief) of `done/` (afgerond)
- [ ] Backlog bevat alleen items die daadwerkelijk overwogen worden
- [ ] `index.md` geeft actueel overzicht
