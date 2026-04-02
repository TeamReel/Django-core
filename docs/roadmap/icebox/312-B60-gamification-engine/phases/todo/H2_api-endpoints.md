# H2 — API Endpoints

> **Effort:** ~2 uur | **Impact:** Frontend kan gamification data ophalen

## Doel

DRF ViewSets en serializers voor alle gamification endpoints. Org-scoped, read-only behalve ReadinessConfig.

## To do

- [ ] URL configuratie: `api/v1/gamification/` prefix
- [ ] **MatchReadiness endpoint:**
  - `GET /api/v1/gamification/readiness/{match_id}/` — score + breakdown per match
  - `GET /api/v1/gamification/readiness/?team={team_id}` — lijst van readiness scores per team
  - Serializer: `score`, `completed_types`, `total_required`, `match` (nested summary), `team`
- [ ] **TeamStreak endpoint:**
  - `GET /api/v1/gamification/streaks/` — alle team streaks (filterable: team, season)
  - `GET /api/v1/gamification/streaks/{team_id}/` — detail per team
  - Serializer: `current_streak`, `longest_streak`, `last_match_date`, `team`, `season`
- [ ] **ClubLeaderboard endpoint:**
  - `GET /api/v1/gamification/leaderboard/` — filter: organisation, season
  - Serializer: `rank`, `team` (nested: name, logo), `average_score`, `total_matches`
- [ ] **Achievements endpoint:**
  - `GET /api/v1/gamification/achievements/` — alle achievements met unlock status
  - `GET /api/v1/gamification/achievements/{team_id}/` — team's unlocked achievements
  - Serializer: `slug`, `name`, `description`, `icon`, `category`, `threshold`, `is_unlocked`, `unlocked_at`
- [ ] **ReadinessConfig endpoint:**
  - `GET /api/v1/gamification/config/{team_id}/` — team config
  - `PATCH /api/v1/gamification/config/{team_id}/` — update (coach+ permission)
  - Serializer: `required_content_types`, `team`
- [ ] Org-scoping: alle querysets filteren op `request.user` organisatie
- [ ] Permission classes: `IsAuthenticated` + org-membership check
- [ ] ReadinessConfig PATCH: coach of admin role vereist

## Done criteria

- [ ] Alle endpoints bereikbaar en retourneren correcte data
- [ ] Org-scoping werkt (geen cross-org data leaks)
- [ ] Permission checks correct (config PATCH alleen voor coach+)
- [ ] Swagger/OpenAPI documentatie gegenereerd
- [ ] Response times < 200ms voor list endpoints
