---
work_package_id: WP03
subtasks:
  - T011
  - T012
  - T013
  - T014
lane: planned
history:
  - { date: "2026-02-04", action: "created" }
---

# Work Package 03: API & Security

## Objective
Implement REST endpoints that securely return navigation data. Crucially, implement the "Stale Link Protection" logic which sanitizes items the user can no longer access.

## Context
We chose the **Batch-Group-Fetch** pattern to verify permissions.
- Iterate list of 50 items.
- Group by `content_type`.
- Fetch actual objects.
- Check `has_perm(user)`.
- If fail: Set `is_accessible=False`, Label="Restricted Item".

## Tasks

### T011: Serializers
In `serializers.py`:
- `NavigationItemSerializer`:
    - Fields: `id`, `path`, `label`, `is_accessible` (ReadOnly), `timestamp`.
    - `to_representation`: Handle the logic where we might need to inject `is_accessible` from the ViewSet context (to avoid N+1 inside serializer).

### T012: RecentViewSet
In `views.py`:
- `RecentViewSet(ModelViewSet)`:
    - Path: `/api/v1/navigation/recents/`
    - Method `list`:
        1. Query `UserRecent.objects.filter(user=request.user)[:50]`.
        2. Perform **Batch Permission Check**:
            - Collect all objects.
            - Run `user.has_perm(obj)`.
            - Construct a map: `{obj_id: bool}`.
        3. Pass map to serializer context.
    - Method `create` (Log Visit): Calls `services.log_visit`.

### T013: FavoriteViewSet
In `views.py`:
- `FavoriteViewSet(ModelViewSet)`:
    - Path: `/api/v1/navigation/favorites/`
    - Standard CRUD.
    - Applies same **Batch Permission Check** on list.

### T014: API Tests
Create `tests/navigation/test_api.py`.
- **Test Stale**:
    1. User A has favorite Project X.
    2. Admin revokes User A access to Project X.
    3. GET /favorites/ -> Assert `is_accessible=False`, `label="Restricted Item"`.
- **Test Deleted Content**:
    1. Create favorite for Object Y.
    2. Hard delete Object Y.
    3. GET /favorites/ -> Assert item is handled safely (is_accessible=False OR filtered out, depending on final GFK behavior).
- **Test N+1**:
    1. Create 50 favorites of different types.
    2. Assert query count is small (e.g., < 10), not 50+.

## Definition of Done
- [ ] Endpoints secure (Request.User filter).
- [ ] Stale links explicitly handled (not hidden, but sanitized).
- [ ] Performance acceptable (no N+1).
