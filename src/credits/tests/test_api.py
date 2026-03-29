"""API tests for credits endpoints."""

from decimal import Decimal

import pytest
from credits.models import CreditsBalance, ProjectCreditsBalance, UserCreditsBalance
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient


@pytest.mark.django_db
class TestGetOrganisationCreditsAPI:
    """Test get_organisation_credits endpoint."""

    def test_get_credits_success(self, user, organisation, membership):
        """Member can retrieve their org's credits balance."""
        CreditsBalance.objects.create(
            organisation=organisation, current_balance=100
        )
        client = APIClient()
        client.force_authenticate(user=user)
        url = reverse("api_v1:credits-balance")
        response = client.get(url, {"organisation_id": str(organisation.id)})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["current_balance"] == 100
        assert response.data["organisation_name"] == organisation.name

    def test_get_credits_no_org_id(self, user, membership):
        """Missing organisation_id returns 400."""
        client = APIClient()
        client.force_authenticate(user=user)
        url = reverse("api_v1:credits-balance")
        response = client.get(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "organisation_id" in response.data["error"]

    def test_get_credits_no_membership(self, user, organisation):
        """User without membership gets 403."""
        CreditsBalance.objects.create(
            organisation=organisation, current_balance=100
        )
        client = APIClient()
        client.force_authenticate(user=user)
        url = reverse("api_v1:credits-balance")
        response = client.get(url, {"organisation_id": str(organisation.id)})
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_credits_no_balance_configured(self, user, organisation, membership):
        """Org with no balance record returns 404."""
        client = APIClient()
        client.force_authenticate(user=user)
        url = reverse("api_v1:credits-balance")
        response = client.get(url, {"organisation_id": str(organisation.id)})
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_credits_unauthenticated(self, organisation):
        """Unauthenticated request is rejected."""
        client = APIClient()
        url = reverse("api_v1:credits-balance")
        response = client.get(url, {"organisation_id": str(organisation.id)})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_superuser_bypasses_membership_check(self, organisation):
        """Superuser can access credits without membership."""
        from accounts.models import User

        superuser = User.objects.create_superuser(
            email="super@example.com", password="superpass123"
        )
        CreditsBalance.objects.create(
            organisation=organisation, current_balance=500
        )
        client = APIClient()
        client.force_authenticate(user=superuser)
        url = reverse("api_v1:credits-balance")
        response = client.get(url, {"organisation_id": str(organisation.id)})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["current_balance"] == 500


@pytest.mark.django_db
class TestGetProjectCreditsAPI:
    """Test get_project_credits endpoint."""

    def test_get_project_credits_success(self, user, organisation, membership, project):
        """Member can retrieve project credits."""
        ProjectCreditsBalance.objects.create(
            project=project, current_balance=Decimal("75.0000")
        )
        client = APIClient()
        client.force_authenticate(user=user)
        url = reverse("api_v1:project-credits-balance", kwargs={"project_id": project.id})
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert Decimal(response.data["current_balance"]) == Decimal("75.0000")

    def test_get_project_credits_not_found(self, user, organisation, membership, project):
        """Project with no balance returns 404."""
        client = APIClient()
        client.force_authenticate(user=user)
        url = reverse("api_v1:project-credits-balance", kwargs={"project_id": project.id})
        response = client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_project_credits_no_membership(self, user, project):
        """User without org membership gets 403."""
        ProjectCreditsBalance.objects.create(
            project=project, current_balance=Decimal("50.0000")
        )
        client = APIClient()
        client.force_authenticate(user=user)
        url = reverse("api_v1:project-credits-balance", kwargs={"project_id": project.id})
        response = client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_project_credits_invalid_project(self, user, membership):
        """Non-existent project returns 404."""
        client = APIClient()
        client.force_authenticate(user=user)
        url = reverse("api_v1:project-credits-balance", kwargs={"project_id": 99999})
        response = client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestGetMyUserCreditsAPI:
    """Test get_my_user_credits endpoint."""

    def test_get_user_credits_success(self, user, organisation, membership):
        """User can retrieve their own credits balance."""
        UserCreditsBalance.objects.create(
            organisation=organisation,
            user=user,
            current_balance=Decimal("300.0000"),
        )
        client = APIClient()
        client.force_authenticate(user=user)
        url = reverse("api_v1:user-credits-balance")
        response = client.get(url, {"organisation_id": str(organisation.id)})
        assert response.status_code == status.HTTP_200_OK
        assert Decimal(response.data["current_balance"]) == Decimal("300.0000")

    def test_get_user_credits_no_org_id(self, user, membership):
        """Missing organisation_id returns 400."""
        client = APIClient()
        client.force_authenticate(user=user)
        url = reverse("api_v1:user-credits-balance")
        response = client.get(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_get_user_credits_no_membership(self, user, organisation):
        """User without org membership gets 403."""
        client = APIClient()
        client.force_authenticate(user=user)
        url = reverse("api_v1:user-credits-balance")
        response = client.get(url, {"organisation_id": str(organisation.id)})
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_user_credits_no_balance(self, user, organisation, membership):
        """User with no balance record returns 404."""
        client = APIClient()
        client.force_authenticate(user=user)
        url = reverse("api_v1:user-credits-balance")
        response = client.get(url, {"organisation_id": str(organisation.id)})
        assert response.status_code == status.HTTP_404_NOT_FOUND
