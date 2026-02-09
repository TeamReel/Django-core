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
    from src.projects.models import Project

    return Project.objects.create(name="Test Project", created_by=user)


# More fixtures will be added as models are created
