"""Pytest configuration for workflows tests."""
import pytest


@pytest.fixture
def user(db, django_user_model):
    """Create test user."""
    return django_user_model.objects.create_user(
        username="testuser", email="test@example.com", password="testpass123"
    )


@pytest.fixture
def project(db, user):
    """Create test project."""
    from projects.models import Project
    from organisations.models import Organisation

    org = Organisation.objects.create(name="Test Org", creator=user)
    return Project.objects.create(name="Test Project", creator=user, organisation=org)


# More fixtures will be added as models are created
