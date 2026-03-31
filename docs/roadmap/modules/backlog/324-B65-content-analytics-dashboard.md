# 324 — B65 — Content Analytics Dashboard

| | |
|---|---|
| Status | 📋 BACKLOG |
| Categorie | Backend (TeamReel Product Feature) |
| Impact | 🟡 important |
| Effort | ~25 uur |

## Wat

User-facing content analytics met aggregatie-endpoints voor content performance, team-activiteit en engagement metrics. Materialized views per organisatie/project/periode/content_type, team activity ranking, content type breakdown met success rates, tijdreeks data, CSV export, en Redis caching met slimme invalidatie.

## Waarom belangrijk

Clubs investeren tijd en credits in content maar hebben geen inzicht in wat ze produceren. Analytics beantwoordt: "Hoeveel video's hebben we dit seizoen gemaakt?", "Welke teams zijn actief?", "Wat is onze approval rate?" Dit toont ROI, identificeert inactieve teams, en drijft upsell naar premium tiers.

## Past in TeamReel / CoreApp

- **TeamReel**: Directe waarde voor bestuurders. Een voorzitter wil in één overzicht zien: "We hebben 47 video's gemaakt, 12 gedeeld, en de jeugd is het meest actief." Dit is het verhaal dat clubbesturen overtuigt om te verlengen.
- **CoreApp**: Content analytics is een generiek pattern. De aggregatie-laag (per org, per periode, met caching) is herbruikbaar voor elk product dat usage metrics toont aan eindgebruikers.

---

## Spec-Kitty Commando's

### Specify

```
/spec-kitty.specify feature=B65-content-analytics-dashboard

We bouwen user-facing content analytics in de Django 5 + DRF backend.

[feature summary]
Aggregatie-endpoints voor content performance, team activity, en engagement met caching en CSV export.

[goals]
- ContentAnalytics aggregatie per: organisatie, project, periode, content_type
- Metrics: total_generated, total_approved, total_rejected, total_shared
- Team activity: meest/minst actieve teams, content per wedstrijd ratio
- Content type breakdown met success rates
- Tijdreeks data: wekelijks, maandelijks trends
- CSV export met date range filters
- Redis caching (TTL 1 uur, invalidatie bij nieuwe content)
- Celery aggregatie refresh (dagelijks + na batch-generatie)

[non-goals]
- Real-time analytics dashboard
- Third-party analytics (Mixpanel, GA)
- Individual user behavior tracking (dat is product analytics, niet user-facing)
- Frontend chart rendering (apart frontend concern)

[tech context]
- Backend: Django 5, DRF, PostgreSQL, Celery, Redis
- Content data: GenerationRequest en gerelateerde models (src/generative/)
- Activities: Activity model (src/activities/)
- Cache: Django Redis cache backend
- Tests: pytest + factory_boy
```

### Plan

```
/spec-kitty.plan feature=B65-content-analytics-dashboard

[tech choices]
- Aggregatie: Django ORM annotate/aggregate met database-level counts
- Materialized view: optioneel PostgreSQL materialized view, of Django model als cache
- Cache: Redis met per-org cache keys, invalidatie via signals
- Export: CSV via Python csv module, streaming response voor grote datasets
- Scheduling: Celery-beat taak voor dagelijkse aggregatie refresh

[models]
- ContentStatsSummary: org FK, project FK (nullable), period (date), content_type, metrics (JSONField)
  → Pre-aggregated per dag, queryable voor trends

[api endpoints]
- GET /api/v1/analytics/content-stats/ — metrics (filters: period, project, type)
- GET /api/v1/analytics/team-activity/ — team activiteit ranking
- GET /api/v1/analytics/content-types/ — breakdown per type
- GET /api/v1/analytics/trends/?range=month — tijdreeks
- GET /api/v1/analytics/export/?format=csv — CSV export

[files to create]
- src/analytics/ — nieuwe Django app
- src/analytics/aggregation.py — aggregatie logica
- src/analytics/tasks.py — Celery refresh taak
- tests/test_analytics/
```

### Research

```
/spec-kitty.research feature=B65-content-analytics-dashboard

Onderzoek de volgende punten:

1. Welke content generation models bestaan er? Check src/generative/models.py voor GenerationRequest en gerelateerde models.
2. Welke status-velden gebruiken content items? (generated, approved, published, shared)
3. Hoeveel content records zijn er in productie? (voor performance schatting)
4. Hoe is Redis geconfigureerd? Check Django settings voor CACHES.
5. Bestaan er al analytics/reporting endpoints in de API?
```
