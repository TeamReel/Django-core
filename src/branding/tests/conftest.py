"""Pytest fixtures for branding tests."""

import pytest
from accounts.models import User
from files.models import FileAsset
from organisations.models import Membership, Organisation
from projects.models import Project
from sport_configuration.models import Sport


@pytest.fixture
def user(db):
    """Create a test user."""
    return User.objects.create_user(email="test@example.com", password="testpass123")


@pytest.fixture
def superuser(db):
    """Create a superuser for admin-only endpoints."""
    return User.objects.create_superuser(
        email="admin@example.com", password="adminpass123"
    )


@pytest.fixture
def organisation(db, user):
    """Create a test organisation."""
    return Organisation.objects.create(name="Test Organisation", creator=user)


@pytest.fixture
def membership(db, user, organisation):
    """Create an organisation membership."""
    return Membership.objects.create(
        user=user, organisation=organisation, role="admin"
    )


@pytest.fixture
def club(db, user, organisation):
    """Create a club (top-level project). Signal auto-creates BrandProfile."""
    return Project.objects.create(
        name="Test Club", organisation=organisation, creator=user
    )


@pytest.fixture
def project(db, user, organisation, club):
    """Create a team (child project). No auto-created brand profile."""
    return Project.objects.create(
        name="Test Team",
        organisation=organisation,
        parent_project=club,
        creator=user,
    )


@pytest.fixture
def sport(db):
    """Create a test sport with unique slug."""
    import uuid
    slug = f"football-{uuid.uuid4().hex[:8]}"
    return Sport.objects.create(name="Football", slug=slug)


@pytest.fixture
def file_asset(db, organisation, user):
    """Create a test file asset."""
    return FileAsset.objects.create(
        organization=organisation,
        uploaded_by=user,
        original_name="logo.png",
        storage_path="test/logo.png",
        file_size=1024,
        mime_type="image/png",
    )


@pytest.fixture
def second_file_asset(db, organisation, user):
    """Create a second file asset for tests requiring two distinct files."""
    return FileAsset.objects.create(
        organization=organisation,
        uploaded_by=user,
        original_name="logo2.png",
        storage_path="test/logo2.png",
        file_size=2048,
        mime_type="image/png",
    )
