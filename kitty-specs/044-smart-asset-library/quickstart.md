# Quickstart: B35 Smart Asset Library

**Feature Branch**: `044-smart-asset-library`
**Created**: 2026-02-02

## Overview

B35 Smart Asset Library provides Digital Asset Management (DAM) capabilities on top of B22 file storage. It adds rich metadata, tagging, context relations, and smart search.

## Prerequisites

- Django Core-App with B22 File Storage module
- FFmpeg installed (`apt-get install ffmpeg` or equivalent)
- Celery configured (B15)
- PostgreSQL database (for full-text search)

## Installation

### 1. Add to INSTALLED_APPS

```python
# settings/base.py
INSTALLED_APPS = [
    # ... existing apps
    'src.media',  # B35 Smart Asset Library
]
```

### 2. Run Migrations

```bash
python manage.py migrate media
```

### 3. Configure Settings

```python
# settings/base.py

# Thumbnail sizes (width x height)
MEDIA_THUMBNAIL_SIZES = ['200x200', '400x400']

# Video thumbnail extraction timestamp (0.0 - 1.0)
MEDIA_VIDEO_THUMBNAIL_TIMESTAMP = 0.5

# Auto-generate tags from filename
MEDIA_AUTO_TAG_FROM_FILENAME = True
```

### 4. Add URLs

```python
# urls.py
from src.media.urls import urlpatterns as media_urls

urlpatterns = [
    # ... existing urls
    path('api/v1/media/', include(media_urls)),
]
```

## Basic Usage

### Create MediaItem from Upload

```python
from src.media.services import MediaItemService
from src.files.models import FileAsset

# Assuming file already uploaded via B22
file_asset = FileAsset.objects.get(id='...')

# Create MediaItem with auto metadata extraction
media_item = MediaItemService.create_from_file(
    file=file_asset,
    title="Ajax vs PSV Highlights",
    project=project,
    created_by=user,
    tags=['highlight', 'eredivisie']
)
```

### Add Tags

```python
from src.media.services import MediaTagService

# Get or create tags
tag = MediaTagService.get_or_create(slug='goal', project=project)

# Add to media item
media_item.tags.add(tag)
```

### Link to Context (Activity/Player)

```python
from src.media.services import MediaItemRelationService

# Link video to match
MediaItemRelationService.add_relation(
    media_item=media_item,
    target=match_activity,
    relation_type='belongs_to'
)

# Link video to players
for player_membership in featured_players:
    MediaItemRelationService.add_relation(
        media_item=media_item,
        target=player_membership,
        relation_type='features'
    )
```

### Search and Filter

```python
from src.media.services import MediaItemService

# Search by text
results = MediaItemService.search(
    query="Ajax goal",
    project=project
)

# Filter by tags
results = MediaItemService.filter(
    project=project,
    tags=['goal', 'highlight'],
    state='processed'
)

# Filter by related entity
results = MediaItemService.filter_by_relation(
    content_type='activity',
    object_id=match_id
)
```

### Create Collection

```python
from src.media.services import CollectionService

collection = CollectionService.create(
    name="Best Goals 2025",
    project=project,
    created_by=user
)

# Add items
collection.items.add(media_item1, media_item2, media_item3)
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/media/items/` | GET | List media items (with filters) |
| `/api/v1/media/items/` | POST | Create media item |
| `/api/v1/media/items/{id}/` | GET | Get media item details |
| `/api/v1/media/items/{id}/` | PATCH | Update media item |
| `/api/v1/media/items/{id}/tags/` | POST | Add tags |
| `/api/v1/media/items/{id}/relations/` | POST | Add relation |
| `/api/v1/media/items/{id}/thumbnails/` | GET | Get thumbnail URLs |
| `/api/v1/media/tags/` | GET | List available tags |
| `/api/v1/media/tags/` | POST | Create tag |
| `/api/v1/media/collections/` | GET | List collections |
| `/api/v1/media/collections/` | POST | Create collection |
| `/api/v1/media/collections/{id}/items/` | POST | Add items to collection |

## B34 Integration (Auto-Linking)

When B34 generates content, MediaItems are auto-created:

```python
# This happens automatically via signal
# GenerationRequest completes → MediaItem created

# The auto-created MediaItem will have:
# - generation_request FK set
# - project inherited from request
# - activity linked if match_id in input_data
# - auto-generated tag matching template slug
```

## Extension Points

### Custom Relation Types

```python
# In your product app
MEDIA_RELATION_TYPES = [
    ('features', 'Features'),
    ('belongs_to', 'Belongs To'),
    ('sponsored_by', 'Sponsored By'),
    ('training_session', 'Training Session'),  # Custom
]
```

### Custom Tag Types

```python
MEDIA_TAG_TYPES = [
    ('system', 'System'),
    ('auto', 'Auto-generated'),
    ('manual', 'Manual'),
    ('ai_suggested', 'AI Suggested'),  # Custom
]
```

### Custom Thumbnail Sizes

```python
MEDIA_THUMBNAIL_SIZES = ['100x100', '200x200', '400x400', '800x800']
```

## Testing

```bash
# Run B35 tests
pytest src/media/tests/ -v

# With coverage
pytest src/media/tests/ --cov=src/media --cov-report=html
```

## Related Modules

- **B22 File Storage**: Low-level file storage (S3, presigned URLs)
- **B24 Full-Text Search**: Search indexing
- **B30 Activities**: Activity model for context linking
- **B34 Generative Pipelines**: Auto-linking generated content
