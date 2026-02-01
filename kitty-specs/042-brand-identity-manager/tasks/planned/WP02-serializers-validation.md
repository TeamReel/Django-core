---
work_package_id: WP02
title: Serializers & Validation
priority: P1
lane: planned
subtasks:
  - T009
  - T010
  - T011
  - T012
  - T013
  - T014
estimated_hours: 3
dependencies:
  - WP01
history:
  - date: 2026-02-01
    action: created
    by: spec-kitty.tasks
---

# Work Package 02: Serializers & Validation

## Objective

Implement Django REST Framework serializers with complete validation logic for BrandProfile, DesignToken, and BrandAsset models.

## Context

**Feature**: B33 Brand Identity Manager
**Location**: `src/branding/serializers.py`
**Dependencies**: WP01 (models must exist)

Serializers provide the interface between Django models and JSON API responses. They handle validation, nested relationships, and data transformation.

## Detailed Guidance

### T009: Create BrandProfileSerializer

**Implementation**:

```python
from rest_framework import serializers
from .models import BrandProfile, DesignToken, BrandAsset


class BrandProfileSerializer(serializers.ModelSerializer):
    """Serializer for BrandProfile with nested tokens and assets."""

    token_count = serializers.SerializerMethodField()
    asset_count = serializers.SerializerMethodField()

    class Meta:
        model = BrandProfile
        fields = [
            'id', 'organisation', 'project', 'name', 'is_active',
            'token_count', 'asset_count',
            'created_at', 'updated_at', 'created_by', 'updated_by'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'token_count', 'asset_count']

    def get_token_count(self, obj):
        return obj.design_tokens.count()

    def get_asset_count(self, obj):
        return obj.brand_assets.count()

    def validate(self, data):
        """Ensure org XOR project constraint."""
        org = data.get('organisation')
        proj = data.get('project')

        if not org and not proj:
            raise serializers.ValidationError(
                "Either organisation or project must be specified."
            )
        if org and proj:
            raise serializers.ValidationError(
                "Cannot specify both organisation and project."
            )

        return data


class BrandProfileDetailSerializer(BrandProfileSerializer):
    """Detailed serializer with nested tokens and assets."""

    tokens = serializers.SerializerMethodField()
    assets = serializers.SerializerMethodField()

    class Meta(BrandProfileSerializer.Meta):
        fields = BrandProfileSerializer.Meta.fields + ['tokens', 'assets']

    def get_tokens(self, obj):
        return DesignTokenSerializer(obj.design_tokens.all(), many=True).data

    def get_assets(self, obj):
        return BrandAssetSerializer(obj.brand_assets.filter(is_active=True), many=True).data
```

**Validation**: Serializer rejects invalid org/project combinations

---

### T010: Create DesignTokenSerializer

**Implementation**:

```python
class DesignTokenSerializer(serializers.ModelSerializer):
    """Serializer for DesignToken with type validation."""

    class Meta:
        model = DesignToken
        fields = [
            'id', 'profile', 'key', 'value', 'type', 'description',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_value(self, value):
        """Validate token value length (1-255 chars per FR-006).

        Note: Format-specific validation (e.g., hex codes for colors) is
        intentionally NOT implemented here per Constitution's product-agnostic
        constraint. Product layers can add format validators as needed.
        """
        if not value or len(value) < 1:
            raise serializers.ValidationError("Token value cannot be empty")
        if len(value) > 255:
            raise serializers.ValidationError("Token value must be 255 characters or less")
        return value

    def validate_key(self, value):
        """Validate token key format."""
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("Key cannot be empty.")
        if len(value) > 100:
            raise serializers.ValidationError("Key too long (max 100 chars).")
        # Allow alphanumeric, underscore, hyphen
        import re
        if not re.match(r'^[a-zA-Z0-9_-]+$', value):
            raise serializers.ValidationError(
                "Key must contain only letters, numbers, underscores, and hyphens."
            )
        return value.lower()  # Normalize to lowercase

    def validate_value(self, value):
        """Validate token value length."""
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("Value cannot be empty.")
        if len(value) > 1000:
            raise serializers.ValidationError("Value too long (max 1000 chars).")
        return value
```

**Validation**: Serializer rejects empty/invalid keys and values

---

### T011: Create BrandAssetSerializer

**Implementation**:

```python
class BrandAssetSerializer(serializers.ModelSerializer):
    """Serializer for BrandAsset with File relationship."""

    file_details = serializers.SerializerMethodField()
    url = serializers.SerializerMethodField()

    class Meta:
        model = BrandAsset
        fields = [
            'id', 'profile', 'file', 'asset_type', 'alt_text', 'is_active',
            'file_details', 'url',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'file_details', 'url']

    def get_file_details(self, obj):
        """Return file metadata from B22."""
        if not obj.file:
            return None
        return {
            'id': str(obj.file.id),
            'name': obj.file.name,
            'size': obj.file.size,
            'content_type': obj.file.content_type,
        }

    def get_url(self, obj):
        """Return file URL."""
        return obj.get_url()

    def validate(self, data):
        """Check for duplicate asset_type per profile."""
        profile = data.get('profile')
        asset_type = data.get('asset_type')

        if profile and asset_type:
            # On update, exclude self
            qs = BrandAsset.objects.filter(profile=profile, asset_type=asset_type)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)

            if qs.exists():
                raise serializers.ValidationError(
                    f"Asset of type '{asset_type}' already exists for this profile. "
                    "Update the existing asset instead."
                )

        return data
```

**Validation**: Prevents duplicate asset types per profile

---

### T012: Implement Token Value Validation

**Already implemented in T010**, verify:
- Length validation: 1-1000 chars
- Non-empty check
- No type-specific validation (color format, etc) - product-agnostic per Constitution

**Additional Tests**:

```python
def test_token_value_validation(self):
    # Valid values
    valid_values = [
        "#FF0000",  # hex color
        "Roboto",  # font name
        "16px",  # spacing
        "1px solid rgba(0,0,0,0.1)",  # complex CSS
    ]
    for value in valid_values:
        serializer = DesignTokenSerializer(data={
            'profile': profile.id,
            'key': 'test_key',
            'value': value,
            'type': 'other'
        })
        assert serializer.is_valid(), f"Should accept: {value}"

    # Invalid values
    assert not DesignTokenSerializer(data={...,'value': ''}).is_valid()
    assert not DesignTokenSerializer(data={...,'value': 'x' * 1001}).is_valid()
```

---

### T013: Implement BrandProfile Validation

**Already implemented in T009**, verify:
- XOR validation: org OR project, not both, not neither
- Unique constraint enforcement handled by model

**Additional Edge Cases**:

```python
def validate(self, data):
    """Enhanced validation with permission checks."""
    org = data.get('organisation')
    proj = data.get('project')

    # XOR constraint
    if not org and not proj:
        raise serializers.ValidationError({
            '__all__': "Either organisation or project must be specified."
        })
    if org and proj:
        raise serializers.ValidationError({
            '__all__': "Cannot specify both organisation and project."
        })

    # Check project belongs to org context (if applicable)
    if proj and proj.organisation:
        # Optional: validate user has access to this project
        pass

    return data
```

---

### T014: Implement Unique Constraint Validation

**Implementation** (add to each serializer):

For DesignToken (already handled by unique_together in model):

```python
def validate(self, data):
    """Check unique key per profile."""
    profile = data.get('profile')
    key = data.get('key')

    if profile and key:
        qs = DesignToken.objects.filter(profile=profile, key=key)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            raise serializers.ValidationError({
                'key': f"Token with key '{key}' already exists for this profile."
            })

    return data
```

For BrandAsset (already implemented in T011).

**Validation**: Database unique constraints + serializer validation both work

---

## Definition of Done

- [ ] BrandProfileSerializer created with nested counts
- [ ] BrandProfileDetailSerializer created with full nested data
- [ ] DesignTokenSerializer created with key/value validation
- [ ] BrandAssetSerializer created with file details
- [ ] All validation rules implemented and tested
- [ ] Serializers handle create and update operations
- [ ] Error messages are clear and actionable
- [ ] Code formatted and linted

---

## Testing Strategy

Unit tests in `tests/branding/test_serializers.py`:

```python
import pytest
from src.branding.serializers import (
    BrandProfileSerializer,
    DesignTokenSerializer,
    BrandAssetSerializer
)


@pytest.mark.django_db
class TestBrandProfileSerializer:
    def test_valid_org_brand(self, organisation):
        data = {'organisation': organisation.id, 'name': 'Test Brand'}
        serializer = BrandProfileSerializer(data=data)
        assert serializer.is_valid()

    def test_invalid_both_org_and_project(self, organisation, project):
        data = {
            'organisation': organisation.id,
            'project': project.id,
            'name': 'Invalid'
        }
        serializer = BrandProfileSerializer(data=data)
        assert not serializer.is_valid()
        assert '__all__' in serializer.errors


@pytest.mark.django_db
class TestDesignTokenSerializer:
    def test_valid_token(self, brand_profile):
        data = {
            'profile': brand_profile.id,
            'key': 'primary_color',
            'value': '#FF0000',
            'type': 'color'
        }
        serializer = DesignTokenSerializer(data=data)
        assert serializer.is_valid()

    def test_invalid_empty_value(self, brand_profile):
        data = {
            'profile': brand_profile.id,
            'key': 'test',
            'value': '',
            'type': 'other'
        }
        serializer = DesignTokenSerializer(data=data)
        assert not serializer.is_valid()
        assert 'value' in serializer.errors
```

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Validation too strict | Medium | Follow Constitution: length only, no type-specific |
| Nested serializer performance | Low | Optimize in WP03 with prefetch_related |
| Error message clarity | Medium | Write clear, actionable messages |

---

## Reviewer Guidance

**Focus**: Validation logic correctness, error message clarity

**Test Cases to Verify**:
- XOR constraint in BrandProfile
- Token key/value length limits
- Unique constraints per profile
- Nested serialization performance
