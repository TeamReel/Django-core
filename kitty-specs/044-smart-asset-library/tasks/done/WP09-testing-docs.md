---
work_package_id: WP09
work_package_name: Testing & Documentation
priority: P1
estimated_hours: 6
dependencies:
  - WP01
  - WP02
  - WP03
  - WP04
  - WP05
  - WP06
  - WP07
  - WP08
subtasks:
  - id: T037
    title: Model unit tests (≥90% coverage)
    priority: P1
    status: done
  - id: T038
    title: API endpoint tests (≥85% coverage)
    priority: P1
    status: done
  - id: T039
    title: Integration tests (upload → tag → link → search)
    priority: P1
    status: done
  - id: T040
    title: Write module README.md
    priority: P1
    status: done
  - id: T041
    title: Update extension guide with B35 examples
    priority: P2
    status: done
lane: planned
---

# WP09: Testing & Documentation

## Goal
Comprehensive test coverage and documentation for the Smart Asset Library module.

## Context

### Coverage Targets
- Models: ≥90%
- API Endpoints: ≥85%
- Services: ≥85%
- Overall module: ≥85%

### Documentation Deliverables
1. Module README.md with setup and usage
2. API documentation (integrated with existing docs)
3. Extension guide for TeamReel integration

## Implementation Details

### T037: Model Unit Tests
Create tests at `tests/assets/test_models.py`:

```python
import pytest
from django.utils import timezone
from decimal import Decimal

from assets.models import (
    MediaItem, MediaItemState, MediaTag,
    Collection, CollectionMembership, MediaItemRelation, Thumbnail
)


@pytest.mark.django_db
class TestMediaItemModel:

    def test_create_media_item(self, project, user, file_asset):
        """Test basic MediaItem creation."""
        item = MediaItem.objects.create(
            project=project,
            file=file_asset,
            title="Test Video",
            mime_type="video/mp4",
            file_size_bytes=1024000,
            created_by=user,
        )

        assert item.id is not None
        assert item.state == MediaItemState.PENDING
        assert item.project == project

    def test_media_item_state_transitions(self, media_item):
        """Test state field transitions."""
        assert media_item.state == MediaItemState.PENDING

        media_item.state = MediaItemState.PROCESSING
        media_item.save()
        media_item.refresh_from_db()
        assert media_item.state == MediaItemState.PROCESSING

        media_item.state = MediaItemState.READY
        media_item.save()
        media_item.refresh_from_db()
        assert media_item.state == MediaItemState.READY

    def test_media_item_dimensions(self, media_item):
        """Test dimension fields."""
        media_item.width = 1920
        media_item.height = 1080
        media_item.duration_seconds = Decimal("120.50")
        media_item.save()

        media_item.refresh_from_db()
        assert media_item.width == 1920
        assert media_item.height == 1080
        assert media_item.duration_seconds == Decimal("120.50")

    def test_media_item_ordering(self, project, file_asset, user):
        """Test default ordering is -created."""
        item1 = MediaItem.objects.create(
            project=project, file=file_asset, title="First",
            mime_type="image/jpeg", file_size_bytes=1000, created_by=user,
        )
        item2 = MediaItem.objects.create(
            project=project, file=file_asset, title="Second",
            mime_type="image/jpeg", file_size_bytes=1000, created_by=user,
        )

        items = list(MediaItem.objects.filter(project=project))
        assert items[0] == item2  # Newer first
        assert items[1] == item1


@pytest.mark.django_db
class TestMediaTagModel:

    def test_create_system_tag(self):
        """Test system tag creation."""
        tag = MediaTag.objects.create(
            name="AI Generated",
            slug="ai-generated",
            project=None,
            is_system=True,
        )

        assert tag.is_system is True
        assert tag.project is None

    def test_create_project_tag(self, project):
        """Test project-scoped tag creation."""
        tag = MediaTag.objects.create(
            name="Match Highlights",
            slug="match-highlights",
            project=project,
            is_system=False,
        )

        assert tag.is_system is False
        assert tag.project == project

    def test_auto_slug_generation(self, project):
        """Test slug is auto-generated from name."""
        tag = MediaTag(name="Training Session", project=project)
        tag.save()

        assert tag.slug == "training-session"

    def test_tag_uniqueness_per_project(self, project):
        """Test same slug allowed in different projects."""
        from projects.models import Project

        project2 = Project.objects.create(name="Another Project")

        tag1 = MediaTag.objects.create(
            name="Highlights", slug="highlights", project=project
        )
        tag2 = MediaTag.objects.create(
            name="Highlights", slug="highlights", project=project2
        )

        assert tag1.id != tag2.id


@pytest.mark.django_db
class TestCollectionModel:

    def test_create_collection(self, project, user):
        """Test collection creation."""
        collection = Collection.objects.create(
            project=project,
            name="Match Day Gallery",
            description="Photos from the match",
            created_by=user,
        )

        assert collection.id is not None
        assert collection.project == project

    def test_collection_membership_ordering(self, collection, media_item):
        """Test items maintain position order."""
        from assets.models import CollectionMembership

        item2 = MediaItem.objects.create(
            project=collection.project,
            file=media_item.file,
            title="Second",
            mime_type="image/jpeg",
            file_size_bytes=1000,
        )

        CollectionMembership.objects.create(
            collection=collection, media_item=media_item, position=1
        )
        CollectionMembership.objects.create(
            collection=collection, media_item=item2, position=0
        )

        items = list(collection.items.order_by("collectionmembership__position"))
        assert items[0] == item2  # position 0
        assert items[1] == media_item  # position 1


@pytest.mark.django_db
class TestMediaItemRelationModel:

    def test_create_relation(self, media_item, activity):
        """Test creating generic relation."""
        from django.contrib.contenttypes.models import ContentType

        ct = ContentType.objects.get_for_model(activity)

        relation = MediaItemRelation.objects.create(
            media_item=media_item,
            content_type=ct,
            object_id=activity.id,
            relation_type="related",
        )

        assert relation.target == activity

    def test_relation_uniqueness(self, media_item, activity):
        """Test duplicate relations prevented."""
        from django.contrib.contenttypes.models import ContentType
        from django.db import IntegrityError

        ct = ContentType.objects.get_for_model(activity)

        MediaItemRelation.objects.create(
            media_item=media_item,
            content_type=ct,
            object_id=activity.id,
        )

        with pytest.raises(IntegrityError):
            MediaItemRelation.objects.create(
                media_item=media_item,
                content_type=ct,
                object_id=activity.id,
            )
```

### T038: API Endpoint Tests
Create tests at `tests/assets/test_api.py`:

```python
import pytest
from rest_framework.test import APIClient
from rest_framework import status

from assets.models import MediaItem, MediaTag, Collection


@pytest.fixture
def api_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestMediaItemAPI:

    def test_list_media_items(self, api_client, media_item):
        """Test listing media items."""
        response = api_client.get("/api/v1/assets/media/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) >= 1

    def test_list_filters_by_project(self, api_client, media_item, other_project):
        """Test items filtered to user's projects."""
        # Create item in other project (user doesn't have access)
        other_item = MediaItem.objects.create(
            project=other_project,
            file=media_item.file,
            title="Other",
            mime_type="image/jpeg",
            file_size_bytes=1000,
        )

        response = api_client.get("/api/v1/assets/media/")

        ids = [item["id"] for item in response.data["results"]]
        assert str(media_item.id) in ids
        assert str(other_item.id) not in ids

    def test_create_media_item(self, api_client, project, file_asset):
        """Test creating media item via API."""
        data = {
            "project": str(project.id),
            "file": str(file_asset.id),
            "title": "New Upload",
            "mime_type": "image/jpeg",
            "file_size_bytes": 2048,
        }

        response = api_client.post("/api/v1/assets/media/", data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["title"] == "New Upload"

    def test_retrieve_media_item(self, api_client, media_item):
        """Test retrieving single item."""
        response = api_client.get(f"/api/v1/assets/media/{media_item.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == str(media_item.id)

    def test_search_media_items(self, api_client, media_item):
        """Test full-text search."""
        media_item.title = "Ajax Training Session"
        media_item.save()

        response = api_client.get("/api/v1/assets/media/?q=ajax")

        assert response.status_code == status.HTTP_200_OK
        assert any(item["id"] == str(media_item.id) for item in response.data["results"])

    def test_filter_by_tags(self, api_client, media_item):
        """Test filtering by tags."""
        tag = MediaTag.objects.create(
            name="training", slug="training", project=media_item.project
        )
        media_item.tags.add(tag)

        response = api_client.get("/api/v1/assets/media/?tags=training")

        assert response.status_code == status.HTTP_200_OK
        assert any(item["id"] == str(media_item.id) for item in response.data["results"])


@pytest.mark.django_db
class TestMediaTagAPI:

    def test_list_tags(self, api_client, project):
        """Test listing available tags."""
        # Create system tag
        MediaTag.objects.create(
            name="System Tag", slug="system-tag", is_system=True
        )
        # Create project tag
        MediaTag.objects.create(
            name="Project Tag", slug="project-tag", project=project
        )

        response = api_client.get(f"/api/v1/assets/tags/?project={project.id}")

        assert response.status_code == status.HTTP_200_OK
        slugs = [t["slug"] for t in response.data]
        assert "system-tag" in slugs
        assert "project-tag" in slugs

    def test_create_project_tag(self, api_client, project):
        """Test creating project-scoped tag."""
        data = {
            "name": "New Tag",
            "project": str(project.id),
        }

        response = api_client.post("/api/v1/assets/tags/", data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["slug"] == "new-tag"


@pytest.mark.django_db
class TestCollectionAPI:

    def test_create_collection(self, api_client, project):
        """Test creating collection."""
        data = {
            "name": "My Gallery",
            "project": str(project.id),
        }

        response = api_client.post("/api/v1/assets/collections/", data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "My Gallery"

    def test_add_items_to_collection(self, api_client, collection, media_item):
        """Test adding items to collection."""
        data = {"item_ids": [str(media_item.id)]}

        response = api_client.post(
            f"/api/v1/assets/collections/{collection.id}/items/",
            data
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["added"] == 1

    def test_list_collection_items(self, api_client, collection, media_item):
        """Test listing collection items."""
        collection.items.add(media_item)

        response = api_client.get(
            f"/api/v1/assets/collections/{collection.id}/items/"
        )

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
```

### T039: Integration Tests
Create integration tests at `tests/assets/test_integration.py`:

```python
import pytest
from unittest.mock import patch, MagicMock

from assets.models import MediaItem, MediaItemState, MediaTag
from assets.tasks import process_media_item
from assets.services.metadata import extract_image_metadata


@pytest.mark.django_db
class TestUploadToSearchFlow:
    """End-to-end integration tests."""

    @patch("assets.services.metadata.extract_image_metadata")
    def test_full_upload_flow(self, mock_extract, api_client, project, file_asset):
        """Test: Upload → Metadata Extraction → Tag → Search."""
        # Mock metadata extraction
        mock_extract.return_value = {
            "width": 1920,
            "height": 1080,
            "format": "JPEG",
        }

        # 1. Upload (create media item)
        upload_data = {
            "project": str(project.id),
            "file": str(file_asset.id),
            "title": "Ajax Match Highlight",
            "mime_type": "image/jpeg",
            "file_size_bytes": 50000,
        }

        response = api_client.post("/api/v1/assets/media/", upload_data)
        assert response.status_code == 201
        item_id = response.data["id"]

        # 2. Simulate async task (normally Celery)
        process_media_item(item_id)

        # Verify metadata extracted
        item = MediaItem.objects.get(id=item_id)
        assert item.state == MediaItemState.READY
        assert item.width == 1920

        # 3. Add tags
        tag_data = {"tags": ["highlight", "ajax"]}
        response = api_client.post(
            f"/api/v1/assets/media/{item_id}/tags/",
            tag_data
        )
        assert response.status_code == 200

        # 4. Search
        response = api_client.get("/api/v1/assets/media/?q=ajax")
        assert response.status_code == 200

        found_ids = [i["id"] for i in response.data["results"]]
        assert item_id in found_ids

        # 5. Filter by tag
        response = api_client.get("/api/v1/assets/media/?tags=highlight")
        assert response.status_code == 200

        found_ids = [i["id"] for i in response.data["results"]]
        assert item_id in found_ids

    def test_collection_workflow(self, api_client, project, media_item):
        """Test: Create collection → Add items → Reorder → Remove."""
        # Create collection
        response = api_client.post("/api/v1/assets/collections/", {
            "name": "Best Moments",
            "project": str(project.id),
        })
        collection_id = response.data["id"]

        # Create additional items
        item2 = MediaItem.objects.create(
            project=project, file=media_item.file, title="Item 2",
            mime_type="image/jpeg", file_size_bytes=1000,
        )
        item3 = MediaItem.objects.create(
            project=project, file=media_item.file, title="Item 3",
            mime_type="image/jpeg", file_size_bytes=1000,
        )

        # Add items
        api_client.post(f"/api/v1/assets/collections/{collection_id}/items/", {
            "item_ids": [str(media_item.id), str(item2.id), str(item3.id)]
        })

        # Verify order
        response = api_client.get(f"/api/v1/assets/collections/{collection_id}/items/")
        ids = [i["id"] for i in response.data]
        assert ids == [str(media_item.id), str(item2.id), str(item3.id)]

        # Reorder
        api_client.put(f"/api/v1/assets/collections/{collection_id}/items/", {
            "item_ids": [str(item3.id), str(media_item.id), str(item2.id)]
        })

        # Verify new order
        response = api_client.get(f"/api/v1/assets/collections/{collection_id}/items/")
        ids = [i["id"] for i in response.data]
        assert ids == [str(item3.id), str(media_item.id), str(item2.id)]

        # Remove item
        api_client.delete(f"/api/v1/assets/collections/{collection_id}/items/", {
            "item_ids": [str(item2.id)]
        })

        response = api_client.get(f"/api/v1/assets/collections/{collection_id}/items/")
        assert len(response.data) == 2
```

### T040: Module README
Create README at `src/assets/README.md`:

```markdown
# B35 Smart Asset Library

Digital Asset Management (DAM) module for managing media files with tagging,
search, and context linking capabilities.

## Features

- **Media Items**: Upload and manage images/videos with automatic metadata extraction
- **Tagging**: System-global and project-scoped tags for organization
- **Collections**: Group media into named, ordered collections
- **Search**: Full-text search with multi-faceted filtering
- **Context Linking**: Link media to activities, matches, players via generic FK
- **B34 Integration**: Auto-create MediaItem when AI generates content
- **Thumbnails**: Auto-generated preview images at multiple sizes

## Quick Start

### Installation

Add to `INSTALLED_APPS`:
```python
INSTALLED_APPS = [
    ...
    "assets",
]
```

Run migrations:
```bash
python manage.py migrate assets
python manage.py setup_system_tags
```

### Basic Usage

```python
from assets.models import MediaItem, MediaTag
from assets.services.tags import MediaTagService

# Create media item
item = MediaItem.objects.create(
    project=project,
    file=file_asset,
    title="Training Video",
    mime_type="video/mp4",
    file_size_bytes=10240000,
)

# Add tags
MediaTagService.tag_media_item(item, ["training", "highlight"])

# Search
from assets.services.search import MediaSearchService
results = MediaSearchService.search("training", user=request.user)
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/assets/media/` | GET | List media items |
| `/api/v1/assets/media/` | POST | Create media item |
| `/api/v1/assets/media/{id}/` | GET | Get media item |
| `/api/v1/assets/media/{id}/tags/` | POST | Add tags |
| `/api/v1/assets/tags/` | GET | List available tags |
| `/api/v1/assets/collections/` | GET/POST | List/create collections |
| `/api/v1/assets/search/` | GET | Advanced search |

See `contracts/openapi.yaml` for full API documentation.

## Configuration

```python
# settings.py

# Thumbnail sizes (default)
ASSETS_THUMBNAIL_SIZES = {
    "small": (200, 200),
    "medium": (400, 400),
    "large": (800, 800),
}

# Allowed relation target models
ASSETS_ALLOWED_TARGETS = [
    "activities.activity",
    "matches.match",
    "players.player",
]
```

## Dependencies

- B07 Projects (required)
- B08 Authentication (required)
- B22 File Storage (required)
- B24 Search (optional, enhances search)
- B30 Activities (optional, for activity linking)
- B34 Generative Pipelines (optional, for auto-linking)
- Pillow (image metadata)
- FFmpeg (video metadata/thumbnails)
```

### T041: Extension Guide Update
Add B35 section to extension guide (wherever that lives):

```markdown
## B35 Smart Asset Library Integration

### TeamReel Use Cases

#### Linking Media to Matches
```python
from assets.services.relations import MediaItemRelationService

# Link highlight video to match
MediaItemRelationService.create_relation(
    media_item=highlight_video,
    target_model="matches.match",
    target_id=str(match.id),
    relation_type="highlight",
)

# Get all media for a match
match_media = MediaItemRelationService.get_media_for_target(
    "matches.match", str(match.id)
)
```

#### Custom Auto-Tagging for Lineup Videos
```python
# In teamreel/signals.py
from django.dispatch import receiver
from assets.signals import auto_create_media_item_signal

@receiver(auto_create_media_item_signal)
def add_teamreel_tags(sender, media_item, generation_output, **kwargs):
    """Add TeamReel-specific tags based on template."""
    template = generation_output.generation_request.template

    if "lineup" in template.slug:
        # Extract team from input variables
        input_vars = generation_output.generation_request.input_variables
        if "team_name" in input_vars:
            MediaTagService.tag_media_item(
                media_item,
                [f"team-{input_vars['team_name'].lower()}"]
            )
```
```

## Acceptance Criteria

- [ ] Model tests: ≥90% coverage
- [ ] API tests: ≥85% coverage
- [ ] Integration tests pass
- [ ] README complete and accurate
- [ ] Extension guide has B35 examples
- [ ] All tests pass in CI

## Testing Notes

- Run coverage: `pytest --cov=assets --cov-report=html`
- Run specific test file: `pytest tests/assets/test_models.py -v`
- Run integration tests: `pytest tests/assets/test_integration.py -v`

## Review Report
**Date:** 2026-02-03
**Reviewer:** GitHub Copilot (Agent)

### Coverage Verification
| Component | Target | Actual | Status |
|-----------|--------|--------|--------|
| Models | 90% | 97% |  PASS |
| API | 85% | 98% |  PASS |
| Services | 85% | 88% (Avg) |  PASS |

### Deliverables Check
- [x] T037: Model Tests (src/medialib/tests/test_models.py)
- [x] T038: API Tests (src/medialib/tests/test_api.py)
- [x] T039: Integration Flow (Added 	est_integration_flow)
- [x] T040: Module README (src/medialib/README.md)
- [x] T041: Extension Guide (documents/04-modules/B35-smart-asset-library/extension-guide.md)

### Conclusion
All acceptance criteria met. WP09 is approved.
