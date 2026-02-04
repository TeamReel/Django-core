# Manual Test: B41 User Navigation State (Recents & Favorites)

**Module:** #047 B41 — User Navigation State (Recents & Favorites)
**Status:** ✅ Implementation Complete | 📋 Testing TODO
**Feature Branch:** `047-user-navigation-state` (merged)
**Test Environment:** Development/Staging

---

## Test Objectives

Verify that the user navigation state system:
1. Tracks recent visits with automatic pruning (max 50 items, 90 days)
2. Manages user favorites with ordering
3. Uses polymorphic GFK for flexible content references
4. Implements stale link protection for inaccessible items
5. Supports path-only items (no content_object)
6. Enforces user isolation (users only see their own data)

---

## Prerequisites

- [ ] Migrations applied: `python manage.py migrate navigation`
- [ ] Settings configured:
  - [ ] `NAVIGATION_RECENTS_MAX_COUNT = 50`
  - [ ] `NAVIGATION_RECENTS_RETENTION_DAYS = 90`
- [ ] Test user created and authenticated
- [ ] Multiple Projects/Teams/Matches exist for testing
- [ ] Second test user (for isolation tests)

---

## Test Scenarios

### 1. Recents: Basic Operations

#### 1.1 Log a Visit
- [ ] POST `/api/v1/navigation/recents/`
  ```json
  {
    "path": "/projects/123",
    "label": "My Project",
    "content_type": "projects.project",
    "object_id": "{project_uuid}"
  }
  ```
- [ ] Verify 201 response with recent ID
- [ ] Verify `last_seen_at` timestamp set

#### 1.2 Update Existing Visit
- [ ] POST same path again
- [ ] Verify existing record updated (not duplicated)
- [ ] Verify `last_seen_at` updated to current time

#### 1.3 List Recents
- [ ] GET `/api/v1/navigation/recents/`
- [ ] Verify ordered by `-last_seen_at` (most recent first)
- [ ] Verify response includes:
  - `id`
  - `path`
  - `label`
  - `content_type`
  - `object_id`
  - `last_seen_at`
  - `context` (if set)

#### 1.4 Path-Only Recent (No Content Object)
- [ ] POST `/api/v1/navigation/recents/`
  ```json
  {
    "path": "/dashboard/custom",
    "label": "Custom Dashboard"
  }
  ```
- [ ] Verify creates without content_type/object_id
- [ ] Verify appears in list correctly

---

### 2. Recents: Hybrid Cap Pruning

#### 2.1 Quantity Limit (Max 50)
- [ ] Create 50 recent items
- [ ] Create 51st item
- [ ] Verify oldest item automatically deleted
- [ ] Verify count stays at 50

#### 2.2 Age Limit (90 Days)
- [ ] Create old record (manually set `last_seen_at` > 90 days ago via admin)
- [ ] Trigger pruning (via scheduled task or management command)
- [ ] Verify old items removed
- [ ] Verify recent items retained

---

### 3. Favorites: Basic Operations

#### 3.1 Create Favorite
- [ ] POST `/api/v1/navigation/favorites/`
  ```json
  {
    "path": "/projects/456",
    "label": "Favorite Project",
    "content_type": "projects.project",
    "object_id": "{project_uuid}"
  }
  ```
- [ ] Verify 201 response
- [ ] Verify `created_at` timestamp set
- [ ] Verify `order` assigned (last position)

#### 3.2 List Favorites
- [ ] GET `/api/v1/navigation/favorites/`
- [ ] Verify ordered by `order` field
- [ ] Verify response structure similar to recents

#### 3.3 Delete Favorite
- [ ] DELETE `/api/v1/navigation/favorites/{id}/`
- [ ] Verify 204 response
- [ ] Verify no longer in list

#### 3.4 Reorder Favorites
- [ ] PATCH `/api/v1/navigation/favorites/{id}/`
  ```json
  {
    "order": 1
  }
  ```
- [ ] Verify order updated
- [ ] Verify list reflects new order

---

### 4. Stale Link Protection

#### 4.1 Delete Referenced Object
- [ ] Create favorite pointing to a Project
- [ ] Delete the Project
- [ ] GET favorites list
- [ ] Verify favorite still visible with `is_accessible: false`
- [ ] Verify original `label` and `path` preserved

#### 4.2 Permission Revoked
- [ ] Create favorite for project user has access to
- [ ] Remove user's access to that project
- [ ] GET favorites list
- [ ] Verify `is_accessible: false`
- [ ] Verify item marked as "Restricted" (or similar)

#### 4.3 Stale Link Display
- [ ] Verify client handles `is_accessible: false`:
  - Shows placeholder instead of 404
  - Displays original label for context
  - Offers to remove stale link

---

### 5. User Isolation

#### 5.1 Users See Only Own Data
- [ ] Login as User A
- [ ] Create some recents and favorites
- [ ] Login as User B
- [ ] GET recents and favorites
- [ ] Verify User B sees ONLY their own items
- [ ] Verify User A's items NOT visible

#### 5.2 Cannot Access Other User's Items
- [ ] Login as User A
- [ ] Note User B's favorite ID
- [ ] Try GET `/api/v1/navigation/favorites/{user_b_id}/`
- [ ] Verify 404 (not 403, to avoid leaking existence)

---

### 6. API Edge Cases

#### 6.1 Empty Lists
- [ ] New user with no recents/favorites
- [ ] GET both endpoints
- [ ] Verify empty arrays returned (not errors)

#### 6.2 Invalid Content Type
- [ ] POST with non-existent content_type
- [ ] Verify 400 error with clear message

#### 6.3 Invalid Object ID
- [ ] POST with valid content_type but non-existent object_id
- [ ] Verify behavior (create with stale flag? or 400?)

#### 6.4 Duplicate Favorite
- [ ] Favorite same item twice
- [ ] Verify appropriate handling (reject duplicate or update)

---

### 7. Service Layer (log_visit)

#### 7.1 Direct Service Usage
```python
from navigation.services import log_visit

recent = log_visit(
    user=request.user,
    path="/projects/123",
    label="My Project",
    content_object=project,
    context={"foo": "bar"}
)
```
- [ ] Verify returns UserRecent instance
- [ ] Verify triggers auto-pruning if needed

---

### 8. Admin Interface

#### 8.1 Admin List View
- [ ] Navigate to Django Admin: `/admin/navigation/`
- [ ] Verify UserRecent and UserFavorite models visible
- [ ] Verify list displays:
  - User
  - Label
  - Path
  - Content type
  - Timestamps

#### 8.2 Admin Filtering
- [ ] Filter by user
- [ ] Filter by content_type
- [ ] Verify filters work correctly

---

## Expected Results Summary

| Test | Expected Outcome |
|------|------------------|
| Recents CRUD | Create, update, list work correctly |
| Hybrid Pruning | Max 50 items, 90 day cleanup |
| Favorites CRUD | Create, list, delete, reorder work |
| Stale Link Protection | Inaccessible items preserved |
| User Isolation | Users only see own data |
| Edge Cases | Graceful error handling |
| Admin | Full admin interface available |

---

## Settings Reference

```python
# src/settings/base.py
NAVIGATION_RECENTS_MAX_COUNT = 50
NAVIGATION_RECENTS_RETENTION_DAYS = 90
```

---

## Notes
<!-- Add test execution notes here -->

**Tested By:** _______________
**Date:** _______________
**Environment:** _______________
