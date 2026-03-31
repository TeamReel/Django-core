# H2 — Credits & Growth Trends

> **Effort:** ~2 uur | **Impact:** Credits overzicht + week-over-week groei zichtbaar

## Context

Laatste dashboard sectie: credits verbruik per organisatie en een simpele growth tabel die week-over-week trends toont. Plus een management command om cache handmatig te refreshen.

## To do

- [ ] `DashboardStatsService.get_credits_stats()` retourneert:
  - **Totaal credits verbruikt** (sum van UsageEvent of Transaction)
  - **Top 5 organisaties** op credits verbruik (naam + bedrag)
  - **Credits deze maand** vs vorige maand
- [ ] `DashboardStatsService.get_growth_stats()` retourneert:
  - Week-over-week tabel (afgelopen 4 weken):
    - Nieuwe organisaties per week
    - Nieuwe members per week  
    - Nieuwe content items per week
    - Nieuwe generation requests per week
  - Elke rij: weeknummer, start_date, counts, delta vs vorige week (↑/↓)
- [ ] Template uitbreiden met:
  - "Credits" sectie — totaal + top-5 tabel
  - "Growth" sectie — 4-weken tabel met trend indicators
- [ ] Management command `refresh_dashboard_stats`:
  - `python manage.py refresh_dashboard_stats`
  - Forceert cache invalidatie + herbouw van alle stats
  - Optional `--verbose` flag voor output
- [ ] Tests:
  - `test_credits_stats_top_5_orgs`
  - `test_growth_stats_weekly_counts`
  - `test_management_command_refreshes_cache`

## Done criteria

- [ ] Credits sectie toont top-5 organisaties
- [ ] Growth tabel toont 4 weken met trend arrows
- [ ] `python manage.py refresh_dashboard_stats` werkt
- [ ] 3+ tests passing
- [ ] Alle acceptatiecriteria uit index.md afgevinkt
