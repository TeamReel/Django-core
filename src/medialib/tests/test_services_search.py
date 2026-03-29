import unittest

from django.contrib.auth import get_user_model
from django.db import connection
from django.test import TestCase
from files.models import FileAsset
from medialib.models import MediaItem, MediaTag
from medialib.services.search import MediaSearchService
from organisations.models import Organisation
from projects.models import Project


class MediaSearchServiceTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(email="search@example.com", password="password")
        self.org = Organisation.objects.create(
            name="Search Org", slug="search-org", creator=self.user
        )
        self.project = Project.objects.create(
            name="Search Project", slug="search-proj", organisation=self.org, creator=self.user
        )

        # Helper to create items
        def create_item(title, proj=self.project):
            unique_name = f"{title.lower().replace(' ', '_')}.jpg"
            fa = FileAsset.objects.create(
                organization=self.org,
                uploaded_by=self.user,
                file_size=10,
                original_name=unique_name,
                storage_path=f"uploads/{unique_name}",
            )
            return MediaItem.objects.create(project=proj, file=fa, title=title, file_size_bytes=10)

        self.item1 = create_item("Football Match")
        self.item2 = create_item("Tennis Match")
        self.item3 = create_item("Football Training")

        # Ensure distinct timestamps for ordering tests
        from datetime import timedelta

        from django.utils import timezone

        self.item1.created_at = timezone.now() - timedelta(hours=3)
        self.item1.save()
        self.item2.created_at = timezone.now() - timedelta(hours=2)
        self.item2.save()
        self.item3.created_at = timezone.now() - timedelta(hours=1)
        self.item3.save()

        # Setup tags
        self.tag_sport = MediaTag.objects.create(name="Sport", slug="sport")
        self.tag_football = MediaTag.objects.create(name="Football", slug="football")

        self.item1.tags.add(self.tag_sport, self.tag_football)
        self.item3.tags.add(self.tag_sport, self.tag_football)
        self.item2.tags.add(self.tag_sport)

    def test_search_no_query(self):
        # Should return all (ordered by created desc)
        qs = MediaSearchService.search(query="", project_ids=[self.project.id])
        self.assertEqual(qs.count(), 3)
        self.assertEqual(qs.first(), self.item3)

    @unittest.skipIf(connection.vendor == "sqlite", "Full text search not supported on SQLite")
    def test_search_text_match(self):
        # "Football" should match item1 and item3
        qs = MediaSearchService.search(query="Football", project_ids=[self.project.id])
        self.assertEqual(qs.count(), 2)
        titles = set(qs.values_list("title", flat=True))
        self.assertEqual(titles, {"Football Match", "Football Training"})

    def test_search_by_tags_all_match(self):
        # Search for items with both "Sport" and "Football"
        qs = MediaSearchService.search_by_tags(
            tag_slugs=["sport", "football"], project_id=self.project.id
        )
        self.assertEqual(qs.count(), 2)
        self.assertIn(self.item1, qs)
        self.assertIn(self.item3, qs)

    def test_search_by_tags_partial_match(self):
        # All have "Sport"
        qs = MediaSearchService.search_by_tags(["sport"], project_id=self.project.id)
        self.assertEqual(qs.count(), 3)

    # We also need to skip the search part of project_filtering if it uses text search
    # But wait, test_search_project_filtering passes a query "Football".
    @unittest.skipIf(connection.vendor == "sqlite", "Full text search not supported on SQLite")
    def test_search_project_filtering(self):
        other_proj = Project.objects.create(
            name="Other", slug="other", organisation=self.org, creator=self.user
        )
        # Create item in other project
        fa = FileAsset.objects.create(
            organization=self.org,
            uploaded_by=self.user,
            file_size=1,
            original_name="other.jpg",
            storage_path="uploads/other.jpg",
        )
        other_item = MediaItem.objects.create(
            project=other_proj, file=fa, title="Football in Other", file_size_bytes=1
        )

        # Search restricted to self.project
        qs = MediaSearchService.search("Football", project_ids=[self.project.id])
        self.assertEqual(qs.count(), 2)
        self.assertNotIn(other_item, qs)
