# T04: Player Statistics

**Phase:** 14
**Status:** 📋 ROADMAP
**Module ID:** 297
**Category:** TeamReel (Product-Specific)

## Description

## 297. T04 – Player Statistics

**Doel**: Player en team statistieken tracking met seizoensaggregaties.

**Waarom TeamReel**: Core feature - stats drive content (top scorers, man of the match).

**Wat moet er gebeuren**:
- **PlayerStats model** (per match):
  - Fields: player FK, match FK, minutes_played
  - Goals: goals, assists, own_goals
  - Cards: yellow_cards, red_cards
  - Saves: saves, clean_sheet (keeper)
  - Rating: match_rating (1-10)
- **SeasonStats model** (aggregated):
  - Fields: player FK, season FK
  - Totals: matches_played, goals, assists, cards
  - Averages: avg_rating, minutes_per_game
  - Auto-calculated on match stats update
- **TeamStats model** (aggregated):
  - Fields: team FK, season FK
  - Record: wins, draws, losses, points
  - Goals: goals_for, goals_against, goal_difference
  - Form: last_5_results
- **MatchEvent model**:
  - Fields: match FK, player FK, event_type, minute
  - Types: goal, assist, yellow_card, red_card, substitution_in/out
  - Assists: related_player (for assist on goal)
- **Leaderboards**:
  - Top scorers
  - Top assists
  - Most clean sheets
  - Fair play (least cards)
- **Content generation hooks**:
  - "Player of the month" data
  - "Top scorer" graphics data
  - Season summary stats
- **Sport-agnostic base**:
  - Extensible for different sports
  - Sport-specific stat fields (B32 integration)
- **Integration**: T03 (matches), B32 (sport config), B34 (generation)

**Scope**: 🔧 **Backend Only** (Django app + REST API + tests + README)

**API Endpoints**:
- `GET /api/v1/players/{id}/stats/` - Player stats (season/career)
- `GET /api/v1/matches/{id}/stats/` - Match stats (all players)
- `POST /api/v1/matches/{id}/events/` - Record match event
- `GET /api/v1/teams/{id}/stats/` - Team stats
- `GET /api/v1/leaderboards/` - Leaderboards

**Status**: 📋 ROADMAP

## Notes
<!-- Add progress notes here -->
