"""Shared fixtures for integration tests.

These tests expect a small set of helpers/fixtures to exist under
`tests.integration.conftest`.

Keep these fixtures minimal and deterministic.
"""

from __future__ import annotations

from typing import Optional

import pytest
from django.contrib.auth import get_user_model

from organisations.models import Organisation
from permissions.models import Role, RoleAssignment, ScopeChoices
from projects.models import Project

User = get_user_model()


def _create_user(*, email: str) -> User:
    user = User.objects.create_user(email=email, password="Test123!@#")
    # Many parts of the app treat verified users as "real" users.
    if hasattr(user, "email_verified"):
        user.email_verified = True
    user.is_active = True
    user.save()
    return user


def _resolve_role(role_key: str, scope: str) -> Role:
    """Resolve a role from a short key used in tests.

    The integration tests sometimes pass keys like "member" rather than full role
    names. We map those keys to seeded defaults created by `seed_default_roles`.
    """

    normalized_key = (role_key or "").strip().lower()
    normalized_scope = (scope or "").strip().lower()

    if normalized_key in {"member"}:
        if normalized_scope == ScopeChoices.PROJECT:
            return Role.objects.get(name="Project Member", scope=ScopeChoices.PROJECT)
        if normalized_scope == ScopeChoices.ORGANIZATION:
            return Role.objects.get(name="Organization Member", scope=ScopeChoices.ORGANIZATION)

    if normalized_key in {"admin", "administrator"}:
        if normalized_scope == ScopeChoices.PROJECT:
            return Role.objects.get(name="Project Admin", scope=ScopeChoices.PROJECT)
        if normalized_scope == ScopeChoices.ORGANIZATION:
            return Role.objects.get(name="Organization Admin", scope=ScopeChoices.ORGANIZATION)
        if normalized_scope == ScopeChoices.GLOBAL:
            return Role.objects.get(name="Global Admin", scope=ScopeChoices.GLOBAL)

    if normalized_key in {"viewer", "view"}:
        if normalized_scope == ScopeChoices.PROJECT:
            return Role.objects.get(name="Project Viewer", scope=ScopeChoices.PROJECT)
        if normalized_scope == ScopeChoices.ORGANIZATION:
            return Role.objects.get(name="Organization Viewer", scope=ScopeChoices.ORGANIZATION)

    # Fall back to allowing passing the exact Role.name
    return Role.objects.get(name=role_key)


def assign_role_to_user(
    user: User,
    role_key: str,
    scope: str,
    target_id: Optional[str] = None,
    *,
    assigned_by: Optional[User] = None,
) -> RoleAssignment:
    """Test helper to create a RoleAssignment.

    This is imported directly by some integration tests.
    """

    normalized_scope = (scope or "").strip().lower()
    role = _resolve_role(role_key, normalized_scope)

    role_assignment_kwargs: dict = {
        "user": user,
        "role": role,
        "scope": normalized_scope,
        "assigned_by": assigned_by,
    }

    if normalized_scope == ScopeChoices.ORGANIZATION:
        if target_id is None:
            raise ValueError("target_id is required for organization scope")
        role_assignment_kwargs["target_organization"] = Organisation.objects.get(id=target_id)

    if normalized_scope == ScopeChoices.PROJECT:
        if target_id is None:
            raise ValueError("target_id is required for project scope")
        project = Project.objects.select_related("organisation").get(id=target_id)
        role_assignment_kwargs["target_project"] = project
        role_assignment_kwargs["target_organization"] = project.organisation

    return RoleAssignment.objects.create(**role_assignment_kwargs)


@pytest.fixture
def org_creator(db):
    return _create_user(email="org.creator@test.com")


@pytest.fixture
def regular_user(db):
    """Basic authenticated user for integration tests."""
    return _create_user(email="user@test.com")


@pytest.fixture
def test_organization(db, org_creator):
    return Organisation.objects.create(
        name="Test Organization", slug="test-organization", creator=org_creator
    )


@pytest.fixture
def test_project(db, test_organization, org_creator):
    return Project.objects.create(
        organisation=test_organization,
        creator=org_creator,
        name="Test Project",
        slug="test-project",
    )


@pytest.fixture
def org1(db, org_creator):
    return Organisation.objects.create(name="Org One", slug="org-one", creator=org_creator)


@pytest.fixture
def org2(db, org_creator):
    return Organisation.objects.create(name="Org Two", slug="org-two", creator=org_creator)


@pytest.fixture
def test_role(db):
    # Used by tests that create a new RoleAssignment under ORGANIZATION scope.
    return Role.objects.get(name="Organization Viewer", scope=ScopeChoices.ORGANIZATION)


@pytest.fixture
def user_with_no_permissions(db):
    return _create_user(email="no.perms@test.com")


@pytest.fixture
def user_without_permission(user_with_no_permissions):
    return user_with_no_permissions


@pytest.fixture
def user_without_org_permission(db):
    return _create_user(email="no.org.perms@test.com")


@pytest.fixture
def user_without_project_permission(db):
    return _create_user(email="no.project.perms@test.com")


@pytest.fixture
def user_without_settings_permission(db):
    return _create_user(email="no.settings.perms@test.com")


@pytest.fixture
def user_without_notifications_permission(db):
    return _create_user(email="no.notifications.perms@test.com")


@pytest.fixture
def user_with_global_permissions(db):
    user = _create_user(email="global.perms@test.com")
    assign_role_to_user(user, "Global Admin", ScopeChoices.GLOBAL)
    return user


@pytest.fixture
def user_with_org_permissions(db, test_organization):
    user = _create_user(email="org.perms@test.com")
    assign_role_to_user(user, "member", ScopeChoices.ORGANIZATION, str(test_organization.id))
    return user


@pytest.fixture
def user_with_multiple_org_permissions(db, org1, org2):
    user = _create_user(email="multi.org.perms@test.com")
    assign_role_to_user(user, "member", ScopeChoices.ORGANIZATION, str(org1.id))
    assign_role_to_user(user, "member", ScopeChoices.ORGANIZATION, str(org2.id))
    return user


@pytest.fixture
def user_with_permissions(db, test_organization, test_project):
    # Give a mix of org/project permissions so sorting is exercised.
    user = _create_user(email="some.perms@test.com")
    assign_role_to_user(user, "admin", ScopeChoices.ORGANIZATION, str(test_organization.id))
    assign_role_to_user(user, "viewer", ScopeChoices.PROJECT, str(test_project.id))
    return user
