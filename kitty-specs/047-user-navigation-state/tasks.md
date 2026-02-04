# Tasks: User Navigation State (B41)

## Work Package 1: Foundations & Models (P1)
**Goal**: Establish the `navigation` app and core data structures.
**Prerequisite**: None
**Success**: `UserRecent` and `UserFavorite` tables created with standard Django GFK.

- [ ] **T001**: Scaffold `src/core/navigation` module and register in `settings.INSTALLED_APPS` (behind B41 flag if needed).
- [ ] **T002**: Implement `NavigationBase` abstract model (user, content_type, object_id, label, path).
- [ ] **T003**: Implement `UserRecent` model with `last_seen_at` and UniqueTogether constraints.
- [ ] **T004**: Implement `UserFavorite` model with `created_at` ordering.
- [ ] **T005**: Create migration (0001_initial) and run it.
- [ ] **T006**: Write tests: `tests/navigation/test_models.py` (CRUD, uniqueness).

## Work Package 2: Business Logic & Guardrails (P1)
**Goal**: Implement the "Hybrid Cap" pruning logic and data integrity rules.
**Prerequisite**: WP1
**Success**: DB never exceeds 50 recent items per user.

- [ ] **T007**: Implement `prune_recents` service method (Time + Quantity limits).
- [ ] **T008**: Hook pruning logic into `UserRecent.save()` or a signal receiver.
- [ ] **T009**: Implement `log_visit` service method (handling update-or-create logic efficiently).
- [ ] **T010**: Write tests: `test_services.py` verify 51st item deletes 1st item.

## Work Package 3: API & Security (P1)
**Goal**: Expose endpoints with "Stale Link" protection.
**Prerequisite**: WP2
**Success**: Endpoints return sanitized data for inaccessible objects.

- [ ] **T011**: Implement `NavigationItemSerializer` with `is_accessible` logic (GFK resolution).
- [ ] **T012**: Implement `RecentViewSet` (List/Create) with Batch-Group-Fetch permission checking.
- [ ] **T013**: Implement `FavoriteViewSet` (List/Create/Destroy).
- [ ] **T014**: Write tests: `test_api.py` (Mock permissions, verify "Restricted Item" output).

## Work Package 4: System Integration (P2)
**Goal**: Ensure clean integration with global settings and admin.
**Prerequisite**: WP3

- [ ] **T015**: Add Admin Interface (`admin.py`) for debugging recents/favorites.
- [ ] **T016**: Add `NAVIGATION_*` settings to `django.conf.settings` with defaults (50, 90).
- [ ] **T017**: Doc update: Add `src/core/navigation/README.md` per Constitution requirements.
