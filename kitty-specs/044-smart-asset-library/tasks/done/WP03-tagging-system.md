---
work_package_id: WP03
work_package_name: Tagging System
priority: P2
estimated_hours: 3
dependencies:
  - WP01
subtasks:
  - id: T013
    title: Implement MediaTagService
    priority: P1
    status: completed
  - id: T014
    title: Implement auto-tagging from filename
    priority: P2
    status: completed
  - id: T015
    title: Add tag management endpoints
    priority: P1
    status: completed
  - id: T016
    title: Wire tags to MediaItem M2M
    priority: P1
    status: completed
lane: done
review_status: "approved without changes"
reviewed_by: "copilot-reviewer"
---

# WP03: Tagging System

## Goal
Implement full tagging functionality with hybrid scope support (system-global tags + project-scoped user tags).

## Context

### Design Documents
- **Research**: See `research.md` - "Hybrid approach" decision
- **Data Model**: MediaTag model with project FK (NULL = system tag)
- **Spec**: FR-021 through FR-028

### Scope Rules
1. **System Tags** (`project=NULL, is_system=True`): Admin-created, visible to all projects
2. **Project Tags** (`project=<uuid>`): User-created, visible only within that project
3. **Available Tags**: Union of system tags + current project's tags

## Implementation Details

### T013: MediaTagService
Create service at `src/assets/services/tags.py`:

```python
from django.db.models import Q
from ..models import MediaTag

class MediaTagService:
    @staticmethod
    def get_available_tags(project_id: str) -> QuerySet:
        """Get all tags available for a project (system + project-specific)."""
        return MediaTag.objects.filter(
            Q(is_system=True) | Q(project_id=project_id)
        ).order_by("name")

    @staticmethod
    def get_or_create_tag(name: str, project_id: str) -> tuple[MediaTag, bool]:
        """Get or create a project-scoped tag.

        Returns (tag, created) tuple.
        System tags cannot be created through this method.
        """
        from django.utils.text import slugify

        slug = slugify(name)

        # Check if system tag with this slug exists
        system_tag = MediaTag.objects.filter(slug=slug, is_system=True).first()
        if system_tag:
            return system_tag, False

        # Check if project tag exists
        project_tag, created = MediaTag.objects.get_or_create(
            slug=slug,
            project_id=project_id,
            defaults={
                "name": name,
                "is_system": False
            }
        )
        return project_tag, created

    @staticmethod
    def create_system_tag(name: str) -> MediaTag:
        """Create a system-wide tag (admin only)."""
        from django.utils.text import slugify

        return MediaTag.objects.create(
            name=name,
            slug=slugify(name),
            project=None,
            is_system=True
        )

    @staticmethod
    def tag_media_item(item, tag_names: list[str]) -> list[MediaTag]:
        """Add tags to a media item by name."""
        tags = []
        for name in tag_names:
            tag, _ = MediaTagService.get_or_create_tag(name, str(item.project_id))
            tags.append(tag)

        item.tags.add(*tags)
        return tags

    @staticmethod
    def remove_tags(item, tag_ids: list[str]):
        """Remove specific tags from item."""
        item.tags.remove(*tag_ids)
```

### T014: Auto-Tagging from Filename
Add filename parsing for automatic tag suggestions:

```python
import re

def suggest_tags_from_filename(filename: str) -> list[str]:
    """Extract potential tag names from filename."""
    suggestions = []

    # Remove extension
    name = filename.rsplit(".", 1)[0]

    # Common patterns
    patterns = {
        r"match[_-]?(\d+)": "match",
        r"training[_-]?(\d+)?": "training",
        r"highlight": "highlight",
        r"goal": "goal",
        r"lineup": "lineup",
        r"preview": "preview",
        r"avatar|profile": "profile",
        r"logo": "logo",
        r"(\d{4})[_-](\d{2})[_-](\d{2})": "dated",  # Date pattern
    }

    for pattern, tag in patterns.items():
        if re.search(pattern, name, re.IGNORECASE):
            suggestions.append(tag)

    # Extract words (split on underscore, hyphen, space)
    words = re.split(r"[_\-\s]+", name)
    for word in words:
        if len(word) >= 3 and word.isalpha():
            suggestions.append(word.lower())

    return list(set(suggestions))[:5]  # Max 5 suggestions
```

### T015: Tag API Endpoints
Add to `src/assets/views.py`:

```python
class MediaTagViewSet(viewsets.ModelViewSet):
    serializer_class = MediaTagSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return available tags for user's projects."""
        project_id = self.request.query_params.get("project")

        if project_id:
            # Tags for specific project
            return MediaTagService.get_available_tags(project_id)
        else:
            # All accessible tags (system + all user's projects)
            user_projects = self.request.user.project_memberships.values_list(
                "project_id", flat=True
            )
            return MediaTag.objects.filter(
                Q(is_system=True) | Q(project_id__in=user_projects)
            ).distinct()

    def perform_create(self, serializer):
        """Create project-scoped tag."""
        project_id = self.request.data.get("project")
        if not project_id:
            raise ValidationError({"project": "Required for creating tags"})

        # Verify user has access to project
        if not self.request.user.project_memberships.filter(project_id=project_id).exists():
            raise PermissionDenied()

        serializer.save(project_id=project_id, is_system=False)


class MediaItemTagsView(APIView):
    """Manage tags on a specific media item."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        """Add tags to media item."""
        item = get_object_or_404(MediaItem, pk=pk)
        self.check_object_permissions(request, item)

        tag_names = request.data.get("tags", [])
        tags = MediaTagService.tag_media_item(item, tag_names)

        return Response({
            "added": [{"id": t.id, "name": t.name} for t in tags]
        })

    def delete(self, request, pk):
        """Remove tags from media item."""
        item = get_object_or_404(MediaItem, pk=pk)
        self.check_object_permissions(request, item)

        tag_ids = request.data.get("tag_ids", [])
        MediaTagService.remove_tags(item, tag_ids)

        return Response(status=204)
```

### T016: URL Configuration
Add to `src/assets/urls.py`:

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MediaItemViewSet, MediaTagViewSet, MediaItemTagsView

router = DefaultRouter()
router.register("media", MediaItemViewSet, basename="media-item")
router.register("tags", MediaTagViewSet, basename="media-tag")

urlpatterns = [
    path("", include(router.urls)),
    path("media/<uuid:pk>/tags/", MediaItemTagsView.as_view(), name="media-item-tags"),
]
```

## Acceptance Criteria

- [ ] Create tag → appears in project's tag list
- [ ] Add tag to item → tag linked via M2M
- [ ] Filter items by tag → correct results
- [ ] System tags visible across all projects
- [ ] Project tags isolated to their project
- [ ] Auto-suggest returns reasonable tags from filename

## Testing Notes

- Test scope isolation (project A tag not visible in project B)
- Test system tag visibility (visible everywhere)
- Test duplicate handling (same name in different projects OK)
- Test slug uniqueness within scope
