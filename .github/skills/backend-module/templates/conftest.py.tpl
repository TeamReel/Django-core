"""Pytest fixtures for B{NUMBER}: {MODULE_TITLE} tests."""

import pytest

from accounts.models import User
from organisations.models import Membership, Organisation
from projects.models import Project
from rest_framework.test import APIClient

from {APP_NAME}.models import {MODEL_NAME}


@pytest.fixture
def user(db):
    """Test user with staff privileges."""
    return User.objects.create_user(
        email="test@example.com", password="testpass123", is_staff=True
    )


@pytest.fixture
def other_user(db):
    """Second test user (non-staff) for permission tests."""
    return User.objects.create_user(
        email="other@example.com", password="testpass123", is_staff=False
    )


@pytest.fixture
def organisation(db, user):
    """Test organisation."""
    return Organisation.objects.create(
        name="Test Organisation", slug="test-org", creator=user
    )


@pytest.fixture
def other_organisation(db, other_user):
    """Second organisation for isolation tests."""
    return Organisation.objects.create(
        name="Other Organisation", slug="other-org", creator=other_user
    )


@pytest.fixture
def member(db, user, organisation):
    """Organisation membership for test user."""
    return Membership.objects.create(
        user=user, organisation=organisation, role="member"
    )


@pytest.fixture
def project(db, user, organisation):
    """Test project."""
    return Project.objects.create(
        name="Test Project",
        slug="test-project",
        organisation=organisation,
        creator=user,
    )


@pytest.fixture
def authenticated_client(db, user):
    """API client authenticated as the test user."""
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def unauthenticated_client(db):
    """API client without authentication."""
    return APIClient()


@pytest.fixture
def {FIXTURE_NAME}(db, organisation, user):
    """Test {MODEL_NAME} instance."""
    return {MODEL_NAME}.objects.create(
        organisation=organisation,
        created_by=user,
        # {FIXTURE_FIELDS}
    )
