"""Tests for authentication API endpoints."""

import pytest
from accounts.models import User
from accounts.tokens import email_verification_token
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status


@pytest.mark.api
@pytest.mark.django_db
class TestRegistrationAPI:
    """Tests for user registration endpoint."""

    def test_register_success(self, api_client):
        """Test successful user registration."""
        data = {
            "email": "newuser@test.com",
            "password": "SecurePass123!",
            "password_confirm": "SecurePass123!",
            "first_name": "Test",
            "last_name": "User",
        }
        response = api_client.post("/api/v1/auth/register", data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["email"] == "newuser@test.com"
        assert response.data["first_name"] == "Test"
        assert response.data["last_name"] == "User"
        assert response.data["email_verified"] is False
        assert response.data["is_active"] is False
        assert "message" in response.data

        # Verify user created in database
        user = User.objects.get(email="newuser@test.com")
        assert user.email_verified is False
        assert user.is_active is False

        # Verify email sent
        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == ["newuser@test.com"]
        assert "verify" in mail.outbox[0].subject.lower()

    def test_register_duplicate_email(self, api_client, regular_user):
        """Test registration with existing email fails."""
        data = {
            "email": regular_user.email,
            "password": "SecurePass123!",
            "password_confirm": "SecurePass123!",
            "first_name": "Test",
            "last_name": "User",
        }
        response = api_client.post("/api/v1/auth/register", data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "email" in response.data

    def test_register_password_mismatch(self, api_client):
        """Test registration with mismatched passwords fails."""
        data = {
            "email": "newuser@test.com",
            "password": "SecurePass123!",
            "password_confirm": "DifferentPass456!",
            "first_name": "Test",
            "last_name": "User",
        }
        response = api_client.post("/api/v1/auth/register", data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "password_confirm" in response.data or "non_field_errors" in response.data

    def test_register_weak_password(self, api_client):
        """Test registration with weak password fails validation."""
        data = {
            "email": "newuser@test.com",
            "password": "weak",
            "password_confirm": "weak",
            "first_name": "Test",
            "last_name": "User",
        }
        response = api_client.post("/api/v1/auth/register", data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "password" in response.data

    def test_register_missing_fields(self, api_client):
        """Test registration with missing required fields fails."""
        data = {"email": "newuser@test.com"}
        response = api_client.post("/api/v1/auth/register", data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "password" in response.data


@pytest.mark.api
@pytest.mark.django_db
class TestEmailVerificationAPI:
    """Tests for email verification endpoint."""

    def test_verify_email_success(self, api_client, db):
        """Test successful email verification."""
        user = User.objects.create_user(email="verify@test.com", password="Test123!@#")
        token = email_verification_token.make_token(user)

        response = api_client.post(f"/api/v1/auth/verify-email/{user.id}/{token}/")

        assert response.status_code == status.HTTP_200_OK
        assert "message" in response.data

        user.refresh_from_db()
        assert user.email_verified is True
        assert user.is_active is True

    def test_verify_email_invalid_token(self, api_client, db):
        """Test email verification with invalid token fails."""
        user = User.objects.create_user(email="verify@test.com", password="Test123!@#")

        response = api_client.post(f"/api/v1/auth/verify-email/{user.id}/invalid-token/")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"] == "invalid_token"

    def test_verify_email_user_not_found(self, api_client):
        """Test email verification with non-existent user fails."""
        response = api_client.post("/api/v1/auth/verify-email/99999/some-token/")

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data["error"] == "not_found"

    def test_verify_email_already_verified(self, api_client, regular_user):
        """Test verification of already verified email fails gracefully."""
        token = email_verification_token.make_token(regular_user)

        response = api_client.post(f"/api/v1/auth/verify-email/{regular_user.id}/{token}/")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"] == "already_verified"


@pytest.mark.api
@pytest.mark.django_db
class TestLoginAPI:
    """Tests for user login endpoint."""

    def test_login_success(self, api_client, regular_user):
        """Test successful login."""
        data = {"email": regular_user.email, "password": "Test123!@#"}
        response = api_client.post("/api/v1/auth/login", data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == regular_user.email
        assert response.data["role"] == "user"
        assert "message" in response.data

    def test_login_admin_role(self, api_client, admin_user):
        """Test login returns correct role for admin."""
        data = {"email": admin_user.email, "password": "Test123!@#"}
        response = api_client.post("/api/v1/auth/login", data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["role"] == "admin"

    def test_login_superadmin_role(self, api_client, superadmin_user):
        """Test login returns correct role for superadmin."""
        data = {"email": superadmin_user.email, "password": "Test123!@#"}
        response = api_client.post("/api/v1/auth/login", data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["role"] == "superadmin"

    def test_login_invalid_credentials(self, api_client, regular_user):
        """Test login with invalid password fails."""
        data = {"email": regular_user.email, "password": "WrongPassword123!"}
        response = api_client.post("/api/v1/auth/login", data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"] == "invalid_credentials"

    def test_login_unverified_email(self, api_client, unverified_user):
        """Test login with unverified email fails."""
        data = {"email": unverified_user.email, "password": "Test123!@#"}
        response = api_client.post("/api/v1/auth/login", data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"] == "email_not_verified"

    def test_login_inactive_account(self, api_client, regular_user):
        """Test login with inactive account fails."""
        regular_user.is_active = False
        regular_user.save()

        data = {"email": regular_user.email, "password": "Test123!@#"}
        response = api_client.post("/api/v1/auth/login", data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"] == "account_inactive"

    def test_login_missing_fields(self, api_client):
        """Test login with missing fields fails."""
        data = {"email": "test@test.com"}
        response = api_client.post("/api/v1/auth/login", data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.api
@pytest.mark.django_db
class TestLogoutAPI:
    """Tests for user logout endpoint."""

    def test_logout_authenticated(self, authenticated_client):
        """Test logout for authenticated user."""
        response = authenticated_client.post("/api/v1/auth/logout")

        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_logout_unauthenticated(self, api_client):
        """Test logout for unauthenticated user (should still succeed)."""
        response = api_client.post("/api/v1/auth/logout")

        # Logout should work even if not authenticated
        assert response.status_code == status.HTTP_204_NO_CONTENT


@pytest.mark.api
@pytest.mark.django_db
class TestPasswordResetAPI:
    """Tests for password reset endpoints."""

    def test_password_reset_request_success(self, api_client, regular_user):
        """Test successful password reset request."""
        data = {"email": regular_user.email}
        response = api_client.post("/api/v1/auth/password-reset", data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert "message" in response.data

        # Verify email sent
        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == [regular_user.email]
        assert "reset" in mail.outbox[0].subject.lower()

    def test_password_reset_request_no_enumeration(self, api_client):
        """Test password reset doesn't reveal if email exists."""
        data = {"email": "nonexistent@test.com"}
        response = api_client.post("/api/v1/auth/password-reset", data, format="json")

        # Should return success to prevent email enumeration
        assert response.status_code == status.HTTP_200_OK
        assert "message" in response.data

        # But no email should be sent
        assert len(mail.outbox) == 0

    def test_password_reset_request_inactive_user(self, api_client, regular_user):
        """Test password reset for inactive user doesn't send email."""
        regular_user.is_active = False
        regular_user.save()

        data = {"email": regular_user.email}
        response = api_client.post("/api/v1/auth/password-reset", data, format="json")

        # Returns success but no email sent
        assert response.status_code == status.HTTP_200_OK
        assert len(mail.outbox) == 0

    def test_password_reset_confirm_success(self, api_client, regular_user):
        """Test successful password reset confirmation."""
        token = default_token_generator.make_token(regular_user)
        uidb64 = urlsafe_base64_encode(force_bytes(regular_user.pk))

        data = {
            "uidb64": uidb64,
            "token": token,
            "new_password": "NewSecurePass123!",
            "new_password_confirm": "NewSecurePass123!",
        }
        response = api_client.post("/api/v1/auth/password-reset-confirm", data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert "message" in response.data

        # Verify password changed
        regular_user.refresh_from_db()
        assert regular_user.check_password("NewSecurePass123!")

    def test_password_reset_confirm_invalid_token(self, api_client, regular_user):
        """Test password reset with invalid token fails."""
        uidb64 = urlsafe_base64_encode(force_bytes(regular_user.pk))

        data = {
            "uidb64": uidb64,
            "token": "invalid-token",
            "new_password": "NewSecurePass123!",
            "new_password_confirm": "NewSecurePass123!",
        }
        response = api_client.post("/api/v1/auth/password-reset-confirm", data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"] == "invalid_token"

    def test_password_reset_confirm_password_mismatch(self, api_client, regular_user):
        """Test password reset with mismatched passwords fails."""
        token = default_token_generator.make_token(regular_user)
        uidb64 = urlsafe_base64_encode(force_bytes(regular_user.pk))

        data = {
            "uidb64": uidb64,
            "token": token,
            "new_password": "NewSecurePass123!",
            "new_password_confirm": "DifferentPass456!",
        }
        response = api_client.post("/api/v1/auth/password-reset-confirm", data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_password_reset_confirm_weak_password(self, api_client, regular_user):
        """Test password reset with weak password fails validation."""
        token = default_token_generator.make_token(regular_user)
        uidb64 = urlsafe_base64_encode(force_bytes(regular_user.pk))

        data = {
            "uidb64": uidb64,
            "token": token,
            "new_password": "weak",
            "new_password_confirm": "weak",
        }
        response = api_client.post("/api/v1/auth/password-reset-confirm", data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
