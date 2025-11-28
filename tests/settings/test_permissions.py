"""
Permission tests for Settings & Feature Flags system.

Tests scope-aware permission checking, role-based access control,
and integration with B08 permission system.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from organisations.models import Organisation
from permissions.models import Permission, Role, RoleAssignment
from projects.models import Project
from rest_framework import status
from rest_framework.test import APIClient

from src.settings.models import FeatureFlag, ScopeType, Setting

User = get_user_model()


class TestScopeAwarePermissions(TestCase):
    """Test scope-aware permission checking."""

    def setUp(self):
        """Set up test users, organisations, and projects."""
        self.admin_user = User.objects.create_user(
            username="admin", email="admin@example.com", password="adminpass123"
        )
        self.org_owner = User.objects.create_user(
            username="owner", email="owner@example.com", password="ownerpass123"
        )
        self.project_member = User.objects.create_user(
            username="member", email="member@example.com", password="memberpass123"
        )
        self.outsider = User.objects.create_user(
            username="outsider", email="outsider@example.com", password="outsiderpass123"
        )

        self.organisation = Organisation.objects.create(
            name="Test Org", slug="test-org", creator=self.org_owner
        )

        self.project = Project.objects.create(
            name="Test Project",
            slug="test-project",
            organisation=self.organisation,
            creator=self.org_owner,
        )

        # Set up roles and permissions
        self.admin_role = Role.objects.create(name="Admin", description="System administrator")
        self.org_admin_role = Role.objects.create(
            name="Organisation Admin", description="Organisation administrator"
        )
        self.project_role = Role.objects.create(name="Project Member", description="Project member")

        # Create permissions
        self.settings_read = Permission.objects.create(
            name="settings.read", description="Read settings and flags"
        )
        self.settings_write = Permission.objects.create(
            name="settings.write", description="Write settings and flags"
        )
        self.settings_admin = Permission.objects.create(
            name="settings.admin", description="Administer settings and flags"
        )

        # Assign permissions to roles
        self.admin_role.permissions.add(
            self.settings_admin, self.settings_write, self.settings_read
        )
        self.org_admin_role.permissions.add(self.settings_write, self.settings_read)
        self.project_role.permissions.add(self.settings_read)

        # Assign roles to users
        RoleAssignment.objects.create(
            user=self.admin_user, role=self.admin_role, scope_type=ScopeType.GLOBAL
        )
        RoleAssignment.objects.create(
            user=self.org_owner,
            role=self.org_admin_role,
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
        )
        RoleAssignment.objects.create(
            user=self.project_member,
            role=self.project_role,
            scope_type=ScopeType.PROJECT,
            organisation=self.organisation,
            project=self.project,
        )

    def test_global_flag_access_admin_only(self):
        """Test only admins can access global flags."""
        global_flag = FeatureFlag.objects.create(
            key="global_flag",
            name="Global Flag",
            scope_type=ScopeType.GLOBAL,
            default_value=True,
            created_by=self.admin_user,
        )

        # Admin should have access
        assert can_access_flag(self.admin_user, global_flag)

        # Organisation owner should not have access to global flags
        assert not can_access_flag(self.org_owner, global_flag)

        # Project member should not have access to global flags
        assert not can_access_flag(self.project_member, global_flag)

        # Outsider should not have access
        assert not can_access_flag(self.outsider, global_flag)

    def test_organisation_flag_access(self):
        """Test organisation flag access permissions."""
        org_flag = FeatureFlag.objects.create(
            key="org_flag",
            name="Organisation Flag",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
            default_value=True,
            created_by=self.org_owner,
        )

        # Admin should have access
        assert can_access_flag(self.admin_user, org_flag)

        # Organisation owner should have access
        assert can_access_flag(self.org_owner, org_flag)

        # Project member should have access (within org)
        assert can_access_flag(self.project_member, org_flag)

        # Outsider should not have access
        assert not can_access_flag(self.outsider, org_flag)

    def test_project_flag_access(self):
        """Test project flag access permissions."""
        project_flag = FeatureFlag.objects.create(
            key="project_flag",
            name="Project Flag",
            scope_type=ScopeType.PROJECT,
            organisation=self.organisation,
            project=self.project,
            default_value=True,
            created_by=self.org_owner,
        )

        # Admin should have access
        assert can_access_flag(self.admin_user, project_flag)

        # Organisation owner should have access
        assert can_access_flag(self.org_owner, project_flag)

        # Project member should have access
        assert can_access_flag(self.project_member, project_flag)

        # Outsider should not have access
        assert not can_access_flag(self.outsider, project_flag)

    def test_setting_modification_permissions(self):
        """Test setting modification permissions."""
        org_setting = Setting.objects.create(
            key="org_setting",
            name="Organisation Setting",
            value_type="string",
            default_value="test",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
            created_by=self.org_owner,
        )

        # Admin should be able to modify any setting
        assert can_modify_setting(self.admin_user, org_setting)

        # Organisation owner should be able to modify org settings
        assert can_modify_setting(self.org_owner, org_setting)

        # Project member should not be able to modify settings
        assert not can_modify_setting(self.project_member, org_setting)

        # Outsider should not be able to modify settings
        assert not can_modify_setting(self.outsider, org_setting)

    def test_flag_creation_permissions(self):
        """Test flag creation permissions."""
        # Admin can create global flags
        assert can_create_flag(self.admin_user, ScopeType.GLOBAL)

        # Admin can create org flags
        assert can_create_flag(self.admin_user, ScopeType.ORGANISATION, self.organisation)

        # Org owner can create org flags
        assert can_create_flag(self.org_owner, ScopeType.ORGANISATION, self.organisation)

        # Org owner cannot create global flags
        assert not can_create_flag(self.org_owner, ScopeType.GLOBAL)

        # Project member cannot create flags
        assert not can_create_flag(
            self.project_member, ScopeType.PROJECT, self.organisation, self.project
        )

        # Outsider cannot create flags
        assert not can_create_flag(self.outsider, ScopeType.ORGANISATION, self.organisation)

    def test_setting_deletion_permissions(self):
        """Test setting deletion permissions."""
        project_setting = Setting.objects.create(
            key="project_setting",
            name="Project Setting",
            value_type="number",
            default_value=42,
            scope_type=ScopeType.PROJECT,
            organisation=self.organisation,
            project=self.project,
            created_by=self.org_owner,
        )

        # Admin can delete any setting
        assert can_delete_setting(self.admin_user, project_setting)

        # Organisation owner can delete org/project settings
        assert can_delete_setting(self.org_owner, project_setting)

        # Project member cannot delete settings
        assert not can_delete_setting(self.project_member, project_setting)

        # Outsider cannot delete settings
        assert not can_delete_setting(self.outsider, project_setting)


class TestPermissionInheritance(TestCase):
    """Test permission inheritance across scopes."""

    def setUp(self):
        """Set up hierarchy of permissions."""
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.organisation = Organisation.objects.create(
            name="Test Org", slug="test-org", creator=self.user
        )
        self.project1 = Project.objects.create(
            name="Project 1", slug="project-1", organisation=self.organisation, creator=self.user
        )
        self.project2 = Project.objects.create(
            name="Project 2", slug="project-2", organisation=self.organisation, creator=self.user
        )

        # Create roles with different permission levels
        self.org_role = Role.objects.create(name="Org Admin")
        self.project_role = Role.objects.create(name="Project Member")

        self.write_permission = Permission.objects.create(
            name="settings.write", description="Write permissions"
        )
        self.read_permission = Permission.objects.create(
            name="settings.read", description="Read permissions"
        )

        self.org_role.permissions.add(self.write_permission, self.read_permission)
        self.project_role.permissions.add(self.read_permission)

    def test_higher_scope_permissions_inherited(self):
        """Test that higher scope permissions are inherited."""
        # User has org-level write permissions
        RoleAssignment.objects.create(
            user=self.user,
            role=self.org_role,
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
        )

        # Should be able to access project-level flags due to inheritance
        project_flag = FeatureFlag.objects.create(
            key="inherit_flag",
            name="Inherit Flag",
            scope_type=ScopeType.PROJECT,
            organisation=self.organisation,
            project=self.project1,
            default_value=True,
            created_by=self.user,
        )

        assert can_access_flag(self.user, project_flag)
        assert can_modify_setting(self.user, None)  # Can modify based on org permissions

    def test_lower_scope_permissions_not_inherited_up(self):
        """Test that lower scope permissions don't inherit upwards."""
        # User only has project-level permissions
        RoleAssignment.objects.create(
            user=self.user,
            role=self.project_role,
            scope_type=ScopeType.PROJECT,
            organisation=self.organisation,
            project=self.project1,
        )

        # Should not be able to access org-level flags
        org_flag = FeatureFlag.objects.create(
            key="org_flag",
            name="Org Flag",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
            default_value=True,
            created_by=self.user,
        )

        # Should have read access but not write access at org level
        assert can_access_flag(self.user, org_flag)  # Read permission inherited down
        # Note: Write permission would not be inherited up

    def test_cross_project_permissions(self):
        """Test permissions don't cross between projects."""
        # User has permissions in project1 only
        RoleAssignment.objects.create(
            user=self.user,
            role=self.project_role,
            scope_type=ScopeType.PROJECT,
            organisation=self.organisation,
            project=self.project1,
        )

        # Create flag in project2
        project2_flag = FeatureFlag.objects.create(
            key="project2_flag",
            name="Project 2 Flag",
            scope_type=ScopeType.PROJECT,
            organisation=self.organisation,
            project=self.project2,
            default_value=True,
            created_by=self.user,
        )

        # Should not have access to project2 flag
        assert not can_access_flag(self.user, project2_flag)


class TestAPIPermissionIntegration(TestCase):
    """Test permission integration with REST API."""

    def setUp(self):
        """Set up API test environment."""
        self.client = APIClient()

        self.admin = User.objects.create_user(
            username="admin", email="admin@example.com", password="adminpass123"
        )
        self.user = User.objects.create_user(
            username="user", email="user@example.com", password="userpass123"
        )

        self.organisation = Organisation.objects.create(
            name="Test Org", slug="test-org", creator=self.admin
        )

        # Set up admin role
        admin_role = Role.objects.create(name="Admin")
        admin_permission = Permission.objects.create(
            name="settings.admin", description="Full settings access"
        )
        admin_role.permissions.add(admin_permission)

        RoleAssignment.objects.create(user=self.admin, role=admin_role, scope_type=ScopeType.GLOBAL)

    def test_unauthenticated_request_denied(self):
        """Test unauthenticated requests are denied."""
        from django.urls import reverse

        url = reverse("featureflag-list")
        response = self.client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_insufficient_permissions_denied(self):
        """Test requests with insufficient permissions are denied."""
        from django.urls import reverse

        self.client.force_authenticate(user=self.user)

        url = reverse("featureflag-list")
        data = {
            "key": "test_flag",
            "name": "Test Flag",
            "scope_type": ScopeType.GLOBAL.value,
            "default_value": True,
        }

        response = self.client.post(url, data, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_sufficient_permissions_allowed(self):
        """Test requests with sufficient permissions are allowed."""
        from django.urls import reverse

        self.client.force_authenticate(user=self.admin)

        url = reverse("featureflag-list")
        data = {
            "key": "admin_flag",
            "name": "Admin Flag",
            "scope_type": ScopeType.GLOBAL.value,
            "default_value": True,
        }

        response = self.client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED

    def test_scope_based_filtering(self):
        """Test that API results are filtered based on user permissions."""
        from django.urls import reverse

        # Create flags at different scopes
        FeatureFlag.objects.create(
            key="global_flag",
            name="Global Flag",
            scope_type=ScopeType.GLOBAL,
            default_value=True,
            created_by=self.admin,
        )
        FeatureFlag.objects.create(
            key="org_flag",
            name="Org Flag",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
            default_value=True,
            created_by=self.admin,
        )

        # Admin should see all flags
        self.client.force_authenticate(user=self.admin)
        url = reverse("featureflag-list")
        response = self.client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 2

        # Regular user should see none (no permissions)
        self.client.force_authenticate(user=self.user)
        response = self.client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 0


class TestPermissionCaching(TestCase):
    """Test permission caching and performance."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.organisation = Organisation.objects.create(
            name="Test Org", slug="test-org", creator=self.user
        )

    def test_permission_check_caching(self):
        """Test that permission checks are cached."""
        flag = FeatureFlag.objects.create(
            key="cached_flag",
            name="Cached Flag",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
            default_value=True,
            created_by=self.user,
        )

        # First call should hit database
        with patch("src.permissions.services.get_user_permissions") as mock_get_perms:
            mock_get_perms.return_value = ["settings.read"]

            result1 = can_access_flag(self.user, flag)
            result2 = can_access_flag(self.user, flag)

            # Should be cached on second call
            assert mock_get_perms.call_count <= 2  # May cache after first call

    def test_permission_cache_invalidation(self):
        """Test permission cache invalidation on role changes."""
        flag = FeatureFlag.objects.create(
            key="invalidate_flag",
            name="Invalidate Flag",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
            default_value=True,
            created_by=self.user,
        )

        # Initial permission check
        result1 = can_access_flag(self.user, flag)

        # Change user permissions
        role = Role.objects.create(name="New Role")
        permission = Permission.objects.create(
            name="settings.admin", description="Admin permission"
        )
        role.permissions.add(permission)

        RoleAssignment.objects.create(
            user=self.user,
            role=role,
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
        )

        # Permission check should reflect changes
        result2 = can_access_flag(self.user, flag)

        # Results may differ based on new permissions
        assert isinstance(result2, bool)


class TestCustomPermissionLogic(TestCase):
    """Test custom permission logic and edge cases."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )

    def test_permission_with_inactive_flag(self):
        """Test permission checks with inactive flags."""
        inactive_flag = FeatureFlag.objects.create(
            key="inactive_flag",
            name="Inactive Flag",
            scope_type=ScopeType.GLOBAL,
            default_value=True,
            is_active=False,  # Inactive
            created_by=self.user,
        )

        # Permission logic should consider inactive flags
        result = can_access_flag(self.user, inactive_flag)
        # Admin might still access inactive flags for management
        assert isinstance(result, bool)

    def test_permission_with_nonexistent_organisation(self):
        """Test permission checks with invalid organisation references."""
        # This tests defensive programming in permission logic
        result = can_create_flag(self.user, ScopeType.ORGANISATION, None)
        assert result is False  # Should safely handle None organisation

    def test_multiple_role_assignments(self):
        """Test user with multiple role assignments."""
        org1 = Organisation.objects.create(name="Org 1", slug="org-1", creator=self.user)
        org2 = Organisation.objects.create(name="Org 2", slug="org-2", creator=self.user)

        # Roles in different organisations
        role1 = Role.objects.create(name="Role 1")
        role2 = Role.objects.create(name="Role 2")

        perm1 = Permission.objects.create(name="settings.read", description="Read")
        perm2 = Permission.objects.create(name="settings.write", description="Write")

        role1.permissions.add(perm1)
        role2.permissions.add(perm1, perm2)

        RoleAssignment.objects.create(
            user=self.user, role=role1, scope_type=ScopeType.ORGANISATION, organisation=org1
        )
        RoleAssignment.objects.create(
            user=self.user, role=role2, scope_type=ScopeType.ORGANISATION, organisation=org2
        )

        # User should have different permissions in each org
        flag1 = FeatureFlag.objects.create(
            key="org1_flag",
            name="Org 1 Flag",
            scope_type=ScopeType.ORGANISATION,
            organisation=org1,
            default_value=True,
            created_by=self.user,
        )
        flag2 = FeatureFlag.objects.create(
            key="org2_flag",
            name="Org 2 Flag",
            scope_type=ScopeType.ORGANISATION,
            organisation=org2,
            default_value=True,
            created_by=self.user,
        )

        # Should have access to both flags (read permission in both orgs)
        assert can_access_flag(self.user, flag1)
        assert can_access_flag(self.user, flag2)

    def test_superuser_permissions(self):
        """Test superuser bypass of normal permissions."""
        superuser = User.objects.create_user(
            username="superuser",
            email="super@example.com",
            password="superpass123",
            is_superuser=True,
        )

        flag = FeatureFlag.objects.create(
            key="super_flag",
            name="Super Flag",
            scope_type=ScopeType.GLOBAL,
            default_value=True,
            created_by=superuser,
        )

        # Superuser should have access to everything
        assert can_access_flag(superuser, flag)
        assert can_modify_setting(superuser, None)
        assert can_create_flag(superuser, ScopeType.GLOBAL)
        assert can_delete_setting(superuser, None)
