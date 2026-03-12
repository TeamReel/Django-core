# B60: Gamification Engine

**Phase:** 14
**Status:** 📋 ROADMAP
**Module ID:** 300
**Category:** Backend (TeamReel Product Feature)

## Description

## 300. B60 – Gamification Engine

**Doel**: Team- en club-level gamification met content streaks, match readiness scores, achievements, en leaderboards om content-adoptie te stimuleren.

**Waarom TeamReel**: Core retention feature - coaches moeten gestimuleerd worden om consistent content te maken voor elke wedstrijd. Gamification drijft credits-verbruik (monetization) en club-brede adoptie.

**Wat moet er gebeuren**:
- **MatchReadiness model**:
  - Fields: match FK, team FK, score (0-100), updated_at
  - Content types tracking: completed_types (JSON array), total_required
  - Score berekening: percentage van vereiste content-types die aangemaakt zijn
  - Auto-update: triggered bij content-creatie (B34 signal)
  - Threshold levels: low (< 30%), medium (30-70%), high (> 70%), complete (100%)
- **TeamStreak model**:
  - Fields: team FK, season FK, current_streak, longest_streak, last_match_date
  - Basis-content definitie: configureerbaar per team (default: flyer + lineup + final score)
  - Streak logica: opeenvolgende wedstrijden met basis-content ≥ 100%
  - Auto-update: na match completion + content check
  - Reset: wanneer wedstrijd voorbij is zonder basis-content
- **Achievement model** (badge definitions):
  - Fields: slug, name, description, icon, category, threshold
  - Categories: content, streak, social, season, team
  - Built-in badges:
    - `first_content` — Eerste content-item gegenereerd
    - `match_ready` — 100% content voor een wedstrijd
    - `streak_3` — 3 wedstrijden streak
    - `streak_10` — 10 wedstrijden streak
    - `streak_25` — 25 wedstrijden streak (seizoen)
    - `early_bird` — Content klaar 24u voor wedstrijd
    - `season_complete` — Alle wedstrijden > 80% in een seizoen
    - `photo_pro` — Alle spelerfoto's geüpload
    - `full_squad` — Volledige selectie met assets
    - `content_machine_50` — 50 content-items gegenereerd
- **AchievementUnlock model**:
  - Fields: achievement FK, team FK, unlocked_at, unlocked_by (user)
  - Unique constraint: (achievement, team) — kan maar 1x unlocked worden
  - Notification trigger: B17 in-app + optional e-mail
- **ClubLeaderboard** (aggregated view):
  - Fields: club FK, season FK, team FK, rank, score
  - Score berekening: gemiddelde match readiness over alle wedstrijden
  - Seizoens-scope: ranking reset per seizoen
  - Auto-recalculate: dagelijkse cron of on-demand
- **ReadinessConfig model** (per team configureerbaar):
  - Fields: team FK, required_content_types (JSON array)
  - Default: `["match_flyer", "lineup_video", "final_score"]`
  - Extensible: coaches kunnen extra types toevoegen
- **Signal handlers**:
  - `post_save` op MediaItem → update MatchReadiness score
  - Match status → `completed` → evaluate streak
  - Achievement threshold check → AchievementUnlock creation
  - Unlock → Notification dispatch (B17)
- **Integration**: B39 (activities), B34 (generation), B17 (notifications), B11 (credits), B49 (analytics), B56 (match calendar)

**Scope**: 🔧 **Backend + Frontend Components**

**API Endpoints**:
- `GET /api/v1/gamification/readiness/{match_id}/` - Match readiness score + breakdown
- `GET /api/v1/gamification/streaks/` - Team streaks (filterable by team/season)
- `GET /api/v1/gamification/streaks/{team_id}/` - Single team streak detail
- `GET /api/v1/gamification/leaderboard/` - Club leaderboard (filterable by club/season)
- `GET /api/v1/gamification/achievements/` - All achievements with unlock status
- `GET /api/v1/gamification/achievements/{team_id}/` - Team's unlocked achievements
- `GET /api/v1/gamification/config/{team_id}/` - Team readiness config
- `PATCH /api/v1/gamification/config/{team_id}/` - Update readiness config (coach+)

**Frontend Components** (demo integration):
- `ProgressRing` — Circulaire SVG readiness score op match-kaart
- `StreakBadge` — Vuur-icoon met teller naast teamnaam
- `LeaderboardCard` — Club ranking tabel met progress bars
- `AchievementGrid` — Badge collectie op team/profiel pagina
- `ConfettiOverlay` — Celebration animatie bij badge-unlock (Lottie, lazy-loaded)

**Status**: 📋 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B60-gamification-engine

[feature summary]
Team and club-level gamification engine with content streaks, match readiness scores, achievements/badges, and club leaderboards to drive content adoption and retention.

[goals]
- MatchReadiness model: per-match score (0-100%) based on completed content types
- TeamStreak model: consecutive matches with baseline content complete
- Achievement model: 10 built-in badges with configurable thresholds
- AchievementUnlock model: team-level badge tracking with notification trigger
- ClubLeaderboard: seasonal ranking of teams by average readiness score
- ReadinessConfig: per-team configurable required content types
- Signal-driven auto-updates on content creation and match completion
- Frontend components: ProgressRing, StreakBadge, LeaderboardCard, AchievementGrid

[non-goals]
- Player-level gamification (focus is team/club)
- Monetary rewards or prizes
- Cross-club or federation-level leaderboards (v1)
- Real-time multiplayer challenges
- Social sharing of badges (handled by B54)

[dependencies]
- B39 (activities — match data)
- B34 (content generation — triggers readiness update)
- B17 (notifications — achievement unlock alerts)
- B11 (credits — gamification drives credit usage)
- B49 (analytics — track gamification engagement)
- B56 (match calendar — match schedule for streaks)

[scope]
Backend: Django app (gamification), REST API, pytest tests, README
Frontend: Demo page + reusable components (ProgressRing, StreakBadge, LeaderboardCard, AchievementGrid)
```

## Notes

**Design Decisions:**
- Gamification is team-level, not player-level (per product decision)
- Streaks use configurable "baseline content" per team (not hardcoded)
- Leaderboard resets per season to keep competition fresh
- Achievements are unlocked once and never revoked
- All animations respect `prefers-reduced-motion`
- Dark mode compatible via CSS variables

**Related Analysis:** See `documents/05-demo/plans/mobile-ux-gamification-analyse.md` for full UX analysis and roadmap context.

---

## Delivery Checklist

- [ ] **Migrations**: Applied to Railway (production-safe)
- [ ] **Seed Data**: Fixtures/factories created for testing
- [ ] **Admin**: Registered & configured in Django Admin
- [ ] **API**: Endpoints tested in Swagger/OpenAPI
- [ ] **Demo Integration**: Visible in demo app (if applicable)
- [ ] **Manual Test**: Test file completed in `documents/08-testing/manual-tests/`
- [ ] **Documentation**: README updated with usage examples
