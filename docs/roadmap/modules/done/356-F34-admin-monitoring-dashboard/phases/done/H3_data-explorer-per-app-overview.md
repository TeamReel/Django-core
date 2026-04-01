# H3 — Data Explorer: Per-App Table Overview + Drill-Down

> **Effort:** ~4 uur | **Impact:** Instant inzicht welke tabellen leeg/gevuld zijn + snelle drill-down naar admin changelist

## Context

Na H0-H2 toont het dashboard aggregated stats. Maar de product owner wil ook concreet zien: welke apps/tabellen zijn al gevuld met data en welke zijn nog leeg? Dit is cruciaal om te zien hoe "vol" het platform is en waar data ontbreekt.

De huidige inventaris (maart 2026) toont ~70 models over ~25 apps. Veel tabellen zijn nog op 0 — dit overzicht maakt dat direct zichtbaar met kleur-codering en klikbare links.

## To do

- [ ] `DashboardStatsService.get_data_explorer_stats()` retourneert per app:
  - **App label** (bijv. "activities", "branding")
  - **Per model**: naam, record count, link naar admin changelist
  - **App totaal**: som van alle records in die app
  - **Vulgraad indicator**: 🟢 (>0 records in alle models), 🟡 (deels gevuld), 🔴 (alles leeg)
  - Apps gesorteerd op vulgraad (lege apps onderaan)
  - Skip interne Django apps (auth, contenttypes, sessions, admin, token_blacklist)
- [ ] Template: nieuwe "Data Explorer" sectie met:
  - **Samenvattingsrij bovenaan**: totaal apps, totaal models, totaal records, % gevulde tabellen
  - **Inklapbare app-secties** (HTML `<details>`/`<summary>`) — standaard dichtgeklapt
  - Per app: badge met vulgraad kleur + totaal records
  - Per model: naam, count, directe link naar admin changelist (`/admin/<app>/<model>/`)
  - Lege tabellen in lichtgrijs, gevulde tabellen in normaal gewicht
  - "Leeg" vs "Gevuld" filter toggle (JS, simpel show/hide)
- [ ] Admin changelist links: model name klikbaar → opent admin lijst voor dat model
- [ ] Cache: aparte key `dashboard:data_explorer` (TTL 300s)
- [ ] Tests:
  - `test_data_explorer_counts_models` — verifieert dat alle custom apps aanwezig zijn
  - `test_data_explorer_fill_indicators` — 🟢/🟡/🔴 logica
  - `test_data_explorer_excludes_internal_apps` — geen auth/sessions/etc
  - `test_data_explorer_admin_links` — correcte changelist URL format
  - `test_data_explorer_caching`

## Done criteria

- [ ] Data Explorer sectie zichtbaar op `/admin/` voor superusers
- [ ] Elke app toont vulgraad badge (🟢/🟡/🔴) + totaal records
- [ ] Elke model-rij bevat count + klikbare link naar admin changelist
- [ ] Samenvattingsrij toont totaal apps/models/records/% gevuld
- [ ] Filter toggle om alleen lege of alleen gevulde tabellen te zien
- [ ] 5+ tests passing
