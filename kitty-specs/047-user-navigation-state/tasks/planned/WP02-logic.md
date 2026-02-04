---
work_package_id: WP02
subtasks:
  - T007
  - T008
  - T009
  - T010
lane: planned
history:
  - { date: "2026-02-04", action: "created" }
---

# Work Package 02: Business Logic & Guardrails

## Objective
Implement the critical "Hybrid Cap" logic (50 items max) to prevent database bloat and ensure `update_or_create` semantics for navigation logging.

## Context
"Digital Hygiene" is a P1 requirement. We chose Option A (Hybrid Cap) during clarification.
Logic must handle high-concurrency responsibly (e.g. 51 items temporarily is fine, but it should self-correct).

## Tasks

### T007: Pruning Service
Create `services.py` in `src/core/navigation`.
- Function: `prune_recents(user) -> deleted_count`
- Implementation:
    1. Count `UserRecent.objects.filter(user=user)`.
    2. If > 50 (from settings): Identify IDs to keep (slice `[:50]`).
    3. Delete `exclude(id__in=keep_ids)`.
- Use a setting `NAVIGATION_RECENTS_MAX_COUNT = 50`.

### T008: Pruning Trigger
Integrate pruning.
- Option A: Signal `post_save`.
- Option B: Explicit service call. **Decision**: Use Explicit Service Call in `log_visit` for better control/testing.
- (Optional): Add `retention_days` check (e.g., delete items seen < 90 days ago).

### T009: Log Visit Service
- Function: `log_visit(user, path, label, content_object=None, context=None) -> UserRecent`
- Logic:
    1. **Validate**: Ensure `path` starts with `/`. Raise `ValidationError` if absolute URL or malformed.
    2. `update_or_create` on `(user, content_type, object_id)` (if object provided).
    3. Fallback: `update_or_create` on `(user, path)` if strictly path-based.
    4. Trigger `prune_recents(user)`.

### T010: Tests
Create `tests/navigation/test_services.py`.
- **Test Cap**:
    1. Create 50 items for user.
    2. Call `log_visit` for item #51.
    3. Assert `UserRecent.count()` == 50.
    4. Assert oldest item is gone.
- **Test Update**:
    1. Visit Item A (Time T1).
    2. Visit Item B (Time T2).
    3. Visit Item A (Time T3).
    4. Assert order is A(T3), B(T2).

## Definition of Done
- [ ] Database never grows beyond Limit+1 items per user.
- [ ] Visiting existing item updates timestamp (bumps to top).
- [ ] Tests verify pruning verified.
