"""Pytest fixtures for the CRUD API example tests.

This module provides reusable test fixtures including:
- User creation fixtures
- API client fixtures
- Note factory fixtures
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api_client() -> APIClient:
    """Create an unauthenticated API client.

    Returns:
        An APIClient instance.
    """
    return APIClient()


@pytest.fixture
def user(db) -> User:
    """Create a test user.

    Args:
        db: Pytest-django database access fixture.

    Returns:
        A User instance with email 'test@example.com'.
    """
    return User.objects.create_user(
        email="test@example.com",
        password="testpass123",
    )


@pytest.fixture
def other_user(db) -> User:
    """Create a second test user for permission testing.

    Args:
        db: Pytest-django database access fixture.

    Returns:
        A User instance with email 'other@example.com'.
    """
    return User.objects.create_user(
        email="other@example.com",
        password="testpass123",
    )


@pytest.fixture
def authenticated_client(api_client: APIClient, user: User) -> APIClient:
    """Create an authenticated API client.

    Args:
        api_client: The base API client.
        user: The user to authenticate as.

    Returns:
        An APIClient authenticated as the test user.
    """
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def other_authenticated_client(api_client: APIClient, other_user: User) -> APIClient:
    """Create an API client authenticated as another user.

    Args:
        api_client: The base API client.
        other_user: The other user to authenticate as.

    Returns:
        An APIClient authenticated as the other user.
    """
    # Create a new client instance for the other user
    client = APIClient()
    client.force_authenticate(user=other_user)
    return client
