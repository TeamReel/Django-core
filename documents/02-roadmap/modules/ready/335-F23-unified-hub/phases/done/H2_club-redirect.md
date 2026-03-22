# H2 — ClubDetailPage → Redirect naar Hub

> **Effort:** ~6 uur | **Impact:** Club admins landen direct in de hub — geen aparte pagina meer

## Context

`ClubDetailPage` (2-segment: `/:org/:club`) dupliceert vrijwel alles wat de Hub's "Club" tab al biedt. Door de 2-segment route te redirecten naar de hub, elimineren we dubbel onderhoud en geven club admins één startpunt.

## To do

- [ ] Maak `ClubToHubResolver` component:
  - Detect user's actieve team (uit member-profiel, gecached in `useAppSelection`)
  - Als team + seizoen bekend → redirect naar `/:org/:club/:team/:season`
  - Als alleen team, geen seizoen → redirect naar `/:org/:club/:team` (TeamSeasonResolver handelt rest af)
  - Als geen team (club-only admin) → render club-scope hub
- [ ] Club-scope hub (fallback):
  - Hergebruik bestaande `HubClubTab` als standalone view
  - Tabs: Overview, Teams, Leden, Identity — exact wat `ClubDetailPage` nu biedt
  - Wikkeld in eigen layout (header, tab bar) zonder SeasonProvider
- [ ] Route update in `appRouteGroups.tsx`:
  - 2-segment route wijst naar `ClubToHubResolver`
  - `ClubDetailPage` component niet verwijderen (cleanup in H5)
- [ ] Preserveer query parameters:
  - `?tab=teams` → redirect naar hub met `?tab=club`
  - `?tab=identity` → redirect naar hub met `?tab=club`
  - Mapping voor legacy tab-namen
- [ ] Back navigation:
  - In club-scope hub: back → federatie (ongewijzigd)
  - In redirect case: transparant — user ziet nooit de 2-segment pagina

## Done criteria

- [ ] `/:org/:club` redirect naar hub (voor users met team)
- [ ] Club-only admins zien een werkende club management view
- [ ] Bestaande bookmarks naar `/:org/:club?tab=teams` blijven werken
- [ ] `HubClubTab` werkt zowel embedded in hub als standalone
- [ ] Geen layout flash bij redirect
