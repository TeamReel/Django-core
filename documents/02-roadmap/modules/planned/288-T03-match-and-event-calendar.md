# T03: Match & Event Calendar

**Phase:** 14
**Status:** 📋 ROADMAP
**Module ID:** 296
**Category:** TeamReel (Product-Specific)

## Description

## 296. T03 – Match & Event Calendar

**Doel**: Sports calendar met wedstrijden, trainingen, en club events.

**Waarom TeamReel**: Core feature - content is wedstrijd-gedreven (pre/during/post-match).

**Wat moet er gebeuren**:
- **Match model**:
  - Fields: home_team, away_team, date, time, location
  - Competition: league, cup, friendly
  - Status: scheduled, live, completed, cancelled, postponed
  - Score: home_score, away_score
- **Event model**:
  - Fields: title, type, date, time, duration, location
  - Types: training, meeting, social, other
  - Recurrence: weekly, biweekly, custom
- **Season model**:
  - Fields: name, start_date, end_date, competition
  - Team roster per season
  - Statistics aggregation
- **Calendar views**:
  - Month/week/day views
  - Filter by team, competition, event type
  - iCal export (.ics)
- **Match workflow integration**:
  - Pre-match: trigger content generation (line-up)
  - During-match: live updates (goals, substitutions)
  - Post-match: result content, statistics
- **External sync** (future):
  - Import from federation APIs (KNVB, etc.)
  - Sync with Google Calendar
- **Notifications** (B17):
  - Match reminders
  - Lineup deadline reminders
  - Result notifications
- **Integration**: B39 (activities), B17 (notifications), B34 (generation)

**Scope**: 🔧 **Backend Only** (Django app + REST API + tests + README)

**API Endpoints**:
- `GET /api/v1/matches/` - List matches
- `POST /api/v1/matches/` - Create match
- `PATCH /api/v1/matches/{id}/` - Update match (score, status)
- `GET /api/v1/events/` - List events
- `POST /api/v1/events/` - Create event
- `GET /api/v1/calendar/` - Calendar view (combined)
- `GET /api/v1/calendar/export/` - iCal export

**Status**: 📋 ROADMAP

## Notes
<!-- Add progress notes here -->
