"""
Tests for Player role privacy enforcement.

Ensures that Players can only view their own user record
and cannot access other users' data.
"""

import pytest
from django.contrib.auth import get_user_model
from organisations.models import Membership, Organisation
from rest_framework.test import APIClient

User = get_user_model()


@pytest.mark.django_db
class TestPlayerPrivacy:
    """Test Player role privacy enforcement in user endpoints."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Create test data."""
        # Create admin user
        self.admin = User.objects.create_user(
            email="admin@test.de", password="password123", first_name="Admin", last_name="User"
        )

        # Create organisation
        self.org = Organisation.objects.create(
            name="Test Bundesliga", slug="test-bundesliga", creator=self.admin
        )

        Membership.objects.create(
            user=self.admin, organisation=self.org, role="admin", is_active=True
        )

        # Create player user (Kimmich)
        self.player = User.objects.create_user(
            email="player@test.de", password="password123", first_name="Joshua", last_name="Kimmich"
        )
        Membership.objects.create(
            user=self.player, organisation=self.org, role="member", is_active=True
        )

        # Create another player user (Musiala)
        self.other_player = User.objects.create_user(
            email="other@test.de", password="password123", first_name="Jamal", last_name="Musiala"
        )
        Membership.objects.create(
            user=self.other_player, organisation=self.org, role="member", is_active=True
        )

        self.client = APIClient()

    def test_player_can_view_self_in_list(self):
        """Player can see only their own record in users list."""
        self.client.force_authenticate(user=self.player)

        response = self.client.get(f"/api/v1/admin/users/?organisation_id={self.org.slug}")

        assert response.status_code == 200
        data = response.data

        # Should return only 1 user (self)
        if isinstance(data, list):
            assert len(data) == 1
            assert data[0]["email"] == self.player.email
        else:
            assert data["count"] == 1
            assert len(data["results"]) == 1
            assert data["results"][0]["email"] == self.player.email

    def test_player_can_view_self_detail(self):
        """Player can view their own user detail."""
        self.client.force_authenticate(user=self.player)

        response = self.client.get(f"/api/v1/admin/users/{self.player.id}/")

        assert response.status_code == 200
        data = response.data
        assert data["email"] == self.player.email

    def test_player_cannot_view_other_user_detail(self):
        """Player gets 404 when trying to view another user's detail."""
        self.client.force_authenticate(user=self.player)

        response = self.client.get(f"/api/v1/admin/users/{self.other_player.id}/")

        # Should return 404 to prevent information leakage
        assert response.status_code == 404
        data = response.data
        assert data["error"] == "not_found"

    def test_player_cannot_edit_other_user(self):
        """Player cannot edit another user."""
        self.client.force_authenticate(user=self.player)

        response = self.client.patch(
            f"/api/v1/admin/users/{self.other_player.id}/", {"first_name": "Hacked"}, format="json"
        )

        # Should return 404 (privacy) or 403 (permission denied)
        assert response.status_code in [404, 403]

    def test_player_cannot_delete_other_user(self):
        """Player cannot delete another user."""
        self.client.force_authenticate(user=self.player)

        response = self.client.delete(f"/api/v1/admin/users/{self.other_player.id}/")

        # Should return 404 (privacy) or 403 (permission denied)
        assert response.status_code in [404, 403]

    def test_admin_can_view_all_users(self):
        """Admin can view all users in their organisation."""
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(f"/api/v1/admin/users/?organisation_id={self.org.slug}")

        assert response.status_code == 200
        data = response.data

        # Should return all 3 users (admin + 2 players)
        assert data["count"] == 3
        emails = {user["email"] for user in data["results"]}
        assert emails == {self.admin.email, self.player.email, self.other_player.email}

    def test_admin_can_view_player_detail(self):
        """Admin can view player's detail."""
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(f"/api/v1/admin/users/{self.player.id}/")

        assert response.status_code == 200
        data = response.data
        assert data["email"] == self.player.email

    def test_player_cannot_create_user(self):
        """Player cannot create new users."""
        self.client.force_authenticate(user=self.player)

        response = self.client.post(
            "/api/v1/admin/users/",
            {
                "email": "newuser@test.de",
                "password": "password123",
                "first_name": "New",
                "last_name": "User",
                "organisation_id": self.org.slug,
            },
            format="json",
        )

        # Should return 403
        assert response.status_code == 403
