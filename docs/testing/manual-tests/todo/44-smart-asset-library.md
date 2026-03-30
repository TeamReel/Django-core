# Manual Test: B35 Smart Asset Library

**Module:** #044 B35 — Smart Asset Library
**Status:** ✅ Implementation Complete | 📋 Testing TODO
**Feature Branch:** `044-smart-asset-library` (merged)
**Test Environment:** Development/Staging

---

## Test Objectives

Verify that the smart asset library system:
1. Creates and manages MediaItems wrapping B22 FileAssets
2. Extracts and stores metadata (dimensions, duration, mime_type)
3. Supports hybrid tagging (system-wide and project-specific)
4. Links media to any object via polymorphic relations (GFK)
5. Organizes media into ordered Collections
6. Handles processing states correctly

---

## Prerequisites

- [ ] Migrations applied: `python manage.py migrate medialib`
- [ ] B22 File storage configured and working
- [ ] Test user with project access created
- [ ] At least one Project created
- [ ] Sample files ready for upload:
  - [ ] Image file (JPG/PNG)
  - [ ] Video file (MP4)
  - [ ] Audio file (MP3)

---

## Test Scenarios

### 1. MediaItem CRUD

#### 1.1 Upload and Create MediaItem
- [ ] First upload file via B22: POST `/api/v1/files/upload/`
- [ ] Then create media item: POST `/api/v1/media-library/items/`
  ```json
  {
    "project": "{project_uuid}",
    "file": "{file_uuid}",
    "title": "Match Day Highlights",
    "description": "Season opener highlights video"
  }
  ```
- [ ] Verify 201 response with item ID
- [ ] Verify `state: "PENDING"` initially

#### 1.2 Metadata Extraction
- [ ] Wait for processing (or trigger manually)
- [ ] GET `/api/v1/media-library/items/{id}/`
- [ ] Verify metadata populated:
  - Image: `width`, `height`
  - Video: `width`, `height`, `duration`
  - Audio: `duration`
- [ ] Verify `mime_type` detected correctly
- [ ] Verify `state: "READY"`

#### 1.3 List MediaItems
- [ ] GET `/api/v1/media-library/items/?project_id={uuid}`
- [ ] Verify pagination works
- [ ] Verify project filtering works

#### 1.4 Update MediaItem
- [ ] PATCH `/api/v1/media-library/items/{id}/`
  ```json
  {
    "title": "Updated Title",
    "description": "Updated description"
  }
  ```
- [ ] Verify changes persisted

#### 1.5 Delete MediaItem
- [ ] DELETE `/api/v1/media-library/items/{id}/`
- [ ] Verify soft delete (or hard delete based on impl)
- [ ] Verify file in B22 handled appropriately

---

### 2. Tagging System

#### 2.1 Create System Tag (Admin)
- [ ] Login as admin
- [ ] Create tag: POST `/api/v1/media-library/tags/`
  ```json
  {
    "name": "Official Content",
    "is_system": true
  }
  ```
- [ ] Verify `slug` auto-generated
- [ ] Verify `project: null` (system-wide)

#### 2.2 Create Project Tag
- [ ] POST `/api/v1/media-library/tags/`
  ```json
  {
    "name": "Season 2024",
    "project": "{project_uuid}"
  }
  ```
- [ ] Verify project-scoped tag created

#### 2.3 Tag MediaItem (Multiple Tags)
- [ ] PATCH media item with tags:
  ```json
  {
    "tag_names": ["official-content", "season-2024", "match-day"]
  }
  ```
- [ ] Verify tags associated with item
- [ ] Verify new tags auto-created if not exists

#### 2.4 Filter by Tags
- [ ] GET `/api/v1/media-library/items/?tags=season-2024`
- [ ] Verify only tagged items returned
- [ ] GET with multiple tags: `?tags=season-2024,match-day`
- [ ] Verify AND/OR logic (document expected behavior)

---

### 3. Context Relations (Polymorphic Links)

#### 3.1 Link Media to Match
- [ ] POST `/api/v1/media-library/items/{id}/add_relation/`
  ```json
  {
    "target_type": "activities.match",
    "target_id": "{match_uuid}",
    "relation_type": "highlight"
  }
  ```
- [ ] Verify 201 response with relation ID

#### 3.2 Link Media to Player
- [ ] POST add_relation with player target
- [ ] Verify different `relation_type` (e.g., "profile_photo")

#### 3.3 List Relations for MediaItem
- [ ] GET `/api/v1/media-library/items/{id}/relations/`
- [ ] Verify all linked objects appear

#### 3.4 Remove Relation
- [ ] DELETE relation by ID
- [ ] Verify media item still exists
- [ ] Verify relation removed

#### 3.5 Find Media by Related Object
- [ ] GET `/api/v1/media-library/items/?related_to={content_type}&related_id={uuid}`
- [ ] Verify media linked to that object returned

---

### 4. Collections

#### 4.1 Create Collection
- [ ] POST `/api/v1/media-library/collections/`
  ```json
  {
    "project": "{project_uuid}",
    "name": "Match Day Photos",
    "description": "All photos from match day 1"
  }
  ```
- [ ] Verify 201 response

#### 4.2 Add Items to Collection
- [ ] POST `/api/v1/media-library/collections/{id}/add_items/`
  ```json
  {
    "items": ["{item1_uuid}", "{item2_uuid}", "{item3_uuid}"]
  }
  ```
- [ ] Verify items added with order preserved

#### 4.3 Reorder Items
- [ ] PATCH collection item order
- [ ] Verify order updated correctly

#### 4.4 List Collection Items
- [ ] GET `/api/v1/media-library/collections/{id}/items/`
- [ ] Verify items returned in correct order

---

### 5. Processing States

#### 5.1 State Transitions
- [ ] Upload new media item
- [ ] Verify initial state: `PENDING`
- [ ] Trigger/wait for processing
- [ ] Verify state: `PROCESSING`
- [ ] Wait for completion
- [ ] Verify state: `READY`

#### 5.2 Error State
- [ ] Upload corrupted file (if possible)
- [ ] Verify state: `ERROR`
- [ ] Verify error message stored

---

### 6. Search & Filtering

#### 6.1 Text Search
- [ ] GET `/api/v1/media-library/items/?search=highlights`
- [ ] Verify title/description searched

#### 6.2 Filter by MIME Type
- [ ] GET `/api/v1/media-library/items/?mime_type=video`
- [ ] Verify only videos returned

#### 6.3 Filter by State
- [ ] GET `/api/v1/media-library/items/?state=READY`
- [ ] Verify only ready items returned

---

## Expected Results Summary

| Test | Expected Outcome |
|------|------------------|
| MediaItem CRUD | Create, read, update, delete work |
| Metadata Extraction | Width, height, duration populated |
| Tagging | System and project tags work |
| Context Relations | GFK links to any model work |
| Collections | Ordered grouping works |
| Processing States | PENDING → PROCESSING → READY flow |

---

## Notes
<!-- Add test execution notes here -->

**Tested By:** _______________
**Date:** _______________
**Environment:** _______________
