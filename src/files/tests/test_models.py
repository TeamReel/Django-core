import pytest
from django.contrib.auth import get_user_model
from files.models import FileAsset
from organisations.models import Organisation

User = get_user_model()


@pytest.mark.django_db
class TestFileAssetModel:
    @pytest.fixture
    def user(self):
        return User.objects.create_user(email="test@example.com", password="password")

    @pytest.fixture
    def organisation(self, user):
        return Organisation.objects.create(name="Test Org", slug="test-org", creator=user)

    def test_create_file_asset(self, organisation, user):
        file_asset = FileAsset.objects.create(
            organization=organisation,
            uploaded_by=user,
            storage_path="uploads/test.txt",
            file_size=1024,
            mime_type="text/plain",
            original_name="test.txt",
        )

        assert file_asset.id is not None
        assert file_asset.organization == organisation
        assert file_asset.uploaded_by == user
        assert file_asset.storage_path == "uploads/test.txt"
        assert file_asset.file_size == 1024
        assert file_asset.mime_type == "text/plain"
        assert file_asset.is_deleted is False
        assert file_asset.deleted_at is None

    def test_soft_delete(self, organisation, user):
        file_asset = FileAsset.objects.create(
            organization=organisation,
            uploaded_by=user,
            storage_path="uploads/test.txt",
            file_size=1024,
            mime_type="text/plain",
            original_name="test.txt",
        )

        file_asset.soft_delete()
        file_asset.refresh_from_db()

        assert file_asset.is_deleted is True
        assert file_asset.deleted_at is not None

        # Ensure it's filtered out by default manager if you have a custom manager (optional check)
        # If you haven't implemented a custom manager that filters deleted, this check might fail or be irrelevant.
        # For now, we just check the flag.
