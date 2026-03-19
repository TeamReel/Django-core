# H0 — Club pagina apart scherm

> **Effort:** ~3 uur | **Impact:** Reduceert tabs van 6 naar 5

## Doel

De "Club"-tab bevat info over de club zelf (naam, logo, velden, bestuur) — dat is een ander niveau dan team-specifieke tabs. Verplaats naar een eigen route.

## To do

- [ ] Nieuwe route `/club/:clubId` of `/organisation/:orgId/club` aanmaken
- [ ] Club-content uit MyTeam-tabs extraheren naar eigen page component
- [ ] Navigatie vanuit team-header (club-naam klikbaar → club-pagina)
- [ ] Breadcrumb: Club > Team > [huidige pagina]
- [ ] Mobile: club-link in team-header of via menu

## Uit scope

- Club-pagina uitbreiden met extra features (dat is een apart spec)
- Desktop layout wijzigen (daar zijn 6 tabs prima)

## Done criteria

- [ ] Club-tab verwijderd uit MyTeam mobile tabs
- [ ] Club-pagina bereikbaar via team-header
- [ ] Bestaande club-content werkt op nieuwe locatie
- [ ] Geen regressie op desktop
