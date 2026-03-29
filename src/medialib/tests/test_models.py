from django.contrib.auth import get_user_model
from django.db.utils import IntegrityError
from django.test import TestCase
from files.models import FileAsset
from medialib.models import Collection, CollectionMembership, MediaItem, MediaItemState, MediaTag
from organisations.models import Organisation
from projects.models import Project


class MediaItemModelTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create(email="modeltest@example.com")
        self.org = Organisation.objects.create(
            name="Model Org", slug="model-org", creator=self.user
        )
        self.project = Project.objects.create(
            name="Model Project", slug="model-project", organisation=self.org, creator=self.user
        )
        self.file_asset = FileAsset.objects.create(
            organization=self.org,
            storage_path="uploads/test.jpg",
            file_size=100,
            mime_type="image/jpeg",
            original_name="test.jpg",
            uploaded_by=self.user,
        )

    def test_create_media_item(self):
        item = MediaItem.objects.create(
            project=self.project,
            file=self.file_asset,
            title="My Item",
            mime_type="image/jpeg",
            file_size_bytes=100,
            state=MediaItemState.RAW,
        )
        self.assertEqual(str(item), "My Item (image/jpeg)")
        self.assertEqual(item.state, MediaItemState.RAW)

    def test_media_item_defaults(self):
        item = MediaItem.objects.create(
            project=self.project,
            file=self.file_asset,
            title="Defaults Item",
            mime_type="video/mp4",
            file_size_bytes=200,
        )
        self.assertEqual(item.state, MediaItemState.RAW)
        self.assertEqual(item.extraction_metadata, {})


class MediaTagModelTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create(email="tagmodel@example.com")
        self.org = Organisation.objects.create(name="Tag Org", slug="tag-org", creator=self.user)
        self.project = Project.objects.create(
            name="Tag Project", slug="tag-project", organisation=self.org, creator=self.user
        )

    def test_auto_slug_generation(self):
        tag = MediaTag.objects.create(project=self.project, name="My Cool Tag")
        self.assertEqual(tag.slug, "my-cool-tag")
        self.assertFalse(tag.is_system)
        expected_str = f"My Cool Tag (project-{self.project.id})"
        self.assertEqual(str(tag), expected_str)

    def test_system_tag(self):
        tag = MediaTag.objects.create(name="System Tag", is_system=True)
        self.assertEqual(tag.slug, "system-tag")
        self.assertIsNone(tag.project)
        self.assertEqual(str(tag), "System Tag (system)")

    def test_unique_project_slug(self):
        MediaTag.objects.create(project=self.project, name="Unique Tag", slug="unique-tag")
        with self.assertRaises(IntegrityError):
            MediaTag.objects.create(project=self.project, name="Another Name", slug="unique-tag")


class CollectionModelTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create(email="collection@example.com")
        self.org = Organisation.objects.create(name="Coll Org", slug="coll-org", creator=self.user)
        self.project = Project.objects.create(
            name="Coll Project", slug="coll-project", organisation=self.org, creator=self.user
        )
        self.file_asset = FileAsset.objects.create(
            organization=self.org,
            storage_path="uploads/test.png",
            file_size=50,
            mime_type="image/png",
            original_name="test.png",
            uploaded_by=self.user,
        )
        self.item1 = MediaItem.objects.create(
            project=self.project,
            file=self.file_asset,
            title="Item 1",
            mime_type="image/png",
            file_size_bytes=50,
        )
        self.item2 = MediaItem.objects.create(
            project=self.project,
            file=self.file_asset,
            title="Item 2",
            mime_type="image/png",
            file_size_bytes=50,
        )

    def test_create_collection_with_members(self):
        collection = Collection.objects.create(
            project=self.project, name="My Collection", created_by=self.user
        )

        # Add via through model for position (if applicable) or add directly
        # Checking CollectionMembership fields from previous read, assuming position exists?
        # Let's check CollectionMembership again. It was cut off.
        # Assuming just add works for M2M.

        collection.items.add(self.item1)
        collection.items.add(self.item2)

        self.assertEqual(collection.items.count(), 2)
        self.assertIn(self.item1, collection.items.all())
        # str check - count might vary if transaction not committed or caching, but usually OK in test
        self.assertEqual(str(collection), "My Collection (2 items)")

    def test_collection_membership_ordering(self):
        collection = Collection.objects.create(
            project=self.project, name="Ordered Collection", created_by=self.user
        )

        # Add with position using Membership object directly
        CollectionMembership.objects.create(
            collection=collection, media_item=self.item1, position=2
        )
        CollectionMembership.objects.create(
            collection=collection, media_item=self.item2, position=1
        )

        memberships = CollectionMembership.objects.filter(collection=collection)
        self.assertEqual(memberships[0].media_item, self.item2)  # pos 1
        self.assertEqual(memberships[1].media_item, self.item1)  # pos 2
