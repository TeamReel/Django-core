# Feature Specification: Smart Asset Library

**Feature Branch**: `044-smart-asset-library`
**Module ID**: B35 / 044
**Created**: 2026-02-02
**Status**: Draft
**Phase**: 10
**Category**: Backend

## Executive Summary

Digital Asset Management (DAM) layer that extends B22 file storage with rich metadata, tagging, context relations, and smart search. Provides the "intelligence" layer for media organization across any product domain.

**Key Design Decision**: Hybrid context relations — explicit FKs for core entities (Project, Activity) + generic FK table for extensibility (players, sponsors, future entities).

**Integrations**: B22 (file storage), B24 (full-text search), B30 (activities), B34 (generated content auto-linking)

## Clarifications

### Session 2026-02-02

- Q: Tag scope — global, project-scoped, or hybrid? → A: Hybrid — system tags global (NULL project), user tags project-scoped. Enables cross-project analytics on standard tags while maintaining privacy for custom tags.

## User Scenarios & Testing

### User Story 1 - Upload and Enrich Media (Priority: P1)

A content manager uploads a video and the system automatically extracts metadata (dimensions, duration) and allows adding title, description, and tags.

**Why this priority**: Core value — without media enrichment, it's just file storage (B22).

**Independent Test**: Upload video → verify metadata extracted → add tags → retrieve with enriched data.

**Acceptance Scenarios**:

1. **Given** a video file, **When** uploaded via API, **Then** MediaItem is created with auto-extracted width, height, duration, and mime type
2. **Given** a MediaItem exists, **When** user adds tags ["goal", "highlight"], **Then** tags are associated and searchable
3. **Given** a MediaItem exists, **When** user updates title/description, **Then** changes are persisted and returned in subsequent requests

---

### User Story 2 - Link Media to Context (Priority: P1)

A user links media to relevant entities — "this video belongs to Match X" and "features Player A, B, C".

**Why this priority**: Context relations are what differentiate DAM from basic file storage.

**Independent Test**: Create MediaItem → link to Activity → link to multiple Memberships → query by relation.

**Acceptance Scenarios**:

1. **Given** a MediaItem and an Activity, **When** user sets activity FK, **Then** media appears in Activity's media list
2. **Given** a MediaItem, **When** user adds relations to multiple players via MediaItemRelation, **Then** all relations are queryable
3. **Given** a linked MediaItem, **When** the related Activity is deleted, **Then** MediaItem's activity FK becomes null (not cascade deleted)

---

### User Story 3 - Search and Filter Media (Priority: P1)

A user searches media library by title, tags, related entities, or date range.

**Why this priority**: Without search, large libraries become unusable.

**Independent Test**: Create 10 MediaItems with various tags/relations → search by tag → filter by project → verify correct results.

**Acceptance Scenarios**:

1. **Given** MediaItems with tags, **When** filtering by tag "highlight", **Then** only matching items returned
2. **Given** MediaItems linked to projects, **When** filtering by project_id, **Then** only that project's media returned
3. **Given** MediaItems with titles, **When** searching "Ajax vs PSV", **Then** full-text search returns relevant matches

---

### User Story 4 - Organize into Collections (Priority: P2)

A user creates collections to group related media ("Best Goals 2024", "Marketing Q1").

**Why this priority**: Nice-to-have organizational layer, not blocking core functionality.

**Independent Test**: Create collection → add MediaItems → list collection contents.

**Acceptance Scenarios**:

1. **Given** multiple MediaItems, **When** user creates Collection and adds items, **Then** collection lists all members
2. **Given** a Collection, **When** user removes an item, **Then** item remains in library but not in collection
3. **Given** a MediaItem, **When** queried, **Then** response includes collections it belongs to

---

### User Story 5 - Auto-Link Generated Content (Priority: P2)

When B34 generates content, the output is automatically wrapped in a MediaItem with context from the generation request.

**Why this priority**: Enables seamless B34 integration without manual linking.

**Independent Test**: B34 completes generation → verify MediaItem created with correct project, activity, and auto-generated tags.

**Acceptance Scenarios**:

1. **Given** B34 generation completes, **When** output is stored, **Then** MediaItem is auto-created with generation_request FK
2. **Given** generation request has project_id, **When** MediaItem is created, **Then** project FK is set
3. **Given** generation request has match_id in input_data, **When** MediaItem is created, **Then** activity FK is set

---

### User Story 6 - Thumbnail Generation (Priority: P3)

System auto-generates preview thumbnails for images and videos.

**Why this priority**: UX enhancement, not core functionality.

**Independent Test**: Upload image → verify thumbnails generated at configured sizes.

**Acceptance Scenarios**:

1. **Given** an image upload, **When** processing completes, **Then** thumbnails exist at 200x200 and 400x400
2. **Given** a video upload, **When** processing completes, **Then** thumbnail extracted from mid-point frame
3. **Given** a MediaItem, **When** requesting thumbnails, **Then** presigned URLs returned for each size

---

### Edge Cases

- What happens when file extraction fails (corrupt file)? → MediaItem created with state="error", metadata fields null
- What happens when linked entity is deleted? → Explicit FKs use SET_NULL, generic relations cascade delete
- What happens when duplicate tags are added? → Idempotent, no duplicate entries
- What happens when searching with no results? → Empty list returned, not error
- What happens when Collection is deleted? → M2M entries removed, MediaItems remain

## Requirements

### Functional Requirements

**Models:**

- **FR-001**: System MUST provide MediaItem model wrapping B22 FileAsset with: title, description, width, height, duration, state, mime_type, created_by, created_at, updated_at
- **FR-002**: MediaItem MUST have explicit FKs to: Project (nullable), Activity (nullable), GenerationRequest (nullable)
- **FR-003**: System MUST provide MediaTag model with: name, slug, tag_type (manual/auto/ai_generated)
- **FR-004**: MediaItem MUST support M2M relation to MediaTag
- **FR-005**: System MUST provide MediaItemRelation model for generic context links with: content_type, object_id, relation_type
- **FR-006**: System MUST provide Collection model with: name, description, project (scope), M2M to MediaItems
- **FR-007**: MediaItem state MUST support values: pending, processing, ready, error

**Metadata Extraction:**

- **FR-010**: System MUST auto-extract image dimensions (width, height) on upload
- **FR-011**: System MUST auto-extract video dimensions and duration on upload
- **FR-012**: System MUST detect and store mime_type for all uploads
- **FR-013**: Metadata extraction failures MUST set state="error" and log details

**Tagging:**

- **FR-020**: Users MUST be able to add/remove tags from MediaItems
- **FR-021**: System MUST auto-generate tags from filename on upload (configurable)
- **FR-022**: Tags MUST be unique by slug within their scope (global for system tags, per-project for user tags)
- **FR-023**: Tag creation MUST be idempotent (get_or_create pattern)
- **FR-024**: MediaTag MUST have optional project FK (NULL = system/global tag, set = project-scoped tag)
- **FR-025**: API MUST return merged tag list (system + project-specific) when querying available tags for a project

**Context Relations:**

- **FR-030**: MediaItem explicit FKs MUST use on_delete=SET_NULL
- **FR-031**: MediaItemRelation MUST support relation_types: features, belongs_to, related_to, sponsored_by
- **FR-032**: MediaItemRelation MUST enforce unique_together on (media_item, content_type, object_id, relation_type)
- **FR-033**: Deleting a MediaItem MUST cascade delete its MediaItemRelations

**Collections:**

- **FR-040**: Collections MUST be scoped to a Project
- **FR-041**: Users MUST be able to add/remove MediaItems from Collections
- **FR-042**: A MediaItem MAY belong to multiple Collections

**Search & Filter:**

- **FR-050**: API MUST support filtering MediaItems by: project, activity, tags, state, creator, date_range
- **FR-051**: API MUST support full-text search on title and description (B24 integration)
- **FR-052**: API MUST support filtering by related entity via MediaItemRelation
- **FR-053**: All list endpoints MUST be paginated

**Thumbnails:**

- **FR-060**: System MUST generate image thumbnails at configurable sizes (default: 200x200, 400x400)
- **FR-061**: System MUST extract video thumbnails from configurable timestamp (default: 50%)
- **FR-062**: Thumbnails MUST be stored via B22 with reference from MediaItem
- **FR-063**: Thumbnail generation MUST be async (Celery task)

**B34 Integration:**

- **FR-070**: When GenerationOutput is created, system MUST auto-create corresponding MediaItem
- **FR-071**: Auto-created MediaItem MUST inherit project_id from GenerationRequest
- **FR-072**: Auto-created MediaItem MUST link to activity if match_id present in input_data
- **FR-073**: Auto-created MediaItem MUST receive auto-generated tag matching template slug

### Key Entities

- **MediaItem**: Rich metadata wrapper around B22 FileAsset. Core entity for all managed media.
- **MediaTag**: Categorization label with type indicator (manual/auto/ai). Shared across all MediaItems.
- **MediaItemRelation**: Flexible link table for M2M context relations via generic FK.
- **Collection**: Named grouping of MediaItems, scoped to a Project.

## Constitution Alignment

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [x] All functionality is reusable across multiple downstream products
- [x] Extension points documented: custom relation_types, tag_types, thumbnail sizes

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering: models → services → API
- [x] No circular dependencies: depends on B22, B24, B30, B34 (all lower/peer level)
- [x] Extension points: MediaItemRelation allows linking to any model

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained
- [x] Type hints will be used in core modules
- [x] Code will be formatted with Black and linted with Ruff

### Testing (Principle IV)
- [x] Test plan includes pytest + pytest-django tests
- [x] Coverage target: ≥90% for models, ≥85% for API
- [x] Integration tests: upload → extract → tag → link → search flow

### Security & Privacy (Principle V)
- [x] Secure defaults maintained
- [x] No secrets in code
- [x] Authorization: project membership checks on all endpoints
- [x] No sensitive data logged

### Performance & Reliability (Principle VI)
- [x] select_related/prefetch_related for tag and relation queries
- [x] Pagination on all list endpoints
- [x] Async thumbnail generation prevents request blocking
- [x] Graceful degradation: metadata extraction failure doesn't block upload

### API Design (Principle VII)
- [x] DRF ViewSets with standard actions
- [x] Consistent response format
- [x] Filter backends for search/filter
- [x] Validation in serializers

### Documentation (Principle XI)
- [x] README with usage examples
- [x] API endpoint documentation
- [x] Extension guide for custom relation types

**Violations Requiring Justification**: None

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can upload and enrich media in under 30 seconds (excluding upload time)
- **SC-002**: Search returns results in under 1 second for libraries up to 100,000 items
- **SC-003**: 95% of uploads have metadata successfully extracted
- **SC-004**: B34 generated content is auto-linked within 5 seconds of generation completion
- **SC-005**: Thumbnail generation completes within 30 seconds for images, 60 seconds for videos
