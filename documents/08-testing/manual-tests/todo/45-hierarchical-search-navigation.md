# Manual Test: B39 Hierarchical Search Navigation & Related Results

**Module:** #045 B39 — Hierarchical Search Navigation & Related Results
**Status:** ✅ Implementation Complete | 📋 Testing TODO
**Feature Branch:** `045-hierarchical-search-navigation` (merged)
**Test Environment:** Development/Staging

---

## Test Objectives

Verify that the hierarchical search system:
1. Indexes searchable models with hierarchical context
2. Returns results with parent/child relationships
3. Provides related results based on context
4. Supports scoped search (org, project, global)
5. Ranks results by relevance with hierarchy boost
6. Handles breadcrumb-style navigation paths

---

## Prerequisites

- [ ] Migrations applied: `python manage.py migrate search`
- [ ] Search index populated: `python manage.py rebuild_search_index`
- [ ] Test data with hierarchy:
  - [ ] Organisation with child Projects
  - [ ] Projects with child resources (Teams, Matches, etc.)
  - [ ] Multiple searchable entities at each level
- [ ] Test user with appropriate access permissions

---

## Test Scenarios

### 1. Search Entry Indexing

#### 1.1 Verify Model Registration
- [ ] Check searchable models registered:
  - [ ] User
  - [ ] Organisation
  - [ ] Project
  - [ ] Team/Club (if applicable)
  - [ ] Match/Activity (if applicable)
- [ ] Verify `post_save` signal triggers indexing

#### 1.2 Create New Entity and Verify Index
- [ ] Create new Project via API/Admin
- [ ] GET `/api/search/?q={project_name}`
- [ ] Verify new project appears in results immediately

#### 1.3 Update Entity and Verify Index
- [ ] Update project name
- [ ] Search for new name
- [ ] Verify updated content indexed

#### 1.4 Delete Entity and Verify Removal
- [ ] Delete a searchable entity
- [ ] Search for deleted entity
- [ ] Verify it no longer appears in results

---

### 2. Global Search

#### 2.1 Basic Keyword Search
- [ ] GET `/api/search/?q=keyword`
- [ ] Verify results returned with:
  - `id`
  - `title`
  - `description`
  - `url`
  - `content_type`
  - `relevance_score`

#### 2.2 Multi-word Search
- [ ] GET `/api/search/?q=multiple+words`
- [ ] Verify AND logic (all words present)
- [ ] Or verify OR logic (any word matches) — document expected behavior

#### 2.3 Partial Match / Prefix Search
- [ ] GET `/api/search/?q=part`
- [ ] Verify prefix matches work (e.g., "partial", "partner")

#### 2.4 No Results
- [ ] GET `/api/search/?q=xyznonexistent123`
- [ ] Verify empty results array
- [ ] Verify 200 status (not error)

---

### 3. Scoped Search

#### 3.1 Search Within Organisation
- [ ] GET `/api/search/?q=keyword&org={org_uuid}`
- [ ] Verify only results within that org returned
- [ ] Verify child projects/resources included

#### 3.2 Search Within Project
- [ ] GET `/api/search/?q=keyword&project={project_uuid}`
- [ ] Verify only results within that project
- [ ] Verify parent org not included (unless relevant)

#### 3.3 Filter by Content Type
- [ ] GET `/api/search/?q=keyword&type=project`
- [ ] Verify only projects returned
- [ ] GET `/api/search/?q=keyword&type=user`
- [ ] Verify only users returned

---

### 4. Hierarchical Context

#### 4.1 Breadcrumb Path in Results
- [ ] Search for a nested resource (e.g., Match under Team under Club)
- [ ] Verify result includes hierarchy path:
  ```json
  {
    "title": "Match Day 1",
    "path": "/org/club/team/match-day-1",
    "hierarchy": [
      {"type": "organisation", "id": "...", "name": "My Org"},
      {"type": "project", "id": "...", "name": "FC Example"},
      {"type": "team", "id": "...", "name": "First Team"}
    ]
  }
  ```

#### 4.2 Parent Context Boost
- [ ] Search for term that matches both parent and child
- [ ] Verify relevance ranking considers hierarchy
- [ ] Document observed ranking behavior

---

### 5. Related Results

#### 5.1 Get Related Results for Entity
- [ ] GET `/api/search/related/?type=project&id={uuid}`
- [ ] Verify related entities returned:
  - Child resources (Teams, Matches)
  - Sibling projects (same org)
  - Parent organisation

#### 5.2 Related Results Limit
- [ ] Verify related results limited (e.g., max 10)
- [ ] Verify most relevant related items shown first

---

### 6. Autocomplete / Suggestions

#### 6.1 Autocomplete Endpoint
- [ ] GET `/api/search/suggest/?q=par`
- [ ] Verify suggestions returned quickly
- [ ] Verify limited to top N results

#### 6.2 Suggestion Ranking
- [ ] Verify frequently accessed items ranked higher (if implemented)
- [ ] Verify recent items considered (if implemented)

---

### 7. Permission Filtering

#### 7.1 User Can Only See Accessible Results
- [ ] Login as user with limited access
- [ ] Search for content user cannot access
- [ ] Verify inaccessible content NOT in results

#### 7.2 Org Admin Sees All Org Content
- [ ] Login as org admin
- [ ] Verify all org content searchable

#### 7.3 Anonymous Search (if allowed)
- [ ] Search without authentication
- [ ] Verify only public content returned (or 401)

---

### 8. Performance

#### 8.1 Large Result Set Pagination
- [ ] Search for common term with many matches
- [ ] Verify pagination metadata:
  - `count`
  - `next`
  - `previous`
  - `page_size`

#### 8.2 Response Time
- [ ] Measure search response time
- [ ] Verify < 500ms for typical queries
- [ ] Verify < 2s for complex queries

---

## Expected Results Summary

| Test | Expected Outcome |
|------|------------------|
| Index Sync | Create/Update/Delete reflected in search |
| Global Search | Multi-type results with relevance |
| Scoped Search | Org/Project filtering works |
| Hierarchy | Breadcrumb paths and parent context |
| Related Results | Contextual related entities |
| Permissions | Only accessible content shown |
| Performance | Fast response times |

---

## Notes
<!-- Add test execution notes here -->

**Tested By:** _______________
**Date:** _______________
**Environment:** _______________
