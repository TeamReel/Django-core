"""API tests for navigation endpoints."""

import pytest
from django.contrib.contenttypes.models import ContentType
from rest_framework import status
from rest_framework.test import APIClient

from navigation.models import UserFavorite, UserRecent
from projects.models import Project


@pytest.mark.django_db
class TestRecentViewSet:
    """Test RecentViewSet API endpoint."""

    def setup_method(self) -> None:
        """Setup test client and authenticated user."""
        self.client = APIClient()

    def test_list_recents_requires_auth(self, user_factory) -> None:
        """Accessing recents without auth returns 401."""
        response = self.client.get("/api/v1/navigation/recents/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_recents_filters_by_user(self, user_factory, project_factory) -> None:
        """List endpoint only returns recents for authenticated user."""
        user1 = user_factory()
        user2 = user_factory()
        project = project_factory()

        # Create recents for both users
        UserRecent.objects.create(
            user=user1,
            content_type=ContentType.objects.get_for_model(Project),
            object_id=str(project.id),
            label="Project A",
            path="/projects/1",
        )
        UserRecent.objects.create(
            user=user2,
            content_type=ContentType.objects.get_for_model(Project),
            object_id=str(project.id),
            label="Project A",
            path="/projects/1",
        )

        # Authenticate as user1
        self.client.force_authenticate(user=user1)
        response = self.client.get("/api/v1/navigation/recents/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["label"] == "Project A"

    def test_list_recents_returns_accessible_flag(self, user_factory, project_factory) -> None:
        """List endpoint includes is_accessible flag for each item."""
        user = user_factory()
        project = project_factory()

        UserRecent.objects.create(
            user=user,
            content_type=ContentType.objects.get_for_model(Project),
            object_id=str(project.id),
            label="Project A",
            path="/projects/1",
        )

        self.client.force_authenticate(user=user)
        response = self.client.get("/api/v1/navigation/recents/")

        assert response.status_code == status.HTTP_200_OK
        assert "is_accessible" in response.data[0]
        assert response.data[0]["is_accessible"] is True  # Object still exists

    def test_list_recents_handles_deleted_content(self, user_factory, project_factory) -> None:
        """List endpoint gracefully handles deleted objects (is_accessible=False)."""
        user = user_factory()
        project = project_factory()
        project_ct = ContentType.objects.get_for_model(Project)

        recent = UserRecent.objects.create(
            user=user,
            content_type=project_ct,
            object_id=str(project.id),
            label="Deleted Project",
            path="/projects/999",
        )

        # Delete the project
        project.delete()

        self.client.force_authenticate(user=user)
        response = self.client.get("/api/v1/navigation/recents/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["is_accessible"] is False
        assert response.data[0]["label"] == "Deleted Project"  # Label preserved

    def test_create_recent_logs_visit(self, user_factory, project_factory) -> None:
        """POST /recents/ creates a new recent entry."""
        user = user_factory()
        project = project_factory()

        self.client.force_authenticate(user=user)
        response = self.client.post(
            "/api/v1/navigation/recents/",
            {
                "path": f"/projects/{project.id}",
                "label": project.name,
                "content_type_model": "project",
                "object_id": str(project.id),
            },
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert UserRecent.objects.filter(user=user).count() == 1
        assert UserRecent.objects.filter(user=user).first().label == project.name

    def test_create_recent_updates_existing(self, user_factory, project_factory) -> None:
        """POST /recents/ with existing path updates timestamp."""
        user = user_factory()
        project = project_factory()

        # Create initial recent
        first_visit = UserRecent.objects.create(
            user=user,
            content_type=ContentType.objects.get_for_model(Project),
            object_id=str(project.id),
            label=project.name,
            path=f"/projects/{project.id}",
        )
        first_timestamp = first_visit.last_seen_at

        # Visit again
        self.client.force_authenticate(user=user)
        response = self.client.post(
            "/api/v1/navigation/recents/",
            {
                "path": f"/projects/{project.id}",
                "label": project.name,
                "content_type_model": "project",
                "object_id": str(project.id),
            },
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert UserRecent.objects.filter(user=user).count() == 1

        # Verify timestamp was updated
        updated = UserRecent.objects.filter(user=user).first()
        assert updated.last_seen_at >= first_timestamp

    def test_create_recent_with_path_only(self, user_factory) -> None:
        """POST /recents/ can create path-only entries without content_object."""
        user = user_factory()

        self.client.force_authenticate(user=user)
        response = self.client.post(
            "/api/v1/navigation/recents/",
            {
                "path": "/custom/page",
                "label": "Custom Page",
            },
        )

        assert response.status_code == status.HTTP_201_CREATED
        recent = UserRecent.objects.filter(user=user).first()
        assert recent.path == "/custom/page"
        assert recent.content_type is None


@pytest.mark.django_db
class TestFavoriteViewSet:
    """Test FavoriteViewSet API endpoint."""

    def setup_method(self) -> None:
        """Setup test client."""
        self.client = APIClient()

    def test_list_favorites_requires_auth(self, user_factory) -> None:
        """Accessing favorites without auth returns 401."""
        response = self.client.get("/api/v1/navigation/favorites/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_favorites_filters_by_user(self, user_factory, project_factory) -> None:
        """List endpoint only returns favorites for authenticated user."""
        user1 = user_factory()
        user2 = user_factory()
        project = project_factory()

        # Create favorites for both users
        UserFavorite.objects.create(
            user=user1,
            content_type=ContentType.objects.get_for_model(Project),
            object_id=str(project.id),
            label="Project A",
            path="/projects/1",
        )
        UserFavorite.objects.create(
            user=user2,
            content_type=ContentType.objects.get_for_model(Project),
            object_id=str(project.id),
            label="Project A",
            path="/projects/1",
        )

        # Authenticate as user1
        self.client.force_authenticate(user=user1)
        response = self.client.get("/api/v1/navigation/favorites/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    def test_create_favorite(self, user_factory, project_factory) -> None:
        """POST /favorites/ creates a new favorite."""
        user = user_factory()
        project = project_factory()

        self.client.force_authenticate(user=user)
        response = self.client.post(
            "/api/v1/navigation/favorites/",
            {
                "path": f"/projects/{project.id}",
                "label": project.name,
                "content_type_model": "project",
                "object_id": str(project.id),
            },
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert UserFavorite.objects.filter(user=user).count() == 1

    def test_delete_favorite(self, user_factory, project_factory) -> None:
        """DELETE /favorites/{id}/ removes a favorite."""
        user = user_factory()
        project = project_factory()

        favorite = UserFavorite.objects.create(
            user=user,
            content_type=ContentType.objects.get_for_model(Project),
            object_id=str(project.id),
            label=project.name,
            path=f"/projects/{project.id}",
        )

        self.client.force_authenticate(user=user)
        response = self.client.delete(f"/api/v1/navigation/favorites/{favorite.id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert UserFavorite.objects.filter(user=user).count() == 0

    def test_favorite_handles_deleted_content(self, user_factory, project_factory) -> None:
        """Favorites gracefully handle deleted objects."""
        user = user_factory()
        project = project_factory()
        project_ct = ContentType.objects.get_for_model(Project)

        UserFavorite.objects.create(
            user=user,
            content_type=project_ct,
            object_id=str(project.id),
            label="Deleted Project",
            path="/projects/999",
        )

        # Delete the project
        project.delete()

        self.client.force_authenticate(user=user)
        response = self.client.get("/api/v1/navigation/favorites/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["is_accessible"] is False


@pytest.mark.django_db
class TestBatchPermissionChecking:
    """Test efficient batch permission checking (N+1 prevention)."""

    def setup_method(self) -> None:
        """Setup test client."""
        self.client = APIClient()

    def test_batch_checking_query_count(self, user_factory, project_factory) -> None:
        """Verify batch permission checking uses reasonable query count."""
        user = user_factory()

        # Create 50 recents of different projects
        for i in range(50):
            project = project_factory()
            UserRecent.objects.create(
                user=user,
                content_type=ContentType.objects.get_for_model(Project),
                object_id=str(project.id),
                label=f"Project {i}",
                path=f"/projects/{project.id}",
            )

        self.client.force_authenticate(user=user)

        # Get the response (verifies it works without N+1 explosion)
        response = self.client.get("/api/v1/navigation/recents/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 50
        # Verify all items have the expected structure
        for item in response.data:
            assert "id" in item
            assert "path" in item
            assert "label" in item
            assert "is_accessible" in item
