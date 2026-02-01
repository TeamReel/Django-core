---
work_package_id: WP05
title: Testing Suite
priority: P2
lane: doing
agent: claude
shell_pid: 18452
assignee: claude
subtasks:
  - T029
  - T030
  - T031
  - T032
  - T033
  - T034
  - T035
  - T036
  - T037
  - T038
estimated_hours: 6
dependencies:
  - WP01
  - WP02
  - WP03
  - WP04
history:
  - date: 2026-02-01
    action: created
    by: spec-kitty.tasks
  - date: 2026-02-01T17:00:00Z
    action: started_implementation
    by: claude
    shell_pid: 18452
    lane: doing
    note: "Started comprehensive testing suite implementation (>90% coverage target)"
---

# Work Package 05: Testing Suite

## Objective

Comprehensive test coverage (>90%) for all components: models, serializers, views, permissions, and integration scenarios.

## Test Structure

```
tests/branding/
├── __init__.py
├── conftest.py              # Fixtures
├── test_models.py           # Model tests
├── test_serializers.py      # Serializer validation
├── test_views.py            # API endpoint tests
├── test_permissions.py      # Permission logic
└── test_integration.py      # End-to-end scenarios
```

## Implementation Guide

### T029: Fixtures (`conftest.py`)

```python
import pytest
from src.organisations.models import Organisation
from src.projects.models import Project
from src.accounts.models import User
from src.branding.models import BrandProfile, DesignToken, BrandAsset
from src.files.models import File


@pytest.fixture
def user():
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123'
    )


@pytest.fixture
def organisation():
    return Organisation.objects.create(name='Test Org')


@pytest.fixture
def project(organisation):
    return Project.objects.create(
        name='Test Project',
        organisation=organisation
    )


@pytest.fixture
def org_brand(organisation):
    return BrandProfile.objects.create(
        organisation=organisation,
        name='Org Brand'
    )


@pytest.fixture
def project_brand(project):
    return BrandProfile.objects.create(
        project=project,
        name='Project Brand'
    )


@pytest.fixture
def org_tokens(org_brand):
    """Create standard org-level tokens."""
    tokens = [
        DesignToken.objects.create(
            profile=org_brand,
            key='primary_color',
            value='#FF6600',
            type='color'
        ),
        DesignToken.objects.create(
            profile=org_brand,
            key='font_heading',
            value='Roboto',
            type='font'
        ),
    ]
    return tokens


@pytest.fixture
def project_tokens(project_brand):
    """Create project override tokens."""
    return DesignToken.objects.create(
        profile=project_brand,
        key='primary_color',
        value='#D2122E',
        type='color'
    )


@pytest.fixture
def brand_file():
    """Mock B22 File object."""
    return File.objects.create(
        name='logo.png',
        size=45678,
        content_type='image/png',
        url='https://example.com/logos/logo.png'
    )


@pytest.fixture
def brand_asset(org_brand, brand_file):
    return BrandAsset.objects.create(
        profile=org_brand,
        file=brand_file,
        asset_type='logo_light',
        alt_text='Org Logo'
    )
```

---

### T030: Model Tests

```python
import pytest
from django.db import IntegrityError
from src.branding.models import BrandProfile, DesignToken, BrandAsset


@pytest.mark.django_db
class TestBrandProfile:
    def test_create_org_brand(self, organisation):
        brand = BrandProfile.objects.create(
            organisation=organisation,
            name='Test Brand'
        )
        assert brand.id is not None
        assert brand.name == 'Test Brand'
        assert brand.is_active is True

    def test_create_project_brand(self, project):
        brand = BrandProfile.objects.create(
            project=project,
            name='Project Brand'
        )
        assert brand.project == project
        assert brand.organisation is None

    def test_cannot_create_both_org_and_project(self, organisation, project):
        """XOR constraint should fail."""
        with pytest.raises(IntegrityError):
            BrandProfile.objects.create(
                organisation=organisation,
                project=project,
                name='Invalid'
            )

    def test_get_tokens(self, org_brand, org_tokens):
        tokens = org_brand.get_tokens()
        assert len(tokens) == 2
        assert tokens['primary_color'] == '#FF6600'
        assert tokens['font_heading'] == 'Roboto'

    def test_get_merged_tokens(self, org_brand, org_tokens, project_brand, project_tokens):
        """Project token should override org token."""
        merged = project_brand.get_merged_tokens()
        assert merged['primary_color'] == '#D2122E'  # Project override
        assert merged['font_heading'] == 'Roboto'  # Inherited from org

    def test_str_method(self, org_brand):
        assert str(org_brand) == org_brand.name


@pytest.mark.django_db
class TestDesignToken:
    def test_create_token(self, org_brand):
        token = DesignToken.objects.create(
            profile=org_brand,
            key='test_key',
            value='test_value',
            type='other'
        )
        assert token.id is not None
        assert token.key == 'test_key'

    def test_unique_key_per_profile(self, org_brand):
        DesignToken.objects.create(
            profile=org_brand,
            key='duplicate',
            value='value1',
            type='other'
        )
        with pytest.raises(IntegrityError):
            DesignToken.objects.create(
                profile=org_brand,
                key='duplicate',
                value='value2',
                type='other'
            )

    def test_str_method(self, org_tokens):
        token = org_tokens[0]
        assert 'primary_color' in str(token)
        assert '#FF6600' in str(token)


@pytest.mark.django_db
class TestBrandAsset:
    def test_create_asset(self, org_brand, brand_file):
        asset = BrandAsset.objects.create(
            profile=org_brand,
            file=brand_file,
            asset_type='logo_light'
        )
        assert asset.id is not None
        assert asset.asset_type == 'logo_light'

    def test_get_url(self, brand_asset):
        url = brand_asset.get_url()
        assert url == 'https://example.com/logos/logo.png'

    def test_unique_asset_type_per_profile(self, org_brand, brand_file):
        BrandAsset.objects.create(
            profile=org_brand,
            file=brand_file,
            asset_type='logo_light'
        )
        with pytest.raises(IntegrityError):
            BrandAsset.objects.create(
                profile=org_brand,
                file=brand_file,
                asset_type='logo_light'
            )
```

---

### T031-T032: Serializer & View Tests

Due to length, key test cases:

**Serializers**:
- Validate XOR constraint
- Validate token key/value lengths
- Nested serialization works
- Update operations preserve constraints

**Views**:
- CRUD operations return correct status codes
- Filtering by org/project works
- Pagination applied
- Query optimization (no N+1)

---

### T033: Token Resolution Tests (Critical)

```python
@pytest.mark.django_db
class TestTokenResolution:
    def test_resolve_project_with_org_fallback(
        self, organisation, project, org_brand, org_tokens,
        project_brand, project_tokens, client
    ):
        """Project overrides org token, inherits others."""
        response = client.get(
            f'/api/branding/tokens/resolve/?project={project.id}'
        )
        assert response.status_code == 200
        data = response.json()

        assert data['tokens']['primary_color'] == '#D2122E'  # Project override
        assert data['tokens']['font_heading'] == 'Roboto'  # Org fallback
        assert data['source'] == 'merged'

    def test_resolve_project_without_own_brand(
        self, organisation, project, org_brand, org_tokens, client
    ):
        """Project without own brand inherits all from org."""
        response = client.get(
            f'/api/branding/tokens/resolve/?project={project.id}'
        )
        assert response.status_code == 200
        data = response.json()

        assert data['tokens']['primary_color'] == '#FF6600'  # Org
        assert data['source'] == 'organisation'

    def test_resolve_no_brands(self, project, client):
        """No brands returns empty tokens."""
        response = client.get(
            f'/api/branding/tokens/resolve/?project={project.id}'
        )
        assert response.status_code == 200
        data = response.json()
        assert data['tokens'] == {}
        assert data['source'] == 'none'

    def test_resolve_with_assets(
        self, project, project_brand, brand_asset, client
    ):
        """Include assets when requested."""
        response = client.get(
            f'/api/branding/tokens/resolve/?project={project.id}&include_assets=true'
        )
        assert response.status_code == 200
        data = response.json()
        assert 'assets' in data
        assert 'logo_light' in data['assets']
```

---

### T034: Permission Tests

```python
@pytest.mark.django_db
class TestPermissions:
    def test_org_admin_can_edit_org_brand(self, org_admin, org_brand, client):
        client.force_authenticate(org_admin)
        response = client.patch(
            f'/api/branding/profiles/{org_brand.id}/',
            {'name': 'Updated'}
        )
        assert response.status_code == 200

    def test_org_admin_can_edit_project_brand(
        self, org_admin, project_brand, client
    ):
        """Cascade: org admin can edit child project brands."""
        client.force_authenticate(org_admin)
        response = client.patch(
            f'/api/branding/profiles/{project_brand.id}/',
            {'name': 'Updated'}
        )
        assert response.status_code == 200

    def test_project_admin_cannot_edit_other_project(
        self, project_admin, other_project_brand, client
    ):
        client.force_authenticate(project_admin)
        response = client.patch(
            f'/api/branding/profiles/{other_project_brand.id}/',
            {'name': 'Hacked'}
        )
        assert response.status_code == 403
```

---

### T035-T036: Integration & Edge Case Tests

Cover all 5 user stories from spec.md as integration tests. Edge cases:
- Inactive brands
- Missing B22 files
- Organisation change scenarios

---

### T037-T038: Coverage Analysis

```bash
pytest tests/branding/ --cov=src.branding --cov-report=html
```

Target: >90% coverage. Address gaps.

---

## Definition of Done

- [ ] All test files created
- [ ] >90% code coverage
- [ ] All user stories covered by integration tests
- [ ] Edge cases tested
- [ ] No flaky tests
- [ ] Tests pass in CI

---

## Run Command

```bash
pytest tests/branding/ -v --cov=src.branding --cov-report=term-missing
```
