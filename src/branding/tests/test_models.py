"""Test cases for branding models.

Target coverage: BrandProfile, DesignToken, BrandAsset, AppBackground.
"""

import pytest
from branding.models import AppBackground, BrandAsset, BrandProfile, DesignToken
from django.db import IntegrityError


@pytest.mark.django_db
class TestBrandProfileModel:
    """Test BrandProfile model constraints and behavior."""

    def test_create_org_level_brand(self, organisation, user):
        """Organisation-level brand profile can be created."""
        profile = BrandProfile.objects.create(
            name="Org Brand",
            organisation=organisation,
            created_by=user,
        )
        assert profile.name == "Org Brand"
        assert profile.organisation == organisation
        assert profile.project is None
        assert profile.is_active is True

    def test_create_project_level_brand(self, project, user):
        """Project-level brand profile can be created."""
        profile = BrandProfile.objects.create(
            name="Project Brand",
            project=project,
            created_by=user,
        )
        assert profile.project == project
        assert profile.organisation is None

    def test_constraint_both_null_raises(self, user):
        """CheckConstraint prevents both org and project being null."""
        with pytest.raises(IntegrityError):
            BrandProfile.objects.create(
                name="Invalid Brand",
                organisation=None,
                project=None,
                created_by=user,
            )

    def test_constraint_both_set_raises(self, organisation, project, user):
        """CheckConstraint prevents both org and project being set."""
        with pytest.raises(IntegrityError):
            BrandProfile.objects.create(
                name="Invalid Brand",
                organisation=organisation,
                project=project,
                created_by=user,
            )

    def test_unique_brand_per_organisation(self, organisation, user):
        """Only one brand per organisation allowed."""
        BrandProfile.objects.create(
            name="Brand 1",
            organisation=organisation,
            created_by=user,
        )
        with pytest.raises(IntegrityError):
            BrandProfile.objects.create(
                name="Brand 2",
                organisation=organisation,
                created_by=user,
            )

    def test_unique_brand_per_project(self, project, user):
        """Only one brand per project allowed."""
        BrandProfile.objects.create(
            name="Brand 1",
            project=project,
            created_by=user,
        )
        with pytest.raises(IntegrityError):
            BrandProfile.objects.create(
                name="Brand 2",
                project=project,
                created_by=user,
            )

    def test_str_representation(self, organisation, user):
        """String representation returns name."""
        profile = BrandProfile.objects.create(
            name="My Brand",
            organisation=organisation,
            created_by=user,
        )
        assert str(profile) == "My Brand"

    def test_get_tokens_empty(self, organisation, user):
        """get_tokens returns empty dict when no tokens exist."""
        profile = BrandProfile.objects.create(
            name="Brand",
            organisation=organisation,
            created_by=user,
        )
        assert profile.get_tokens() == {}

    def test_get_tokens_returns_dict(self, organisation, user):
        """get_tokens returns {key: value} dict of all tokens."""
        profile = BrandProfile.objects.create(
            name="Brand",
            organisation=organisation,
            created_by=user,
        )
        DesignToken.objects.create(
            profile=profile, key="primary_color", value="#FF0000", type="color"
        )
        DesignToken.objects.create(
            profile=profile, key="font_heading", value="Roboto", type="font"
        )
        tokens = profile.get_tokens()
        assert tokens["primary_color"] == "#FF0000"
        assert tokens["font_heading"] == "Roboto"
        assert len(tokens) == 2

    def test_get_merged_tokens_org_brand(self, organisation, user):
        """Org-level brand returns its own tokens (no merge)."""
        profile = BrandProfile.objects.create(
            name="Org Brand",
            organisation=organisation,
            created_by=user,
        )
        DesignToken.objects.create(
            profile=profile, key="primary_color", value="#0000FF", type="color"
        )
        merged = profile.get_merged_tokens()
        assert merged == {"primary_color": "#0000FF"}

    def test_get_merged_tokens_project_overrides_org(self, organisation, project, user):
        """Project brand inherits org tokens and overrides duplicates."""
        org_profile = BrandProfile.objects.create(
            name="Org Brand",
            organisation=organisation,
            created_by=user,
        )
        DesignToken.objects.create(
            profile=org_profile, key="primary_color", value="#0000FF", type="color"
        )
        DesignToken.objects.create(
            profile=org_profile, key="font_heading", value="Arial", type="font"
        )

        project_profile = BrandProfile.objects.create(
            name="Project Brand",
            project=project,
            created_by=user,
        )
        DesignToken.objects.create(
            profile=project_profile, key="primary_color", value="#FF0000", type="color"
        )

        merged = project_profile.get_merged_tokens()
        assert merged["primary_color"] == "#FF0000"  # overridden
        assert merged["font_heading"] == "Arial"  # inherited

    def test_get_effective_brand_project_first(self, organisation, project, user):
        """get_effective_brand prefers project brand over org brand."""
        BrandProfile.objects.create(
            name="Org Brand",
            organisation=organisation,
            created_by=user,
        )
        project_brand = BrandProfile.objects.create(
            name="Project Brand",
            project=project,
            created_by=user,
        )
        effective = BrandProfile.get_effective_brand(project=project)
        assert effective == project_brand

    def test_get_effective_brand_falls_back_to_org(self, organisation, project, user):
        """get_effective_brand falls back to org when no project brand."""
        org_brand = BrandProfile.objects.create(
            name="Org Brand",
            organisation=organisation,
            created_by=user,
        )
        effective = BrandProfile.get_effective_brand(project=project)
        assert effective == org_brand

    def test_get_effective_brand_none(self, project):
        """get_effective_brand returns None when no brands exist."""
        effective = BrandProfile.get_effective_brand(project=project)
        assert effective is None

    def test_is_active_default_true(self, organisation, user):
        """Brand profile is active by default."""
        profile = BrandProfile.objects.create(
            name="Brand",
            organisation=organisation,
            created_by=user,
        )
        assert profile.is_active is True

    def test_inactive_brand_excluded_from_effective(self, organisation, user):
        """Inactive brand is not returned by get_effective_brand."""
        BrandProfile.objects.create(
            name="Inactive Brand",
            organisation=organisation,
            is_active=False,
            created_by=user,
        )
        effective = BrandProfile.get_effective_brand(organisation=organisation)
        assert effective is None


@pytest.mark.django_db
class TestDesignTokenModel:
    """Test DesignToken model constraints and behavior."""

    def test_create_token(self, organisation, user):
        """Design token can be created with valid data."""
        profile = BrandProfile.objects.create(
            name="Brand", organisation=organisation, created_by=user
        )
        token = DesignToken.objects.create(
            profile=profile,
            key="primary_color",
            value="#FF0000",
            type="color",
        )
        assert token.key == "primary_color"
        assert token.value == "#FF0000"
        assert token.type == "color"

    def test_str_representation(self, organisation, user):
        """String representation shows key: value."""
        profile = BrandProfile.objects.create(
            name="Brand", organisation=organisation, created_by=user
        )
        token = DesignToken.objects.create(
            profile=profile, key="primary_color", value="#FF0000"
        )
        assert str(token) == "primary_color: #FF0000"

    def test_unique_key_per_profile(self, organisation, user):
        """Same key cannot be reused in the same profile."""
        profile = BrandProfile.objects.create(
            name="Brand", organisation=organisation, created_by=user
        )
        DesignToken.objects.create(
            profile=profile, key="primary_color", value="#FF0000"
        )
        with pytest.raises(IntegrityError):
            DesignToken.objects.create(
                profile=profile, key="primary_color", value="#00FF00"
            )

    def test_same_key_different_profiles(self, organisation, project, user):
        """Same token key can exist in different profiles."""
        profile1 = BrandProfile.objects.create(
            name="Org Brand", organisation=organisation, created_by=user
        )
        profile2 = BrandProfile.objects.create(
            name="Project Brand", project=project, created_by=user
        )
        t1 = DesignToken.objects.create(
            profile=profile1, key="primary_color", value="#FF0000"
        )
        t2 = DesignToken.objects.create(
            profile=profile2, key="primary_color", value="#0000FF"
        )
        assert t1.value != t2.value

    def test_is_well_known(self, organisation, user):
        """is_well_known returns True for standard token keys."""
        profile = BrandProfile.objects.create(
            name="Brand", organisation=organisation, created_by=user
        )
        token = DesignToken.objects.create(
            profile=profile, key="primary_color", value="#FF0000"
        )
        assert token.is_well_known() is True

    def test_is_not_well_known(self, organisation, user):
        """is_well_known returns False for custom token keys."""
        profile = BrandProfile.objects.create(
            name="Brand", organisation=organisation, created_by=user
        )
        token = DesignToken.objects.create(
            profile=profile, key="custom_gradient", value="linear-gradient(...)"
        )
        assert token.is_well_known() is False


@pytest.mark.django_db
class TestBrandAssetModel:
    """Test BrandAsset model constraints and behavior."""

    def test_create_brand_asset(self, organisation, user, file_asset):
        """Brand asset can be created with valid data."""
        profile = BrandProfile.objects.create(
            name="Brand", organisation=organisation, created_by=user
        )
        asset = BrandAsset.objects.create(
            profile=profile,
            file=file_asset,
            asset_type="logo_upload",
        )
        assert asset.asset_type == "logo_upload"
        assert asset.profile == profile
        assert asset.is_active is True

    def test_str_representation(self, organisation, user, file_asset):
        """String representation shows profile name and asset type display."""
        profile = BrandProfile.objects.create(
            name="My Club", organisation=organisation, created_by=user
        )
        asset = BrandAsset.objects.create(
            profile=profile, file=file_asset, asset_type="logo_upload"
        )
        assert str(asset) == "My Club - Logo (Raw Upload)"

    def test_unique_asset_type_per_profile(self, organisation, user, file_asset, second_file_asset):
        """Same non-background asset type cannot be duplicated in a profile."""
        profile = BrandProfile.objects.create(
            name="Brand", organisation=organisation, created_by=user
        )
        BrandAsset.objects.create(
            profile=profile, file=file_asset, asset_type="logo_upload"
        )
        with pytest.raises(IntegrityError):
            BrandAsset.objects.create(
                profile=profile, file=second_file_asset, asset_type="logo_upload"
            )

    def test_multiple_club_backgrounds_allowed(self, organisation, user, file_asset, second_file_asset):
        """Multiple club_background assets allowed per profile (exception to uniqueness)."""
        profile = BrandProfile.objects.create(
            name="Brand", organisation=organisation, created_by=user
        )
        BrandAsset.objects.create(
            profile=profile, file=file_asset, asset_type="club_background"
        )
        asset2 = BrandAsset.objects.create(
            profile=profile, file=second_file_asset, asset_type="club_background"
        )
        assert asset2.pk is not None


@pytest.mark.django_db
class TestAppBackgroundModel:
    """Test AppBackground model behavior."""

    def test_create_app_background(self, sport, file_asset, user):
        """App background can be created with valid data."""
        bg = AppBackground.objects.create(
            sport=sport,
            file=file_asset,
            label="Voetbalveld",
            sort_order=1,
            created_by=user,
        )
        assert bg.label == "Voetbalveld"
        assert bg.is_active is True
        assert bg.sort_order == 1

    def test_str_representation(self, sport, file_asset, user):
        """String representation shows label and sport name."""
        bg = AppBackground.objects.create(
            sport=sport,
            file=file_asset,
            label="Grasmat avond",
            created_by=user,
        )
        assert str(bg) == "Grasmat avond (Football)"

    def test_ordering_by_sort_order(self, sport, file_asset, second_file_asset, user):
        """Backgrounds ordered by sort_order then label."""
        bg_b = AppBackground.objects.create(
            sport=sport, file=file_asset, label="B Background", sort_order=2, created_by=user
        )
        bg_a = AppBackground.objects.create(
            sport=sport, file=second_file_asset, label="A Background", sort_order=1, created_by=user
        )
        backgrounds = list(AppBackground.objects.all())
        assert backgrounds[0] == bg_a
        assert backgrounds[1] == bg_b
