# Data Model: B35 Smart Asset Library

**Feature Branch**: `044-smart-asset-library`
**Created**: 2026-02-02

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              B35 Smart Asset Library                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐              │
│  │   MediaTag   │      │  MediaItem   │      │  Collection  │              │
│  ├──────────────┤      ├──────────────┤      ├──────────────┤              │
│  │ id           │◄────┐│ id           │┌────►│ id           │              │
│  │ name         │     ││ file ────────┼┼─────│ name         │              │
│  │ slug         │     ││ title        ││     │ description  │              │
│  │ tag_type     │     ││ description  ││     │ project ─────┼──►Project    │
│  │ project? ────┼──┐  ││ width        ││     │ created_by   │              │
│  │ created_at   │  │  ││ height       ││     │ created_at   │              │
│  └──────────────┘  │  ││ duration     ││     └──────────────┘              │
│         ▲          │  ││ state        ││            ▲                      │
│         │          │  ││ mime_type    ││            │                      │
│         │ M2M      │  ││ project? ────┼┼────────────┼───────►Project       │
│         │          │  ││ activity? ───┼┼────────────┼───────►Activity      │
│         │          │  ││ gen_request? ┼┼────────────┼───────►GenRequest    │
│         │          │  ││ created_by   ││            │                      │
│         └──────────┼──┼┤ tags ────────┼┘            │                      │
│                    │  ││ collections ─┼─────────────┘ M2M                  │
│                    │  ││ created_at   ││                                   │
│                    │  ││ updated_at   ││                                   │
│                    │  │└──────────────┘│                                   │
│                    │  │       │        │                                   │
│                    │  │       │ 1:N    │                                   │
│                    │  │       ▼        │                                   │
│                    │  │┌──────────────┐│                                   │
│                    │  ││MediaItemRel. ││                                   │
│                    │  │├──────────────┤│                                   │
│                    │  ││ id           ││                                   │
│                    │  ││ media_item ──┼┘                                   │
│                    │  ││ content_type │──────►ContentType                  │
│                    │  ││ object_id    │──────►Any Model (UUID)             │
│                    │  ││ relation_type│                                   │
│                    │  ││ created_at   │                                   │
│                    │  │└──────────────┘                                   │
│                    │  │                                                    │
│                    │  │       │                                            │
│                    │  │       │ Thumbnails                                 │
│                    │  │       ▼                                            │
│                    │  │┌──────────────┐                                   │
│                    └──┼┤  FileAsset   │◄──────────────────────────────────┤
│                       │├──────────────┤         (B22)                     │
│                       ││ storage_path │                                   │
│                       ││ content_type │                                   │
│                       ││ file_size    │                                   │
│                       │└──────────────┘                                   │
│                       │                                                    │
└───────────────────────┴────────────────────────────────────────────────────┘
```

## Models

### MediaItem

Core entity wrapping B22 FileAsset with rich metadata.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto | Primary key |
| file | OneToOneField | FK→FileAsset, CASCADE | Link to B22 storage |
| title | CharField(255) | required | Display title |
| description | TextField | blank | Extended description |
| width | PositiveIntegerField | null | Image/video width in pixels |
| height | PositiveIntegerField | null | Image/video height in pixels |
| duration | DecimalField(10,3) | null | Video duration in seconds |
| state | CharField(20) | choices, default='raw' | Processing state |
| mime_type | CharField(100) | blank | Detected MIME type |
| project | ForeignKey | FK→Project, SET_NULL, null | Owning project scope |
| activity | ForeignKey | FK→Activity, SET_NULL, null | Related activity (match) |
| generation_request | ForeignKey | FK→GenerationRequest, SET_NULL, null | B34 source |
| created_by | ForeignKey | FK→User, SET_NULL, null | Upload user |
| tags | ManyToManyField | M2M→MediaTag | Associated tags |
| collections | ManyToManyField | M2M→Collection, through | Collection membership |
| created_at | DateTimeField | auto_now_add | Creation timestamp |
| updated_at | DateTimeField | auto_now | Last modification |

**State Choices**:
- `raw` - Just uploaded, not processed
- `processing` - Metadata extraction in progress
- `processed` - Ready for use
- `error` - Processing failed
- `archived` - Soft-archived

**Indexes**:
- `project` (filter by project)
- `activity` (filter by activity)
- `state` (filter by state)
- `created_at` (sort by date)
- GIN index on search_vector (full-text)

---

### MediaTag

Categorization labels with scope support.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto | Primary key |
| name | CharField(100) | required | Display name |
| slug | SlugField(100) | required | URL-safe identifier |
| tag_type | CharField(20) | choices, default='manual' | Tag origin |
| project | ForeignKey | FK→Project, CASCADE, null | Scope (null=global) |
| created_at | DateTimeField | auto_now_add | Creation timestamp |

**Tag Type Choices**:
- `system` - Platform-defined, global
- `auto` - Auto-generated (filename, B34)
- `manual` - User-created

**Constraints**:
```python
# Unique global tags
UniqueConstraint(fields=['slug'], condition=Q(project__isnull=True), name='unique_global_tag')
# Unique per-project tags
UniqueConstraint(fields=['slug', 'project'], condition=Q(project__isnull=False), name='unique_project_tag')
```

---

### MediaItemRelation

Generic FK table for flexible M2M context relations.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto | Primary key |
| media_item | ForeignKey | FK→MediaItem, CASCADE | Parent media |
| content_type | ForeignKey | FK→ContentType, CASCADE | Target model type |
| object_id | UUIDField | required | Target object ID |
| relation_type | CharField(50) | choices | Relation semantics |
| created_at | DateTimeField | auto_now_add | Creation timestamp |

**Relation Type Choices**:
- `features` - "Video features Player X"
- `belongs_to` - "Video belongs to Event Y"
- `related_to` - Generic association
- `sponsored_by` - Sponsor link

**Constraints**:
```python
UniqueConstraint(
    fields=['media_item', 'content_type', 'object_id', 'relation_type'],
    name='unique_media_relation'
)
```

---

### Collection

Named grouping of MediaItems.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto | Primary key |
| name | CharField(255) | required | Collection name |
| description | TextField | blank | Description |
| project | ForeignKey | FK→Project, CASCADE | Owning project |
| created_by | ForeignKey | FK→User, SET_NULL, null | Creator |
| items | ManyToManyField | M2M→MediaItem | Collection members |
| created_at | DateTimeField | auto_now_add | Creation timestamp |
| updated_at | DateTimeField | auto_now | Last modification |

---

### Thumbnail (stored as FileAsset)

Thumbnails are stored as B22 FileAsset entries with metadata linking to parent.

| Field | Type | Location | Description |
|-------|------|----------|-------------|
| parent_media_item | - | FileAsset.metadata | Reference to source MediaItem |
| size | - | FileAsset.metadata | Thumbnail size (e.g., "200x200") |
| storage_path | CharField | FileAsset | S3 path to thumbnail |

**Storage Pattern**:
```
thumbnails/{media_item_id}/{size}.{ext}
```

## State Transitions

```
                    ┌─────────┐
                    │   raw   │
                    └────┬────┘
                         │ upload complete
                         ▼
                    ┌─────────────┐
          ┌────────│ processing  │────────┐
          │        └─────────────┘        │
          │ success                  fail │
          ▼                               ▼
    ┌───────────┐                   ┌─────────┐
    │ processed │                   │  error  │
    └─────┬─────┘                   └────┬────┘
          │                              │
          │ user action                  │ retry
          ▼                              │
    ┌───────────┐                        │
    │ archived  │◄───────────────────────┘
    └───────────┘
```

## Validation Rules

1. **MediaItem.file**: Must reference existing FileAsset
2. **MediaTag.slug**: Must be unique within scope (global or project)
3. **MediaItemRelation**: Target object must exist (validated at application level)
4. **Collection.project**: Must match MediaItem.project for items (soft constraint, logged if mismatch)
5. **Thumbnails**: Generated async, failure doesn't block MediaItem creation
