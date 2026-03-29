from django.db import models, transaction

from ..models import Collection, CollectionMembership, MediaItem


class CollectionService:
    @staticmethod
    def create_collection(
        project_id: str, name: str, description: str = "", user=None
    ) -> Collection:
        """Create a new collection."""
        return Collection.objects.create(
            project_id=project_id, name=name, description=description, created_by=user
        )

    @staticmethod
    def add_items(
        collection: Collection, item_ids: list[str], position_start: int = None
    ) -> list[CollectionMembership]:
        """Add items to collection.

        If position_start is provided, items are inserted at that position.
        Otherwise, items are appended to the end.
        """
        if position_start is None:
            # Get current max position
            max_pos = (
                collection.collectionmembership_set.aggregate(max=models.Max("position"))["max"]
                or 0
            )
            if collection.collectionmembership_set.exists():
                position_start = max_pos + 1
            else:
                position_start = 0

        memberships = []
        for i, item_id in enumerate(item_ids):
            # Verify item belongs to same project
            item = MediaItem.objects.filter(id=item_id, project_id=collection.project_id).first()

            if not item:
                continue  # Skip invalid/inaccessible items

            membership, created = CollectionMembership.objects.get_or_create(
                collection=collection, media_item=item, defaults={"position": position_start + i}
            )
            if not created:
                # Update position if already exists
                # Note: this simple logic doesn't shift other items, standard append/update behavior
                membership.position = position_start + i
                membership.save(update_fields=["position"])

            memberships.append(membership)

        return memberships

    @staticmethod
    def remove_items(collection: Collection, item_ids: list[str]) -> int:
        """Remove items from collection. Returns count removed."""
        return CollectionMembership.objects.filter(
            collection=collection, media_item_id__in=item_ids
        ).delete()[0]

    @staticmethod
    @transaction.atomic
    def reorder_items(collection: Collection, ordered_item_ids: list[str]):
        """Reorder items in collection based on provided order."""
        for position, item_id in enumerate(ordered_item_ids):
            CollectionMembership.objects.filter(
                collection=collection, media_item_id=item_id
            ).update(position=position)

    @staticmethod
    def get_items(collection: Collection) -> list[MediaItem]:
        """Get collection items in order."""
        return MediaItem.objects.filter(collectionmembership__collection=collection).order_by(
            "collectionmembership__position"
        )

    @staticmethod
    def duplicate_collection(collection: Collection, new_name: str = None, user=None) -> Collection:
        """Create a copy of collection with all items."""
        new_collection = Collection.objects.create(
            project=collection.project,
            name=new_name or f"{collection.name} (Copy)",
            description=collection.description,
            created_by=user,
        )

        # Copy memberships
        memberships = collection.collectionmembership_set.all()
        new_memberships = [
            CollectionMembership(
                collection=new_collection, media_item=m.media_item, position=m.position
            )
            for m in memberships
        ]
        CollectionMembership.objects.bulk_create(new_memberships)

        return new_collection
