from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from files.models import FileAsset
from medialib.models import Collection, CollectionMembership, MediaItem, MediaTag
from organisations.models import Membership, Organisation
from projects.models import Project, ProjectMembership
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="user@example.com", password="password", first_name="Test", last_name="User"
    )


@pytest.fixture
def organisation(db, user):
    org = Organisation.objects.create(name="Test Org", slug="test-org", creator=user)
    Membership.objects.create(user=user, organisation=org, role="admin")
    return org


@pytest.fixture
def project(db, organisation, user):
    proj = Project.objects.create(
        name="Test Project", slug="test-project", organisation=organisation, creator=user
    )
    ProjectMembership.objects.create(project=proj, user=user, role="admin")
    return proj


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        email="other@example.com", password="password", first_name="Other", last_name="User"
    )


@pytest.fixture
def file_asset(db, organisation, user):
    return FileAsset.objects.create(
        organization=organisation,
        uploaded_by=user,
        original_name="test.jpg",
        storage_path="uploads/test.jpg",
        file_size=1024,
        mime_type="image/jpeg",
    )


@pytest.fixture
def media_item(db, project, user, file_asset):
    return MediaItem.objects.create(
        project=project,
        file=file_asset,
        title="Test Image",
        mime_type="image/jpeg",
        file_size_bytes=1024,
        created_by=user,
    )


@pytest.fixture
def collection(db, project, user):
    return Collection.objects.create(
        project=project,
        name="Test Collection",
        description="Test Collection Description",
        created_by=user,
    )


@pytest.mark.django_db
class TestMediaItemViewSet:
    def test_list_media_items(self, api_client, user, project, media_item):
        api_client.force_authenticate(user=user)
        response = api_client.get("/api/v1/media-library/items/")
        assert response.status_code == status.HTTP_200_OK
        # MediaItemViewSet uses MediaItemCursorPagination (standard DRF CursorPagination structure)
        assert "results" in response.data
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["id"] == str(media_item.id)

    def test_list_media_items_empty_for_non_member(
        self, api_client, other_user, project, media_item
    ):
        api_client.force_authenticate(user=other_user)
        response = api_client.get("/api/v1/media-library/items/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 0

    def test_list_media_items_filter_by_relation(self, api_client, user, media_item, collection):
        # Create a relation first
        from django.contrib.contenttypes.models import ContentType
        from medialib.models import Collection, MediaItemRelation

        collection_ct = ContentType.objects.get_for_model(Collection)
        MediaItemRelation.objects.create(
            media_item=media_item, content_type=collection_ct, object_id=collection.id
        )

        api_client.force_authenticate(user=user)
        # Filter by relation
        response = api_client.get(
            f"/api/v1/media-library/items/?target_type=medialib.collection&target_id={collection.id}"
        )
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["id"] == str(media_item.id)

        # Filter by non-matching relation (use a random uuid)
        import uuid

        random_uuid = uuid.uuid4()
        response = api_client.get(
            f"/api/v1/media-library/items/?target_type=medialib.collection&target_id={random_uuid}"
        )
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 0

    def test_create_media_item(self, api_client, user, project, file_asset):
        api_client.force_authenticate(user=user)
        data = {
            "title": "New Item",
            "file_size_bytes": 1024,
            "mime_type": "image/jpeg",
            "project": str(project.id),
            "file": str(file_asset.id),
        }
        with patch("medialib.views.process_media_item.delay") as mock_task:
            response = api_client.post("/api/v1/media-library/items/", data, format="json")
            assert response.status_code == status.HTTP_201_CREATED
            mock_task.assert_called_once()

        assert response.data["title"] == "New Item"
        assert response.data["file_id"] == str(file_asset.id)

    def test_retrieve_media_item(self, api_client, user, media_item):
        api_client.force_authenticate(user=user)
        response = api_client.get(f"/api/v1/media-library/items/{media_item.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == media_item.title

    def test_update_media_item(self, api_client, user, media_item):
        api_client.force_authenticate(user=user)
        data = {"title": "Updated Title"}
        response = api_client.patch(
            f"/api/v1/media-library/items/{media_item.id}/", data, format="json"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "Updated Title"
        media_item.refresh_from_db()
        assert media_item.title == "Updated Title"

    def test_delete_media_item(self, api_client, user, media_item):
        api_client.force_authenticate(user=user)
        response = api_client.delete(f"/api/v1/media-library/items/{media_item.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not MediaItem.objects.filter(id=media_item.id).exists()

    def test_thumbnails_action(self, api_client, user, media_item):
        api_client.force_authenticate(user=user)
        response = api_client.get(f"/api/v1/media-library/items/{media_item.id}/thumbnails/")
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)

    def test_add_relation(self, api_client, user, media_item, project):
        api_client.force_authenticate(user=user)
        # Relation to a collection (which has UUID)
        collection = Collection.objects.create(
            name="Target Collection", project=project, created_by=user
        )
        data = {
            "target_type": "medialib.collection",
            "target_id": str(collection.id),
            "relation_type": "reference",
        }
        response = api_client.post(
            f"/api/v1/media-library/items/{media_item.id}/add_relation/", data, format="json"
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["target_id"] == str(collection.id)

    def test_list_relations(self, api_client, user, media_item, project):
        api_client.force_authenticate(user=user)
        # Create relation first
        from django.contrib.contenttypes.models import ContentType
        from medialib.models import MediaItemRelation

        collection = Collection.objects.create(
            name="Target Collection", project=project, created_by=user
        )
        ct = ContentType.objects.get_for_model(collection)
        MediaItemRelation.objects.create(
            media_item=media_item,
            content_type=ct,
            object_id=collection.id,
            relation_type="reference",
            created_by=user,
        )

        response = api_client.get(f"/api/v1/media-library/items/{media_item.id}/relations/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["target_id"] == str(collection.id)

    def test_remove_relation(self, api_client, user, media_item, project):
        api_client.force_authenticate(user=user)
        # Create relation first
        from django.contrib.contenttypes.models import ContentType
        from medialib.models import MediaItemRelation

        collection = Collection.objects.create(
            name="Target Collection", project=project, created_by=user
        )
        ct = ContentType.objects.get_for_model(collection)
        MediaItemRelation.objects.create(
            media_item=media_item,
            content_type=ct,
            object_id=collection.id,
            relation_type="reference",
            created_by=user,
        )

        data = {
            "target_type": "medialib.collection",
            "target_id": str(collection.id),
            "relation_type": "reference",
        }

        response = api_client.post(
            f"/api/v1/media-library/items/{media_item.id}/remove_relation/", data, format="json"
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not MediaItemRelation.objects.filter(media_item=media_item).exists()

    def test_list_media_items_filter_invalid_target_type(self, api_client, user, project):
        """Test filtering with invalid target type returns empty result"""
        api_client.force_authenticate(user=user)
        base_url = "/api/v1/media-library/items/"

        # Invalid format (no dot)
        response = api_client.get(f"{base_url}?target_type=invalid&target_id=1")
        assert response.status_code == 200
        assert len(response.data["results"]) == 0

        # Non-existent model
        response = api_client.get(f"{base_url}?target_type=app.NonExistent&target_id=1")
        assert response.status_code == 200
        assert len(response.data["results"]) == 0

    def test_add_relation_target_not_found(self, api_client, user, media_item):
        """Test adding relation to non-existent objects"""
        api_client.force_authenticate(user=user)
        url = f"/api/v1/media-library/items/{media_item.id}/add_relation/"

        payload = {
            "target_type": "medialib.mediaitem",  # Valid type
            "target_id": "00000000-0000-0000-0000-000000000000",  # Non-existent UUID
            "relation_type": "reference",
        }

        response = api_client.post(url, payload, format="json")
        assert response.status_code == 404
        assert "not found" in response.data["error"]

    def test_add_relation_validation_error(self, api_client, user, media_item, project, file_asset):
        """Test handling validation errors during relation creation"""
        from django.core.exceptions import ValidationError

        api_client.force_authenticate(user=user)
        url = f"/api/v1/media-library/items/{media_item.id}/add_relation/"

        # Create a valid target
        other_item = MediaItem.objects.create(
            project=project, file=file_asset, created_by=user, title="Other", file_size_bytes=100
        )

        payload = {
            "target_type": "medialib.mediaitem",
            "target_id": str(other_item.id),
            "relation_type": "reference",
        }

        with patch(
            "medialib.services.relations.MediaItemRelationService.create_relation"
        ) as mock_create:
            mock_create.side_effect = ValidationError("Custom validation error")
            response = api_client.post(url, payload, format="json")
            assert response.status_code == 400
            assert response.data["error"] == "Custom validation error"

    def test_remove_relation_missing_params(self, api_client, user, media_item):
        """Test removing relation with missing parameters"""
        api_client.force_authenticate(user=user)
        url = f"/api/v1/media-library/items/{media_item.id}/remove_relation/"

        # Missing target_id
        response = api_client.post(url, {"target_type": "medialib.mediaitem"}, format="json")
        assert response.status_code == 400

    def test_remove_relation_target_not_found(self, api_client, user, media_item):
        """Test removing relation for non-existent target"""
        api_client.force_authenticate(user=user)
        url = f"/api/v1/media-library/items/{media_item.id}/remove_relation/"

        payload = {
            "target_type": "medialib.mediaitem",
            "target_id": "00000000-0000-0000-0000-000000000000",
        }

        response = api_client.post(url, payload, format="json")
        # Should be 404 as per implementation
        assert response.status_code == 404

    def test_integration_flow(self, api_client, user, project, file_asset):
        """
        T039: Integration test (upload -> tag -> link -> search)
        1. Upload item with tags
        2. Verify tags applied
        3. Link to another item
        4. Search by tag and verify result
        """
        api_client.force_authenticate(user=user)

        # 1. Upload item with tags
        data = {
            "title": "Integration Item",
            "file_size_bytes": 2048,
            "mime_type": "image/png",
            "project": str(project.id),
            "file": str(file_asset.id),
            "tag_names": ["summer", "vacation"],
        }

        with patch("medialib.views.process_media_item.delay") as mock_task:
            response = api_client.post("/api/v1/media-library/items/", data, format="json")
            assert response.status_code == status.HTTP_201_CREATED
            item_id = response.data["id"]

        # 2. Verify tags applied (requires refresh or GET)
        response = api_client.get(f"/api/v1/media-library/items/{item_id}/")
        assert response.status_code == status.HTTP_200_OK
        tags = [t["name"] for t in response.data["tags"]]
        assert "summer" in tags
        assert "vacation" in tags

        # 3. Link to another item (relation)
        # Create a second item to link TO
        item2 = MediaItem.objects.create(
            project=project,
            file=file_asset,
            title="Linked Item",
            created_by=user,
            file_size_bytes=100,
        )

        link_data = {
            "target_type": "medialib.mediaitem",
            "target_id": str(item2.id),
            "relation_type": "reference",
        }
        response = api_client.post(
            f"/api/v1/media-library/items/{item_id}/add_relation/", link_data, format="json"
        )
        assert response.status_code == status.HTTP_201_CREATED

        # 4. Search by tag
        # Filter by tags=slug. Slug for 'summer' is 'summer' (auto-generated)
        response = api_client.get("/api/v1/media-library/items/?tags=summer")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) >= 1
        found_ids = [r["id"] for r in response.data["results"]]
        assert item_id in found_ids

        # Checking inverse (tag that doesn't exist)
        response = api_client.get("/api/v1/media-library/items/?tags=winter")
        assert response.status_code == status.HTTP_200_OK
        found_ids = [r["id"] for r in response.data["results"]]
        assert item_id not in found_ids


@pytest.mark.django_db
class TestMediaTagViewSet:
    def test_list_tags(self, api_client, user, project):
        api_client.force_authenticate(user=user)
        tag = MediaTag.objects.create(name="Test Tag", slug="test-tag", project=project)
        response = api_client.get("/api/v1/media-library/tags/")
        assert response.status_code == status.HTTP_200_OK

        # MediaTagViewSet uses DEFAULT_PAGINATION_CLASS (BaseAPIPagination)
        # Returns: { "data": [...], "meta": {...} }
        assert "data" in response.data
        assert isinstance(response.data["data"], list)
        assert len(response.data["data"]) == 1
        assert response.data["data"][0]["name"] == "Test Tag"

    def test_create_tag(self, api_client, user, project):
        api_client.force_authenticate(user=user)
        data = {"name": "New Tag", "project_id": project.id}
        response = api_client.post("/api/v1/media-library/tags/", data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert MediaTag.objects.filter(name="New Tag", project=project).exists()

    def test_available_tags(self, api_client, user, project):
        api_client.force_authenticate(user=user)
        MediaTag.objects.create(name="Project Tag", project=project)
        MediaTag.objects.create(name="System Tag", is_system=True)

        response = api_client.get(f"/api/v1/media-library/tags/available/?project_id={project.id}")
        assert response.status_code == status.HTTP_200_OK
        names = [t["name"] for t in response.data]
        assert "Project Tag" in names
        assert "System Tag" in names

    def test_suggest_tags(self, api_client, user):
        api_client.force_authenticate(user=user)
        response = api_client.get("/api/v1/media-library/tags/suggest/?filename=test_logo_2024.jpg")
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)
        # Simple extraction might return ['test', 'logo', '2024']
        assert "logo" in response.data

    def test_create_tag_errors(self, api_client, user, project):
        """Test tag creation validation errors"""
        api_client.force_authenticate(user=user)
        url = "/api/v1/media-library/tags/"

        # Missing project_id
        response = api_client.post(url, {"name": "Tag"}, format="json")
        assert response.status_code == 400

        # Missing name
        response = api_client.post(url, {"project_id": str(project.id)}, format="json")
        assert response.status_code == 400

        # No access to project (using non-existent ID)
        random_id = 999999
        response = api_client.post(url, {"name": "Tag", "project_id": random_id}, format="json")
        assert response.status_code == 403

    def test_available_tags_errors(self, api_client, user):
        """Test available tags validation errors"""
        api_client.force_authenticate(user=user)
        url = "/api/v1/media-library/tags/available/"

        # Missing project_id
        response = api_client.get(url)
        assert response.status_code == 400

        # No access
        random_id = 999999
        response = api_client.get(f"{url}?project_id={random_id}")
        assert response.status_code == 403

    def test_suggest_tags_missing_filename(self, api_client, user):
        api_client.force_authenticate(user=user)
        response = api_client.get("/api/v1/media-library/tags/suggest/")
        assert response.status_code == 400


@pytest.mark.django_db
class TestCollectionViewSet:
    def test_list_collections(self, api_client, user, project):
        api_client.force_authenticate(user=user)
        Collection.objects.create(name="Test Collection", project=project, created_by=user)
        response = api_client.get("/api/v1/media-library/collections/")
        assert response.status_code == status.HTTP_200_OK

        # CollectionViewSet uses DEFAULT_PAGINATION_CLASS (BaseAPIPagination)
        assert "data" in response.data
        assert isinstance(response.data["data"], list)
        assert len(response.data["data"]) == 1

    def test_create_collection(self, api_client, user, project):
        api_client.force_authenticate(user=user)
        data = {"name": "New Collection", "project": project.id}
        response = api_client.post("/api/v1/media-library/collections/", data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert Collection.objects.filter(name="New Collection", project=project).exists()

    def test_items_action_add(self, api_client, user, project, media_item):
        api_client.force_authenticate(user=user)
        collection = Collection.objects.create(
            name="Test Collection", project=project, created_by=user
        )
        data = {"item_ids": [str(media_item.id)]}
        response = api_client.post(
            f"/api/v1/media-library/collections/{collection.id}/items/", data, format="json"
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert CollectionMembership.objects.filter(
            collection=collection, media_item=media_item
        ).exists()

    def test_items_action_get(self, api_client, user, project, media_item):
        api_client.force_authenticate(user=user)
        collection = Collection.objects.create(
            name="Test Collection", project=project, created_by=user
        )
        CollectionMembership.objects.create(
            collection=collection, media_item=media_item, position=0
        )

        response = api_client.get(f"/api/v1/media-library/collections/{collection.id}/items/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["id"] == str(media_item.id)

    def test_items_action_delete(self, api_client, user, project, media_item):
        api_client.force_authenticate(user=user)
        collection = Collection.objects.create(
            name="Test Collection", project=project, created_by=user
        )
        CollectionMembership.objects.create(
            collection=collection, media_item=media_item, position=0
        )

        data = {"item_ids": [str(media_item.id)]}
        response = api_client.delete(
            f"/api/v1/media-library/collections/{collection.id}/items/", data, format="json"
        )
        assert response.status_code == status.HTTP_200_OK
        assert not CollectionMembership.objects.filter(
            collection=collection, media_item=media_item
        ).exists()

    def test_items_action_reorder(self, api_client, user, project, media_item):
        api_client.force_authenticate(user=user)
        collection = Collection.objects.create(
            name="Test Collection", project=project, created_by=user
        )
        CollectionMembership.objects.create(
            collection=collection, media_item=media_item, position=0
        )

        data = {"item_ids": [str(media_item.id)]}
        response = api_client.put(
            f"/api/v1/media-library/collections/{collection.id}/items/", data, format="json"
        )
        assert response.status_code == status.HTTP_200_OK

    def test_duplicate_collection(self, api_client, user, project, media_item):
        api_client.force_authenticate(user=user)
        collection = Collection.objects.create(name="Original", project=project, created_by=user)
        CollectionMembership.objects.create(collection=collection, media_item=media_item)

        data = {"name": "Copy"}
        response = api_client.post(
            f"/api/v1/media-library/collections/{collection.id}/duplicate/", data, format="json"
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Copy"
        # Check items were copied
        new_id = response.data["id"]
        assert CollectionMembership.objects.filter(collection_id=new_id).count() == 1

    def test_collection_items_invalid_payload(self, api_client, user, project):
        """Test collection items action with invalid payload"""
        api_client.force_authenticate(user=user)
        collection = Collection.objects.create(
            name="Test Collection", project=project, created_by=user
        )

        # item_ids is not a list
        data = {"item_ids": "not-a-list"}
        response = api_client.post(
            f"/api/v1/media-library/collections/{collection.id}/items/", data, format="json"
        )
        assert response.status_code == 400
