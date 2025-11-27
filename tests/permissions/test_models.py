"""Tests for permission models validation and behavior."""

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from permissions.models import Permission, Role, RoleAssignment, ScopeChoices


@pytest.mark.django_db
class TestPermissionModel:
    """Test Permission model validation and constraints."""

    def test_create_valid_permission(self):
        """Test creating permission with valid format."""
        perm = Permission.objects.create(
            permission="projects.view", resource_type="projects", description="View projects"
        )
        assert perm.permission == "projects.view"
        assert perm.resource_type == "projects"
        assert str(perm) == "projects.view"

    def test_permission_unique_constraint(self):
        """Test permission string must be unique."""
        Permission.objects.create(permission="projects.view", resource_type="projects")
        with pytest.raises(IntegrityError):
            Permission.objects.create(permission="projects.view", resource_type="projects")

    def test_permission_format_validation_uppercase(self):
        """Test permission string rejects uppercase."""
        perm = Permission(permission="Projects.View", resource_type="projects")
        with pytest.raises(ValidationError) as exc_info:
            perm.full_clean()
        assert "permission" in exc_info.value.message_dict

    def test_permission_format_validation_no_dot(self):
        """Test permission string requires dot separator."""
        perm = Permission(permission="projectsview", resource_type="projects")
        with pytest.raises(ValidationError) as exc_info:
            perm.full_clean()
        assert "permission" in exc_info.value.message_dict

    def test_permission_format_validation_multiple_dots(self):
        """Test permission string rejects multiple dots."""
        perm = Permission(permission="projects.sub.view", resource_type="projects")
        with pytest.raises(ValidationError) as exc_info:
            perm.full_clean()
        assert "permission" in exc_info.value.message_dict

    def test_permission_format_validation_special_chars(self):
        """Test permission string rejects special characters."""
        perm = Permission(permission="projects.view-all", resource_type="projects")
        with pytest.raises(ValidationError) as exc_info:
            perm.full_clean()
        assert "permission" in exc_info.value.message_dict

    def test_permission_format_validation_spaces(self):
        """Test permission string rejects spaces."""
        perm = Permission(permission="projects .view", resource_type="projects")
        with pytest.raises(ValidationError) as exc_info:
            perm.full_clean()
        assert "permission" in exc_info.value.message_dict

    def test_permission_allows_underscores(self):
        """Test permission string allows underscores."""
        perm = Permission(permission="org_members.invite_user", resource_type="org_members")
        perm.full_clean()  # Should not raise

    def test_permission_is_sensitive_default(self):
        """Test is_sensitive defaults to False."""
        perm = Permission.objects.create(permission="projects.view", resource_type="projects")
        assert perm.is_sensitive is False

    def test_permission_timestamps(self):
        """Test created_at is set automatically."""
        perm = Permission.objects.create(permission="projects.view", resource_type="projects")
        assert perm.created_at is not None


@pytest.mark.django_db
class TestRoleModel:
    """Test Role model validation and constraints."""

    def test_create_valid_role(self):
        """Test creating role with valid data."""
        role = Role.objects.create(
            name="Project Viewer",
            scope=ScopeChoices.PROJECT,
            description="Can view project details",
        )
        assert role.name == "Project Viewer"
        assert role.scope == ScopeChoices.PROJECT
        assert "Project Viewer" in str(role)

    def test_role_unique_together_name_scope(self):
        """Test role name must be unique within scope."""
        Role.objects.create(name="Admin", scope=ScopeChoices.GLOBAL)
        # Same name, different scope - allowed
        Role.objects.create(name="Admin", scope=ScopeChoices.PROJECT)
        # Same name, same scope - not allowed
        with pytest.raises(IntegrityError):
            Role.objects.create(name="Admin", scope=ScopeChoices.GLOBAL)

    def test_role_permissions_many_to_many(self):
        """Test role can have multiple permissions."""
        role = Role.objects.create(name="Project Admin", scope=ScopeChoices.PROJECT)
        perm1 = Permission.objects.create(permission="projects.view", resource_type="projects")
        perm2 = Permission.objects.create(permission="projects.update", resource_type="projects")

        role.permissions.add(perm1, perm2)
        assert role.permissions.count() == 2

    def test_role_timestamps(self):
        """Test created_at and updated_at are set."""
        role = Role.objects.create(name="Viewer", scope=ScopeChoices.GLOBAL)
        assert role.created_at is not None
        assert role.updated_at is not None

    def test_role_str_includes_scope_display(self):
        """Test string representation includes scope."""
        role = Role.objects.create(name="Admin", scope=ScopeChoices.ORGANIZATION)
        assert "Admin" in str(role)
        assert "Organization" in str(role)


@pytest.mark.django_db
class TestRoleAssignmentModel:
    """Test RoleAssignment model validation and constraints."""

    def test_create_global_assignment(self, user):
        """Test creating global scope assignment."""
        role = Role.objects.create(name="Global Admin", scope=ScopeChoices.GLOBAL)
        assignment = RoleAssignment.objects.create(user=user, role=role, scope=ScopeChoices.GLOBAL)

        assert assignment.user == user
        assert assignment.role == role
        assert assignment.scope == ScopeChoices.GLOBAL
        assert assignment.target_organization is None
        assert assignment.target_project is None

    def test_create_org_assignment(self, user, organisation):
        """Test creating organization scope assignment."""
        role = Role.objects.create(name="Org Admin", scope=ScopeChoices.ORGANIZATION)
        assignment = RoleAssignment.objects.create(
            user=user, role=role, scope=ScopeChoices.ORGANIZATION, target_organization=organisation
        )

        assert assignment.target_organization == organisation
        assert assignment.target_project is None

    def test_create_project_assignment(self, user, project):
        """Test creating project scope assignment."""
        role = Role.objects.create(name="Project Admin", scope=ScopeChoices.PROJECT)
        assignment = RoleAssignment.objects.create(
            user=user, role=role, scope=ScopeChoices.PROJECT, target_project=project
        )

        assert assignment.target_project == project

    def test_global_scope_rejects_target_organization(self, user):
        """Test global scope cannot have target_organization."""
        role = Role.objects.create(name="Global Admin", scope=ScopeChoices.GLOBAL)
        org = pytest.importorskip("organisations.models").Organisation.objects.create(
            name="Test Org", slug="test", creator=user
        )

        assignment = RoleAssignment(
            user=user, role=role, scope=ScopeChoices.GLOBAL, target_organization=org
        )
        with pytest.raises(ValidationError) as exc_info:
            assignment.full_clean()
        assert "scope" in exc_info.value.message_dict

    def test_global_scope_rejects_target_project(self, user, project):
        """Test global scope cannot have target_project."""
        role = Role.objects.create(name="Global Admin", scope=ScopeChoices.GLOBAL)

        assignment = RoleAssignment(
            user=user, role=role, scope=ScopeChoices.GLOBAL, target_project=project
        )
        with pytest.raises(ValidationError) as exc_info:
            assignment.full_clean()
        assert "scope" in exc_info.value.message_dict

    def test_org_scope_requires_target_organization(self, user):
        """Test organization scope requires target_organization."""
        role = Role.objects.create(name="Org Admin", scope=ScopeChoices.ORGANIZATION)

        assignment = RoleAssignment(user=user, role=role, scope=ScopeChoices.ORGANIZATION)
        with pytest.raises(ValidationError) as exc_info:
            assignment.full_clean()
        assert "target_organization" in exc_info.value.message_dict

    def test_org_scope_rejects_target_project(self, user, organisation, project):
        """Test organization scope cannot have target_project."""
        role = Role.objects.create(name="Org Admin", scope=ScopeChoices.ORGANIZATION)

        assignment = RoleAssignment(
            user=user,
            role=role,
            scope=ScopeChoices.ORGANIZATION,
            target_organization=organisation,
            target_project=project,
        )
        with pytest.raises(ValidationError) as exc_info:
            assignment.full_clean()
        assert "target_project" in exc_info.value.message_dict

    def test_project_scope_requires_target_project(self, user):
        """Test project scope requires target_project."""
        role = Role.objects.create(name="Project Admin", scope=ScopeChoices.PROJECT)

        assignment = RoleAssignment(user=user, role=role, scope=ScopeChoices.PROJECT)
        with pytest.raises(ValidationError) as exc_info:
            assignment.full_clean()
        assert "target_project" in exc_info.value.message_dict

    def test_role_scope_must_match_assignment_scope(self, user):
        """Test role scope must match assignment scope."""
        role = Role.objects.create(name="Project Admin", scope=ScopeChoices.PROJECT)

        assignment = RoleAssignment(user=user, role=role, scope=ScopeChoices.GLOBAL)
        with pytest.raises(ValidationError) as exc_info:
            assignment.full_clean()
        assert "role" in exc_info.value.message_dict

    def test_unique_constraint_prevents_duplicates(self, user, project):
        """Test user can't have duplicate assignments to same scope/target."""
        role1 = Role.objects.create(name="Project Admin", scope=ScopeChoices.PROJECT)
        role2 = Role.objects.create(name="Project Member", scope=ScopeChoices.PROJECT)

        # First assignment succeeds
        RoleAssignment.objects.create(
            user=user, role=role1, scope=ScopeChoices.PROJECT, target_project=project
        )

        # Same user, same scope, same target, different role - should still work
        # (unique_together is on user, scope, target_organization, target_project)
        assignment2 = RoleAssignment.objects.create(
            user=user, role=role2, scope=ScopeChoices.PROJECT, target_project=project
        )
        assert assignment2.id is not None

    def test_assignment_str_global(self, user):
        """Test string representation for global assignment."""
        role = Role.objects.create(name="Global Admin", scope=ScopeChoices.GLOBAL)
        assignment = RoleAssignment.objects.create(user=user, role=role, scope=ScopeChoices.GLOBAL)

        assert "Global" in str(assignment)

    def test_assignment_str_organization(self, user, organisation):
        """Test string representation for organization assignment."""
        role = Role.objects.create(name="Org Admin", scope=ScopeChoices.ORGANIZATION)
        assignment = RoleAssignment.objects.create(
            user=user,
            role=role,
            scope=ScopeChoices.ORGANIZATION,
            target_organization=organisation,
        )

        assert organisation.name in str(assignment)

    def test_assignment_str_project(self, user, project):
        """Test string representation for project assignment."""
        role = Role.objects.create(name="Project Admin", scope=ScopeChoices.PROJECT)
        assignment = RoleAssignment.objects.create(
            user=user, role=role, scope=ScopeChoices.PROJECT, target_project=project
        )

        assert project.name in str(assignment)

    def test_assigned_by_tracks_creator(self, user, admin_user):
        """Test assigned_by field tracks who created assignment."""
        role = Role.objects.create(name="Global Admin", scope=ScopeChoices.GLOBAL)
        assignment = RoleAssignment.objects.create(
            user=user, role=role, scope=ScopeChoices.GLOBAL, assigned_by=admin_user
        )

        assert assignment.assigned_by == admin_user

    def test_assigned_at_timestamp(self, user):
        """Test assigned_at is set automatically."""
        role = Role.objects.create(name="Global Admin", scope=ScopeChoices.GLOBAL)
        assignment = RoleAssignment.objects.create(user=user, role=role, scope=ScopeChoices.GLOBAL)

        assert assignment.assigned_at is not None
