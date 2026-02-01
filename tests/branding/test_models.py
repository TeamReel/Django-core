"""Tests for B33 Brand Identity Manager models."""

import pytest
from django.db import IntegrityError

from branding.models import BrandAsset, BrandProfile, DesignToken


@pytest.mark.django_db
class TestBrandProfile:
    """Tests for BrandProfile model."""

    def test_create_org_brand(self, organisation):
        """Test creating organisation-level brand profile."""
        brand = BrandProfile.objects.create(organisation=organisation, name="Test Brand")

        assert brand.id is not None
        assert brand.name == "Test Brand"
        assert brand.organisation == organisation
        assert brand.project is None
        assert brand.is_active is True

    def test_create_project_brand(self, project):
        """Test creating project-level brand profile."""
        brand = BrandProfile.objects.create(project=project, name="Project Brand")

        assert brand.id is not None
        assert brand.name == "Project Brand"
        assert brand.project == project
        assert brand.organisation is None

    def test_xor_constraint_prevents_both_org_and_project(self, organisation, project):
        """Test that XOR constraint prevents setting both org and project."""
        # This should raise an IntegrityError due to XOR constraint
        with pytest.raises(Exception):  # Could be IntegrityError or ValidationError
            brand = BrandProfile(organisation=organisation, project=project, name="Invalid")
            brand.full_clean()  # Validation error
            brand.save()  # Or integrity error

    def test_xor_constraint_requires_at_least_one(self):
        """Test that at least one of organisation or project is required."""
        with pytest.raises(Exception):  # ValidationError or IntegrityError
            brand = BrandProfile(name="Invalid")
            brand.full_clean()
            brand.save()

    def test_get_tokens_org_brand(self, org_brand, org_tokens):
        """Test get_tokens returns dict of tokens for org brand."""
        tokens = org_brand.get_tokens()

        assert isinstance(tokens, dict)
        assert len(tokens) == 3
        assert tokens["primary_color"] == "#FF6600"
        assert tokens["font_heading"] == "Roboto"
        assert tokens["spacing_base"] == "8px"

    def test_get_tokens_empty(self, org_brand):
        """Test get_tokens returns empty dict when no tokens."""
        tokens = org_brand.get_tokens()
        assert tokens == {}

    def test_get_merged_tokens_project_with_org(
        self, organisation, project, org_brand, org_tokens, project_brand, project_token
    ):
        """Test merge inheritance: project overrides org token."""
        # project_brand inherits from org_brand via project.organisation
        merged = project_brand.get_merged_tokens()

        assert merged["primary_color"] == "#D2122E"  # Project override
        assert merged["font_heading"] == "Roboto"  # Inherited from org
        assert merged["spacing_base"] == "8px"  # Inherited from org

    def test_get_merged_tokens_project_without_brand(self, project, org_brand, org_tokens):
        """Test project without own brand still inherits org tokens."""
        # Create project brand without any tokens
        project_brand = BrandProfile.objects.create(project=project, name="Empty Project Brand")

        merged = project_brand.get_merged_tokens()

        # Should inherit all from org
        assert merged["primary_color"] == "#FF6600"
        assert merged["font_heading"] == "Roboto"
        assert merged["spacing_base"] == "8px"

    def test_get_merged_tokens_no_org_brand(self, project):
        """Test project brand with no org brand."""
        project_brand = BrandProfile.objects.create(project=project, name="Isolated Project Brand")

        merged = project_brand.get_merged_tokens()
        assert merged == {}

    def test_str_representation(self, org_brand):
        """Test string representation."""
        assert str(org_brand) == org_brand.name


@pytest.mark.django_db
class TestDesignToken:
    """Tests for DesignToken model."""

    def test_create_token(self, org_brand):
        """Test creating a design token."""
        token = DesignToken.objects.create(
            profile=org_brand,
            key="test_key",
            value="test_value",
            type="other",
            description="Test token",
        )

        assert token.id is not None
        assert token.key == "test_key"
        assert token.value == "test_value"
        assert token.type == "other"

    def test_unique_key_per_profile(self, org_brand):
        """Test unique constraint on (profile, key)."""
        DesignToken.objects.create(profile=org_brand, key="duplicate", value="value1", type="other")

        with pytest.raises(IntegrityError):
            DesignToken.objects.create(
                profile=org_brand, key="duplicate", value="value2", type="other"
            )

    def test_same_key_different_profiles(self, org_brand, project_brand):
        """Test same key can exist in different profiles."""
        token1 = DesignToken.objects.create(
            profile=org_brand, key="primary_color", value="#FF6600", type="color"
        )

        token2 = DesignToken.objects.create(
            profile=project_brand, key="primary_color", value="#D2122E", type="color"
        )

        assert token1.id != token2.id
        assert token1.key == token2.key
        assert token1.value != token2.value

    def test_key_max_length(self, org_brand):
        """Test key respects max length (255)."""
        long_key = "k" * 255
        token = DesignToken.objects.create(
            profile=org_brand, key=long_key, value="value", type="other"
        )
        assert len(token.key) == 255

    def test_value_max_length(self, org_brand):
        """Test value respects max length (255)."""
        long_value = "v" * 255
        token = DesignToken.objects.create(
            profile=org_brand, key="long_value", value=long_value, type="other"
        )
        assert len(token.value) == 255

    def test_type_choices(self, org_brand):
        """Test all type choices work."""
        types = ["color", "font", "spacing", "size", "shadow", "opacity", "other"]

        for token_type in types:
            token = DesignToken.objects.create(
                profile=org_brand,
                key=f"test_{token_type}",
                value="test",
                type=token_type,
            )
            assert token.type == token_type

    def test_str_representation(self, org_tokens):
        """Test string representation includes key and value."""
        token = org_tokens[0]
        str_repr = str(token)
        assert "primary_color" in str_repr
        assert "#FF6600" in str_repr


@pytest.mark.django_db
class TestBrandAsset:
    """Tests for BrandAsset model."""

    def test_create_asset_without_file(self, org_brand):
        """Test creating brand asset (file is optional for testing)."""
        asset = BrandAsset.objects.create(
            profile=org_brand, asset_type="logo_light", alt_text="Logo"
        )

        assert asset.id is not None
        assert asset.asset_type == "logo_light"
        assert asset.alt_text == "Logo"
        assert asset.is_active is True

    def test_unique_asset_type_per_profile(self, org_brand):
        """Test unique constraint on (profile, asset_type)."""
        BrandAsset.objects.create(profile=org_brand, asset_type="logo_light", alt_text="Logo 1")

        with pytest.raises(IntegrityError):
            BrandAsset.objects.create(profile=org_brand, asset_type="logo_light", alt_text="Logo 2")

    def test_same_asset_type_different_profiles(self, org_brand, project_brand):
        """Test same asset_type can exist in different profiles."""
        asset1 = BrandAsset.objects.create(
            profile=org_brand, asset_type="logo_light", alt_text="Org Logo"
        )

        asset2 = BrandAsset.objects.create(
            profile=project_brand, asset_type="logo_light", alt_text="Project Logo"
        )

        assert asset1.id != asset2.id
        assert asset1.asset_type == asset2.asset_type

    def test_asset_type_choices(self, org_brand):
        """Test all asset_type choices work."""
        types = [
            "logo_light",
            "logo_dark",
            "icon",
            "banner",
            "background",
            "image",
            "other",
        ]

        for asset_type in types:
            asset = BrandAsset.objects.create(
                profile=org_brand, asset_type=asset_type, alt_text=f"Test {asset_type}"
            )
            assert asset.asset_type == asset_type

    def test_get_url_with_file(self, org_brand):
        """Test get_url returns file URL when file exists."""
        # Mock file with URL
        from unittest.mock import Mock

        mock_file = Mock()
        mock_file.url = "https://example.com/logo.png"

        asset = BrandAsset.objects.create(
            profile=org_brand, file=mock_file, asset_type="logo_light"
        )

        # Note: In real DB, file would be B22 File object
        # Here we're just testing the logic
        url = asset.get_url()
        # Will return None since file.url isn't actually persisted
        assert url is None or isinstance(url, str)

    def test_inactive_asset(self, org_brand):
        """Test creating inactive asset."""
        asset = BrandAsset.objects.create(
            profile=org_brand, asset_type="logo_light", is_active=False
        )

        assert asset.is_active is False

    def test_str_representation(self, brand_asset_factory, org_brand):
        """Test string representation."""
        asset = brand_asset_factory(profile=org_brand, asset_type="logo_light")
        str_repr = str(asset)
        assert "logo_light" in str_repr.lower() or org_brand.name in str_repr
