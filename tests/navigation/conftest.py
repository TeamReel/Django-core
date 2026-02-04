"""Pytest fixtures for navigation app tests."""

import pytest
from django.contrib.auth import get_user_model
from organisations.models import Membership, Organisation
from projects.models import Project

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
            name=name,
            slug=slug,
            organisation=organisation,
            creator=creator,
            description=description,
            **kwargs,
        )

    return _create_project
