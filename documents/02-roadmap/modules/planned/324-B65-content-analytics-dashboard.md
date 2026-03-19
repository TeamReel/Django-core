# B65: Content Analytics Dashboard

**Priority:** ⏳ Later
**Phase:** 16
**Status:** 📋 ROADMAP
**Module ID:** 324
**Category:** Backend (TeamReel Product Feature)

## Description

## 306. B65 – Content Analytics Dashboard

**Doel**: Aggregatie-endpoints voor content performance, team-activiteit en engagement metrics — zodat clubbestuur en coaches inzicht krijgen in contentgebruik per team, seizoen en periode.

**Waarom TeamReel**: Clubs investeren credits in content-generatie maar hebben geen inzicht in wat ze produceren. Analytics toont ROI ("dit seizoen 47 video's gemaakt, 12 gedeeld"), identificeert inactieve teams, en drijft upsell naar premium tiers. Verschilt van B49 (Feature Usage Analytics) dat interne product analytics is — B65 is user-facing content analytics.

**Wat moet er gebeuren**:
- **ContentAnalytics materialized view / model**:
  - Aggregatie per: organisatie, project, periode, content_type
  - Metrics: total_generated, total_approved, total_rejected, total_shared
  - Time series: per week, per maand
  - Auto-refresh: Celery periodic task (dagelijks of na batch-generatie)
- **Team Activity metrics**:
  - Meest actieve teams (content volume)
  - Inactieve teams (geen content > 14 dagen)
  - Content per wedstrijd ratio
  - Gemiddelde goedkeuringstijd
- **Content Type breakdown**:
  - Per type: lineup_video, match_flyer, score_graphic, highlight_reel
  - Populariteit ranking
  - Success rate (approved / total)
- **Engagement metrics** (optioneel, afhankelijk van B61):
  - Reactions per content item
  - Comments per content item
  - Most engaged content (meeste reacties)
- **Export**:
  - CSV download van alle rapportage data
  - Date range filter: week, maand, seizoen, custom
  - Organisatie-level en project-level scope
- **Caching**:
  - Redis cache op aggregatie queries (TTL: 1 uur)
  - Cache invalidatie bij nieuwe content-generatie
- **Integration**: B34 (content generatie data), B61 (reactions/comments counts), B25 (cache)

**Scope**: 🔧 **Backend Only** (Django app + REST API + Celery tasks + tests + README)

**API Endpoints**:
- `GET /api/v1/analytics/content-stats/` — Content metrics (filters: period, project, type)
- `GET /api/v1/analytics/team-activity/` — Team activiteit ranking
- `GET /api/v1/analytics/content-types/` — Breakdown per content type
- `GET /api/v1/analytics/trends/?range=month` — Tijdreeks data
- `GET /api/v1/analytics/export/?format=csv&range=season` — CSV export

**Status**: 📋 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B65-content-analytics-dashboard

[feature summary]
User-facing content analytics with aggregation endpoints for content performance, team activity, and engagement metrics per organisation/project/season.

[goals]
- ContentAnalytics materialized view with auto-refresh via Celery
- Aggregation per org, project, period, content_type
- Team activity metrics: most active, inactive, content-per-match ratio
- Content type breakdown with success rates
- Time series data: weekly, monthly trends
- CSV export with date range filters
- Redis caching with smart invalidation

[non-goals]
- Real-time analytics (batch aggregation is sufficient)
- Third-party analytics integration (Mixpanel, GA)
- Individual user behavior tracking (that's B49)
- Frontend chart rendering (Roadmap #30 responsibility)

[dependencies]
- B34 (content generation — primary data source)
- B61 (comments/reactions — engagement data, optional)
- B25 (cache — Redis for aggregation caching)
- Celery Beat (periodic aggregation refresh)

[scope]
Backend only — Django app, REST API, Celery tasks, pytest tests, README
Frontend chart integration via Roadmap #30 H5
```
