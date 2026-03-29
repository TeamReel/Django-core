"""API tests for branding endpoints."""

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from branding.models import AppBackground, BrandProfile
from sport_configuration.models import Sport


@pytest.mark.django_db
class TestBrandProfileAPI:
    """Test BrandProfile API endpoints."""

    def test_list_profiles_authenticated(self, user, organisation, membership):
        """Authenticated user can list brand profiles."""
        BrandProfile.objects.create(
            name="Org Brand", organisation=organisation, created_by=user
        )
        client = APIClient()
        client.force_authenticate(user=user)
        url = reverse("brandprofile-list")
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] >= 1

    def test_list_profiles_unauthenticated(self):
        """Unauthenticated request is rejected."""
        client = APIClient()
        url = reverse("brandprofile-list")
        response = client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_retrieve_profile(self, user, organisation, membership):
        """Authenticated user can retrieve a brand profile."""
        profile = BrandProfile.objects.create(
            name="Org Brand", organisation=organisation, created_by=user
        )
        client = APIClient()
        client.force_authenticate(user=user)
        url = reverse("brandprofile-detail", kwargs={"pk": str(profile.pk)})
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Org Brand"

    def test_create_profile_with_org(self, user, organisation, membership):
        """Admin can create a brand profile for their organisation."""
        client = APIClient()
        client.force_authenticate(user=user)
        url = reverse("brandprofile-list")
        data = {
            "name": "New Brand",
            "organisation": str(organisation.id),
        }
        response = client.post(url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "New Brand"
        # created_by should be set
        assert BrandProfile.objects.get(name="New Brand").created_by == user

    def test_filter_by_organisation(self, user, organisation, membership):
        """Profiles can be filtered by organisation UUID."""
        BrandProfile.objects.create(
            name="Org Brand", organisation=organisation, created_by=user
        )
        client = APIClient()
        client.force_authenticate(user=user)
        url = reverse("brandprofile-list")
        response = client.get(url, {"organisation": str(organisation.id)})
        assert response.status_code == status.HTTP_200_OK
        for result in response.data["results"]:
            assert str(result.get("organisation", "")) == str(organisation.id)

    def test_filter_by_is_active(self, user, organisation, membership):
        """Profiles can be filtered by is_active status."""
        BrandProfile.objects.create(
            name="Active", organisation=organisation, is_active=True, created_by=user
        )
        client = APIClient()
        client.force_authenticate(user=user)
        url = reverse("brandprofile-list")
        response = client.get(url, {"is_active": "true"})
        assert response.status_code == status.HTTP_200_OK
        for result in response.data["results"]:
            assert result["is_active"] is True

    def test_update_profile(self, user, organisation, membership):
        """Admin can update a brand profile name."""
        profile = BrandProfile.objects.create(
            name="Old Name", organisation=organisation, created_by=user
        )
        client = APIClient()
        client.force_authenticate(user=user)
        url = reverse("brandprofile-detail", kwargs={"pk": str(profile.pk)})
        response = client.patch(url, {"name": "New Name"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        profile.refresh_from_db()
        assert profile.name == "New Name"
        assert profile.updated_by == user


@pytest.mark.django_db
class TestAppBackgroundAPI:
    """Test AppBackground API endpoints."""

    def test_list_backgrounds_authenticated(self, user, membership, file_asset):
        """Authenticated user can list app backgrounds."""
        sport = Sport.objects.create(name="Football", slug="football-bg-list")
        AppBackground.objects.create(
            sport=sport, file=file_asset, label="Field", created_by=user
        )
        client = APIClient()
        client.force_authenticate(user=user)
        url = reverse("appbackground-list")
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] >= 1

    def test_list_backgrounds_unauthenticated(self):
        """Unauthenticated request is rejected."""
        client = APIClient()
        url = reverse("appbackground-list")
        response = client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_background_requires_superadmin(self, user, membership, file_asset):
        """Non-superadmin cannot create app backgrounds."""
        sport = Sport.objects.create(name="Handball", slug="handball-bg-create")
        client = APIClient()
        client.force_authenticate(user=user)
        url = reverse("appbackground-list")
        data = {
            "sport": sport.id,
            "file": str(file_asset.id),
            "label": "New Background",
        }
        response = client.post(url, data, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_background_as_superadmin(self, superuser, file_asset):
        """Superadmin can create app backgrounds."""
        sport = Sport.objects.create(name="Basketball", slug="basketball-bg-admin")
        client = APIClient()
        client.force_authenticate(user=superuser)
        url = reverse("appbackground-list")
        data = {
            "sport": sport.id,
            "file": str(file_asset.id),
            "label": "New Background",
        }
        response = client.post(url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
