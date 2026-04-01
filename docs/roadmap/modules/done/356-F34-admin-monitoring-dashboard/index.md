# 356 — F34 — Admin Monitoring Dashboard

| | |
|---|---|
| Status | � IN UITVOERING |
| Categorie | Backend (Internal Tooling) |
| Impact | 🟡 important |
| Effort | ~35 uur |

## Doel

Lightweight monitoring dashboard in Django Admin waarmee de product owner in één overzicht ziet:
- Hoeveel clubs, teams, members er zijn
- Welke AI flows er draaien en hun status
- Content productie en approval rates
- Video processing queue status
- Credits verbruik

**Geen** user-facing analytics (dat is B65). Dit is een **intern owner-dashboard** in de bestaande Django Admin.

## Huidige staat

- Django Admin draait op standaard `django.contrib.admin` — geen customizations
- 27 apps hebben admin registraties met `@admin.register()` + `ModelAdmin`
- Geen custom admin site, geen dashboard widgets
- Alle benodigde data zit al in de database (models bestaan)
- Geen extra infra nodig (geen Streamlit, geen extra Railway service)

## Design beslissingen

| Beslissing | Keuze | Reden |
|------------|-------|-------|
| Framework | Django Admin custom view | Geen extra infra, auth gratis, ORM direct |
| Custom AdminSite | Ja — `TeamReelAdminSite` | Clean override van index template |
| Styling | Inline CSS in admin template | Admin templates zijn self-contained, geen build step |
| Caching | Django cache framework (Redis) | TTL 5 min, voorkomt zware queries bij elke pageload |
| Refresh | Management command + optioneel Celery beat | `python manage.py refresh_dashboard_stats` |
| Charts | Geen (fase 0) — puur getallen + tabellen | Later Chart.js toevoegen als nodig |

## Fasering

| Fase | Titel | Effort | Status |
|------|-------|--------|--------|
| H0 | Custom AdminSite + Platform Stats | ~3 uur | ✅ DONE |
| H1 | AI & Content Pipeline Stats | ~3 uur | ✅ DONE |
| H2 | Credits & Trends | ~2 uur | ✅ DONE |
| H3 | Data Explorer | ~4 uur | ✅ DONE |
| H4 | Interactive React Dashboard | ~22 uur | ✅ DONE |

## Acceptatiecriteria

- [ ] `/admin/` toont een custom dashboard boven de standaard app-lijst
- [ ] Platform stats: organisaties, projecten, teams, members, periodes, activiteiten (live counts)
- [ ] AI stats: generation requests per status, content items per status, video jobs per status+type
- [ ] Credits: totaal verbruik, top-5 organisaties op verbruik
- [ ] Growth: week-over-week tabel (afgelopen 4 weken) voor nieuwe orgs, members, content items
- [ ] Stats gecached (Redis, TTL 5 min) — geen N+1 queries
- [ ] Management command `refresh_dashboard_stats` voor handmatige refresh
- [ ] Data Explorer: per-app overzicht met record counts, vulgraad (🟢/🟡/🔴), admin changelist links
- [ ] Data Explorer: samenvattingsrij (totaal apps/models/records/% gevuld) + filter toggle
- [ ] Alleen zichtbaar voor superusers
- [ ] Tests voor de stats gathering service
- [ ] H4: `/platform-stats` React pagina met Recharts charts (area, donut, bar)
- [ ] H4: Auto-refresh elke 30s + date range selector (7d/30d/90d/seizoen)
- [ ] H4: 3 DRF API endpoints (`/api/v1/dashboard/overview|pipelines|credits/`)
- [ ] H4: Drill-down links, skeleton loaders, responsive layout
- [ ] H4: Backend tests (10+), TypeScript strict, Vite build passing
