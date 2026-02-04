# Research Notes: User Navigation State (Feature B41)

## Architecture Decisions

### 1. Polymorphic Relationships
**Decision**: Use Django `GenericForeignKey` (ContentType + Object ID).
**Rationale**:
- Provides native Refer ential Integrity (cascading deletes via GenericRelation if configured, or cleanup hooks).
- Allows linking to *any* future module (Projects, Squads, Settings) without schema changes.
- Core-App remains agnostic of the downstream models.

### 2. Deep Permission Checking (The "Stale Link" Problem)
**Challenge**: How to check `has_perm` on 50 items of mixed types (Project, Match, Player) efficiently?
**Decision**: **Batch-Group-Fetch Pattern**.
1. Retrieve 50 `UserRecent` records.
2. Group `object_id`s by `content_type`.
3. Perform bulk reads: `Model.objects.filter(id__in=ids)` for each type.
4. Map back to navigation items.
5. Iterate and check permissions (using common permission backend).
**Trade-off**: Requires ~1 query per unique ContentType involved. For 50 items, usually <5 queries. Much better than N+1.

### 3. Storage Guards (Hybrid Cap)
**Decision**: Max 50 items per user. FIFO.
**Implementation**:
- On `save()` of a new `UserRecent`:
  - Check `UserRecent.objects.filter(user=owner).count()`.
  - If >= 50, delete `order_by('last_seen_at').first()`.
- **Concurrency**: Acceptable race condition for "Recents". Exact strictness not required (51 items is fine, 500 is not).

### 4. API Namespace
**Decision**: `/api/v1/navigation/recents/` & `/api/v1/navigation/favorites/`.
**Rationale**: Keeps `users` app clean. Treats "Navigation" as a distinct domain context.

## Integrations
- **Authentication**: Standard DRF Token/Session.
- **Permissions**: Relies on `django.contrib.contenttypes`.

## Dependencies
- `django.contrib.contenttypes` (Standard).
- No new external packages required.
