import pytest
from rest_framework import status
from medialib.models import CollectionMembership, MediaItem


@pytest.mark.django_db
class TestCollectionService:
    def test_create_collection(self, project, user):
        from medialib.services.collections import CollectionService

        collection = CollectionService.create_collection(
            project_id=project.id, name="My Collection", description="Test Description", user=user
        )

        assert collection.id is not None
        assert collection.name == "My Collection"
        assert collection.project_id == project.id
        assert collection.created_by == user

    def test_add_remove_items(self, project, user, media_item):
        from medialib.services.collections import CollectionService

        collection = CollectionService.create_collection(project.id, "Test API")

        # Add item
        memberships = CollectionService.add_items(collection, [media_item.id])
        assert len(memberships) == 1
        assert memberships[0].media_item == media_item
        assert memberships[0].position == 0

        # Remove item
        count = CollectionService.remove_items(collection, [media_item.id])
        assert count == 1
        assert CollectionMembership.objects.filter(collection=collection).count() == 0

    def test_reorder_items(self, project, media_item, user, organisation):
        """Test reordering items"""
        from medialib.services.collections import CollectionService
        from files.models import FileAsset

        # Create 2 more items
        file2 = FileAsset.objects.create(
            organization=organisation,
            uploaded_by=user,
            original_name="test2.jpg",
            storage_path="uploads/test2.jpg",
            file_size=1024,
            mime_type="image/jpeg",
        )
        item2 = MediaItem.objects.create(
            project=project,
            title="Item 2",
            file=file2,
            mime_type="image/jpeg",
            file_size_bytes=1024,
            created_by=user,
            state="processed",
        )

        file3 = FileAsset.objects.create(
            organization=organisation,
            uploaded_by=user,
            original_name="test3.jpg",
            storage_path="uploads/test3.jpg",
            file_size=1024,
            mime_type="image/jpeg",
        )
        item3 = MediaItem.objects.create(
            project=project,
            title="Item 3",
            file=file3,
            mime_type="image/jpeg",
            file_size_bytes=1024,
            created_by=user,
            state="processed",
        )

        collection = CollectionService.create_collection(project.id, "Order Test")
        CollectionService.add_items(collection, [media_item.id, item2.id, item3.id])

        # Verify initial order (by addition)
        items = CollectionService.get_items(collection)
        assert [i.id for i in items] == [media_item.id, item2.id, item3.id]

        # Reorder reversed
        CollectionService.reorder_items(collection, [item3.id, item2.id, media_item.id])

        items = CollectionService.get_items(collection)
        assert [i.id for i in items] == [item3.id, item2.id, media_item.id]

    def test_duplicate_collection(self, project, media_item, user):
        from medialib.services.collections import CollectionService

        col = CollectionService.create_collection(project.id, "Original")
        CollectionService.add_items(col, [media_item.id])

        dup = CollectionService.duplicate_collection(col, user=user)

        assert dup.name == "Original (Copy)"
        assert dup.collectionmembership_set.count() == 1
        assert dup.collectionmembership_set.first().media_item == media_item


@pytest.mark.django_db
class TestCollectionViewSet:
    def test_crud(self, authenticated_api_client, project):
        client = authenticated_api_client
        url = "/api/v1/media/collections/"

        # Create
        data = {
            "name": "API Collection",
            "project": str(project.id),
            "description": "Created via API",
        }
        response = client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED, response.data
        col_id = response.data["id"]

        # List
        response = client.get(url, {"project": project.id})
        assert response.status_code == status.HTTP_200_OK
        if "results" in response.data:
            assert len(response.data["results"]) >= 1
        else:
            assert len(response.data) >= 1

        # Detail
        response = client.get(f"{url}{col_id}/")
        assert response.data["name"] == "API Collection"

    def test_items_endpoint(self, authenticated_api_client, project, media_item):
        from medialib.services.collections import CollectionService

        col = CollectionService.create_collection(project.id, "Items Test")

        client = authenticated_api_client
        url = f"/api/v1/media/collections/{col.id}/items/"

        # Add item
        data = {"item_ids": [str(media_item.id)]}
        response = client.post(url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["added"] == 1

        # List items
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["id"] == str(media_item.id)

        # Reorder (noop here but testing endpoint)
        response = client.put(url, {"item_ids": [media_item.id]}, format="json")
        assert response.status_code == status.HTTP_200_OK

        # Remove item
        response = client.delete(url, data={"item_ids": [media_item.id]}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["removed"] == 1

    def test_duplicate_endpoint(self, authenticated_api_client, project):
        from medialib.services.collections import CollectionService

        col = CollectionService.create_collection(project.id, "Dup Root")

        client = authenticated_api_client
        url = f"/api/v1/media/collections/{col.id}/duplicate/"

        response = client.post(url, {"name": "New Name"})
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "New Name"
