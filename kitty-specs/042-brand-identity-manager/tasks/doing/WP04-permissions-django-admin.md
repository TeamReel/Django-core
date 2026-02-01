---
work_package_id: WP04
title: Permissions & Django Admin
priority: P2
lane: doing
agent: claude
shell_pid: 18452
assignee: claude
subtasks:
  - T023
  - T024
  - T025
  - T026
  - T027
  - T028
estimated_hours: 3
dependencies:
  - WP03
history:
  - date: 2026-02-01
    action: created
    by: spec-kitty.tasks
  - date: 2026-02-01T16:45:00Z
    action: started_implementation
    by: claude
    shell_pid: 18452
    lane: doing
    note: "Started implementation of permissions and Django admin"
---

# Work Package 04: Permissions & Django Admin

## Objective

Implement cascade permission control (org admins can edit all brands, project admins only own) and configure Django admin interface.

## Implementation Guide

### T023-T024: Permissions

**`src/branding/permissions.py`**:

```python
from rest_framework import permissions


class BrandProfilePermission(permissions.BasePermission):
    """
    Cascade permissions:
    - Org admins can modify org brand AND all child project brands
    - Project admins can only modify their own project brand
    - Read access for all org/project members
    """

    def has_permission(self, request, view):
        # All authenticated users can list/retrieve
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        user = request.user

        # Read permissions for members
        if request.method in permissions.SAFE_METHODS:
            # Check if user is member of org or project
            if obj.organisation:
                return user.memberships.filter(organisation=obj.organisation).exists()
            if obj.project:
                return user.memberships.filter(project=obj.project).exists()
            return False

        # Write permissions
        if obj.organisation:
            # Org brand: must be org admin
            return user.memberships.filter(
                organisation=obj.organisation,
                role__in=['admin', 'owner']
            ).exists()

        if obj.project:
            # Project brand: project admin OR org admin (cascade)
            is_project_admin = user.memberships.filter(
                project=obj.project,
                role__in=['admin', 'owner']
            ).exists()

            is_org_admin = user.memberships.filter(
                organisation=obj.project.organisation,
                role__in=['admin', 'owner']
            ).exists()

            return is_project_admin or is_org_admin

        return False
```

**Apply to ViewSets** (`src/branding/views.py`):

```python
class BrandProfileViewSet(viewsets.ModelViewSet):
    permission_classes = [BrandProfilePermission]
    # ... rest of implementation
```

---

### T025-T028: Django Admin

**`src/branding/admin.py`**:

```python
from django.contrib import admin
from .models import BrandProfile, DesignToken, BrandAsset


class DesignTokenInline(admin.TabularInline):
    model = DesignToken
    extra = 3
    fields = ['key', 'value', 'type', 'description']


class BrandAssetInline(admin.TabularInline):
    model = BrandAsset
    extra = 1
    fields = ['asset_type', 'file', 'alt_text', 'is_active']
    readonly_fields = ['created_at']


@admin.register(BrandProfile)
class BrandProfileAdmin(admin.ModelAdmin):
    list_display = ('name', 'organisation', 'project', 'is_active', 'token_count', 'updated_at')
    list_filter = ('is_active', 'created_at', 'updated_at')
    search_fields = ('name', 'organisation__name', 'project__name')
    readonly_fields = ('id', 'created_at', 'updated_at', 'created_by', 'updated_by')

    inlines = [DesignTokenInline, BrandAssetInline]

    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'is_active')
        }),
        ('Scope', {
            'fields': ('organisation', 'project'),
            'description': 'Specify EITHER organisation OR project, not both.'
        }),
        ('Audit', {
            'fields': ('id', 'created_at', 'created_by', 'updated_at', 'updated_by'),
            'classes': ('collapse',)
        }),
    )

    def token_count(self, obj):
        return obj.design_tokens.count()
    token_count.short_description = 'Tokens'

    def save_model(self, request, obj, form, change):
        if not change:  # Creating new
            obj.created_by = request.user
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(DesignToken)
class DesignTokenAdmin(admin.ModelAdmin):
    list_display = ('key', 'value_preview', 'type', 'profile', 'updated_at')
    list_filter = ('type', 'created_at')
    search_fields = ('key', 'value', 'profile__name')
    readonly_fields = ('id', 'created_at', 'updated_at')

    fieldsets = (
        (None, {
            'fields': ('profile', 'key', 'value', 'type', 'description')
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def value_preview(self, obj):
        return obj.value[:50] + '...' if len(obj.value) > 50 else obj.value
    value_preview.short_description = 'Value'


@admin.register(BrandAsset)
class BrandAssetAdmin(admin.ModelAdmin):
    list_display = ('profile', 'asset_type', 'file_name', 'is_active', 'updated_at')
    list_filter = ('asset_type', 'is_active', 'created_at')
    search_fields = ('profile__name', 'alt_text', 'file__name')
    readonly_fields = ('id', 'created_at', 'updated_at', 'file_url')

    fieldsets = (
        (None, {
            'fields': ('profile', 'file', 'asset_type', 'alt_text', 'is_active')
        }),
        ('File Info', {
            'fields': ('file_url',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def file_name(self, obj):
        return obj.file.name if obj.file else '-'
    file_name.short_description = 'File'

    def file_url(self, obj):
        url = obj.get_url()
        if url:
            return f'<a href="{url}" target="_blank">{url}</a>'
        return '-'
    file_url.short_description = 'File URL'
    file_url.allow_tags = True
```

---

## Definition of Done

- [ ] BrandProfilePermission class implemented with cascade logic
- [ ] Permissions applied to all ViewSets
- [ ] Permission tests pass (org admin, project admin, member, non-member)
- [ ] Django admin registered for all 3 models
- [ ] Inlines configured (tokens + assets in profile admin)
- [ ] List filters and search functional
- [ ] Can create/edit brands via admin interface

---

## Testing

Manual permission testing:

```python
# Org admin can edit org brand + all project brands
org_admin = User.objects.get(...)
project_brand = BrandProfile.objects.get(project=...)
client.force_authenticate(org_admin)
response = client.patch(f'/api/branding/profiles/{project_brand.id}/', {'name': 'Updated'})
assert response.status_code == 200

# Project admin cannot edit other project brands
project_admin = User.objects.get(...)
other_project_brand = BrandProfile.objects.get(project=other_project)
client.force_authenticate(project_admin)
response = client.patch(f'/api/branding/profiles/{other_project_brand.id}/', {'name': 'Hacked'})
assert response.status_code == 403
```

Admin testing:
1. Login as superuser: http://localhost:8000/admin/
2. Navigate to Branding section
3. Create new brand profile with inline tokens
4. Verify constraints work (can't set both org + project)
5. Upload asset and verify file preview

---

## Reviewer Focus

- Cascade permission logic correctness
- Admin interface usability (inline forms work smoothly)
- Readonly fields properly set
