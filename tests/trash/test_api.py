"""Tests for trash API endpoints."""

import pytest
from rest_framework.test import APIClient

from projects.models.project_membership import ProjectMembership
from trash.models import TrashItem


@pytest.mark.django_db
class TestTrashListAPI:
    """Test GET /api/v1/trash/"""

    def test_list_trash_authenticated(self, membership, user, organisation):
        """Authenticated user can list trash items."""
        membership.soft_delete(user=user)

        client = APIClient()
        client.force_authenticate(user=user)
        # Set current_org for org-scoping
        user.current_org = organisation
        response = client.get("/api/v1/trash/")
        assert response.status_code == 200
        assert response.data["count"] == 1
        assert response.data["results"][0]["object_repr"] != ""

    def test_list_trash_unauthenticated(self):
        """Unauthenticated request returns 401."""
        client = APIClient()
        response = client.get("/api/v1/trash/")
        assert response.status_code == 401

    def test_list_trash_org_scoped(self, membership, user, organisation, admin_user):
        """Trash items are scoped to current organisation."""
        membership.soft_delete(user=user)

        # Admin user from different context shouldn't see trash
        client = APIClient()
        client.force_authenticate(user=admin_user)
        admin_user.current_org = None  # No org context
        response = client.get("/api/v1/trash/")
        assert response.status_code == 200
        assert response.data["count"] == 0


@pytest.mark.django_db
class TestTrashRestoreAPI:
    """Test POST /api/v1/trash/{id}/restore/"""

    def test_restore_item(self, membership, user, organisation):
        """Restore brings back the soft-deleted object."""
        membership.soft_delete(user=user)
        trash_item = TrashItem.objects.first()

        client = APIClient()
        client.force_authenticate(user=user)
        user.current_org = organisation
        response = client.post(f"/api/v1/trash/{trash_item.pk}/restore/")
        assert response.status_code == 200

        # Original object should be active again
        membership.refresh_from_db()
        assert membership.deleted_at is None
        # TrashItem should be gone
        assert TrashItem.objects.count() == 0

    def test_restore_missing_object(self, membership, user, organisation):
        """Restoring when original object is permanently deleted returns 404."""
        membership.soft_delete(user=user)
        trash_item = TrashItem.objects.first()

        # Permanently delete the original
        ProjectMembership.all_objects.filter(pk=membership.pk).hard_delete()

        client = APIClient()
        client.force_authenticate(user=user)
        user.current_org = organisation
        response = client.post(f"/api/v1/trash/{trash_item.pk}/restore/")
        assert response.status_code == 404


@pytest.mark.django_db
class TestTrashDeleteAPI:
    """Test DELETE /api/v1/trash/{id}/"""

    def test_permanent_delete(self, membership, user, admin_user, organisation, admin_membership):
        """Admin can permanently delete a trash item."""
        membership.soft_delete(user=user)
        trash_item = TrashItem.objects.first()

        client = APIClient()
        client.force_authenticate(user=admin_user)
        admin_user.current_org = organisation
        response = client.delete(f"/api/v1/trash/{trash_item.pk}/")
        assert response.status_code == 204

        # Both original and trash item should be gone
        assert TrashItem.objects.count() == 0
        assert not ProjectMembership.all_objects.filter(pk=membership.pk).exists()


@pytest.mark.django_db
class TestTrashStatsAPI:
    """Test GET /api/v1/trash/stats/"""

    def test_stats_returns_counts(self, membership, user, organisation):
        """Stats endpoint returns per-content-type counts."""
        membership.soft_delete(user=user)

        client = APIClient()
        client.force_authenticate(user=user)
        user.current_org = organisation
        response = client.get("/api/v1/trash/stats/")
        assert response.status_code == 200
        assert len(response.data) == 1
        assert response.data[0]["count"] == 1
        assert response.data[0]["total"] == 1
