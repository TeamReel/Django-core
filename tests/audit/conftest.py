import pytest
from django.contrib.auth import get_user_model
from organisations.models import Membership, Organisation
from projects.models import Project
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def authenticated_client(api_client, user_factory):
    user = user_factory()
    api_client.force_authenticate(user=user)
    # Store user on client for easy access in tests
    api_client.handler._force_user = user
    return api_client


@pytest.fixture
def user_factory(db):
    """Factory for creating test users."""

    def _create_user(email=None, password="testpass123", **kwargs):
        if email is None:
            import uuid

            email = f"user-{uuid.uuid4().hex[:8]}@example.com"
        return User.objects.create_user(email=email, password=password, **kwargs)

    return _create_user


@pytest.fixture
def organisation_factory(db, user_factory):
    """Factory for creating test organisations."""

    def _create_organisation(name=None, creator=None, **kwargs):
        if creator is None:
            creator = user_factory()
        if name is None:
            import uuid

            name = f"Org {uuid.uuid4().hex[:8]}"
        return Organisation.objects.create(name=name, creator=creator, **kwargs)

    return _create_organisation


@pytest.fixture
def project_factory(db, organisation_factory, user_factory):
    """Factory for creating test projects."""

    def _create_project(name=None, organisation=None, creator=None, **kwargs):
        if organisation is None:
            organisation = organisation_factory()
        if creator is None:
            creator = user_factory()
            # Ensure creator is admin of org
            Membership.objects.get_or_create(
                organisation=organisation, user=creator, defaults={"role": "admin"}
            )
        if name is None:
            import uuid

            name = f"Project {uuid.uuid4().hex[:8]}"
        return Project.objects.create(
            name=name, organisation=organisation, creator=creator, **kwargs
        )

    return _create_project


@pytest.fixture(autouse=True)
def register_test_event_type():
    """Register test event type for all tests."""
    from audit.registry import is_event_type_registered, register_event_type

    if not is_event_type_registered("test.event"):
        register_event_type("test.event", "test", "Test event")
    if not is_event_type_registered("test.other_event"):
        register_event_type("test.other_event", "test", "Other test event")
