"""
Unit tests for navigation models.

Tests cover:
- Model creation and field validation
- Integrity constraints (unique_together)
- GenericForeignKey resolution
- Path validation
"""

import pytest
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from navigation.models import UserFavorite, UserRecent
from projects.models import Project


@pytest.mark.django_db
class TestUserRecent:
    """Test UserRecent model creation and integrity."""

    def test_create_user_recent(self, user_factory, project_factory):
        """Test creating a UserRecent with valid data."""
        user = user_factory()
        project = project_factory()
        content_type = ContentType.objects.get_for_model(Project)

        recent = UserRecent.objects.create(
            user=user,
            content_type=content_type,
            object_id=str(project.id),
            label=project.name,
            path=f"/projects/{project.id}",
            context={"org_id": str(project.organisation.id)},
        )

        assert recent.id is not None
        assert recent.user == user
        assert recent.content_object == project
        assert recent.label == project.name
        assert recent.path.startswith("/")
        assert recent.last_seen_at is not None

    def test_unique_constraint_user_recent(self, user_factory, project_factory):
        """Test unique_together constraint on (user, content_type, object_id)."""
        user = user_factory()
        project = project_factory()
        content_type = ContentType.objects.get_for_model(Project)

        # Create first recent
        UserRecent.objects.create(
            user=user,
            content_type=content_type,
            object_id=str(project.id),
            label=project.name,
            path=f"/projects/{project.id}",
        )

        # Attempting to create duplicate should fail
        with pytest.raises(IntegrityError):
            UserRecent.objects.create(
                user=user,
                content_type=content_type,
                object_id=str(project.id),
                label=project.name,
                path=f"/projects/{project.id}",
            )

    def test_gfk_resolution(self, user_factory, project_factory):
        """Test GenericForeignKey resolves to correct object."""
        user = user_factory()
        project = project_factory()
        content_type = ContentType.objects.get_for_model(Project)

        recent = UserRecent.objects.create(
            user=user,
            content_type=content_type,
            object_id=str(project.id),
            label=project.name,
            path=f"/projects/{project.id}",
        )

        # GFK should resolve to project instance
        assert recent.content_object == project
        assert isinstance(recent.content_object, Project)

    def test_path_validation_invalid(self, user_factory, project_factory):
        """Test path validation rejects absolute URLs."""
        user = user_factory()
        project = project_factory()
        content_type = ContentType.objects.get_for_model(Project)

        recent = UserRecent(
            user=user,
            content_type=content_type,
            object_id=str(project.id),
            label=project.name,
            path="https://evil.com/phishing",
        )

        with pytest.raises(ValidationError) as exc_info:
            recent.full_clean()

        assert "path" in exc_info.value.error_dict

    def test_path_validation_valid(self, user_factory, project_factory):
        """Test path validation accepts relative paths."""
        user = user_factory()
        project = project_factory()
        content_type = ContentType.objects.get_for_model(Project)

        recent = UserRecent(
            user=user,
            content_type=content_type,
            object_id=str(project.id),
            label=project.name,
            path="/projects/123",
        )

        # Should not raise
        recent.full_clean()


@pytest.mark.django_db
class TestUserFavorite:
    """Test UserFavorite model creation and integrity."""

    def test_create_user_favorite(self, user_factory, project_factory):
        """Test creating a UserFavorite with valid data."""
        user = user_factory()
        project = project_factory()
        content_type = ContentType.objects.get_for_model(Project)

        favorite = UserFavorite.objects.create(
            user=user,
            content_type=content_type,
            object_id=str(project.id),
            label=project.name,
            path=f"/projects/{project.id}",
            context={"org_id": str(project.organisation.id)},
            order=0,
        )

        assert favorite.id is not None
        assert favorite.user == user
        assert favorite.content_object == project
        assert favorite.label == project.name
        assert favorite.order == 0
        assert favorite.created_at is not None

    def test_unique_constraint_user_favorite(self, user_factory, project_factory):
        """Test unique_together constraint on (user, content_type, object_id)."""
        user = user_factory()
        project = project_factory()
        content_type = ContentType.objects.get_for_model(Project)

        # Create first favorite
        UserFavorite.objects.create(
            user=user,
            content_type=content_type,
            object_id=str(project.id),
            label=project.name,
            path=f"/projects/{project.id}",
        )

        # Attempting to create duplicate should fail
        with pytest.raises(IntegrityError):
            UserFavorite.objects.create(
                user=user,
                content_type=content_type,
                object_id=str(project.id),
                label=project.name,
                path=f"/projects/{project.id}",
            )

    def test_gfk_resolution(self, user_factory, project_factory):
        """Test GenericForeignKey resolves to correct object."""
        user = user_factory()
        project = project_factory()
        content_type = ContentType.objects.get_for_model(Project)

        favorite = UserFavorite.objects.create(
            user=user,
            content_type=content_type,
            object_id=str(project.id),
            label=project.name,
            path=f"/projects/{project.id}",
        )

        # GFK should resolve to project instance
        assert favorite.content_object == project
        assert isinstance(favorite.content_object, Project)

    def test_custom_order(self, user_factory, project_factory):
        """Test custom sort order field."""
        user = user_factory()
        project1 = project_factory()
        project2 = project_factory()
        ct = ContentType.objects.get_for_model(Project)

        # Create favorites with different order values
        fav1 = UserFavorite.objects.create(
            user=user,
            content_type=ct,
            object_id=str(project1.id),
            label=project1.name,
            path=f"/projects/{project1.id}",
            order=10,
        )
        fav2 = UserFavorite.objects.create(
            user=user,
            content_type=ct,
            object_id=str(project2.id),
            label=project2.name,
            path=f"/projects/{project2.id}",
            order=5,
        )

        # Fetch all favorites for user (ordered by order, -created_at)
        favorites = list(UserFavorite.objects.filter(user=user))

        # fav2 (order=5) should come before fav1 (order=10)
        assert favorites[0] == fav2
        assert favorites[1] == fav1
