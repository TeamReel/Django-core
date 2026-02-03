import pytest
from rest_framework.test import APIClient
from accounts.models import User
from projects.models import Project, ProjectMembership
from medialib.models import MediaItem, MediaTag
from organisations.models import Organisation
from files.models import FileAsset


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="test@example.com", password="password", first_name="Test", last_name="User"
    )


@pytest.fixture
def organisation(db, user):
    return Organisation.objects.create(name="Test Org", slug="test-org", creator=user)


@pytest.fixture
def project(db, user, organisation):
    project = Project.objects.create(
        name="Test Project", slug="test-project", creator=user, organisation=organisation
    )
    ProjectMembership.objects.create(user=user, project=project, role="admin")
    return project


@pytest.fixture
def authenticated_api_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def file_asset(db, organisation, user):
    return FileAsset.objects.create(
        organization=organisation,
        uploaded_by=user,
        original_name="test_asset.jpg",
        storage_path="uploads/test_asset.jpg",
        file_size=1024,
        mime_type="image/jpeg",
    )


@pytest.fixture
def media_tag(db, project):
    return MediaTag.objects.create(name="Test Tag", slug="test-tag", project=project)


@pytest.fixture
def media_item(db, project, user, organisation, file_asset):
    return MediaItem.objects.create(
        project=project,
        title="Test Media Item",
        file=file_asset,
        mime_type="image/jpeg",
        file_size_bytes=1024,
        created_by=user,
        state="processed",
    )
