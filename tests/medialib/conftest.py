import pytest
from rest_framework.test import APIClient
from accounts.models import User
from projects.models import Project, ProjectMembership
from medialib.models import MediaItem
from organisations.models import Organisation
from files.models import FileAsset


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
def media_item(db, project, user, organisation):
    file_asset = FileAsset.objects.create(
        organization=organisation,
        uploaded_by=user,
        original_name="test.jpg",
        storage_path="uploads/test.jpg",
        file_size=1024,
        mime_type="image/jpeg",
    )
    return MediaItem.objects.create(
        project=project,
        title="Test Media Item",
        file=file_asset,
        mime_type="image/jpeg",
        file_size_bytes=1024,
        created_by=user,
        state="processed",
    )
