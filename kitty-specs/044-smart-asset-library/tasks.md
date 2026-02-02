# B35 Smart Asset Library - Task Breakdown

**Feature**: 044-smart-asset-library
**Branch**: `044-smart-asset-library`
**Total Work Packages**: 9
**Total Subtasks**: 41
**Estimated Effort**: ~33 hours

---

## Work Packages Overview

| WP | Name | Priority | Subtasks | Status |
|----|------|----------|----------|--------|
| WP01 | Core Models & API | P1 | T001-T007 | ✅ Done |
| WP02 | Metadata Extraction | P1 | T008-T012 | ✅ Done |
| WP03 | Tagging System | P2 | T013-T016 | ✅ Done |
| WP04 | Context Relations | P2 | T017-T020 | 🟡 In Progress |
| WP05 | Collections | P2 | T021-T023 | 🟡 Planned |
| WP06 | Search & Filter | P1 | T024-T027 | 🟡 Planned |
| WP07 | Thumbnail Generation | P3 | T028-T032 | 🟡 Planned |
| WP08 | B34 Auto-Linking | P2 | T033-T036 | 🟡 Planned |
| WP09 | Testing & Documentation | P1 | T037-T041 | 🟡 Planned |

---

## WP01: Core Models & API [P1]
**Goal**: MediaItem, MediaTag, Collection models + basic CRUD endpoints
**Estimate**: 4h
**Dependencies**: B22 File Storage, B07 Projects
**Prompt**: [tasks/done/WP01-core-models.md](tasks/done/WP01-core-models.md)

- [x] [T001] [P1] Create MediaItem model with required fields
- [x] [T002] [P1] Create MediaTag model with hybrid scope (system/project)
- [x] [T003] [P1] Create Collection model with membership M2M
- [x] [T004] [P1] Create MediaItemSerializer with nested output
- [x] [T005] [P1] Create MediaItemViewSet with project scoping
- [x] [T006] [P1] Create MediaTagViewSet with scope filtering
- [x] [T007] [P2] Add admin configuration for debugging

---

## WP02: Metadata Extraction [P1]
**Goal**: Auto-extract image/video metadata on upload
**Estimate**: 4h
**Dependencies**: WP01, Pillow, ffprobe
**Prompt**: [tasks/done/WP02-metadata-extraction.md](tasks/done/WP02-metadata-extraction.md)

- [x] [T008] [P1] Implement `extract_image_metadata()` service (Pillow)
- [x] [T009] [P1] Implement `extract_video_metadata()` service (ffprobe)
- [x] [T010] [P1] Create Celery task `process_media_item` for async extraction
- [x] [T011] [P1] Wire extraction to MediaItem creation flow
- [x] [T012] [P2] Handle extraction failures gracefully (state=error)

---

## WP03: Tagging System [P2]
**Goal**: Full tagging with scope support (system global + project-scoped)
**Estimate**: 3h
**Dependencies**: WP01
**Prompt**: [tasks/done/WP03-tagging-system.md](tasks/done/WP03-tagging-system.md)

- [ ] [T013] [P1] Implement MediaTagService (get_or_create, list_available)
- [ ] [T014] [P2] Implement auto-tagging from filename parsing
- [ ] [T015] [P1] Add tag management endpoints to API
- [ ] [T016] [P1] Wire tags to MediaItem M2M relationship

---

## WP04: Context Relations [P2]
**Goal**: Link media to activities, players, matches via generic FK
**Estimate**: 4h
**Dependencies**: WP01, B30 Activities
**Prompt**: [tasks/planned/WP04-context-relations.md](tasks/planned/WP04-context-relations.md)

- [ ] [T017] [P1] Create MediaItemRelation model for generic FK
- [ ] [T018] [P1] Implement MediaItemRelationService
- [ ] [T019] [P1] Add relation endpoints to API
- [ ] [T020] [P2] Validate target object exists before linking

---

## WP05: Collections [P2]
**Goal**: Group media into named collections with ordering
**Estimate**: 2h
**Dependencies**: WP01
**Prompt**: [tasks/planned/WP05-collections.md](tasks/planned/WP05-collections.md)

- [ ] [T021] [P1] Implement CollectionService
- [ ] [T022] [P1] Add Collection ViewSet with CRUD
- [ ] [T023] [P1] Add/remove items endpoints with position support

---

## WP06: Search & Filter [P1]
**Goal**: Full-text search and filtering with B24 integration
**Estimate**: 4h
**Dependencies**: WP01, WP03, B24 Search
**Prompt**: [tasks/planned/WP06-search-filter.md](tasks/planned/WP06-search-filter.md)

- [ ] [T024] [P1] Add SearchVector to MediaItem (title, description)
- [ ] [T025] [P1] Implement search endpoint with B24 integration
- [ ] [T026] [P1] Implement filters (project, activity, tags, state, date_range)
- [ ] [T027] [P1] Add cursor-based pagination

---

## WP07: Thumbnail Generation [P3]
**Goal**: Auto-generate preview thumbnails for images and videos
**Estimate**: 4h
**Dependencies**: WP01, WP02, Pillow, ffmpeg
**Prompt**: [tasks/planned/WP07-thumbnail-generation.md](tasks/planned/WP07-thumbnail-generation.md)

- [ ] [T028] [P1] Implement `generate_image_thumbnail()` (Pillow resize)
- [ ] [T029] [P1] Implement `generate_video_thumbnail()` (ffmpeg frame)
- [ ] [T030] [P1] Create Celery task for async generation
- [ ] [T031] [P2] Store thumbnails as FileAsset with parent reference
- [ ] [T032] [P2] Add thumbnails endpoint to API

---

## WP08: B34 Auto-Linking [P2]
**Goal**: Auto-create MediaItem when B34 generates output files
**Estimate**: 2h
**Dependencies**: WP01, WP04, B34 Generative Pipelines
**Prompt**: [tasks/planned/WP08-b34-auto-linking.md](tasks/planned/WP08-b34-auto-linking.md)

- [ ] [T033] [P1] Create signal handler for GenerationOutput creation
- [ ] [T034] [P1] Auto-set project, activity from GenerationRequest
- [ ] [T035] [P2] Auto-generate tag from template slug
- [ ] [T036] [P1] Integration test with B34 flow

---

## WP09: Testing & Documentation [P1]
**Goal**: Comprehensive tests and README documentation
**Estimate**: 6h
**Dependencies**: WP01-WP08
**Prompt**: [tasks/planned/WP09-testing-docs.md](tasks/planned/WP09-testing-docs.md)

- [ ] [T037] [P1] Model unit tests (≥90% coverage)
- [ ] [T038] [P1] API endpoint tests (≥85% coverage)
- [ ] [T039] [P1] Integration tests (upload → tag → link → search)
- [ ] [T040] [P1] Write module README.md
- [ ] [T041] [P2] Update extension guide with B35 examples

---

## Execution Order (Recommended)

```
Phase 1: Foundation (P1 Critical Path)
├── WP01: Core Models & API        [FIRST - enables everything]
├── WP02: Metadata Extraction      [after WP01]
└── WP06: Search & Filter          [after WP01, parallel with WP02]

Phase 2: Features (P2)
├── WP03: Tagging System           [after WP01]
├── WP04: Context Relations        [after WP01]
├── WP05: Collections              [after WP01]
└── WP08: B34 Auto-Linking         [after WP04]

Phase 3: Polish (P3)
├── WP07: Thumbnail Generation     [after WP02]
└── WP09: Testing & Documentation  [LAST - after all features]
```

---

## Legend

- 🟡 Planned
- 🔵 In Progress
- 🟢 Done
- 🔴 Blocked

**Priority Tags**:
- `[P1]` - Critical path, must complete
- `[P2]` - Important, should complete
- `[P3]` - Nice to have, can defer
