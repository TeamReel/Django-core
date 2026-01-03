"""Test fixtures for search tests."""

import pytest
from django.contrib.contenttypes.models import ContentType
from accounts.models import User
from organisations.models import Organisation
from projects.models import Project
from search.models import SearchEntry


@pytest.fixture
def test_user(db):
    """Create a test user."""
    return User.objects.create_user(
        username="testuser",
        email="test@example.com",
        password="testpass123",
    )


@pytest.fixture
def test_organisation(db, test_user):
    """Create a test organisation."""
    org = Organisation.objects.create(
        name="Test Organisation",
        description="A test organisation for search testing",
        slug="test-org",
        created_by=test_user,
    )
    return org


@pytest.fixture
def test_project(db, test_organisation, test_user):
    """Create a test project."""
    project = Project.objects.create(
        name="Test Project",
        description="A test project for search testing",
        organisation=test_organisation,
        created_by=test_user,
    )
    return project


@pytest.fixture
def search_entries(db, test_user, test_organisation, test_project):
    """Create search entries for testing."""
    user_ct = ContentType.objects.get_for_model(User)
    org_ct = ContentType.objects.get_for_model(Organisation)
    project_ct = ContentType.objects.get_for_model(Project)

    entries = []

    # User search entry
    user_entry = SearchEntry.objects.create(
        content_type=user_ct,
        object_id=str(test_user.id),
        title=f"{test_user.first_name} {test_user.last_name}",
        description=test_user.email,
        url=f"/users/{test_user.id}/",
        body_text=f"{test_user.username} {test_user.email} testuser",
    )
    entries.append(user_entry)

    # Organisation search entry
    org_entry = SearchEntry.objects.create(
        content_type=org_ct,
        object_id=str(test_organisation.id),
        title=test_organisation.name,
        description=test_organisation.description,
        url=f"/organisations/{test_organisation.slug}/",
        body_text=f"{test_organisation.name} {test_organisation.description}",
    )
    entries.append(org_entry)

    # Project search entry
    project_entry = SearchEntry.objects.create(
        content_type=project_ct,
        object_id=str(test_project.id),
        title=test_project.name,
        description=test_project.description,
        url=f"/projects/{test_project.id}/",
        body_text=f"{test_project.name} {test_project.description}",
    )
    entries.append(project_entry)

    return entries
