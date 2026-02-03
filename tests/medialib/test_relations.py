import pytest
import uuid
from rest_framework import status
from medialib.models import Collection, MediaItemRelation, MediaTag
from medialib.services.relations import MediaItemRelationService


@pytest.mark.django_db
class TestMediaItemRelations:
    def test_relation_lifecycle(self, authenticated_api_client, media_item, project):
        """Test adding, listing, and removing relations via API"""
        # Setup: Create a Collection to link to (Whitelisted)
        collection = Collection.objects.create(
            project=project,
            name="Test Collection",
        )

        client = authenticated_api_client
        url_prefix = f"/api/v1/media/items/{media_item.id}"

        # 1. Add Relation
        payload = {
            "target_type": "medialib.collection",
            "target_id": str(collection.id),
            "relation_type": "reference",
            "metadata": {"reason": "testing"},
        }

        response = client.post(f"{url_prefix}/add_relation/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED, response.data

        # Verify db
        assert MediaItemRelation.objects.count() == 1

        # 2. List Relations
        response = client.get(f"{url_prefix}/relations/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["target_id"] == str(collection.id)

        # 3. Remove Relation
        remove_payload = {
            "target_type": "medialib.collection",
            "target_id": str(collection.id),
            "relation_type": "reference",
        }
        response = client.post(f"{url_prefix}/remove_relation/", remove_payload, format="json")
        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify db
        assert MediaItemRelation.objects.count() == 0

    def test_whitelist_validation(self, authenticated_api_client, media_item, project):
        """Test that only whitelisted models can be targets"""
        client = authenticated_api_client
        url_prefix = f"/api/v1/media/items/{media_item.id}"

        # MediaTag uses UUID but is NOT in the whitelist
        tag = MediaTag.objects.create(name="Forbidden Tag", project=project)

        payload = {
            "target_type": "medialib.mediatag",
            "target_id": str(tag.id),
            "relation_type": "reference",
        }

        response = client.post(f"{url_prefix}/add_relation/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        # The error structure depends on how we returned it in view, it is inside "error" key
        assert "not allowed" in str(response.data) or "Relations to" in str(response.data)

    def test_uuid_validation(self, authenticated_api_client, media_item):
        """Test that invalid UUIDs are rejected gracefully"""
        client = authenticated_api_client
        url_prefix = f"/api/v1/media/items/{media_item.id}"

        # Use a fake UUID string that is just garbage
        invalid_uuid = "not-a-uuid"

        payload = {
            "target_type": "medialib.collection",
            "target_id": invalid_uuid,
            "relation_type": "reference",
        }

        # Serializer should catch this because target_id is UUIDField in serializer (usually)
        response = client.post(f"{url_prefix}/add_relation/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_reverse_lookup_filter(self, authenticated_api_client, media_item, project):
        """Test filtering media items by relation target"""
        collection = Collection.objects.create(project=project, name="Lookup Collection")

        # Create relation
        MediaItemRelationService.create_relation(media_item, collection, "related")

        client = authenticated_api_client

        # Query API
        response = client.get(
            f"/api/v1/media/items/?target_type=medialib.collection&target_id={collection.id}"
        )

        assert response.status_code == status.HTTP_200_OK

        # Handle pagination or wrapped response
        if "data" in response.data:
            results = response.data["data"]
        elif "results" in response.data:
            results = response.data["results"]
        else:
            results = response.data

        assert len(results) == 1
        assert results[0]["id"] == str(media_item.id)

        # Query with wrong target ID
        response_empty = client.get(
            f"/api/v1/media/items/?target_type=medialib.collection&target_id={uuid.uuid4()}"
        )

        if "data" in response_empty.data:
            results_empty = response_empty.data["data"]
        elif "results" in response_empty.data:
            results_empty = response_empty.data["results"]
        else:
            results_empty = response_empty.data

        assert len(results_empty) == 0
