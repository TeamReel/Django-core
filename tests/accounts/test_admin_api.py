"""Tests for admin API endpoints."""

from io import BytesIO
from unittest.mock import patch

import pytest
from accounts.models import User
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

pytestmark = pytest.mark.django_db  # Apply to all tests in this module


@pytest.mark.api
class TestAdminUserListAPI:
    """Tests for admin user list endpoint."""

    def test_list_users_as_admin(self, admin_client, regular_user, admin_user):
        """Test admin can list all users."""
        response = admin_client.get("/api/v1/admin/users/")

        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert len(response.data["results"]) >= 2  # At least admin and regular user

    def test_list_users_as_superadmin(self, superadmin_client, regular_user):
        """Test superadmin can list all users."""
        response = superadmin_client.get("/api/v1/admin/users/")

        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data

    def test_list_users_as_regular_user_denied(self, authenticated_client):
        """Test regular user cannot list users."""
        response = authenticated_client.get("/api/v1/admin/users/")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_users_unauthenticated_denied(self, api_client):
        """Test unauthenticated user cannot list users."""
        response = api_client.get("/api/v1/admin/users/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_users_filter_by_active(self, admin_client, db):
        """Test filtering users by active status."""
        User.objects.create_user(
            email="active@test.com", password="Test123!@#", is_active=True, email_verified=True
        )
        User.objects.create_user(email="inactive@test.com", password="Test123!@#", is_active=False)

        response = admin_client.get("/api/v1/admin/users/?is_active=true")

        assert response.status_code == status.HTTP_200_OK
        for user in response.data["results"]:
            assert user["is_active"] is True

    def test_list_users_filter_by_verified(self, admin_client, db):
        """Test filtering users by email verification status."""
        User.objects.create_user(
            email="verified@test.com", password="Test123!@#", email_verified=True
        )
        User.objects.create_user(
            email="unverified@test.com", password="Test123!@#", email_verified=False
        )

        response = admin_client.get("/api/v1/admin/users/?email_verified=true")

        assert response.status_code == status.HTTP_200_OK
        for user in response.data["results"]:
            assert user["email_verified"] is True

    def test_list_users_filter_by_role(self, admin_client, superadmin_user):
        """Test filtering users by role."""
        response = admin_client.get("/api/v1/admin/users/?role=superadmin")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) >= 1
        for user in response.data["results"]:
            assert user["role"] == "superadmin"

    def test_list_users_pagination(self, admin_client, db):
        """Test user list pagination."""
        # Create multiple users to test pagination
        for i in range(60):
            User.objects.create_user(
                email=f"user{i}@test.com",
                password="Test123!@#",
                email_verified=True,
                is_active=True,
            )

        response = admin_client.get("/api/v1/admin/users/")

        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert "count" in response.data
        assert "next" in response.data
        assert "previous" in response.data
        assert len(response.data["results"]) == 50  # Default page size


@pytest.mark.api
class TestAdminUserDetailAPI:
    """Tests for admin user detail endpoint."""

    def test_get_user_detail_as_admin(self, admin_client, regular_user):
        """Test admin can get user details."""
        response = admin_client.get(f"/api/v1/admin/users/{regular_user.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == regular_user.email
        assert "groups" in response.data

    def test_get_user_detail_as_superadmin(self, superadmin_client, admin_user):
        """Test superadmin can get admin user details."""
        response = superadmin_client.get(f"/api/v1/admin/users/{admin_user.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == admin_user.email

    def test_get_user_detail_not_found(self, admin_client):
        """Test getting non-existent user returns 404."""
        response = admin_client.get("/api/v1/admin/users/99999/")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data["error"] == "not_found"

    def test_get_user_detail_as_regular_user_denied(self, authenticated_client, admin_user):
        """Test regular user cannot get user details."""
        response = authenticated_client.get(f"/api/v1/admin/users/{admin_user.id}/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_user_detail_unauthenticated_denied(self, api_client, regular_user):
        """Test unauthenticated user cannot get user details."""
        response = api_client.get(f"/api/v1/admin/users/{regular_user.id}/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.api
class TestAdminUserActivateAPI:
    """Tests for admin user activation endpoint."""

    def test_activate_user_as_admin(self, admin_client, db):
        """Test admin can activate inactive user."""
        user = User.objects.create_user(
            email="inactive@test.com", password="Test123!@#", is_active=False, email_verified=True
        )

        response = admin_client.patch(f"/api/v1/admin/users/{user.id}/activate/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_active"] is True

        user.refresh_from_db()
        assert user.is_active is True

    def test_activate_already_active_user(self, admin_client, regular_user):
        """Test activating already active user fails."""
        response = admin_client.patch(f"/api/v1/admin/users/{regular_user.id}/activate/")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"] == "bad_request"

    def test_activate_user_not_found(self, admin_client):
        """Test activating non-existent user returns 404."""
        response = admin_client.patch("/api/v1/admin/users/99999/activate/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_activate_user_as_regular_user_denied(self, authenticated_client, db):
        """Test regular user cannot activate users."""
        user = User.objects.create_user(
            email="inactive@test.com", password="Test123!@#", is_active=False
        )

        response = authenticated_client.patch(f"/api/v1/admin/users/{user.id}/activate/")

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.api
class TestAdminUserDeactivateAPI:
    """Tests for admin user deactivation endpoint."""

    def test_deactivate_user_as_admin(self, admin_client, regular_user):
        """Test admin can deactivate regular user."""
        response = admin_client.patch(f"/api/v1/admin/users/{regular_user.id}/deactivate/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_active"] is False

        regular_user.refresh_from_db()
        assert regular_user.is_active is False

    def test_deactivate_self_denied(self, admin_client, admin_user):
        """Test admin cannot deactivate their own account."""
        response = admin_client.patch(f"/api/v1/admin/users/{admin_user.id}/deactivate/")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"] == "bad_request"
        assert "cannot deactivate your own" in response.data["message"].lower()

    def test_admin_cannot_deactivate_other_admin(self, admin_client, db, admin_group):
        """Test admin cannot deactivate another admin."""
        other_admin = User.objects.create_user(
            email="otheradmin@test.com",
            password="Test123!@#",
            is_active=True,
            email_verified=True,
            is_staff=True,
        )
        other_admin.groups.add(admin_group)

        response = admin_client.patch(f"/api/v1/admin/users/{other_admin.id}/deactivate/")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.data["error"] == "permission_denied"

    def test_admin_cannot_deactivate_superadmin(self, admin_client, superadmin_user):
        """Test admin cannot deactivate superadmin."""
        response = admin_client.patch(f"/api/v1/admin/users/{superadmin_user.id}/deactivate/")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.data["error"] == "permission_denied"

    def test_superadmin_can_deactivate_admin(self, superadmin_client, admin_user):
        """Test superadmin can deactivate admin user."""
        response = superadmin_client.patch(f"/api/v1/admin/users/{admin_user.id}/deactivate/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_active"] is False

    def test_deactivate_already_inactive_user(self, admin_client, db):
        """Test deactivating already inactive user fails."""
        user = User.objects.create_user(
            email="inactive@test.com", password="Test123!@#", is_active=False
        )

        response = admin_client.patch(f"/api/v1/admin/users/{user.id}/deactivate/")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"] == "bad_request"

    def test_deactivate_user_as_regular_user_denied(self, authenticated_client, admin_user):
        """Test regular user cannot deactivate users."""
        response = authenticated_client.patch(f"/api/v1/admin/users/{admin_user.id}/deactivate/")

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.api
class TestAdminPasswordResetAPI:
    """Tests for admin-initiated password reset endpoint."""

    def test_admin_reset_user_password(self, admin_client, regular_user):
        """Test admin can send password reset email to user."""
        response = admin_client.post(f"/api/v1/admin/users/{regular_user.id}/reset-password/")

        assert response.status_code == status.HTTP_200_OK
        assert "message" in response.data

        # Verify email sent
        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == [regular_user.email]
        assert "reset" in mail.outbox[0].subject.lower()

    def test_admin_reset_inactive_user_password_denied(self, admin_client, db):
        """Test admin cannot reset password for inactive user."""
        user = User.objects.create_user(
            email="inactive@test.com", password="Test123!@#", is_active=False, email_verified=True
        )

        response = admin_client.post(f"/api/v1/admin/users/{user.id}/reset-password/")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"] == "bad_request"
        assert "inactive" in response.data["message"].lower()

    def test_admin_reset_unverified_user_password_denied(self, admin_client, unverified_user):
        """Test admin cannot reset password for unverified user."""
        response = admin_client.post(f"/api/v1/admin/users/{unverified_user.id}/reset-password/")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"] == "bad_request"
        assert "inactive" in response.data["message"].lower()

    def test_admin_reset_nonexistent_user_password(self, admin_client):
        """Test resetting password for non-existent user returns 404."""
        response = admin_client.post("/api/v1/admin/users/99999/reset-password/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_regular_user_cannot_reset_password(self, authenticated_client, admin_user):
        """Test regular user cannot initiate password reset."""
        response = authenticated_client.post(f"/api/v1/admin/users/{admin_user.id}/reset-password/")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_cannot_reset_superadmin_password(self, admin_client, superadmin_user):
        """Test admin cannot reset password for superadmin."""
        response = admin_client.post(f"/api/v1/admin/users/{superadmin_user.id}/reset-password/")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.data["error"] == "permission_denied"


@pytest.mark.api
class TestAdminChangeRoleAPI:
    """Tests for admin change user role endpoint."""

    def test_admin_change_user_to_admin(self, superadmin_client, regular_user, admin_group):
        """Test superadmin can promote user to admin."""
        data = {"role": "admin"}
        response = superadmin_client.patch(
            f"/api/v1/admin/users/{regular_user.id}/role/", data, format="json"
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["role"] == "admin"

        regular_user.refresh_from_db()
        assert regular_user.groups.filter(name="admin").exists()

    def test_admin_change_admin_to_user(self, superadmin_client, admin_user, user_group):
        """Test superadmin can demote admin to user."""
        data = {"role": "user"}
        response = superadmin_client.patch(
            f"/api/v1/admin/users/{admin_user.id}/role/", data, format="json"
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["role"] == "user"

        admin_user.refresh_from_db()
        assert not admin_user.groups.filter(name="admin").exists()
        assert admin_user.groups.filter(name="user").exists()

    def test_admin_change_role_to_superadmin_denied(self, admin_client, regular_user):
        """Test admin cannot promote user to superadmin."""
        data = {"role": "superadmin"}
        response = admin_client.patch(
            f"/api/v1/admin/users/{regular_user.id}/role/", data, format="json"
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_superadmin_change_role_to_superadmin(self, superadmin_client, admin_user):
        """Test superadmin can promote to superadmin."""
        data = {"role": "superadmin"}
        response = superadmin_client.patch(
            f"/api/v1/admin/users/{admin_user.id}/role/", data, format="json"
        )

        assert response.status_code == status.HTTP_200_OK

        admin_user.refresh_from_db()
        assert admin_user.is_superuser is True

    def test_admin_cannot_change_superadmin_role(self, admin_client, superadmin_user):
        """Test admin cannot change superadmin's role."""
        data = {"role": "user"}
        response = admin_client.patch(
            f"/api/v1/admin/users/{superadmin_user.id}/role/", data, format="json"
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_change_self_role_denied(self, admin_client, admin_user):
        """Test admin cannot change their own role."""
        data = {"role": "user"}
        response = admin_client.patch(
            f"/api/v1/admin/users/{admin_user.id}/role/", data, format="json"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "cannot change your own" in response.data["message"].lower()

    def test_change_role_invalid_role(self, superadmin_client, regular_user):
        """Test changing to invalid role fails."""
        data = {"role": "invalid_role"}
        response = superadmin_client.patch(
            f"/api/v1/admin/users/{regular_user.id}/role/", data, format="json"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_change_role_user_not_found(self, superadmin_client):
        """Test changing role for non-existent user returns 404."""
        data = {"role": "admin"}
        response = superadmin_client.patch("/api/v1/admin/users/99999/role/", data, format="json")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_regular_user_cannot_change_role(self, authenticated_client, admin_user):
        """Test regular user cannot change roles."""
        data = {"role": "user"}
        response = authenticated_client.patch(
            f"/api/v1/admin/users/{admin_user.id}/role/", data, format="json"
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.api
class TestAdminAvatarUpload:
    """Tests for admin avatar upload endpoint — Q031 regression."""

    def _make_image(self) -> SimpleUploadedFile:
        """Create a minimal valid PNG file for upload."""
        import struct
        import zlib

        def _png_chunk(chunk_type: bytes, data: bytes) -> bytes:
            chunk = chunk_type + data
            return (
                struct.pack(">I", len(data))
                + chunk
                + struct.pack(">I", zlib.crc32(chunk) & 0xFFFFFFFF)
            )

        sig = b"\x89PNG\r\n\x1a\n"
        ihdr = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
        raw = zlib.compress(b"\x00\x00\x00\x00")
        png = (
            sig
            + _png_chunk(b"IHDR", ihdr)
            + _png_chunk(b"IDAT", raw)
            + _png_chunk(b"IEND", b"")
        )
        return SimpleUploadedFile("avatar.png", png, content_type="image/png")

    def test_avatar_upload_error_does_not_leak_traceback(self, admin_client, regular_user):
        """Regression test Q031: server error must not expose traceback or debug info."""
        avatar = self._make_image()
        with patch("files.utils.get_storage_backend") as mock_backend:
            mock_backend.return_value.save.side_effect = RuntimeError("S3 connection failed")
            response = admin_client.post(
                f"/api/v1/admin/users/{regular_user.id}/avatar/",
                {"avatar": avatar},
                format="multipart",
            )

        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert response.data["error"] == "server_error"
        assert response.data["message"] == "Failed to save avatar."
        assert "debug" not in response.data
        assert "traceback" not in response.data
        assert "Traceback" not in str(response.data)
        assert "S3 connection failed" not in str(response.data)

    def test_avatar_upload_success(self, admin_client, regular_user):
        """Test successful avatar upload returns URL without debug info."""
        avatar = self._make_image()
        with patch("files.utils.get_storage_backend") as mock_backend:
            mock_backend.return_value.save.return_value = "avatars/test/avatar.png"
            with patch("accounts.utils.sync_avatar_to_memberships"):
                with patch(
                    "accounts.utils.get_avatar_url",
                    return_value="https://cdn.example.com/avatar.png",
                ):
                    response = admin_client.post(
                        f"/api/v1/admin/users/{regular_user.id}/avatar/",
                        {"avatar": avatar},
                        format="multipart",
                    )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "success"
        assert "debug" not in response.data
