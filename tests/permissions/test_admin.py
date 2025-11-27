"""Tests for Django Admin interface."""

import pytest
from django.contrib.admin.sites import site
from permissions.admin import PermissionAdmin, RoleAdmin, RoleAssignmentAdmin
from permissions.models import Permission, Role, RoleAssignment


@pytest.mark.django_db
class TestAdminRegistration:
    """Test that admin classes are properly registered."""

    def test_role_admin_registered(self):
        """Verify RoleAdmin is registered."""
        assert site.is_registered(Role)
        assert isinstance(site._registry[Role], RoleAdmin)

    def test_permission_admin_registered(self):
        """Verify PermissionAdmin is registered."""
        assert site.is_registered(Permission)
        assert isinstance(site._registry[Permission], PermissionAdmin)

    def test_role_assignment_admin_registered(self):
        """Verify RoleAssignmentAdmin is registered."""
        assert site.is_registered(RoleAssignment)
        assert isinstance(site._registry[RoleAssignment], RoleAssignmentAdmin)


@pytest.mark.django_db
class TestRoleAdmin:
    """Test RoleAdmin functionality."""

    def test_list_display_fields(self):
        """Verify list_display configuration."""
        admin_instance = RoleAdmin(Role, site)
        assert "name" in admin_instance.list_display
        assert "scope" in admin_instance.list_display
        assert "permission_count" in admin_instance.list_display
        assert "created_at" in admin_instance.list_display

    def test_search_fields(self):
        """Verify search configuration."""
        admin_instance = RoleAdmin(Role, site)
        assert "name" in admin_instance.search_fields
        assert "description" in admin_instance.search_fields

    def test_filter_horizontal_permissions(self):
        """Verify M2M widget configuration."""
        admin_instance = RoleAdmin(Role, site)
        assert "permissions" in admin_instance.filter_horizontal

    def test_readonly_fields(self):
        """Verify audit fields are readonly."""
        admin_instance = RoleAdmin(Role, site)
        assert "id" in admin_instance.readonly_fields
        assert "created_at" in admin_instance.readonly_fields
        assert "updated_at" in admin_instance.readonly_fields


@pytest.mark.django_db
class TestPermissionAdmin:
    """Test PermissionAdmin functionality."""

    def test_list_display_fields(self):
        """Verify list_display configuration."""
        admin_instance = PermissionAdmin(Permission, site)
        assert "permission" in admin_instance.list_display
        assert "resource_type" in admin_instance.list_display
        assert "is_sensitive_badge" in admin_instance.list_display

    def test_list_editable(self):
        """Verify is_sensitive can be edited in list view."""
        admin_instance = PermissionAdmin(Permission, site)
        assert "is_sensitive" in admin_instance.list_editable

    def test_search_fields(self):
        """Verify search configuration."""
        admin_instance = PermissionAdmin(Permission, site)
        assert "permission" in admin_instance.search_fields
        assert "description" in admin_instance.search_fields

    def test_list_filter(self):
        """Verify filter configuration."""
        admin_instance = PermissionAdmin(Permission, site)
        assert "resource_type" in admin_instance.list_filter
        assert "is_sensitive" in admin_instance.list_filter


@pytest.mark.django_db
class TestRoleAssignmentAdmin:
    """Test RoleAssignmentAdmin functionality."""

    def test_list_display_fields(self):
        """Verify list_display configuration."""
        admin_instance = RoleAssignmentAdmin(RoleAssignment, site)
        assert "user_display" in admin_instance.list_display
        assert "role" in admin_instance.list_display
        assert "scope" in admin_instance.list_display
        assert "target_display" in admin_instance.list_display

    def test_autocomplete_fields(self):
        """Verify autocomplete configuration for performance."""
        admin_instance = RoleAssignmentAdmin(RoleAssignment, site)
        assert "user" in admin_instance.autocomplete_fields
        assert "role" in admin_instance.autocomplete_fields
        assert "target_organization" in admin_instance.autocomplete_fields
        assert "target_project" in admin_instance.autocomplete_fields

    def test_readonly_fields(self):
        """Verify audit fields are readonly."""
        admin_instance = RoleAssignmentAdmin(RoleAssignment, site)
        assert "id" in admin_instance.readonly_fields
        assert "assigned_by" in admin_instance.readonly_fields
        assert "assigned_at" in admin_instance.readonly_fields

    def test_date_hierarchy(self):
        """Verify date hierarchy for easy filtering."""
        admin_instance = RoleAssignmentAdmin(RoleAssignment, site)
        assert admin_instance.date_hierarchy == "assigned_at"

    def test_list_filter(self):
        """Verify filter configuration."""
        admin_instance = RoleAssignmentAdmin(RoleAssignment, site)
        assert "scope" in admin_instance.list_filter
        assert "role" in admin_instance.list_filter
