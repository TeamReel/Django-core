"""Tests for B33 Brand Identity Manager serializers."""

import pytest

from branding.serializers import (
    BrandAssetSerializer,
    BrandProfileDetailSerializer,
    BrandProfileSerializer,
    DesignTokenSerializer,
)


@pytest.mark.django_db
class TestBrandProfileSerializer:
    """Tests for BrandProfileSerializer."""

    def test_serialize_org_brand(self, org_brand):
        """Test serializing organisation brand."""
        serializer = BrandProfileSerializer(org_brand)
        data = serializer.data

        assert data["id"] == str(org_brand.id)
        assert data["name"] == org_brand.name
        assert data["organisation"] == str(org_brand.organisation.id)
        assert data["project"] is None
        assert data["is_active"] is True

    def test_serialize_project_brand(self, project_brand):
        """Test serializing project brand."""
        serializer = BrandProfileSerializer(project_brand)
        data = serializer.data

        assert data["id"] == str(project_brand.id)
        assert data["project"] == str(project_brand.project.id)
        assert data["organisation"] is None

    def test_create_org_brand(self, organisation):
        """Test creating org brand via serializer."""
        data = {"organisation": str(organisation.id), "name": "New Brand"}

        serializer = BrandProfileSerializer(data=data)
        assert serializer.is_valid()

        brand = serializer.save()
        assert brand.organisation == organisation
        assert brand.name == "New Brand"

    def test_create_project_brand(self, project):
        """Test creating project brand via serializer."""
        data = {"project": str(project.id), "name": "New Project Brand"}

        serializer = BrandProfileSerializer(data=data)
        assert serializer.is_valid()

        brand = serializer.save()
        assert brand.project == project
        assert brand.name == "New Project Brand"

    def test_xor_validation_both_org_and_project(self, organisation, project):
        """Test XOR validation rejects both org and project."""
        data = {
            "organisation": str(organisation.id),
            "project": str(project.id),
            "name": "Invalid",
        }

        serializer = BrandProfileSerializer(data=data)
        assert not serializer.is_valid()
        assert "__all__" in serializer.errors or "non_field_errors" in serializer.errors

    def test_xor_validation_neither_org_nor_project(self):
        """Test XOR validation requires at least one."""
        data = {"name": "Invalid"}

        serializer = BrandProfileSerializer(data=data)
        assert not serializer.is_valid()
        assert "__all__" in serializer.errors or "non_field_errors" in serializer.errors

    def test_name_required(self, organisation):
        """Test name field is required."""
        data = {"organisation": str(organisation.id)}

        serializer = BrandProfileSerializer(data=data)
        assert not serializer.is_valid()
        assert "name" in serializer.errors


@pytest.mark.django_db
class TestBrandProfileDetailSerializer:
    """Tests for BrandProfileDetailSerializer with nested data."""

    def test_serialize_with_tokens_and_assets(self, org_brand, org_tokens, brand_asset_factory):
        """Test serializing brand with nested tokens and assets."""
        # Create some assets
        asset1 = brand_asset_factory(profile=org_brand, asset_type="logo_light")
        asset2 = brand_asset_factory(profile=org_brand, asset_type="icon")

        serializer = BrandProfileDetailSerializer(org_brand)
        data = serializer.data

        assert "design_tokens" in data
        assert "brand_assets" in data
        assert len(data["design_tokens"]) == 3
        assert len(data["brand_assets"]) == 2

    def test_nested_tokens_structure(self, org_brand, org_tokens):
        """Test nested token structure."""
        serializer = BrandProfileDetailSerializer(org_brand)
        data = serializer.data

        token_data = data["design_tokens"][0]
        assert "id" in token_data
        assert "key" in token_data
        assert "value" in token_data
        assert "type" in token_data


@pytest.mark.django_db
class TestDesignTokenSerializer:
    """Tests for DesignTokenSerializer."""

    def test_serialize_token(self, org_tokens):
        """Test serializing design token."""
        token = org_tokens[0]
        serializer = DesignTokenSerializer(token)
        data = serializer.data

        assert data["id"] == str(token.id)
        assert data["key"] == "primary_color"
        assert data["value"] == "#FF6600"
        assert data["type"] == "color"
        assert data["profile"] == str(token.profile.id)

    def test_create_token(self, org_brand):
        """Test creating token via serializer."""
        data = {
            "profile": str(org_brand.id),
            "key": "new_token",
            "value": "new_value",
            "type": "other",
            "description": "Test description",
        }

        serializer = DesignTokenSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

        token = serializer.save()
        assert token.key == "new_token"
        assert token.value == "new_value"

    def test_key_required(self, org_brand):
        """Test key field is required."""
        data = {"profile": str(org_brand.id), "value": "test", "type": "other"}

        serializer = DesignTokenSerializer(data=data)
        assert not serializer.is_valid()
        assert "key" in serializer.errors

    def test_value_required(self, org_brand):
        """Test value field is required."""
        data = {"profile": str(org_brand.id), "key": "test_key", "type": "other"}

        serializer = DesignTokenSerializer(data=data)
        assert not serializer.is_valid()
        assert "value" in serializer.errors

    def test_key_max_length_255(self, org_brand):
        """Test key max length validation."""
        data = {
            "profile": str(org_brand.id),
            "key": "k" * 256,  # Too long
            "value": "test",
            "type": "other",
        }

        serializer = DesignTokenSerializer(data=data)
        assert not serializer.is_valid()
        assert "key" in serializer.errors

    def test_value_max_length_255(self, org_brand):
        """Test value max length validation."""
        data = {
            "profile": str(org_brand.id),
            "key": "test_key",
            "value": "v" * 256,  # Too long
            "type": "other",
        }

        serializer = DesignTokenSerializer(data=data)
        assert not serializer.is_valid()
        assert "value" in serializer.errors

    def test_unique_key_per_profile(self, org_brand, org_tokens):
        """Test unique validation for key per profile."""
        # Try to create duplicate key
        data = {
            "profile": str(org_brand.id),
            "key": "primary_color",  # Already exists
            "value": "#000000",
            "type": "color",
        }

        serializer = DesignTokenSerializer(data=data)
        # Serializer validation passes, but DB will reject
        assert serializer.is_valid()

        # DB constraint will catch it
        from django.db import IntegrityError

        with pytest.raises(IntegrityError):
            serializer.save()


@pytest.mark.django_db
class TestBrandAssetSerializer:
    """Tests for BrandAssetSerializer."""

    def test_serialize_asset(self, brand_asset_factory, org_brand):
        """Test serializing brand asset."""
        asset = brand_asset_factory(profile=org_brand, asset_type="logo_light", alt_text="Logo")

        serializer = BrandAssetSerializer(asset)
        data = serializer.data

        assert data["id"] == str(asset.id)
        assert data["asset_type"] == "logo_light"
        assert data["alt_text"] == "Logo"
        assert data["is_active"] is True
        assert data["profile"] == str(org_brand.id)

    def test_create_asset(self, org_brand):
        """Test creating asset via serializer."""
        data = {
            "profile": str(org_brand.id),
            "asset_type": "icon",
            "alt_text": "Test Icon",
            "is_active": True,
        }

        serializer = BrandAssetSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

        asset = serializer.save()
        assert asset.asset_type == "icon"
        assert asset.alt_text == "Test Icon"

    def test_asset_type_required(self, org_brand):
        """Test asset_type field is required."""
        data = {"profile": str(org_brand.id), "alt_text": "Test"}

        serializer = BrandAssetSerializer(data=data)
        assert not serializer.is_valid()
        assert "asset_type" in serializer.errors

    def test_unique_asset_type_per_profile(self, brand_asset_factory, org_brand):
        """Test unique validation for asset_type per profile."""
        # Create first asset
        brand_asset_factory(profile=org_brand, asset_type="logo_light")

        # Try to create duplicate
        data = {
            "profile": str(org_brand.id),
            "asset_type": "logo_light",  # Already exists
            "alt_text": "Duplicate",
        }

        serializer = BrandAssetSerializer(data=data)
        assert serializer.is_valid()

        # DB constraint will catch it
        from django.db import IntegrityError

        with pytest.raises(IntegrityError):
            serializer.save()

    def test_update_alt_text(self, brand_asset_factory, org_brand):
        """Test updating alt_text via serializer."""
        asset = brand_asset_factory(profile=org_brand, asset_type="icon")

        data = {"alt_text": "Updated Alt Text"}
        serializer = BrandAssetSerializer(asset, data=data, partial=True)

        assert serializer.is_valid()
        updated_asset = serializer.save()

        assert updated_asset.alt_text == "Updated Alt Text"
        assert updated_asset.asset_type == "icon"  # Unchanged
