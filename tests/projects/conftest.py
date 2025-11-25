"""Pytest fixtures for projects app tests."""

import pytest
from django.contrib.auth import get_user_model
from organisations.models import Membership, Organisation
from projects.models import Project
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def user_factory(db):
    """Factory for creating test users."""

    def _create_user(
        email=None,
        password="testpass123",  # noqa: S107
        first_name="Test",
        last_name="User",
        **kwargs,
    ):
        if email is None:
            import uuid

            email = f"user-{uuid.uuid4().hex[:8]}@example.com"

        return User.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            **kwargs,
        )

    return _create_user


@pytest.fixture
def organisation_factory(db, user_factory):
    """Factory for creating test organisations."""

    def _create_organisation(
        name=None,
        slug=None,
        creator=None,
        description="Test organisation",
        **kwargs,
    ):
        if creator is None:
            creator = user_factory()

        if name is None:
            import uuid

            name = f"Org {uuid.uuid4().hex[:8]}"

        if slug is None:
            slug = name.lower().replace(" ", "-")

        return Organisation.objects.create(
            name=name,
            slug=slug,
            creator=creator,
            description=description,
            **kwargs,
        )

    return _create_organisation


@pytest.fixture
def project_factory(db, organisation_factory, user_factory):
    """Factory for creating test projects."""

    def _create_project(
        name=None,
        slug=None,
        organisation=None,
        creator=None,
        description="Test project",
        **kwargs,
    ):
        if organisation is None:
            organisation = organisation_factory()

        if creator is None:
            creator = user_factory()
            # Create admin membership for creator
            Membership.objects.get_or_create(
                organisation=organisation,
                user=creator,
                defaults={"role": "admin"},
            )

        if name is None:
            import uuid

            name = f"Project {uuid.uuid4().hex[:8]}"

        if slug is None:
            slug = name.lower().replace(" ", "-")

        return Project.objects.create(
            organisation=organisation,
            creator=creator,
            name=name,
            slug=slug,
            description=description,
            **kwargs,
        )

    return _create_project


@pytest.fixture
def user(user_factory):
    """Create a standard test user."""
    return user_factory(email="testuser@example.com")


@pytest.fixture
def organisation(organisation_factory, user):
    """Create a standard test organisation."""
    return organisation_factory(
        name="Test Organisation",
        slug="test-org",
        creator=user,
    )


@pytest.fixture
def admin_user(user_factory, organisation):
    """Create an admin user with membership in the test organisation."""
    admin = user_factory(
        email="admin@example.com",
        first_name="Admin",
        last_name="User",
    )
    Membership.objects.create(
        organisation=organisation,
        user=admin,
        role="admin",
    )
    return admin


@pytest.fixture
def member_user(user_factory, organisation):
    """Create a member user with membership in the test organisation."""
    member = user_factory(
        email="member@example.com",
        first_name="Member",
        last_name="User",
    )
    Membership.objects.create(
        organisation=organisation,
        user=member,
        role="member",
    )
    return member


@pytest.fixture
def project(project_factory, organisation, admin_user):
    """Create a standard test project."""
    return project_factory(
        name="Test Project",
        slug="test-project",
        organisation=organisation,
        creator=admin_user,
    )


@pytest.fixture
def archived_project(project_factory, organisation, admin_user):
    """Create an archived test project."""
    proj = project_factory(
        name="Archived Project",
        slug="archived-project",
        organisation=organisation,
        creator=admin_user,
    )
    proj.archive()
    return proj


@pytest.fixture
def api_client():
    """Return DRF API client."""
    return APIClient()


@pytest.fixture
def authenticated_client(api_client, admin_user):
    """Return API client authenticated as admin user."""
    api_client.force_authenticate(user=admin_user)
    return api_client


@pytest.fixture
def member_client(api_client, member_user):
    """Return API client authenticated as member user."""
    api_client.force_authenticate(user=member_user)
    return api_client


@pytest.fixture
def unauthenticated_client(api_client):
    """Return unauthenticated API client."""
    return api_client
