---
work_package_id: WP05
work_package_name: Collections
priority: P2
estimated_hours: 2
dependencies:
  - WP01
subtasks:
  - id: T021
    title: Implement CollectionService
    priority: P1
    status: not-started
  - id: T022
    title: Add Collection ViewSet with CRUD
    priority: P1
    status: not-started
  - id: T023
    title: Add/remove items endpoints with position support
    priority: P1
    status: not-started
lane: planned
---

# WP05: Collections

## Goal
Enable grouping media items into named collections with manual ordering support.

## Context

### Design Documents
- **Data Model**: Collection model with CollectionMembership through table
- **Spec**: FR-041 through FR-050

### Use Cases
- "Match Day Gallery" - curated photos for a match
- "Training Week 12" - all training media from a week
- "Top Highlights 2024" - best-of compilation source

## Implementation Details

### T021: CollectionService
Create service at `src/assets/services/collections.py`:

```python
from django.db import transaction
from ..models import Collection, CollectionMembership, MediaItem

class CollectionService:
    @staticmethod
    def create_collection(
        project_id: str,
        name: str,
        description: str = "",
        user=None
    ) -> Collection:
        """Create a new collection."""
        return Collection.objects.create(
            project_id=project_id,
            name=name,
            description=description,
            created_by=user
        )

    @staticmethod
    def add_items(
        collection: Collection,
        item_ids: list[str],
        position_start: int = None
    ) -> list[CollectionMembership]:
        """Add items to collection.

        If position_start is provided, items are inserted at that position.
        Otherwise, items are appended to the end.
        """
        if position_start is None:
            # Get current max position
            max_pos = collection.collectionmembership_set.aggregate(
                max=models.Max("position")
            )["max"] or 0
            position_start = max_pos + 1

        memberships = []
        for i, item_id in enumerate(item_ids):
            # Verify item belongs to same project
            item = MediaItem.objects.filter(
                id=item_id,
                project_id=collection.project_id
            ).first()

            if not item:
                continue  # Skip invalid/inaccessible items

            membership, created = CollectionMembership.objects.get_or_create(
                collection=collection,
                media_item=item,
                defaults={"position": position_start + i}
            )
            if not created:
                # Update position if already exists
                membership.position = position_start + i
                membership.save(update_fields=["position"])

            memberships.append(membership)

        return memberships

    @staticmethod
    def remove_items(collection: Collection, item_ids: list[str]) -> int:
        """Remove items from collection. Returns count removed."""
        return CollectionMembership.objects.filter(
            collection=collection,
            media_item_id__in=item_ids
        ).delete()[0]

    @staticmethod
    @transaction.atomic
    def reorder_items(collection: Collection, ordered_item_ids: list[str]):
        """Reorder items in collection based on provided order."""
        for position, item_id in enumerate(ordered_item_ids):
            CollectionMembership.objects.filter(
                collection=collection,
                media_item_id=item_id
            ).update(position=position)

    @staticmethod
    def get_items(collection: Collection) -> list[MediaItem]:
        """Get collection items in order."""
        return MediaItem.objects.filter(
            collectionmembership__collection=collection
        ).order_by("collectionmembership__position")

    @staticmethod
    def duplicate_collection(
        collection: Collection,
        new_name: str = None,
        user=None
    ) -> Collection:
        """Create a copy of collection with all items."""
        new_collection = Collection.objects.create(
            project=collection.project,
            name=new_name or f"{collection.name} (Copy)",
            description=collection.description,
            created_by=user
        )

        # Copy memberships
        memberships = collection.collectionmembership_set.all()
        new_memberships = [
            CollectionMembership(
                collection=new_collection,
                media_item=m.media_item,
                position=m.position
            )
            for m in memberships
        ]
        CollectionMembership.objects.bulk_create(new_memberships)

        return new_collection
```

### T022: Collection ViewSet
Add ViewSet at `src/assets/views.py`:

```python
class CollectionSerializer(serializers.ModelSerializer):
    item_count = serializers.SerializerMethodField()
    items = serializers.SerializerMethodField()

    class Meta:
        model = Collection
        fields = [
            "id", "name", "description", "item_count",
            "items", "created", "modified"
        ]
        read_only_fields = ["id", "created", "modified"]

    def get_item_count(self, obj):
        return obj.collectionmembership_set.count()

    def get_items(self, obj):
        # Only include items if requested via ?expand=items
        request = self.context.get("request")
        if request and request.query_params.get("expand") == "items":
            items = CollectionService.get_items(obj)
            return MediaItemSerializer(items, many=True, context=self.context).data
        return None


class CollectionViewSet(viewsets.ModelViewSet):
    serializer_class = CollectionSerializer
    permission_classes = [IsAuthenticated, HasProjectAccess]

    def get_queryset(self):
        project_id = self.request.query_params.get("project")
        qs = Collection.objects.filter(
            project__memberships__user=self.request.user
        ).prefetch_related("collectionmembership_set")

        if project_id:
            qs = qs.filter(project_id=project_id)

        return qs

    def perform_create(self, serializer):
        project_id = self.request.data.get("project")
        serializer.save(
            project_id=project_id,
            created_by=self.request.user
        )
```

### T023: Item Management Endpoints
Add item management views:

```python
class CollectionItemsView(APIView):
    """Manage items within a collection."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        """List items in collection."""
        collection = get_object_or_404(Collection, pk=pk)
        self.check_access(request, collection)

        items = CollectionService.get_items(collection)
        serializer = MediaItemSerializer(items, many=True)
        return Response(serializer.data)

    def post(self, request, pk):
        """Add items to collection.

        Body: {"item_ids": ["uuid1", "uuid2"], "position": 0}
        """
        collection = get_object_or_404(Collection, pk=pk)
        self.check_access(request, collection)

        item_ids = request.data.get("item_ids", [])
        position = request.data.get("position")  # Optional

        memberships = CollectionService.add_items(collection, item_ids, position)

        return Response({
            "added": len(memberships),
            "collection_id": str(collection.id)
        }, status=201)

    def delete(self, request, pk):
        """Remove items from collection.

        Body: {"item_ids": ["uuid1", "uuid2"]}
        """
        collection = get_object_or_404(Collection, pk=pk)
        self.check_access(request, collection)

        item_ids = request.data.get("item_ids", [])
        removed = CollectionService.remove_items(collection, item_ids)

        return Response({"removed": removed})

    def put(self, request, pk):
        """Reorder items in collection.

        Body: {"item_ids": ["uuid3", "uuid1", "uuid2"]}  # New order
        """
        collection = get_object_or_404(Collection, pk=pk)
        self.check_access(request, collection)

        ordered_ids = request.data.get("item_ids", [])
        CollectionService.reorder_items(collection, ordered_ids)

        return Response({"status": "reordered"})

    def check_access(self, request, collection):
        if not collection.project.memberships.filter(user=request.user).exists():
            raise PermissionDenied()


class CollectionDuplicateView(APIView):
    """Duplicate a collection."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        collection = get_object_or_404(Collection, pk=pk)

        if not collection.project.memberships.filter(user=request.user).exists():
            raise PermissionDenied()

        new_name = request.data.get("name")
        new_collection = CollectionService.duplicate_collection(
            collection, new_name, request.user
        )

        return Response(
            CollectionSerializer(new_collection).data,
            status=201
        )
```

### URL Configuration
```python
urlpatterns = [
    # ... existing routes ...
    path("collections/<uuid:pk>/items/", CollectionItemsView.as_view()),
    path("collections/<uuid:pk>/duplicate/", CollectionDuplicateView.as_view()),
]
```

## Acceptance Criteria

- [ ] Create collection → collection exists with name
- [ ] Add items → items linked with positions
- [ ] Reorder items → positions updated correctly
- [ ] Remove items → items unlinked, collection intact
- [ ] Duplicate collection → new collection with same items
- [ ] List collection items → returns in position order

## Testing Notes

- Test position ordering (insert at beginning, middle, end)
- Test duplicate handling (same item added twice)
- Test cross-project isolation
- Test empty collection edge cases
