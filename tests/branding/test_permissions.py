"""Tests for B33 Brand Identity Manager permissions."""

import pytest


@pytest.mark.django_db
class TestBrandProfilePermissions:
    """Tests for BrandProfile permission cascade logic."""

    def test_org_admin_can_read_org_brand(self, api_client, org_admin, org_brand):
        """Test org admin can read org brand."""
        api_client.force_authenticate(org_admin)
        response = api_client.get(f"/api/branding/profiles/{org_brand.id}/")

        assert response.status_code == 200

    def test_org_admin_can_edit_org_brand(self, api_client, org_admin, org_brand):
        """Test org admin can edit org brand."""
        api_client.force_authenticate(org_admin)
        response = api_client.patch(f"/api/branding/profiles/{org_brand.id}/", {"name": "Updated"})

        assert response.status_code == 200
        assert response.json()["name"] == "Updated"

    def test_org_admin_can_read_project_brand(self, api_client, org_admin, project_brand):
        """Test org admin can read project brand (cascade)."""
        api_client.force_authenticate(org_admin)
        response = api_client.get(f"/api/branding/profiles/{project_brand.id}/")

        assert response.status_code == 200

    def test_org_admin_can_edit_project_brand(self, api_client, org_admin, project_brand):
        """Test org admin can edit project brand (cascade)."""
        api_client.force_authenticate(org_admin)
        response = api_client.patch(
            f"/api/branding/profiles/{project_brand.id}/", {"name": "Updated Project"}
        )

        assert response.status_code == 200
        assert response.json()["name"] == "Updated Project"

    def test_org_member_can_read_org_brand(self, api_client, org_member, org_brand):
        """Test org member can read org brand."""
        api_client.force_authenticate(org_member)
        response = api_client.get(f"/api/branding/profiles/{org_brand.id}/")

        assert response.status_code == 200

    def test_org_member_cannot_edit_org_brand(self, api_client, org_member, org_brand):
        """Test org member cannot edit org brand."""
        api_client.force_authenticate(org_member)
        response = api_client.patch(f"/api/branding/profiles/{org_brand.id}/", {"name": "Hacked"})

        assert response.status_code == 403

    def test_project_admin_can_read_project_brand(self, api_client, project_admin, project_brand):
        """Test project admin can read their project brand."""
        api_client.force_authenticate(project_admin)
        response = api_client.get(f"/api/branding/profiles/{project_brand.id}/")

        assert response.status_code == 200

    def test_project_admin_can_edit_project_brand(self, api_client, project_admin, project_brand):
        """Test project admin can edit their project brand."""
        api_client.force_authenticate(project_admin)
        response = api_client.patch(
            f"/api/branding/profiles/{project_brand.id}/", {"name": "Updated by PA"}
        )

        assert response.status_code == 200
        assert response.json()["name"] == "Updated by PA"

    def test_project_admin_cannot_edit_other_project_brand(
        self, api_client, project_admin, project_factory, brand_profile_factory
    ):
        """Test project admin cannot edit other project's brand."""
        # Create another project and brand
        other_project = project_factory()
        other_brand = brand_profile_factory(project=other_project, name="Other Project Brand")

        api_client.force_authenticate(project_admin)
        response = api_client.patch(f"/api/branding/profiles/{other_brand.id}/", {"name": "Hacked"})

        assert response.status_code == 403

    def test_project_member_can_read_project_brand(self, api_client, project_member, project_brand):
        """Test project member can read project brand."""
        api_client.force_authenticate(project_member)
        response = api_client.get(f"/api/branding/profiles/{project_brand.id}/")

        assert response.status_code == 200

    def test_project_member_cannot_edit_project_brand(
        self, api_client, project_member, project_brand
    ):
        """Test project member cannot edit project brand."""
        api_client.force_authenticate(project_member)
        response = api_client.patch(
            f"/api/branding/profiles/{project_brand.id}/", {"name": "Hacked"}
        )

        assert response.status_code == 403

    def test_non_member_cannot_read_brand(self, api_client, user_factory, org_brand):
        """Test non-member cannot read brand."""
        non_member = user_factory()
        api_client.force_authenticate(non_member)

        response = api_client.get(f"/api/branding/profiles/{org_brand.id}/")
        assert response.status_code == 403

    def test_non_member_cannot_edit_brand(self, api_client, user_factory, org_brand):
        """Test non-member cannot edit brand."""
        non_member = user_factory()
        api_client.force_authenticate(non_member)

        response = api_client.patch(f"/api/branding/profiles/{org_brand.id}/", {"name": "Hacked"})
        assert response.status_code == 403

    def test_unauthenticated_cannot_access(self, api_client, org_brand):
        """Test unauthenticated users cannot access."""
        response = api_client.get(f"/api/branding/profiles/{org_brand.id}/")
        assert response.status_code == 401


@pytest.mark.django_db
class TestDesignTokenPermissions:
    """Tests for DesignToken permissions (inherit from BrandProfile)."""

    def test_org_admin_can_edit_org_tokens(self, api_client, org_admin, org_brand, org_tokens):
        """Test org admin can edit org brand tokens."""
        token = org_tokens[0]
        api_client.force_authenticate(org_admin)

        response = api_client.patch(
            f"/api/branding/profiles/{org_brand.id}/tokens/{token.id}/",
            {"value": "#000000"},
        )

        assert response.status_code == 200

    def test_org_admin_can_edit_project_tokens(
        self, api_client, org_admin, project_brand, project_token
    ):
        """Test org admin can edit project brand tokens (cascade)."""
        api_client.force_authenticate(org_admin)

        response = api_client.patch(
            f"/api/branding/profiles/{project_brand.id}/tokens/{project_token.id}/",
            {"value": "#000000"},
        )

        assert response.status_code == 200

    def test_project_admin_can_edit_project_tokens(
        self, api_client, project_admin, project_brand, project_token
    ):
        """Test project admin can edit their project tokens."""
        api_client.force_authenticate(project_admin)

        response = api_client.patch(
            f"/api/branding/profiles/{project_brand.id}/tokens/{project_token.id}/",
            {"value": "#FFFFFF"},
        )

        assert response.status_code == 200

    def test_project_member_cannot_edit_tokens(
        self, api_client, project_member, project_brand, project_token
    ):
        """Test project member cannot edit tokens."""
        api_client.force_authenticate(project_member)

        response = api_client.patch(
            f"/api/branding/profiles/{project_brand.id}/tokens/{project_token.id}/",
            {"value": "#000000"},
        )

        assert response.status_code == 403


@pytest.mark.django_db
class TestBrandAssetPermissions:
    """Tests for BrandAsset permissions (inherit from BrandProfile)."""

    def test_org_admin_can_edit_org_assets(
        self, api_client, org_admin, org_brand, brand_asset_factory
    ):
        """Test org admin can edit org brand assets."""
        asset = brand_asset_factory(profile=org_brand, asset_type="logo_light")
        api_client.force_authenticate(org_admin)

        response = api_client.patch(
            f"/api/branding/profiles/{org_brand.id}/assets/{asset.id}/",
            {"alt_text": "Updated"},
        )

        assert response.status_code == 200

    def test_org_admin_can_edit_project_assets(
        self, api_client, org_admin, project_brand, brand_asset_factory
    ):
        """Test org admin can edit project brand assets (cascade)."""
        asset = brand_asset_factory(profile=project_brand, asset_type="icon")
        api_client.force_authenticate(org_admin)

        response = api_client.patch(
            f"/api/branding/profiles/{project_brand.id}/assets/{asset.id}/",
            {"alt_text": "Updated"},
        )

        assert response.status_code == 200

    def test_project_admin_can_edit_project_assets(
        self, api_client, project_admin, project_brand, brand_asset_factory
    ):
        """Test project admin can edit their project assets."""
        asset = brand_asset_factory(profile=project_brand, asset_type="logo_light")
        api_client.force_authenticate(project_admin)

        response = api_client.patch(
            f"/api/branding/profiles/{project_brand.id}/assets/{asset.id}/",
            {"alt_text": "Updated by PA"},
        )

        assert response.status_code == 200

    def test_org_member_cannot_edit_assets(
        self, api_client, org_member, org_brand, brand_asset_factory
    ):
        """Test org member cannot edit assets."""
        asset = brand_asset_factory(profile=org_brand, asset_type="icon")
        api_client.force_authenticate(org_member)

        response = api_client.patch(
            f"/api/branding/profiles/{org_brand.id}/assets/{asset.id}/",
            {"alt_text": "Hacked"},
        )

        assert response.status_code == 403


@pytest.mark.django_db
class TestCascadePermissionEdgeCases:
    """Edge cases for permission cascade logic."""

    def test_org_admin_across_multiple_projects(
        self,
        api_client,
        org_admin,
        organisation,
        project_factory,
        brand_profile_factory,
    ):
        """Test org admin can edit brands across all org projects."""
        # Create multiple projects
        project1 = project_factory(organisation=organisation)
        project2 = project_factory(organisation=organisation)

        brand1 = brand_profile_factory(project=project1, name="Project 1 Brand")
        brand2 = brand_profile_factory(project=project2, name="Project 2 Brand")

        api_client.force_authenticate(org_admin)

        # Can edit both
        response1 = api_client.patch(f"/api/branding/profiles/{brand1.id}/", {"name": "Updated 1"})
        response2 = api_client.patch(f"/api/branding/profiles/{brand2.id}/", {"name": "Updated 2"})

        assert response1.status_code == 200
        assert response2.status_code == 200

    def test_project_admin_isolation(
        self,
        api_client,
        organisation,
        user_factory,
        project_factory,
        brand_profile_factory,
    ):
        """Test project admins cannot access each other's projects."""
        # Create two projects with different admins
        admin1 = user_factory()
        admin2 = user_factory()

        project1 = project_factory(organisation=organisation, creator=admin1)
        project2 = project_factory(organisation=organisation, creator=admin2)

        brand1 = brand_profile_factory(project=project1, name="P1 Brand")
        brand2 = brand_profile_factory(project=project2, name="P2 Brand")

        # Admin1 tries to access Brand2
        api_client.force_authenticate(admin1)
        response = api_client.get(f"/api/branding/profiles/{brand2.id}/")

        assert response.status_code == 403

    def test_private_project_restrictions(
        self, api_client, organisation_factory, user_factory, project_factory, brand_profile_factory
    ):
        """Test private project brand access restrictions."""
        org = organisation_factory()
        admin = user_factory()
        member = user_factory()

        # Add both as org members
        from organisations.models import Membership

        Membership.objects.create(organisation=org, user=admin, role="admin")
        Membership.objects.create(organisation=org, user=member, role="member")

        # Create private project with only admin
        private_project = project_factory(organisation=org, creator=admin, is_private=True)
        private_brand = brand_profile_factory(project=private_project, name="Private Brand")

        # Org member (not in project) should NOT have access
        api_client.force_authenticate(member)
        response = api_client.get(f"/api/branding/profiles/{private_brand.id}/")

        # Expected: 403 because member isn't in the private project
        # (This tests project membership isolation)
        assert response.status_code == 403
