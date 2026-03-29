import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from files.models import FileAsset
from organisations.models import Membership, Organisation
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


@pytest.mark.django_db
class TestFileAPI:
    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def user(self):
        return User.objects.create_user(email="test@example.com", password="password")

    @pytest.fixture
    def other_user(self):
        return User.objects.create_user(email="other@example.com", password="password")

    @pytest.fixture
    def organisation(self, user):
        org = Organisation.objects.create(name="Test Org", slug="test-org", creator=user)
        Membership.objects.create(user=user, organisation=org, role="admin")
        return org

    @pytest.fixture
    def other_organisation(self, other_user):
        org = Organisation.objects.create(name="Other Org", slug="other-org", creator=other_user)
        Membership.objects.create(user=other_user, organisation=org, role="admin")
        return org

    def test_list_files_requires_header(self, api_client, user):
        api_client.force_authenticate(user=user)
        response = api_client.get("/api/v1/files/")
        # Should return empty list or 200 with empty list because we return none() if no header
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 0

    def test_list_files_with_header(self, api_client, user, organisation):
        api_client.force_authenticate(user=user)

        # Create a file manually
        FileAsset.objects.create(
            organization=organisation,
            uploaded_by=user,
            original_name="test.txt",
            storage_path="test.txt",
            file_size=10,
            mime_type="text/plain",
        )

        response = api_client.get(
            "/api/v1/files/", headers={"X-Organization-ID": str(organisation.id)}
        )
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["original_name"] == "test.txt"

    def test_create_file_upload(self, api_client, user, organisation):
        api_client.force_authenticate(user=user)

        file_content = b"Hello World"
        file = SimpleUploadedFile("hello.txt", file_content, content_type="text/plain")

        response = api_client.post(
            "/api/v1/files/",
            {"file": file, "is_public": True},
            format="multipart",
            headers={"X-Organization-ID": str(organisation.id)},
        )

        assert response.status_code == status.HTTP_201_CREATED

        # Verify DB
        asset = FileAsset.objects.first()
        assert asset is not None
        assert asset.original_name == "hello.txt"
        assert asset.organization == organisation
        assert asset.uploaded_by == user
        assert asset.is_public is True

    def test_retrieve_file(self, api_client, user, organisation):
        api_client.force_authenticate(user=user)
        asset = FileAsset.objects.create(
            organization=organisation,
            uploaded_by=user,
            original_name="test.txt",
            storage_path="test.txt",
            file_size=10,
            mime_type="text/plain",
        )

        response = api_client.get(
            f"/api/v1/files/{asset.id}/", headers={"X-Organization-ID": str(organisation.id)}
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == str(asset.id)

    def test_soft_delete_file(self, api_client, user, organisation):
        api_client.force_authenticate(user=user)
        asset = FileAsset.objects.create(
            organization=organisation,
            uploaded_by=user,
            original_name="test.txt",
            storage_path="test.txt",
            file_size=10,
            mime_type="text/plain",
        )

        response = api_client.delete(
            f"/api/v1/files/{asset.id}/", headers={"X-Organization-ID": str(organisation.id)}
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT

        asset.refresh_from_db()
        assert asset.is_deleted is True
        assert asset.deleted_at is not None

    def test_download_url(self, api_client, user, organisation):
        api_client.force_authenticate(user=user)
        asset = FileAsset.objects.create(
            organization=organisation,
            uploaded_by=user,
            original_name="test.txt",
            storage_path="test.txt",
            file_size=10,
            mime_type="text/plain",
        )

        response = api_client.get(
            f"/api/v1/files/{asset.id}/download/",
            headers={"X-Organization-ID": str(organisation.id)},
        )
        assert response.status_code == status.HTTP_200_OK
        assert "url" in response.data
        assert "expires_in" in response.data

    def test_isolation(self, api_client, user, organisation, other_user, other_organisation):
        # User cannot see other org's files
        api_client.force_authenticate(user=user)

        # Create file in other org
        FileAsset.objects.create(
            organization=other_organisation,
            uploaded_by=other_user,
            original_name="other.txt",
            storage_path="other.txt",
            file_size=10,
            mime_type="text/plain",
        )

        # Try to list with own org header
        response = api_client.get(
            "/api/v1/files/", headers={"X-Organization-ID": str(organisation.id)}
        )
        assert len(response.data) == 0

        # Try to list with other org header (should fail or return empty if not member)
        response = api_client.get(
            "/api/v1/files/", headers={"X-Organization-ID": str(other_organisation.id)}
        )
        # Since get_queryset filters by organization__members=user, it should return empty
        assert len(response.data) == 0

    def test_create_requires_org_header(self, api_client, user):
        api_client.force_authenticate(user=user)
        file = SimpleUploadedFile("test.txt", b"content")
        response = api_client.post("/api/v1/files/", {"file": file}, format="multipart")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
