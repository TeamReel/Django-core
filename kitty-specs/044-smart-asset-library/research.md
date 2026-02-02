# Research: B35 Smart Asset Library

**Feature Branch**: `044-smart-asset-library`
**Created**: 2026-02-02
**Status**: Complete

## Research Questions

### 1. Context Relations Strategy

**Decision**: Hybrid approach — explicit FKs for core entities + generic FK table for extensibility

**Rationale**:
- Explicit FKs (Project, Activity, GenerationRequest) provide DB-level integrity, fast queries, and Django admin support
- Generic FK via MediaItemRelation allows M2M links to any model (players, sponsors, future entities)
- 80/20 split: most queries use explicit FKs (fast), edge cases use generic (flexible)

**Alternatives Considered**:
- Pure Generic FKs: Too complex for common queries, no referential integrity
- Pure Explicit FKs: Not extensible, requires migration for each new entity type

### 2. Tag Scope Strategy

**Decision**: Hybrid — system tags global, user tags project-scoped

**Rationale**:
- System tags (project=NULL): Platform-wide standards like `lineup-video`, `goal`, `highlight`
- Project tags (project=FK): Club-specific tags like `tactiek-analyse`, `sponsor-content`
- Enables cross-project analytics on system tags while maintaining privacy for custom tags

**Alternatives Considered**:
- Global only: Privacy issues, tag pollution across projects
- Project-scoped only: No cross-project analytics, duplicated common tags

### 3. Metadata Extraction Libraries

**Decision**: Pillow + ffprobe (via subprocess)

**Rationale**:
- Pillow: Industry standard for image processing, already in most Django projects
- ffprobe: Part of FFmpeg, already required for B34 video generation
- No additional dependencies beyond what's needed for B34 Lineup Video feature
- Direct subprocess calls are faster than Python wrappers

**Alternatives Considered**:
- Pillow + moviepy: Heavy dependencies, overkill for metadata extraction
- django-imagekit: No video support
- python-ffmpeg wrapper: Extra abstraction not needed

### 4. Thumbnail Generation Strategy

**Decision**: Async via Celery, stored in B22 with parent reference

**Rationale**:
- Thumbnail generation is CPU-intensive, must not block upload requests
- Store thumbnails as separate FileAsset entries linked to parent MediaItem
- Use FFmpeg for both image resize and video frame extraction (unified tooling)

**Implementation Notes**:
- Image thumbnails: PIL resize with LANCZOS filter
- Video thumbnails: ffmpeg `-ss {timestamp} -vframes 1`
- Default sizes: 200x200, 400x400 (configurable via settings)
- Video timestamp: 50% of duration (configurable)

### 5. B22 FileAsset Integration

**Decision**: OneToOne relationship, MediaItem wraps FileAsset

**Rationale**:
- FileAsset handles low-level storage (S3 paths, presigned URLs)
- MediaItem adds rich metadata layer (dimensions, duration, tags, relations)
- Clear separation of concerns: storage vs. semantics

**Integration Pattern**:
```
FileAsset (B22)          MediaItem (B35)
├── storage_path    ←──  file (OneToOne)
├── content_type         title
├── file_size            description
└── owner                width, height, duration
                         state, tags, relations
```

### 6. B24 Search Integration

**Decision**: Index title, description, and tag names for full-text search

**Rationale**:
- B24 provides SearchVector/SearchQuery integration
- Index fields: title, description (weighted), tag names (via M2M)
- Filter fields: project, activity, state, creator, date_range, tags

**Implementation Notes**:
- Use django.contrib.postgres.search or B24's abstraction
- Trigger index update on MediaItem save and tag changes
- Consider GIN index on search_vector field for performance

### 7. B34 Auto-Linking

**Decision**: Signal-based auto-creation on GenerationOutput save

**Rationale**:
- When B34 creates GenerationOutput, signal creates corresponding MediaItem
- Inherits project_id from GenerationRequest
- Auto-links to Activity if match_id in input_data
- Auto-generates tag matching template slug

**Implementation Notes**:
- Use post_save signal on GenerationOutput (or GenerationRequest completion)
- Create MediaItem with state='processed' (already generated)
- Link via generation_request FK

## Dependencies

| Module | Integration Point |
|--------|------------------|
| B22 File Storage | FileAsset model, presigned URLs |
| B24 Full-Text Search | SearchVector indexing |
| B30 Activities | Activity FK on MediaItem |
| B34 Generative Pipelines | GenerationRequest FK, auto-linking signal |
| B07 Projects | Project FK on MediaItem, Collection |

## Technical Constraints

- Python 3.12+
- Django 5.x with DRF
- PostgreSQL (for full-text search)
- FFmpeg available in deployment environment
- Celery for async thumbnail generation
