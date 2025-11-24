"""Pytest fixtures for accounts tests."""

import pytest
from accounts.models import User
from django.contrib.auth.models import Group


@pytest.fixture
def user_group(db):
    """Create or get the 'user' group."""
    return Group.objects.get_or_create(name="user")[0]


@pytest.fixture
def admin_group(db):
    """Create or get the 'admin' group."""
    return Group.objects.get_or_create(name="admin")[0]


@pytest.fixture
def superadmin_group(db):
    """Create or get the 'superadmin' group."""
    return Group.objects.get_or_create(name="superadmin")[0]


@pytest.fixture
def regular_user(db, user_group):
    """Create a verified regular user."""
    user = User.objects.create_user(email="user@test.com", password="Test123!@#")
    user.email_verified = True
    user.is_active = True
    user.save()
    user.groups.add(user_group)
    return user


@pytest.fixture
def unverified_user(db):
    """Create an unverified user."""
    return User.objects.create_user(email="unverified@test.com", password="Test123!@#")


@pytest.fixture
def admin_user(db, admin_group):
    """Create a verified admin user."""
    user = User.objects.create_user(email="admin@test.com", password="Test123!@#")
    user.email_verified = True
    user.is_active = True
    user.is_staff = True
    user.save()
    user.groups.add(admin_group)
    return user


@pytest.fixture
def superadmin_user(db, superadmin_group):
    """Create a superadmin user."""
    user = User.objects.create_superuser(email="superadmin@test.com", password="Test123!@#")
    user.groups.add(superadmin_group)
    return user


@pytest.fixture
def api_client():
    """Return DRF API client."""
    from rest_framework.test import APIClient

    return APIClient()


@pytest.fixture
def authenticated_client(api_client, regular_user):
    """Return API client authenticated as regular user."""
    api_client.force_authenticate(user=regular_user)
    return api_client


@pytest.fixture
def admin_client(api_client, admin_user):
    """Return API client authenticated as admin."""
    api_client.force_authenticate(user=admin_user)
    return api_client


@pytest.fixture
def superadmin_client(api_client, superadmin_user):
    """Return API client authenticated as superadmin."""
    api_client.force_authenticate(user=superadmin_user)
    return api_client
