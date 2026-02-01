# Quickstart Guide — B33 Brand Identity Manager

**Feature**: B33 Brand Identity Manager
**Django App**: `branding`
**Date**: 2026-02-01

## Setup

### 1. Install App

Add to `INSTALLED_APPS` in `src/config/settings/base.py`:

```python
INSTALLED_APPS = [
    # ... existing apps
    'src.branding',
]
```

### 2. Run Migrations

```bash
python manage.py makemigrations branding
python manage.py migrate branding
```

### 3. Register URLs

Add to `src/config/urls.py`:

```python
from django.urls import path, include

urlpatterns = [
    # ... existing patterns
    path('api/branding/', include('src.branding.urls')),
]
```

### 4. Create Superuser (if needed)

```bash
python manage.py createsuperuser
```

---

## Basic Usage

### Creating a Brand Profile

#### For Organisation (Python Shell)

```python
from src.branding.models import BrandProfile, DesignToken, BrandAsset
from src.organisations.models import Organisation
from src.files.models import File

# Get organisation
org = Organisation.objects.get(name="Demo Organisation")

# Create brand profile
brand = BrandProfile.objects.create(
    organisation=org,
    name="Demo Brand",
    is_active=True
)

# Add tokens
DesignToken.objects.create(
    profile=brand,
    key="primary_color",
    value="#1E3A8A",
    type="color"
)

DesignToken.objects.create(
    profile=brand,
    key="font_heading",
    value="Inter",
    type="font"
)

# Add asset (assuming logo file exists)
logo_file = File.objects.get(name="demo-logo.png")
BrandAsset.objects.create(
    profile=brand,
    file=logo_file,
    asset_type="logo_light"
)
```

#### Via Django Admin

1. Navigate to `/admin/branding/brandprofile/`
2. Click "Add Brand Profile"
3. Fill in:
   - **Organisation**: Select from dropdown
   - **Name**: Enter brand name
   - **Is Active**: Check
4. Save
5. Add tokens via inline forms or separate admin pages

#### Via API

```bash
# Create brand profile
curl -X POST http://localhost:8000/api/branding/profiles/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organisation": "org-uuid",
    "name": "Demo Brand",
    "is_active": true
  }'

# Add token
curl -X POST http://localhost:8000/api/branding/profiles/{profile_id}/tokens/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "primary_color",
    "value": "#1E3A8A",
    "type": "color"
  }'
```

---

## Common Workflows

### 1. Get All Tokens for a Project (Merge Inheritance)

```python
from src.branding.models import BrandProfile
from src.projects.models import Project

project = Project.objects.get(id="project-uuid")

# Get project brand (if exists)
project_brand = BrandProfile.objects.filter(project=project).first()

# Get org brand (fallback)
org_brand = BrandProfile.objects.filter(organisation=project.organisation).first()

# Merge tokens (project overrides org)
def get_merged_tokens(project_brand, org_brand):
    tokens = {}
    if org_brand:
        org_tokens = {t.key: t.value for t in org_brand.designtoken_set.all()}
        tokens.update(org_tokens)
    if project_brand:
        project_tokens = {t.key: t.value for t in project_brand.designtoken_set.all()}
        tokens.update(project_tokens)
    return tokens

merged = get_merged_tokens(project_brand, org_brand)
# {'primary_color': '#DC2626', 'font_heading': 'Inter', ...}
```

Or use the API endpoint:

```bash
curl http://localhost:8000/api/branding/tokens/resolve/?project=project-uuid \
  -H "Authorization: Token YOUR_TOKEN"
```

### 2. Update a Token

```python
token = DesignToken.objects.get(profile=brand, key="primary_color")
token.value = "#DC2626"
token.save()
```

Or via API:

```bash
curl -X PATCH http://localhost:8000/api/branding/tokens/{token_id}/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "#DC2626"}'
```

### 3. Upload Brand Asset

```python
# Assuming File object already created via B22
from src.files.models import File

logo_file = File.objects.get(name="team-logo.png")

BrandAsset.objects.create(
    profile=brand,
    file=logo_file,
    asset_type="logo_light"
)
```

Or via API (two-step: upload file via B22, then create asset):

```bash
# Step 1: Upload file via B22 API (not shown)
# Step 2: Create asset
curl -X POST http://localhost:8000/api/branding/profiles/{profile_id}/assets/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "file": "file-uuid",
    "asset_type": "logo_light"
  }'
```

### 4. List All Brands for an Organisation

```python
brands = BrandProfile.objects.filter(organisation=org, is_active=True)
for brand in brands:
    print(f"{brand.name}: {brand.designtoken_set.count()} tokens")
```

Or via API:

```bash
curl http://localhost:8000/api/branding/profiles/?organisation=org-uuid \
  -H "Authorization: Token YOUR_TOKEN"
```

---

## Integration with Other Modules

### B06 Organisations

```python
from src.organisations.models import Organisation

# Get all brands for an org
org = Organisation.objects.get(id="org-uuid")
brands = BrandProfile.objects.filter(organisation=org)
```

### B07 Projects

```python
from src.projects.models import Project

# Get project-specific brand
project = Project.objects.get(id="project-uuid")
brand = BrandProfile.objects.filter(project=project).first()
```

### B22 Files

```python
from src.files.models import File

# Get all brand assets using a specific file
file = File.objects.get(id="file-uuid")
assets = BrandAsset.objects.filter(file=file)
```

### B34 AI Content Generation (Downstream)

```python
# B34 consumes token API to generate brand-consistent content
from src.branding.models import BrandProfile

project = get_current_project()
brand = BrandProfile.objects.filter(project=project).first()
tokens = {t.key: t.value for t in brand.designtoken_set.all()}

# Use tokens in AI prompt
prompt = f"Generate social media post using brand color {tokens['primary_color']}"
```

---

## Testing

### Run Tests

```bash
# All branding tests
pytest tests/branding/

# Specific test file
pytest tests/branding/test_models.py

# With coverage
pytest --cov=src.branding tests/branding/
```

### Sample Test

```python
from django.test import TestCase
from src.branding.models import BrandProfile, DesignToken
from src.organisations.models import Organisation

class BrandProfileTestCase(TestCase):
    def setUp(self):
        self.org = Organisation.objects.create(name="Test Org")

    def test_create_brand_profile(self):
        brand = BrandProfile.objects.create(
            organisation=self.org,
            name="Test Brand"
        )
        self.assertEqual(brand.name, "Test Brand")
        self.assertEqual(brand.organisation, self.org)

    def test_add_token(self):
        brand = BrandProfile.objects.create(organisation=self.org, name="Test")
        token = DesignToken.objects.create(
            profile=brand,
            key="primary_color",
            value="#FF0000",
            type="color"
        )
        self.assertEqual(brand.designtoken_set.count(), 1)
```

---

## Django Admin

### Register Models

In `src/branding/admin.py`:

```python
from django.contrib import admin
from .models import BrandProfile, DesignToken, BrandAsset

class DesignTokenInline(admin.TabularInline):
    model = DesignToken
    extra = 1

class BrandAssetInline(admin.TabularInline):
    model = BrandAsset
    extra = 1

@admin.register(BrandProfile)
class BrandProfileAdmin(admin.ModelAdmin):
    list_display = ('name', 'organisation', 'project', 'is_active', 'updated_at')
    list_filter = ('is_active', 'organisation', 'project')
    search_fields = ('name',)
    inlines = [DesignTokenInline, BrandAssetInline]

@admin.register(DesignToken)
class DesignTokenAdmin(admin.ModelAdmin):
    list_display = ('key', 'value', 'type', 'profile')
    list_filter = ('type',)
    search_fields = ('key', 'value')

@admin.register(BrandAsset)
class BrandAssetAdmin(admin.ModelAdmin):
    list_display = ('profile', 'asset_type', 'is_active')
    list_filter = ('asset_type', 'is_active')
```

Access at: `http://localhost:8000/admin/branding/`

---

## Troubleshooting

### Token Not Appearing in Merged Set

**Issue**: Project token not overriding org token.

**Solution**: Check that both brands are active and keys match exactly (case-sensitive).

```python
# Debug merge logic
org_tokens = {t.key: t.value for t in org_brand.designtoken_set.all()}
project_tokens = {t.key: t.value for t in project_brand.designtoken_set.all()}
print("Org:", org_tokens)
print("Project:", project_tokens)
print("Merged:", {**org_tokens, **project_tokens})
```

### Asset File Not Found

**Issue**: `BrandAsset.file.url` returns 404.

**Solution**: Ensure File object exists and is accessible via B22.

```python
asset = BrandAsset.objects.get(id="asset-uuid")
print(asset.file.url)  # Check URL
print(asset.file.storage.exists(asset.file.name))  # Check file exists
```

### Permission Denied

**Issue**: API returns 403 Forbidden.

**Solution**: Ensure user has org/project membership.

```python
from src.permissions.models import Membership

# Check membership
membership = Membership.objects.filter(
    user=user,
    organisation=brand.organisation
).exists()
print(membership)  # Should be True
```

---

## Performance Tips

1. **Use select_related for brand lookups**:
   ```python
   brands = BrandProfile.objects.select_related('organisation', 'project').all()
   ```

2. **Prefetch tokens and assets**:
   ```python
   brands = BrandProfile.objects.prefetch_related('designtoken_set', 'brandasset_set').all()
   ```

3. **Cache merged tokens** (future enhancement):
   ```python
   from django.core.cache import cache

   cache_key = f"brand_tokens_{project.id}"
   tokens = cache.get(cache_key)
   if not tokens:
       tokens = get_merged_tokens(project_brand, org_brand)
       cache.set(cache_key, tokens, timeout=3600)  # 1 hour
   ```

---

## Next Steps

1. **Add custom token types**: Extend `TOKEN_TYPES` choices in `models.py`
2. **Add custom asset types**: Extend `ASSET_TYPES` choices in `models.py`
3. **Build frontend UI**: Create brand management interface in demo/
4. **Integrate with B34**: Use tokens in AI content generation prompts
5. **Add token validation**: Create custom validators for color/font formats

---

## Resources

- **API Docs**: [contracts/api.md](contracts/api.md)
- **Data Model**: [data-model.md](data-model.md)
- **Research**: [research.md](research.md)
- **Spec**: [spec.md](spec.md)

---

## Support

For issues or questions:
1. Check existing tests: `tests/branding/`
2. Review API contracts: `contracts/api.md`
3. Run test suite to validate setup
4. Check Django admin for data inspection
