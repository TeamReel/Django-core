"""Tests for User model."""

import pytest
from accounts.models import User


@pytest.mark.django_db
class TestUserModel:
    """Tests for the custom User model."""

    def test_create_user(self):
        """Test creating a regular user."""
        user = User.objects.create_user(email="test@example.com", password="Test123!@#")
        assert user.email == "test@example.com"
        assert user.is_active is False
        assert user.email_verified is False
        assert user.is_staff is False
        assert user.is_superuser is False
        assert user.check_password("Test123!@#")

    def test_create_user_without_email(self):
        """Test that creating a user without email raises ValueError."""
        with pytest.raises(ValueError, match="Users must have an email address"):
            User.objects.create_user(email="", password="Test123!@#")

    def test_create_user_normalizes_email(self):
        """Test that email is normalized (lowercased domain)."""
        user = User.objects.create_user(email="test@EXAMPLE.COM", password="Test123!@#")
        assert user.email == "test@example.com"

    def test_create_superuser(self):
        """Test creating a superuser."""
        user = User.objects.create_superuser(email="admin@example.com", password="Test123!@#")
        assert user.is_superuser is True
        assert user.is_staff is True
        assert user.is_active is True
        assert user.email_verified is True

    def test_create_superuser_requires_is_staff(self):
        """Test that create_superuser enforces is_staff=True."""
        with pytest.raises(ValueError, match="Superuser must have is_staff=True"):
            User.objects.create_superuser(
                email="admin@example.com", password="Test123!@#", is_staff=False
            )

    def test_create_superuser_requires_is_superuser(self):
        """Test that create_superuser enforces is_superuser=True."""
        with pytest.raises(ValueError, match="Superuser must have is_superuser=True"):
            User.objects.create_superuser(
                email="admin@example.com", password="Test123!@#", is_superuser=False
            )

    def test_user_str(self):
        """Test string representation of user."""
        user = User.objects.create_user(email="test@example.com", password="Test123!@#")
        assert str(user) == "test@example.com"

    def test_user_full_name(self):
        """Test get_full_name method."""
        user = User.objects.create_user(email="test@example.com", password="Test123!@#")
        user.first_name = "John"
        user.last_name = "Doe"
        assert user.get_full_name() == "John Doe"

    def test_user_full_name_empty(self):
        """Test get_full_name with no name set."""
        user = User.objects.create_user(email="test@example.com", password="Test123!@#")
        assert user.get_full_name() == ""

    def test_user_short_name(self):
        """Test get_short_name method."""
        user = User.objects.create_user(email="test@example.com", password="Test123!@#")
        user.first_name = "John"
        assert user.get_short_name() == "John"

    def test_email_unique(self):
        """Test that email must be unique."""
        User.objects.create_user(email="test@example.com", password="Test123!@#")
        with pytest.raises(Exception):  # IntegrityError
            User.objects.create_user(email="test@example.com", password="Test123!@#")


@pytest.mark.django_db
class TestUserRoleProperties:
    """Tests for user role property methods."""

    def test_is_regular_user(self, regular_user):
        """Test is_regular_user property."""
        assert regular_user.is_regular_user is True
        assert regular_user.is_admin is False
        assert regular_user.is_superadmin is False

    def test_is_admin(self, admin_user):
        """Test is_admin property."""
        assert admin_user.is_admin is True
        assert admin_user.is_regular_user is False
        assert admin_user.is_superadmin is False

    def test_is_superadmin(self, superadmin_user):
        """Test is_superadmin property."""
        assert superadmin_user.is_superadmin is True
        assert superadmin_user.is_admin is False
        assert superadmin_user.is_regular_user is False

    def test_user_without_groups(self):
        """Test user with no groups is not assigned any role."""
        user = User.objects.create_user(email="nogroups@test.com", password="Test123!@#")
        user.is_active = True
        user.email_verified = True
        user.save()
        # Remove all groups (including the auto-assigned 'user' group from signal)
        user.groups.clear()
        assert user.is_regular_user is False
        assert user.is_admin is False
        assert user.is_superadmin is False
