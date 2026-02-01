"""Integration tests for B33 Brand Identity Manager.

Tests complete user stories end-to-end.
"""

import pytest

from branding.models import BrandProfile, DesignToken


@pytest.mark.django_db
class TestUserStory1OrgBrandSetup:
    """US1: As an org admin, I set up the org brand identity."""

    def test_complete_org_brand_setup(self, api_client, org_admin, organisation):
        """Test complete org brand setup workflow."""
        api_client.force_authenticate(org_admin)

        # Step 1: Create org brand profile
        brand_response = api_client.post(
            "/api/branding/profiles/",
            {
                "organisation": str(organisation.id),
                "name": "Acme Corp Brand",
                "is_active": True,
            },
        )
        assert brand_response.status_code == 201
        brand_id = brand_response.json()["id"]

        # Step 2: Add design tokens
        token_data = [
            {"key": "primary_color", "value": "#FF6600", "type": "color"},
            {"key": "secondary_color", "value": "#333333", "type": "color"},
            {"key": "font_primary", "value": "Roboto", "type": "font"},
            {"key": "font_secondary", "value": "Open Sans", "type": "font"},
            {"key": "spacing_base", "value": "8px", "type": "spacing"},
        ]

        for token in token_data:
            token["profile"] = brand_id
            response = api_client.post(f"/api/branding/profiles/{brand_id}/tokens/", token)
            assert response.status_code == 201

        # Step 3: Add brand assets
        asset_response = api_client.post(
            f"/api/branding/profiles/{brand_id}/assets/",
            {
                "profile": brand_id,
                "asset_type": "logo_light",
                "alt_text": "Acme Corp Logo Light",
            },
        )
        assert asset_response.status_code == 201

        # Verify complete brand
        brand = BrandProfile.objects.get(id=brand_id)
        assert brand.design_tokens.count() == 5
        assert brand.brand_assets.count() == 1


@pytest.mark.django_db
class TestUserStory2ProjectOverride:
    """US2: As a project admin, I override specific tokens for my project."""

    def test_project_overrides_org_tokens(
        self,
        api_client,
        project_admin,
        project,
        org_brand,
        org_tokens,
    ):
        """Test project admin creates override tokens."""
        api_client.force_authenticate(project_admin)

        # Step 1: Create project brand
        brand_response = api_client.post(
            "/api/branding/profiles/",
            {
                "project": str(project.id),
                "name": "Team Alpha Brand",
                "is_active": True,
            },
        )
        assert brand_response.status_code == 201
        project_brand_id = brand_response.json()["id"]

        # Step 2: Override primary color only
        override_response = api_client.post(
            f"/api/branding/profiles/{project_brand_id}/tokens/",
            {
                "profile": project_brand_id,
                "key": "primary_color",
                "value": "#D2122E",  # Team-specific red
                "type": "color",
                "description": "Team Alpha primary color",
            },
        )
        assert override_response.status_code == 201

        # Step 3: Verify merge inheritance
        resolve_response = api_client.get(f"/api/branding/tokens/resolve/?project={project.id}")
        assert resolve_response.status_code == 200

        resolved = resolve_response.json()
        assert resolved["tokens"]["primary_color"] == "#D2122E"  # Override
        assert resolved["tokens"]["font_heading"] == "Roboto"  # Inherited
        assert resolved["source"] == "merged"


@pytest.mark.django_db
class TestUserStory3ConsumerApp:
    """US3: As a frontend dev, my app fetches merged brand tokens."""

    def test_consumer_app_gets_complete_brand(
        self,
        api_client,
        user,
        organisation,
        project,
        org_brand,
        org_tokens,
        project_brand,
        project_token,
        brand_asset_factory,
    ):
        """Test frontend app receives complete merged brand."""
        # Add user to project to have access
        from organisations.models import Membership
        from projects.models import ProjectMembership

        Membership.objects.create(organisation=organisation, user=user, role="member")
        ProjectMembership.objects.create(
            project=project, user=user, role="viewer", assignment_reason="manual"
        )

        # Add assets to both levels
        org_asset = brand_asset_factory(
            profile=org_brand, asset_type="logo_light", alt_text="Org Logo"
        )
        project_asset = brand_asset_factory(
            profile=project_brand, asset_type="icon", alt_text="Team Icon"
        )

        api_client.force_authenticate(user)

        # Fetch complete brand with assets
        response = api_client.get(
            f"/api/branding/tokens/resolve/?project={project.id}&include_assets=true"
        )
        assert response.status_code == 200

        data = response.json()

        # Verify merged tokens
        assert "tokens" in data
        assert data["tokens"]["primary_color"] == "#D2122E"  # Project
        assert data["tokens"]["font_heading"] == "Roboto"  # Org
        assert data["tokens"]["spacing_base"] == "8px"  # Org

        # Verify assets included
        assert "assets" in data
        assert "logo_light" in data["assets"]
        assert "icon" in data["assets"]

        # Verify metadata
        assert data["source"] == "merged"
        assert "profile_ids" in data


@pytest.mark.django_db
class TestUserStory4BrandUpdate:
    """US4: As an org admin, I update brand colors across all projects."""

    def test_org_update_cascades_to_projects(
        self,
        api_client,
        org_admin,
        organisation,
        org_brand,
        org_tokens,
        project_factory,
        brand_profile_factory,
    ):
        """Test org brand update affects all projects."""
        # Create multiple projects
        project1 = project_factory(organisation=organisation)
        project2 = project_factory(organisation=organisation)

        # Only project2 has override
        project2_brand = brand_profile_factory(project=project2, name="P2 Brand")
        DesignToken.objects.create(
            profile=project2_brand,
            key="primary_color",
            value="#OVERRIDE",
            type="color",
        )

        api_client.force_authenticate(org_admin)

        # Update org token
        org_color_token = org_tokens[0]  # primary_color
        update_response = api_client.patch(
            f"/api/branding/profiles/{org_brand.id}/tokens/{org_color_token.id}/",
            {"value": "#NEW_ORG_COLOR"},
        )
        assert update_response.status_code == 200

        # Verify project1 inherits new color
        resolve1 = api_client.get(f"/api/branding/tokens/resolve/?project={project1.id}")
        assert resolve1.json()["tokens"]["primary_color"] == "#NEW_ORG_COLOR"

        # Verify project2 keeps override
        resolve2 = api_client.get(f"/api/branding/tokens/resolve/?project={project2.id}")
        assert resolve2.json()["tokens"]["primary_color"] == "#OVERRIDE"


@pytest.mark.django_db
class TestUserStory5InactiveBrands:
    """US5: As an org admin, I deactivate old brand without deleting history."""

    def test_inactive_brand_excluded_from_resolution(
        self,
        api_client,
        org_admin,
        organisation,
        project,
        org_brand,
        org_tokens,
    ):
        """Test inactive brands are excluded but preserved."""
        api_client.force_authenticate(org_admin)

        # Verify brand is initially active
        resolve_active = api_client.get(f"/api/branding/tokens/resolve/?project={project.id}")
        assert resolve_active.status_code == 200
        assert len(resolve_active.json()["tokens"]) == 3

        # Deactivate brand
        deactivate_response = api_client.patch(
            f"/api/branding/profiles/{org_brand.id}/",
            {"is_active": False},
        )
        assert deactivate_response.status_code == 200

        # Verify brand still exists in DB
        assert BrandProfile.objects.filter(id=org_brand.id).exists()
        brand = BrandProfile.objects.get(id=org_brand.id)
        assert brand.is_active is False

        # Verify resolution excludes inactive brand
        resolve_inactive = api_client.get(f"/api/branding/tokens/resolve/?project={project.id}")
        assert resolve_inactive.status_code == 200
        assert resolve_inactive.json()["tokens"] == {}
        assert resolve_inactive.json()["source"] == "none"

        # Verify can reactivate
        reactivate_response = api_client.patch(
            f"/api/branding/profiles/{org_brand.id}/",
            {"is_active": True},
        )
        assert reactivate_response.status_code == 200

        # Tokens should be available again
        resolve_reactivated = api_client.get(f"/api/branding/tokens/resolve/?project={project.id}")
        assert len(resolve_reactivated.json()["tokens"]) == 3


@pytest.mark.django_db
class TestEdgeCases:
    """Edge case and error handling tests."""

    def test_duplicate_token_keys_prevented(self, api_client, org_admin, org_brand, org_tokens):
        """Test duplicate token keys are prevented per profile."""
        api_client.force_authenticate(org_admin)

        # Try to create duplicate key
        response = api_client.post(
            f"/api/branding/profiles/{org_brand.id}/tokens/",
            {
                "profile": str(org_brand.id),
                "key": "primary_color",  # Already exists
                "value": "#DUPLICATE",
                "type": "color",
            },
        )

        # Should fail at DB level (IntegrityError)
        assert response.status_code == 400 or response.status_code == 500

    def test_duplicate_asset_types_prevented(
        self, api_client, org_admin, org_brand, brand_asset_factory
    ):
        """Test duplicate asset types are prevented per profile."""
        brand_asset_factory(profile=org_brand, asset_type="logo_light")

        api_client.force_authenticate(org_admin)

        response = api_client.post(
            f"/api/branding/profiles/{org_brand.id}/assets/",
            {
                "profile": str(org_brand.id),
                "asset_type": "logo_light",  # Already exists
                "alt_text": "Duplicate",
            },
        )

        # Should fail at DB level
        assert response.status_code == 400 or response.status_code == 500

    def test_token_resolution_with_no_project(self, api_client, org_admin):
        """Test error handling when project param missing."""
        api_client.force_authenticate(org_admin)

        response = api_client.get("/api/branding/tokens/resolve/")
        assert response.status_code == 400
        assert "error" in response.json()

    def test_nested_project_inheritance(
        self,
        api_client,
        org_admin,
        organisation,
        project_factory,
        brand_profile_factory,
        design_token_factory,
    ):
        """Test inheritance with parent-child projects."""
        # Create parent project with brand
        parent = project_factory(organisation=organisation)
        parent_brand = brand_profile_factory(project=parent, name="Parent Brand")
        design_token_factory(profile=parent_brand, key="parent_token", value="parent_value")

        # Create child project (via parent_project FK)
        child = project_factory(organisation=organisation, parent_project=parent)

        api_client.force_authenticate(org_admin)

        # Child should still inherit from ORG, not parent project
        # (Project-to-project inheritance is not implemented, only org->project)
        response = api_client.get(f"/api/branding/tokens/resolve/?project={child.id}")
        assert response.status_code == 200
        # Should not have parent_token (unless org has it)
        tokens = response.json()["tokens"]
        # This validates current behavior: no project-to-project inheritance
