# Smart Asset Library (B35)

The Smart Asset Library is a centralized media management module designed to handle file assets with rich metadata, tagging, and contextual relationships to other system objects.

## Key Features

- **Project Scoped**: All media items belong to a project.
- **Rich Metadata**: Automatic extraction of dimensions, duration, and file attributes.
- **Tagging System**: Hybrid tagging with system-wide and project-specific tags.
- **Context Relations**: Link media items to any other object in the system (e.g., Match, Player, Formation) via `GenericForeignKey`.
- **Collections**: Group media items into ordered collections.

## Data Model

### MediaItem
The core model representing a file asset.
- Wraps `FileAsset` (B22).
- Stores `width`, `height`, `duration`, `mime_type`.
- Tracks processing `state` (PENDING, PROCESSING, READY, ERROR).

### MediaTag
- `name`, `slug`.
- `is_system`: If true, available to all projects.
- `project`: If set, scoped to that project.

### MediaItemRelation
- Connects `MediaItem` to any target object (`content_type`, `object_id`).
- `relation_type`: e.g., "reference", "cover", "evidence".

## API Usage

### Upload & Create

```http
POST /api/v1/media-library/items/
Content-Type: application/json

{
  "project": "uuid",
  "file": "uuid",
  "title": "Match Day 1",
  "tag_names": ["season-2024", "match-day"]
}
```

### Filtering & Search

```http
GET /api/v1/media-library/items/?project_id=...&tags=season-2024
GET /api/v1/media-library/items/?search=match
```

### Context Relations

**Link to a Match:**

```http
POST /api/v1/media-library/items/{id}/add_relation/
{
  "target_type": "activities.match",
  "target_id": "{match_uuid}",
  "relation_type": "highlight"
}
```

## Services

- **MediaTagService**: Handles tag creation, deduplication, and suggestions.
- **MediaItemRelationService**: Manages polymorphic links between media and domain objects.
- **CollectionService**: Manages ordered lists of media items.
