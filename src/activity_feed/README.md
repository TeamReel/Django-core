# Activity Feed

Organisation-wide activity feed that automatically logs events for content generation, team changes, matches, and approvals — giving coaches and board members a single chronological timeline of everything happening in their club.

**Status**: Production-ready (B62)
**Dependencies**: B05 (accounts), B06 (organisations), B07 (projects), B08 (permissions)
**Module ID**: 310

## Scope

### In Scope
- Immutable event logging via Django signals (auto-logs Activity, Period, Participation changes)
- Decorator `@log_activity` for ViewSet action logging
- Async Celery task for zero-latency writes with sync fallback
- Cursor-based pagination for consistent feed ordering
- On-read aggregation: group similar events within 5-minute windows
- Unread tracking per user per organisation (FeedPosition)
- Filtering by project, verb, actor
- Retention policy with cleanup management command

### Out of Scope
- Real-time push of feed updates (WebSocket — handled by B64)
- Social media-style reactions on feed items (handled by B61)
- Cross-organisation feed visibility
- Full-text search within feed
- Frontend UI components (handled by Roadmap #30 H4)

## Key Components

### Models

**ActivityLog** (`activity_feed.models.ActivityLog`)
- Immutable event record with UUID primary key
- `actor` FK to User (nullable for system events)
- `verb` CharField with `VerbChoices` enum (9 event types)
- `target` GenericForeignKey (content_type + object_id)
- `organisation` FK (CASCADE) — org scope
- `project` FK (SET_NULL, nullable) — optional project scope
- `extra_data` JSONField for event-specific metadata
- `created_at` auto_now_add with composite indexes for fast queries

**FeedPosition** (`activity_feed.models.FeedPosition`)
- Tracks per-user/org read position for unread-count calculation
- `user` FK + `organisation` FK with unique constraint
- `last_read_at` DateTimeField — events after this are "unread"

**VerbChoices** (TextChoices enum)
- `content.created`, `content.approved`, `content.rejected`
- `member.added`, `member.confirmed`
- `match.created`, `match.lineup_set`
- `season.started`, `lineup.published`

### API Endpoints

**Feed**
- `GET /api/v1/activity-feed/` — Paginated feed (cursor-based, 20 per page)
- `GET /api/v1/activity-feed/?project={id}` — Filter by project
- `GET /api/v1/activity-feed/?verb=content.created` — Filter by verb
- `GET /api/v1/activity-feed/?actor={user_id}` — Filter by actor
- `GET /api/v1/activity-feed/?grouped=true` — Aggregated feed (5-min windows)

**Unread Tracking**
- `GET /api/v1/activity-feed/unread-count/` — Unread event count + last_read_at
- `POST /api/v1/activity-feed/mark-read/` — Mark feed as read (creates/updates FeedPosition)

### Permissions

- Authenticated users only (DRF `IsAuthenticated`)
- Org membership validated via `ActivityFeedPermission`
- Staff/superusers bypass membership check
- FeedPosition: object-level — users can only read/write their own

### Organisation Scoping

Organisation resolved from request context (in order):
1. `?organisation_id=` query parameter
2. `X-Organization-ID` header
3. User's first active membership (fallback)

## Quick Start

### Reading the Feed

```python
from rest_framework.test import APIClient

client = APIClient()
client.force_authenticate(user=user)

# Get paginated feed
response = client.get("/api/v1/activity-feed/", {"organisation_id": str(org.id)})
events = response.data["results"]

# Get unread count
response = client.get("/api/v1/activity-feed/unread-count/", {"organisation_id": str(org.id)})
print(response.data)  # {"unread_count": 5, "last_read_at": null}

# Mark as read
client.post("/api/v1/activity-feed/mark-read/", {"organisation_id": str(org.id)})
```

### Logging Events via Signals (Automatic)

Events are auto-logged when these models change:

```python
# Creating an Activity → logs "match.created"
Activity.objects.create(project=project, period=period, title="Ajax vs Feyenoord", ...)

# Creating a Participation → logs "member.added"
Participation.objects.create(activity=activity, member=member, ...)

# Creating a Period → logs "season.started"
Period.objects.create(name="Seizoen 2026/2027", organisation=org, ...)
```

### Logging Events via Decorator

```python
from activity_feed.decorators import log_activity

class ContentViewSet(ModelViewSet):
    @log_activity(verb="content.created")
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @log_activity(
        verb="content.approved",
        extra_data_fn=lambda view, req, resp: {"new_status": "approved"},
    )
    def approve(self, request, *args, **kwargs):
        ...
```

### Logging Events via Celery Task (Direct)

```python
from activity_feed.tasks import log_event

log_event.delay(
    actor_id=str(user.pk),
    verb="content.created",
    target_content_type_id=ct.pk,
    target_object_id=str(content.pk),
    organisation_id=str(org.pk),
    project_id=str(project.pk),
    extra_data={"title": "Match Highlight Video"},
)
```

## Signal Handlers

Connected via `apps.py` `ready()`:

| Model | Signal | Verb | Condition |
|-------|--------|------|-----------|
| `activities.Activity` | `post_save` | `match.created` | `created=True` only |
| `activities.Participation` | `post_save` | `member.added` | `created=True` |
| `activities.Participation` | `post_save` | `member.confirmed` | `status == "confirmed"` on update |
| `activities.Period` | `post_save` | `season.started` | `created=True` only |

All signal handlers use `_log_event_async()` which dispatches via Celery with sync fallback when the broker is unavailable.

## Celery Task

**Task**: `activity_feed.log_event`
- `bind=True`, `max_retries=3`, `default_retry_delay=5`, `acks_late=True`
- Accepts string IDs (auto-coerced by Django ORM for UUID/integer FKs)
- Retries on failure with exponential backoff

## Management Commands

### cleanup_activity_feed

Delete events older than N days (default 90):

```bash
# Preview what would be deleted
python manage.py cleanup_activity_feed --days 90 --dry-run

# Delete events older than 90 days (in 5000-record batches)
python manage.py cleanup_activity_feed --days 90

# Delete events older than 30 days
python manage.py cleanup_activity_feed --days 30
```

## Database Indexes

Composite indexes for fast feed queries:

| Index | Columns | Purpose |
|-------|---------|---------|
| `actfeed_org_created_desc` | `(organisation, -created_at)` | Main feed query |
| `actfeed_org_proj_created` | `(organisation, project, -created_at)` | Project-filtered feed |
| `actfeed_org_verb_created` | `(organisation, verb, -created_at)` | Verb-filtered feed |
| `actfeed_target_gfk` | `(target_content_type, target_object_id)` | GenericFK lookups |

## Related Modules

- **B05 (accounts)**: User model as `actor` FK
- **B06 (organisations)**: Organisation scoping + Membership for permissions
- **B07 (projects)**: Optional project-level scoping
- **B09 (audit)**: Separate compliance audit trail — B62 is user-facing timeline
- **B17 (notifications)**: Can trigger notifications from feed events (future)
- **B64 (realtime)**: WebSocket push for live feed updates (future)

## Extension Points

### Adding New Event Types

1. Add verb to `VerbChoices` in `models.py`
2. Add signal receiver in `signals.py` (or use `@log_activity` decorator)
3. No migration needed — verbs are stored as strings

### Custom Extra Data

`extra_data` JSONField is flexible — store any context:

```python
log_event.delay(
    ...,
    extra_data={
        "title": "Ajax vs Feyenoord",
        "score": {"home": 3, "away": 1},
        "goals": [{"player": "Jayden", "minute": 23}],
    },
)
```

## Testing

### Running Tests

```bash
# All activity feed tests (37 tests)
pytest src/activity_feed/tests/

# By category
pytest src/activity_feed/tests/test_models.py   # 16 model tests
pytest src/activity_feed/tests/test_api.py       # 17 API tests
pytest src/activity_feed/tests/test_signals.py   # 4 signal tests
```

### Test Settings

Tests require `CELERY_TASK_ALWAYS_EAGER=True` (configured in `config.settings.test`) so signal handlers execute synchronously without a Redis broker.

### Coverage Areas

- Models: creation, UUID PKs, ordering, indexes, constraints, `__str__`
- API: list, filtering (project/verb/actor), pagination, org isolation
- Unread: count with/without position, mark-read create/update
- Grouped: aggregation within 5-minute windows
- Auth: unauthenticated rejected, staff access, cross-org isolation
- Signals: Activity/Period/Participation create → event logged, update → no event

## Change Log

- **2026-03-19**: Initial implementation (B62 Activity Feed)
