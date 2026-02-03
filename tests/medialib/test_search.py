import pytest
from django.db import connection
from medialib.models import MediaItem
from medialib.services.search import MediaSearchService

IS_POSTGRES = connection.vendor == "postgresql"


@pytest.mark.django_db
class TestMediaSearch:
    def test_search_vector_update_signal(self, media_item):
        """Test that search_vector is updated on save"""
        if not IS_POSTGRES:
            pytest.skip("PostgreSQL required for SearchVector")

        media_item.title = "Unique Title For Search"
        media_item.description = "Descriptive text here"
        media_item.save()

        media_item.refresh_from_db()
        assert media_item.search_vector is not None

        # Verify simple search finds it
        qs = MediaItem.objects.filter(search_vector="Unique")
        assert qs.exists()
        assert qs.first() == media_item

    def test_search_service_ranking(self, project, file_asset, user):
        """Test search service returns ranked results"""
        if not IS_POSTGRES:
            pytest.skip("PostgreSQL required for SearchVector")

        item1 = MediaItem.objects.create(
            project=project,
            file=file_asset,
            title="Apple Banana",
            description="Fruit",
            file_size_bytes=100,
            created_by=user,
        )
        item2 = MediaItem.objects.create(
            project=project,
            file=file_asset,
            title="Banana Cherry",
            description="Fruit",
            file_size_bytes=100,
            created_by=user,
        )

        # Search for "Apple" - should match item1
        results = MediaSearchService.search("Apple")
        assert item1 in results
        assert item2 not in results

        # Search for "Banana" - should match both
        results = MediaSearchService.search("Banana")
        assert item1 in results
        assert item2 in results

    def test_search_by_tags(self, media_item, media_tag, project):
        """Test searching by tags"""
        media_tag.project = project
        media_tag.save()
        media_item.tags.add(media_tag)

        results = MediaSearchService.search_by_tags([media_tag.slug], project_id=project.id)
        assert media_item in results

        # Negative test
        results = MediaSearchService.search_by_tags(["non-existent-tag"])
        assert not results.exists()


import pytest


@pytest.mark.django_db
class TestSearchAPI:
    def test_filter_api(self, authenticated_api_client, media_item, project):
        """Test API filtering"""
        url = "/api/v1/media/items/"

        # Filter by state
        response = authenticated_api_client.get(url, {"state": media_item.state})
        assert response.status_code == 200
        assert len(response.data["results"]) == 1

        # Filter by invalid state
        response = authenticated_api_client.get(url, {"state": "archived"})
        assert response.status_code == 200
        assert len(response.data["results"]) == 0

        # Search filter "q" - Mocking if SQLite to avoid error
        if not IS_POSTGRES:
            # We can't easily mock the filter backend logic inside the view
            # without complex patching.
            # But the 'q' filter logic in MediaItemFilterSet uses Postgres.
            # So testing 'q' on SQLite will crash unless we patch the filter method.
            pass
        else:
            media_item.title = "Findable Item"
            media_item.save()

            response = authenticated_api_client.get(url, {"q": "Findable"})
            assert response.status_code == 200
            assert len(response.data["results"]) == 1
            assert response.data["results"][0]["id"] == str(media_item.id)

    def test_pagination(self, authenticated_api_client, project, file_asset, user):
        """Test cursor pagination"""
        # Create enough items to trigger pagination (page size 24)
        MediaItem.objects.bulk_create(
            [
                MediaItem(
                    project=project,
                    file=file_asset,
                    title=f"Item {i}",
                    file_size_bytes=100,
                    created_by=user,
                )
                for i in range(25)
            ]
        )

        url = "/api/v1/media/items/"
        response = authenticated_api_client.get(url)
        assert response.status_code == 200
        # Check defaults
        assert len(response.data["results"]) == 24
        assert response.data["next"] is not None
