---
work_package_id: WP04
work_package_name: Context Relations
priority: P2
estimated_hours: 4
dependencies:
  - WP01
  - B30 Activities
subtasks:
  - id: T017
    title: Create MediaItemRelation model
    priority: P1
    status: done
  - id: T018
    title: Implement MediaItemRelationService
    priority: P1
    status: done
  - id: T019
    title: Add relation endpoints to API
    priority: P1
    status: done
  - id: T020
    title: Validate target object exists
    priority: P2
    status: done
lane: "done"
review_status: approved
reviewed_by: github-copilot
assignee: "copilot"
agent: "copilot"
shell_pid: "12345"
---


# WP04: Context Relations

## Goal
Enable linking media items to activities, players, matches, and other domain entities via a flexible generic FK table.

## Context

### Design Documents
- **Research**: See `research.md` - "Hybrid Context Relations" decision
- **Data Model**: MediaItemRelation for generic FK, explicit FKs on MediaItem for hot paths

### Architecture Decision
**Hybrid Approach**:
1. **Explicit FKs** on MediaItem for common relations (project, activity, generation_request)
2. **Generic FK table** (MediaItemRelation) for extensibility (Player, Match, Competition, etc.)

This allows:
- Fast queries for 80% use case (activity lookup)
- Full flexibility for TeamReel extensions

## Implementation Details

### T017: MediaItemRelation Model
Create model at `src/assets/models.py`:

```python
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType

class MediaItemRelation(TimeStampedModel):
    """Generic relation linking media items to any model."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    media_item = models.ForeignKey(
        MediaItem,
        on_delete=models.CASCADE,
        related_name="relations"
    )

    # Generic FK target
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField()
    target = GenericForeignKey("content_type", "object_id")

    # Relation metadata
    relation_type = models.CharField(max_length=50, default="related")
    metadata = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )

    class Meta:
        unique_together = [("media_item", "content_type", "object_id")]
        indexes = [
            models.Index(fields=["content_type", "object_id"]),
        ]

    def __str__(self):
        return f"{self.media_item_id} → {self.content_type.model}:{self.object_id}"
```

**Allowed Relation Types**:
- `related` - General relation
- `cover` - Cover image for entity
- `avatar` - Profile/avatar image
- `highlight` - Highlighted content
- `source` - Original source material

### T018: MediaItemRelationService
Create service at `src/assets/services/relations.py`:

```python
from django.contrib.contenttypes.models import ContentType
from ..models import MediaItem, MediaItemRelation

# Whitelist of allowed target models for security
ALLOWED_TARGETS = {
    "activities.activity",
    "matches.match",
    "players.player",
    "competitions.competition",
    "organizations.organization",
}

class MediaItemRelationService:
    @staticmethod
    def validate_target(content_type: ContentType, object_id: str) -> bool:
        """Validate target exists and is allowed."""
        model_key = f"{content_type.app_label}.{content_type.model}"

        if model_key not in ALLOWED_TARGETS:
            raise ValueError(f"Cannot link media to {model_key}")

        # Check object exists
        model_class = content_type.model_class()
        if not model_class.objects.filter(pk=object_id).exists():
            raise ValueError(f"{content_type.model} with id {object_id} not found")

        return True

    @staticmethod
    def create_relation(
        media_item: MediaItem,
        target_model: str,  # e.g., "activities.activity"
        target_id: str,
        relation_type: str = "related",
        user=None,
        metadata: dict = None
    ) -> MediaItemRelation:
        """Create a relation between media item and target."""
        app_label, model = target_model.lower().split(".")
        content_type = ContentType.objects.get(app_label=app_label, model=model)

        MediaItemRelationService.validate_target(content_type, target_id)

        relation, created = MediaItemRelation.objects.get_or_create(
            media_item=media_item,
            content_type=content_type,
            object_id=target_id,
            defaults={
                "relation_type": relation_type,
                "created_by": user,
                "metadata": metadata or {},
            }
        )

        return relation

    @staticmethod
    def get_media_for_target(target_model: str, target_id: str) -> QuerySet:
        """Get all media items linked to a target."""
        app_label, model = target_model.lower().split(".")
        content_type = ContentType.objects.get(app_label=app_label, model=model)

        return MediaItem.objects.filter(
            relations__content_type=content_type,
            relations__object_id=target_id
        ).distinct()

    @staticmethod
    def get_relations_for_item(media_item: MediaItem) -> list[dict]:
        """Get all relations for a media item with resolved targets."""
        relations = media_item.relations.select_related("content_type")
        result = []

        for rel in relations:
            result.append({
                "id": str(rel.id),
                "target_type": f"{rel.content_type.app_label}.{rel.content_type.model}",
                "target_id": str(rel.object_id),
                "relation_type": rel.relation_type,
                "metadata": rel.metadata,
            })

        return result

    @staticmethod
    def delete_relation(relation_id: str):
        """Delete a relation."""
        MediaItemRelation.objects.filter(id=relation_id).delete()
```

### T019: Relation API Endpoints
Add views at `src/assets/views.py`:

```python
class MediaItemRelationViewSet(viewsets.ModelViewSet):
    serializer_class = MediaItemRelationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        media_item_id = self.kwargs.get("media_item_pk")
        return MediaItemRelation.objects.filter(
            media_item_id=media_item_id,
            media_item__project__memberships__user=self.request.user
        )

    def perform_create(self, serializer):
        media_item_id = self.kwargs.get("media_item_pk")
        media_item = get_object_or_404(MediaItem, pk=media_item_id)

        # Verify user access
        if not media_item.project.memberships.filter(user=self.request.user).exists():
            raise PermissionDenied()

        # Validate and create
        target_type = self.request.data.get("target_type")
        target_id = self.request.data.get("target_id")

        relation = MediaItemRelationService.create_relation(
            media_item=media_item,
            target_model=target_type,
            target_id=target_id,
            relation_type=self.request.data.get("relation_type", "related"),
            user=self.request.user,
            metadata=self.request.data.get("metadata", {})
        )

        serializer.instance = relation


class TargetMediaView(APIView):
    """Get media items for any linkable target."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """GET /api/v1/assets/target-media/?target_type=matches.match&target_id=<uuid>"""
        target_type = request.query_params.get("target_type")
        target_id = request.query_params.get("target_id")

        if not target_type or not target_id:
            return Response(
                {"error": "target_type and target_id required"},
                status=400
            )

        items = MediaItemRelationService.get_media_for_target(target_type, target_id)
        # Filter by user access
        items = items.filter(project__memberships__user=request.user)

        serializer = MediaItemSerializer(items, many=True)
        return Response(serializer.data)
```

### T020: URL Configuration
Add nested routes:

```python
# src/assets/urls.py
from rest_framework_nested import routers

router = DefaultRouter()
router.register("media", MediaItemViewSet, basename="media-item")

# Nested routes for relations
media_router = routers.NestedDefaultRouter(router, "media", lookup="media_item")
media_router.register("relations", MediaItemRelationViewSet, basename="media-relations")

urlpatterns = [
    path("", include(router.urls)),
    path("", include(media_router.urls)),
    path("target-media/", TargetMediaView.as_view(), name="target-media"),
]
```

## Acceptance Criteria

- [ ] Link media item to Match → relation created
- [ ] Query media for Match → returns linked items
- [ ] Invalid target type → rejected with error
- [ ] Non-existent target → rejected with error
- [ ] Relations respect project isolation

## Testing Notes

- Test all allowed target types
- Test target validation (reject non-whitelisted models)
- Test object existence validation
- Test duplicate relation prevention
- Test reverse query (target → media)

## Activity Log

- 2026-02-02T20:13:58Z – copilot – shell_pid= – lane=doing – Restarting implementation to address feedback
