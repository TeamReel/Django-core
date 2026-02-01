"""Tests for B33 Brand Identity Manager API views."""

import pytest

from branding.models import BrandAsset, BrandProfile, DesignToken


def extract_data(response):
    """Helper to extract data from B13 wrapper response."""
    response_data = response.json()
    # Handle both wrapped and direct responses for flexibility
    if "data" in response_data:
        return response_data["data"]
    return response_data


@pytest.mark.django_db
class TestBrandProfileViewSet:
    """Tests for BrandProfile API endpoints."""

    def test_list_brands_authenticated(self, api_client, org_admin, org_brand):
        """Test listing brands requires authentication."""
        # Unauthenticated
        response = api_client.get("/api/branding/profiles/")
        assert response.status_code == 401

        # Authenticated
        api_client.force_authenticate(org_admin)
        response = api_client.get("/api/branding/profiles/")
        assert response.status_code == 200

    def test_list_brands_returns_profiles(self, api_client, org_admin, org_brand, project_brand):
        """Test list endpoint returns brand profiles."""
        api_client.force_authenticate(org_admin)
        response = api_client.get("/api/branding/profiles/")

        assert response.status_code == 200
        data = extract_data(response)
        assert "results" in data  # Paginated
        assert len(data["results"]) >= 2

    def test_retrieve_brand(self, api_client, org_admin, org_brand, org_tokens):
        """Test retrieving single brand with details."""
        api_client.force_authenticate(org_admin)
        response = api_client.get(f"/api/branding/profiles/{org_brand.id}/")

        assert response.status_code == 200
        data = extract_data(response)
        assert data["id"] == str(org_brand.id)
        assert data["name"] == org_brand.name
        assert "design_tokens" in data
        assert len(data["design_tokens"]) == 3

    def test_create_org_brand(self, api_client, org_admin, organisation):
        """Test creating organisation brand."""
        api_client.force_authenticate(org_admin)

        payload = {"organisation": str(organisation.id), "name": "New Brand"}

        response = api_client.post("/api/branding/profiles/", payload)

        assert response.status_code == 201
        data = extract_data(response)
        assert data["name"] == "New Brand"
        assert data["organisation"] == str(organisation.id)

    def test_update_brand(self, api_client, org_admin, org_brand):
        """Test updating brand profile."""
        api_client.force_authenticate(org_admin)

        payload = {"name": "Updated Brand Name"}
        response = api_client.patch(f"/api/branding/profiles/{org_brand.id}/", payload)

        assert response.status_code == 200
        data = extract_data(response)
        assert data["name"] == "Updated Brand Name"

    def test_delete_brand(self, api_client, org_admin, org_brand):
        """Test deleting brand profile."""
        api_client.force_authenticate(org_admin)

        response = api_client.delete(f"/api/branding/profiles/{org_brand.id}/")
        assert response.status_code == 204

        # Verify deleted
        assert not BrandProfile.objects.filter(id=org_brand.id).exists()

    def test_filter_by_organisation(self, api_client, org_admin, org_brand, organisation_factory):
        """Test filtering brands by organisation."""
        # Create another org with brand
        other_org = organisation_factory()
        other_brand = BrandProfile.objects.create(organisation=other_org, name="Other Brand")

        api_client.force_authenticate(org_admin)
        response = api_client.get(
            f"/api/branding/profiles/?organisation={org_brand.organisation.id}"
        )

        assert response.status_code == 200
        data = extract_data(response)
        results = data["results"]

        # Should only return brands for specified org
        assert len(results) >= 1
        for brand in results:
            assert brand["organisation"] == str(org_brand.organisation.id)

    def test_filter_by_project(self, api_client, project_admin, project, project_brand):
        """Test filtering brands by project."""
        api_client.force_authenticate(project_admin)
        response = api_client.get(f"/api/branding/profiles/?project={project.id}")

        assert response.status_code == 200
        data = extract_data(response)
        results = data["results"]

        # Should only return brands for specified project
        for brand in results:
            assert str(brand["project"]) == str(project.id)

    def test_filter_by_is_active(self, api_client, org_admin, org_brand):
        """Test filtering by is_active status."""
        # Create inactive brand
        inactive = BrandProfile.objects.create(
            organisation=org_brand.organisation, name="Inactive", is_active=False
        )

        api_client.force_authenticate(org_admin)

        # Filter active only
        response = api_client.get("/api/branding/profiles/?is_active=true")
        assert response.status_code == 200
        data = extract_data(response)
        for brand in data["results"]:
            assert brand["is_active"] is True

    def test_pagination(self, api_client, org_admin, organisation, organisation_factory):
        """Test pagination works correctly."""
        # Create 25 brands (more than default page_size of 20)
        # Use different orgs to avoid UNIQUE constraint
        for i in range(25):
            org = organisation_factory() if i > 0 else organisation
            BrandProfile.objects.create(organisation=org, name=f"Brand {i}")

        api_client.force_authenticate(org_admin)
        response = api_client.get("/api/branding/profiles/")

        assert response.status_code == 200
        data = extract_data(response)
        assert "results" in data
        assert "count" in data
        assert "next" in data
        assert len(data["results"]) == 20  # Default page size


@pytest.mark.django_db
class TestDesignTokenViewSet:
    """Tests for DesignToken API endpoints (nested under profiles)."""

    def test_list_tokens_for_profile(self, api_client, org_admin, org_brand, org_tokens):
        """Test listing tokens for specific profile."""
        api_client.force_authenticate(org_admin)
        response = api_client.get(f"/api/branding/profiles/{org_brand.id}/tokens/")

        assert response.status_code == 200
        data = extract_data(response)
        assert "results" in data
        assert len(data["results"]) == 3

    def test_create_token(self, api_client, org_admin, org_brand):
        """Test creating design token."""
        api_client.force_authenticate(org_admin)

        payload = {
            "profile": str(org_brand.id),
            "key": "new_token",
            "value": "new_value",
            "type": "other",
        }

        response = api_client.post(f"/api/branding/profiles/{org_brand.id}/tokens/", payload)

        assert response.status_code == 201
        data = extract_data(response)
        assert data["key"] == "new_token"

    def test_update_token(self, api_client, org_admin, org_brand, org_tokens):
        """Test updating token value."""
        token = org_tokens[0]
        api_client.force_authenticate(org_admin)

        payload = {"value": "#000000"}
        response = api_client.patch(
            f"/api/branding/profiles/{org_brand.id}/tokens/{token.id}/", payload
        )

        assert response.status_code == 200
        data = extract_data(response)
        assert data["value"] == "#000000"

    def test_delete_token(self, api_client, org_admin, org_brand, org_tokens):
        """Test deleting design token."""
        token = org_tokens[0]
        api_client.force_authenticate(org_admin)

        response = api_client.delete(f"/api/branding/profiles/{org_brand.id}/tokens/{token.id}/")

        assert response.status_code == 204
        assert not DesignToken.objects.filter(id=token.id).exists()

    def test_filter_tokens_by_type(self, api_client, org_admin, org_brand, org_tokens):
        """Test filtering tokens by type."""
        api_client.force_authenticate(org_admin)
        response = api_client.get(f"/api/branding/profiles/{org_brand.id}/tokens/?type=color")

        assert response.status_code == 200
        data = extract_data(response)
        for token in data["results"]:
            assert token["type"] == "color"

    def test_search_tokens_by_key(self, api_client, org_admin, org_brand, org_tokens):
        """Test searching tokens by key."""
        api_client.force_authenticate(org_admin)
        response = api_client.get(f"/api/branding/profiles/{org_brand.id}/tokens/?key=color")

        assert response.status_code == 200
        data = extract_data(response)
        # Should find primary_color
        assert len(data["results"]) >= 1


@pytest.mark.django_db
class TestBrandAssetViewSet:
    """Tests for BrandAsset API endpoints (nested under profiles)."""

    def test_list_assets_for_profile(self, api_client, org_admin, org_brand, brand_asset_factory):
        """Test listing assets for specific profile."""
        asset1 = brand_asset_factory(profile=org_brand, asset_type="logo_light")
        asset2 = brand_asset_factory(profile=org_brand, asset_type="icon")

        api_client.force_authenticate(org_admin)
        response = api_client.get(f"/api/branding/profiles/{org_brand.id}/assets/")

        assert response.status_code == 200
        data = extract_data(response)
        assert "results" in data
        assert len(data["results"]) == 2

    def test_create_asset(self, api_client, org_admin, org_brand):
        """Test creating brand asset."""
        api_client.force_authenticate(org_admin)

        payload = {
            "profile": str(org_brand.id),
            "asset_type": "icon",
            "alt_text": "Test Icon",
        }

        response = api_client.post(f"/api/branding/profiles/{org_brand.id}/assets/", payload)

        assert response.status_code == 201
        data = extract_data(response)
        assert data["asset_type"] == "icon"

    def test_update_asset(self, api_client, org_admin, org_brand, brand_asset_factory):
        """Test updating asset."""
        asset = brand_asset_factory(profile=org_brand, asset_type="logo_light")
        api_client.force_authenticate(org_admin)

        payload = {"alt_text": "Updated Alt Text"}
        response = api_client.patch(
            f"/api/branding/profiles/{org_brand.id}/assets/{asset.id}/", payload
        )

        assert response.status_code == 200
        data = extract_data(response)
        assert data["alt_text"] == "Updated Alt Text"

    def test_delete_asset(self, api_client, org_admin, org_brand, brand_asset_factory):
        """Test deleting brand asset."""
        asset = brand_asset_factory(profile=org_brand, asset_type="icon")
        api_client.force_authenticate(org_admin)

        response = api_client.delete(f"/api/branding/profiles/{org_brand.id}/assets/{asset.id}/")

        assert response.status_code == 204
        assert not BrandAsset.objects.filter(id=asset.id).exists()

    def test_filter_assets_by_type(self, api_client, org_admin, org_brand, brand_asset_factory):
        """Test filtering assets by asset_type."""
        brand_asset_factory(profile=org_brand, asset_type="logo_light")
        brand_asset_factory(profile=org_brand, asset_type="icon")

        api_client.force_authenticate(org_admin)
        response = api_client.get(
            f"/api/branding/profiles/{org_brand.id}/assets/?asset_type=logo_light"
        )

        assert response.status_code == 200
        data = extract_data(response)
        for asset in data["results"]:
            assert asset["asset_type"] == "logo_light"


@pytest.mark.django_db
class TestTokenResolutionView:
    """Tests for token resolution endpoint (merge inheritance)."""

    def test_resolve_project_with_org_fallback(
        self,
        api_client,
        org_admin,
        project,
        org_brand,
        org_tokens,
        project_brand,
        project_token,
    ):
        """Test project overrides org token, inherits others."""
        api_client.force_authenticate(org_admin)
        response = api_client.get(f"/api/branding/tokens/resolve/?project={project.id}")

        assert response.status_code == 200
        data = extract_data(response)

        assert "tokens" in data
        assert data["tokens"]["primary_color"] == "#D2122E"  # Project override
        assert data["tokens"]["font_heading"] == "Roboto"  # Org fallback
        assert data["tokens"]["spacing_base"] == "8px"  # Org fallback
        assert data["source"] == "merged"

    def test_resolve_project_without_own_brand(
        self, api_client, org_admin, project, org_brand, org_tokens
    ):
        """Test project without own brand inherits all from org."""
        api_client.force_authenticate(org_admin)
        response = api_client.get(f"/api/branding/tokens/resolve/?project={project.id}")

        assert response.status_code == 200
        data = extract_data(response)

        assert data["tokens"]["primary_color"] == "#FF6600"  # Org
        assert data["tokens"]["font_heading"] == "Roboto"  # Org
        assert data["source"] == "organisation"

    def test_resolve_no_brands(self, api_client, org_admin, project):
        """Test project with no brands returns empty."""
        api_client.force_authenticate(org_admin)
        response = api_client.get(f"/api/branding/tokens/resolve/?project={project.id}")

        assert response.status_code == 200
        data = extract_data(response)
        assert data["tokens"] == {}
        assert data["source"] == "none"

    def test_resolve_with_assets(
        self, api_client, org_admin, project, project_brand, brand_asset_factory
    ):
        """Test including assets in resolution."""
        asset = brand_asset_factory(profile=project_brand, asset_type="logo_light")

        api_client.force_authenticate(org_admin)
        response = api_client.get(
            f"/api/branding/tokens/resolve/?project={project.id}&include_assets=true"
        )

        assert response.status_code == 200
        data = extract_data(response)
        assert "assets" in data
        assert "logo_light" in data["assets"]

    def test_resolve_without_project_param(self, api_client, org_admin):
        """Test error when project param missing."""
        api_client.force_authenticate(org_admin)
        response = api_client.get("/api/branding/tokens/resolve/")

        assert response.status_code == 400
        data = extract_data(response)
        assert "error" in data

    def test_resolve_inactive_brand_excluded(self, api_client, org_admin, project, organisation):
        """Test inactive brands are excluded from resolution."""
        # Create inactive org brand
        inactive_brand = BrandProfile.objects.create(
            organisation=organisation, name="Inactive", is_active=False
        )
        DesignToken.objects.create(
            profile=inactive_brand, key="inactive_token", value="test", type="other"
        )

        api_client.force_authenticate(org_admin)
        response = api_client.get(f"/api/branding/tokens/resolve/?project={project.id}")

        assert response.status_code == 200
        data = extract_data(response)
        # Should not include inactive_token
        assert "inactive_token" not in data["tokens"]
