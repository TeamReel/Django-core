# H4 — Team-only hub (geen seizoen)

> **Effort:** ~6 uur | **Impact:** Nieuwe teams zijn direct bruikbaar zonder seizoen

## Context

Wanneer een club admin een nieuw team aanmaakt, heeft dat team nog geen seizoenen. De `TeamSeasonResolver` (H0) vangt dit op met een fallback. Deze fase bouwt die fallback uit tot een volwaardige team-setup ervaring.

## To do

- [ ] Bouw `HubTeamOnlyView` component:
  - Header: team naam + "Nog geen seizoen" badge
  - Overview tab:
    - Team info sectie (naam, club, beschrijving)
    - "Maak je eerste seizoen aan" CTA → opent seizoen-create modal
    - Leden preview (team roster, niet seizoen-specifiek)
    - Asset status (team + club assets)
  - Selectie tab:
    - Hergebruik team leden lijst via `useTeamTabData`
    - "Voeg leden toe" functionaliteit
  - Beheer tab:
    - `TeamBeheerTab` as-is (assets, kits, credits)
- [ ] Seizoen-creatie flow:
  - CTA button → opent bestaande create-period modal
  - Na creatie: automatisch redirect naar 4-segment hub met nieuw seizoen
- [ ] Data hook:
  - Gebruik `useTeamDetailData()` + `useTeamTabData()`
  - Geen SeasonProvider nodig
- [ ] RBAC:
  - Supporter: alleen Overview (lege staat)
  - Player: Overview + Selectie (kan leden bekijken)
  - Admin: Overview + Selectie + Beheer + seizoen aanmaken

## Done criteria

- [ ] Nieuw team zonder seizoenen toont bruikbare hub
- [ ] "Maak seizoen aan" CTA werkt en redirect correct
- [ ] Team leden beheerbaar vóór eerste seizoen
- [ ] Team assets uploadbaar vóór eerste seizoen
- [ ] Na seizoen-creatie: naadloze overgang naar volledige hub
