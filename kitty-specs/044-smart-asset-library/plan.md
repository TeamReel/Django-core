# Implementation Plan: B35 Smart Asset Library

**Feature Branch**: `044-smart-asset-library`
**Module ID**: B35 / 044
**Created**: 2026-02-02
**Status**: Ready for Implementation
**Phase**: 10

## Technical Context

### Stack
- Python 3.12+
- Django 5.x with Django REST Framework
- PostgreSQL (full-text search)
- Celery (async thumbnail generation)
- Pillow (image metadata/thumbnails)
- FFmpeg/ffprobe (video metadata/thumbnails)

### Key Decisions
1. **Context Relations**: Hybrid — explicit FKs for core (Project, Activity, GenerationRequest) + MediaItemRelation with generic FK for extensibility
2. **Tag Scope**: Hybrid — system tags global (project=NULL), user tags project-scoped
3. **Metadata Extraction**: Pillow + ffprobe (industry standard, FFmpeg already required for B34)
4. **Thumbnail Storage**: As B22 FileAsset entries linked via metadata to parent MediaItem

### Dependencies
| Module | Integration |
|--------|-------------|
| B22 File Storage | FileAsset model, presigned URLs |
| B24 Full-Text Search | SearchVector indexing |
| B30 Activities | Activity FK |
| B34 Generative Pipelines | GenerationRequest FK, auto-link signal |
| B07 Projects | Project FK scoping |
| B15 Celery | Async thumbnail generation |

## Constitution Check

### Principle I: Product-Agnostic
✅ No product-specific logic — tags, relations, collections are generic concepts

### Principle II: Architecture & Modularity
✅ Clear layering: models → services → API
✅ No circular dependencies (depends on B22, B24, B30, B34)

### Principle III: Code Quality
✅ Python 3.12+, type hints, Black, Ruff

### Principle IV: Testing
✅ pytest-django, targets: models ≥90%, API ≥85%

### Principle V: Security
✅ Project membership checks on all endpoints
✅ No sensitive data logged

### Principle VI: Performance
✅ Async thumbnail generation
✅ Pagination on list endpoints
✅ GIN index for full-text search

### Principle VII: API Design
✅ DRF ViewSets, consistent responses

## Phase 0: Research ✅

Completed — see [research.md](research.md)

## Phase 1: Design & Contracts ✅

### Artifacts Generated
- [data-model.md](data-model.md) — Entity definitions, relationships, constraints
- [contracts/openapi.yaml](contracts/openapi.yaml) — Full API specification
- [quickstart.md](quickstart.md) — Integration guide

### Models Summary
| Model | Purpose |
|-------|---------|
| MediaItem | Rich metadata wrapper for B22 FileAsset |
| MediaTag | Categorization with scope (global/project) |
| MediaItemRelation | Generic FK for flexible M2M links |
| Collection | Named grouping of MediaItems |

### API Summary
| Resource | Endpoints |
|----------|-----------|
| MediaItems | CRUD, tags, relations, thumbnails |
| Tags | List, create (scoped) |
| Collections | CRUD, add/remove items |

## Phase 2: Implementation Roadmap

### Work Package 1: Core Models (P1)
**Goal**: Create Django models with migrations

Tasks:
- T01: Create `src/media/` Django app structure
- T02: Implement MediaItem model with B22 FileAsset FK
- T03: Implement MediaTag model with scope constraints
- T04: Implement MediaItemRelation with generic FK
- T05: Implement Collection model with M2M
- T06: Create and verify migrations
- T07: Add model admin for debugging

**Acceptance**: Models created, migrations run, admin accessible

### Work Package 2: Metadata Extraction (P1)
**Goal**: Auto-extract image/video metadata on upload

Tasks:
- T08: Implement `extract_image_metadata()` service (Pillow)
- T09: Implement `extract_video_metadata()` service (ffprobe)
- T10: Create Celery task `process_media_item` for async extraction
- T11: Wire extraction to MediaItem creation flow
- T12: Handle extraction failures (state=error)

**Acceptance**: Upload image → dimensions extracted; Upload video → dimensions + duration extracted

### Work Package 3: Tagging System (P2)
**Goal**: Full tagging with scope support

Tasks:
- T13: Implement MediaTagService (get_or_create, list_available)
- T14: Implement auto-tagging from filename
- T15: Add tag endpoints to API
- T16: Wire tags to MediaItem M2M

**Acceptance**: Create tag → add to item → filter by tag works

### Work Package 4: Context Relations (P2)
**Goal**: Link media to activities, players, etc.

Tasks:
- T17: Implement MediaItemRelationService
- T18: Add relation endpoints to API
- T19: Add filter by relation to MediaItem list
- T20: Validate target object exists

**Acceptance**: Link video to match → query "media for match X" returns video

### Work Package 5: Collections (P2)
**Goal**: Group media into named collections

Tasks:
- T21: Implement CollectionService
- T22: Add Collection ViewSet
- T23: Add/remove items endpoints

**Acceptance**: Create collection → add items → list collection shows items

### Work Package 6: Search & Filter (P1)
**Goal**: Full-text search and filtering

Tasks:
- T24: Add SearchVector to MediaItem (title, description)
- T25: Implement search endpoint with B24 integration
- T26: Implement filters (project, activity, tags, state, date_range)
- T27: Add pagination

**Acceptance**: Search "Ajax" → returns matching items; Filter by tag works

### Work Package 7: Thumbnail Generation (P3)
**Goal**: Auto-generate preview thumbnails

Tasks:
- T28: Implement `generate_image_thumbnail()` (Pillow resize)
- T29: Implement `generate_video_thumbnail()` (ffmpeg frame)
- T30: Create Celery task for async generation
- T31: Store thumbnails as FileAsset with parent reference
- T32: Add thumbnails endpoint

**Acceptance**: Upload image → thumbnails at 200x200, 400x400 available

### Work Package 8: B34 Auto-Linking (P2)
**Goal**: Auto-create MediaItem when B34 generates content

Tasks:
- T33: Create signal handler for GenerationOutput
- T34: Auto-set project, activity from request
- T35: Auto-generate tag from template slug
- T36: Integration test with B34

**Acceptance**: B34 generates video → MediaItem auto-created with context

### Work Package 9: Testing & Documentation (P1)
**Goal**: Comprehensive tests and README

Tasks:
- T37: Model tests (≥90% coverage)
- T38: API tests (≥85% coverage)
- T39: Integration tests (upload → tag → link → search)
- T40: Write README.md for module
- T41: Update extension guide

**Acceptance**: All tests pass, coverage targets met

## Estimated Effort

| Work Package | Complexity | Est. Hours |
|--------------|------------|------------|
| WP1: Core Models | Medium | 4h |
| WP2: Metadata Extraction | Medium | 4h |
| WP3: Tagging System | Low | 3h |
| WP4: Context Relations | Medium | 4h |
| WP5: Collections | Low | 2h |
| WP6: Search & Filter | Medium | 4h |
| WP7: Thumbnail Generation | Medium | 4h |
| WP8: B34 Auto-Linking | Low | 2h |
| WP9: Testing & Docs | High | 6h |
| **Total** | | **33h** |

## Next Steps

1. Run `/spec-kitty.tasks` to break down into detailed task files
2. Implement WP1 (Core Models) first — foundation for everything else
3. WP2 and WP6 can run in parallel after WP1
4. WP7 and WP8 are lower priority, can be deferred if needed
