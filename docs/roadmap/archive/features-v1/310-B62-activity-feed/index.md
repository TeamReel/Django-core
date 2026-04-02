# B62: Activity Feed

**Priority:** 🔥 Bouwen
**Phase:** 15
**Status:** ✅ IMPLEMENTED
**Module ID:** 310
**Category:** Backend (TeamReel Product Feature)

## Description

## 303. B62 – Activity Feed

**Doel**: Organisatie-breed activity feed dat automatisch events logt bij content-generatie, teamwijzigingen, wedstrijden en goedkeuringen — zodat coaches en bestuur in één timeline zien wat er gebeurt.

**Waarom TeamReel**: Core engagement feature — clubs met meerdere teams missen overzicht. Een activity feed toont alle relevante acties chronologisch, vergroot betrokkenheid en vermindert FOMO. Stimuleert terugkeerbezoeken.

**Wat moet er gebeuren**:
- **ActivityLog model**:
  - Fields: actor (User FK), verb (CharField), target_content_type, target_object_id
  - Context: organisation FK, project FK (optioneel)
  - Metadata: extra_data (JSONField) — bevat context-specifieke info
  - Timestamps: created_at
  - Index: (organisation, created_at DESC) voor snelle timeline queries
- **Event types (verb registry)**:
  - `content.created` — "Brian heeft een line-up video aangemaakt"
  - `content.approved` — "Dennis heeft de wedstrijdflyer goedgekeurd"
  - `content.rejected` — "Coach heeft de video afgekeurd met feedback"
  - `member.added` — "Jayden is toegevoegd aan Heren 1"
  - `member.confirmed` — "Jayden heeft zijn beschikbaarheid bevestigd"
  - `match.created` — "Wedstrijd vs Ajax gepland op 22 maart"
  - `match.lineup_set` — "Line-up voor Ajax - Thuis is ingesteld"
  - `season.started` — "Seizoen 2025/2026 is gestart"
  - `lineup.published` — "Line-up is gepubliceerd naar spelers"
- **Signal-based logging**:
  - Django signals op key model changes (post_save, post_delete)
  - Decorator `@log_activity(verb="content.created")` voor ViewSet actions
  - Celery task voor async logging (geen impact op request latency)
- **Feed API**:
  - Paginatie: cursor-based (niet offset) voor consistente feeds
  - Filters: per project, per event type, per actor
  - Scope: organisatie-niveau (alle projecten) of project-niveau
- **Aggregatie**:
  - Groepering van gelijksoortige events: "3 spelers bevestigd" i.p.v. 3 losse items
  - Time-window grouping: events binnen 5 min van zelfde type samenvoegen
- **Retention**:
  - Events ouder dan 90 dagen archiveren (soft)
  - Management command: `cleanup_activity_feed --days 90`
- **Integration**: B09 (audit), B17 (notifications), B08 (permissions)

**Scope**: 🔧 **Backend Only** (Django app + REST API + tests + README)

**API Endpoints**:
- `GET /api/v1/activity-feed/` — Gepagineerde feed (cursor-based), scope op org
- `GET /api/v1/activity-feed/?project={id}` — Feed gefilterd op project
- `GET /api/v1/activity-feed/?verb=content.created` — Feed gefilterd op type
- `GET /api/v1/activity-feed/unread-count/` — Aantal ongelezen events

**Status**: ✅ IMPLEMENTED

**Specify Prompt**:
```
/spec-kitty.specify feature=B62-activity-feed

[feature summary]
Organisation-wide activity feed with signal-based event logging for content generation, team changes, matches, and approvals.

[goals]
- ActivityLog model with actor, verb, target (GenericFK), org/project scope
- Signal-based logging via Django signals + decorator
- Async logging via Celery task (no request latency impact)
- Cursor-based pagination for consistent feed ordering
- Event aggregation: group similar events within 5-min windows
- 9+ event types covering content, members, matches, seasons
- Retention policy with cleanup management command

[non-goals]
- Real-time push of feed updates (handled by B63)
- Social media-style "like" on feed items (handled by B61)
- Cross-organisation feed visibility
- Full-text search within feed

[dependencies]
- B09 (audit logging infrastructure)
- B17 (notification triggers from feed events)
- B08 (permissions — org/project scoping)

[scope]
Backend only — Django app, REST API, pytest tests, README
Frontend integration via Roadmap #30 H4
```
