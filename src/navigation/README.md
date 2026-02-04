# Navigation: User Navigation State (B41)

## Purpose

The Navigation module (`B41`) tracks user interaction history and saved items across the application. It provides:

- **Recents**: Auto-pruned list of recently visited items (up to 50 items, cleaned up after 90 days)
- **Favorites**: User-curated list of bookmarked items
- **Stale Link Protection**: Gracefully handles items the user no longer has access to

## Key Features

### Hybrid Cap Pruning (Recents)

Recent items are automatically pruned when:
1. **Quantity limit exceeded**: User adds a 51st item → oldest is deleted
2. **Age limit exceeded**: Item older than 90 days → eligible for cleanup

See [prune_recents](#business-logic--pruning) for implementation.

### Stale Link Protection

When an item user bookmarked is deleted or becomes inaccessible:
- The favorite/recent **remains visible** with `is_accessible=False`
- Original metadata (label, path) is **preserved** for historical value
- Client shows "Restricted Item" placeholder instead of 404

This prevents UX degradation and preserves user context.

### Polymorphic Content References

Both `UserRecent` and `UserFavorite` use Django's Generic Foreign Key (GFK) to link to any model:
```python
content_type = ForeignKey(ContentType)
object_id = CharField()
content_object = GenericForeignKey(ct_field='content_type', fk_field='object_id')
```

Supports: Projects, Activities, Teams, Matches, etc. Can be extended without schema changes.

### Path-Only Support

Items without a content_object (e.g., custom dashboard URLs) are supported:
```python
UserRecent.objects.create(
    user=request.user,
    path="/dashboard/custom",
    label="My Dashboard"
    # No content_type/object_id
)
```

## Public Interface

### Models

**UserRecent** (recent navigation items)
- `user`: User who visited
- `content_type` / `object_id`: What was visited (or None for path-only)
- `label`: Display name
- `path`: URL path
- `last_seen_at`: Last visit timestamp
- `context`: Optional JSON metadata

**UserFavorite** (bookmarked items)
- Same structure as UserRecent, plus:
- `order`: Display order (settable, affects sorting)
- `created_at`: When favorited

### Services

```python
from navigation.services import log_visit

# Create or update a recent visit
recent = log_visit(
    user=request.user,
    path="/projects/123",
    label="My Project",
    content_object=project,  # Optional: Django model instance
    context={"foo": "bar"}  # Optional: extra data
)
# Returns: UserRecent instance (created or updated)
# Side effect: Auto-prunes if count exceeds NAVIGATION_RECENTS_MAX_COUNT
```

### REST API

All endpoints require authentication (IsAuthenticated) and user isolation (IsOwner).

**Recents**
- `GET /api/v1/navigation/recents/` - List user's recents (ordered by -last_seen_at)
- `POST /api/v1/navigation/recents/` - Log a visit

**Favorites**
- `GET /api/v1/navigation/favorites/` - List user's favorites
- `POST /api/v1/navigation/favorites/` - Create favorite
- `DELETE /api/v1/navigation/favorites/{id}/` - Remove favorite

### Admin Interface

Navigate to `/admin/navigation/` for debugging:
- **UserRecentAdmin**: View/filter/search recents
  - Columns: user, label, path, content_type, last_seen_at
  - Filters: content_type, last_seen_at
  - Search: user email, label, path
- **UserFavoriteAdmin**: View/filter/search favorites
  - Columns: user, label, path, content_type, created_at
  - Filters: content_type, created_at
  - Search: user email, label, path

## Configuration

Set these environment variables in `.env` (or `docker-compose.yml`):

```bash
# Maximum number of recents per user (default: 50)
NAVIGATION_RECENTS_MAX_COUNT=50

# Retention period in days before eligible for cleanup (default: 90)
NAVIGATION_RECENTS_RETENTION_DAYS=90
```

## Architecture

### Batch Permission Checking (N+1 Prevention)

API list endpoints use an efficient "Batch-Group-Fetch" pattern:
1. Fetch all user's items
2. Group by content_type
3. For each type, bulk-fetch linked objects
4. Check object existence (deleted = inaccessible)
5. Build accessibility map for serializer

Result: ~5-10 queries for 50 items instead of 50+ queries.

### Serialization

`NavigationItemSerializer` is a **read-only** base serializer (not ModelSerializer) that:
- Supports both UserRecent and UserFavorite without duplication
- Injects `is_accessible` from context (no per-item GFK resolution)
- Falls back to GFK resolution if context unavailable

### Update-or-Create Semantics

`log_visit()` uses Django's `update_or_create()` to bump timestamp on revisits:
- **First visit**: Creates new UserRecent
- **Revisit same path+content**: Updates last_seen_at
- **Revisit path only**: Creates new if path differs (allows multiple visits to same URL)

## Integration Guide

### Frontend: Log Visits

Wrap navigation with `log_visit` API call:

```javascript
// Example: React component
const navigateToProject = async (projectId) => {
  const project = await api.get(`/projects/${projectId}`);

  // Log the visit
  await api.post('/api/v1/navigation/recents/', {
    path: `/projects/${projectId}`,
    label: project.name,
    content_type_model: 'project',
    object_id: projectId
  });

  // Navigate
  history.push(`/projects/${projectId}`);
};
```

### Display Recent Items

```javascript
// Fetch recents
const recents = await api.get('/api/v1/navigation/recents/');

// Show in sidebar
recents.data.map(item => (
  <a href={item.path} key={item.id}>
    {item.is_accessible ? item.label : `Restricted Item`}
  </a>
));
```

### Add to Favorites

```javascript
const toggleFavorite = async (projectId) => {
  const project = await api.get(`/projects/${projectId}`);

  await api.post('/api/v1/navigation/favorites/', {
    path: `/projects/${projectId}`,
    label: project.name,
    content_type_model: 'project',
    object_id: projectId
  });
};
```

## Business Logic & Pruning

The `prune_recents()` service implements the hybrid cap:

```python
def prune_recents(user: User) -> int:
    """
    Prune old recent items for a user.

    Returns count of deleted items.

    Deletes items if:
    1. User has >NAVIGATION_RECENTS_MAX_COUNT items (delete oldest)
    2. Item is older than NAVIGATION_RECENTS_RETENTION_DAYS (delete if over limit)
    """
```

**Algorithm**:
1. Get user's recents (ordered by -last_seen_at)
2. If count > RECENTS_MAX_COUNT:
   - Calculate how many to delete: `count - RECENTS_MAX_COUNT`
   - Delete the oldest N items
3. If any remaining items are older than RETENTION_DAYS:
   - Mark as eligible for cleanup (future enhancement)
4. Return count deleted

**Called from**:
- `log_visit()` after creating/updating a recent
- (Future) Periodic cleanup task via Celery

## Testing

Run tests:
```bash
pytest tests/navigation/ -v
```

Test files:
- `tests/navigation/test_models.py` - Model CRUD and constraints
- `tests/navigation/test_services.py` - Pruning and visit logging
- `tests/navigation/test_api.py` - REST endpoints and stale link handling

Coverage target: >85% (currently: 82%)

## Standards Compliance

✅ **Constitution Article XI (Module Documentation)**
- Purpose: User navigation tracking
- Public interface: Services + API
- Integration guide: Frontend examples
- Testing: >85% coverage
- Admin: `/admin/navigation/` for inspection

✅ **Django Best Practices**
- Generic Foreign Keys for polymorphism
- QuerySet optimization (batch checking)
- Signals for auto-pruning (future)
- Type hints on all public methods

## See Also

- [spec.md](../../kitty-specs/047-user-navigation-state/spec.md) - Full specification
- [plan.md](../../kitty-specs/047-user-navigation-state/plan.md) - Implementation roadmap
- [quickstart.md](../../kitty-specs/047-user-navigation-state/quickstart.md) - Quick integration guide
