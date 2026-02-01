"""Pytest fixtures for branding app tests."""

import pytest
from django.contrib.auth import get_user_model
from organisations.models import Membership, Organisation
from projects.models import Project, ProjectMembership
from rest_framework.test import APIClient

from branding.models import BrandAsset, BrandProfile, DesignToken

User = get_user_model()


@pytest.fixture
def api_client():
    """REST framework API client."""
    return APIClient()


@pytest.fixture
def user_factory(db):
    """Factory for creating test users."""

    def _create_user(email=None, password="testpass123", **kwargs):  # noqa: S107
        if email is None:
            import uuid

            email = f"user-{uuid.uuid4().hex[:8]}@example.com"

        return User.objects.create_user(email=email, password=password, **kwargs)

    return _create_user


@pytest.fixture
def organisation_factory(db, user_factory):
    """Factory for creating test organisations."""

    def _create_organisation(name=None, creator=None, **kwargs):
        if creator is None:
            creator = user_factory()

        if name is None:
            import uuid

            name = f"Org-{uuid.uuid4().hex[:8]}"

        org = Organisation.objects.create(name=name, creator=creator, **kwargs)

        # Create admin membership for creator
        Membership.objects.create(organisation=org, user=creator, role="admin")

        return org

    return _create_organisation


@pytest.fixture
def project_factory(db, organisation_factory, user_factory):
    """Factory for creating test projects."""

    def _create_project(name=None, organisation=None, creator=None, is_private=False, **kwargs):
        if organisation is None:
            organisation = organisation_factory()

        if creator is None:
            creator = organisation.creator  # Use org creator

        if name is None:
            import uuid

            name = f"Project-{uuid.uuid4().hex[:8]}"

        # Ensure creator is org member
        Membership.objects.get_or_create(
            organisation=organisation,
            user=creator,
            defaults={"role": "admin"},
        )

        project = Project.objects.create(
            name=name,
            organisation=organisation,
            creator=creator,
            is_private=is_private,
            **kwargs,
        )

        # Create project admin membership for creator
        ProjectMembership.objects.create(
            project=project,
            user=creator,
            role="admin",
            assignment_reason="manual",
        )

        return project

    return _create_project


@pytest.fixture
def brand_profile_factory(db, organisation_factory, project_factory):
    """Factory for creating brand profiles."""

    def _create_brand_profile(name=None, organisation=None, project=None, is_active=True, **kwargs):
        if name is None:
            import uuid

            name = f"Brand-{uuid.uuid4().hex[:8]}"

        # XOR: either organisation or project, not both
        if organisation is None and project is None:
            organisation = organisation_factory()

        return BrandProfile.objects.create(
            name=name,
            organisation=organisation,
            project=project,
            is_active=is_active,
            **kwargs,
        )

    return _create_brand_profile


@pytest.fixture
def design_token_factory(db, brand_profile_factory):
    """Factory for creating design tokens."""

    def _create_token(
        profile=None,
        key=None,
        value="test-value",
        token_type="other",
        description="",
        **kwargs,
    ):
        if profile is None:
            profile = brand_profile_factory()

        if key is None:
            import uuid

            key = f"token_{uuid.uuid4().hex[:8]}"

        return DesignToken.objects.create(
            profile=profile,
            key=key,
            value=value,
            type=token_type,
            description=description,
            **kwargs,
        )

    return _create_token


@pytest.fixture
def brand_asset_factory(db, brand_profile_factory):
    """Factory for creating brand assets."""

    def _create_asset(
        profile=None,
        asset_type="other",
        file=None,
        alt_text="Test asset",
        is_active=True,
        **kwargs,
    ):
        if profile is None:
            profile = brand_profile_factory()

        # Mock B22 File - use None for now
        # In real tests, you'd create a File object

        return BrandAsset.objects.create(
            profile=profile,
            file=file,
            asset_type=asset_type,
            alt_text=alt_text,
            is_active=is_active,
            **kwargs,
        )

    return _create_asset


# Concrete fixtures for common scenarios


@pytest.fixture
def user(user_factory):
    """Single test user."""
    return user_factory()


@pytest.fixture
def organisation(organisation_factory):
    """Single test organisation."""
    return organisation_factory()


@pytest.fixture
def org_admin(user_factory, organisation):
    """Organisation admin user."""
    user = user_factory()
    Membership.objects.create(organisation=organisation, user=user, role="admin")
    return user


@pytest.fixture
def org_member(user_factory, organisation):
    """Organisation member (non-admin) user."""
    user = user_factory()
    Membership.objects.create(organisation=organisation, user=user, role="member")
    return user


@pytest.fixture
def project(project_factory, organisation):
    """Single test project under organisation."""
    return project_factory(organisation=organisation)


@pytest.fixture
def project_admin(user_factory, project):
    """Project admin user."""
    user = user_factory()
    # Must be org member first
    Membership.objects.create(organisation=project.organisation, user=user, role="member")
    ProjectMembership.objects.create(
        project=project, user=user, role="admin", assignment_reason="manual"
    )
    return user


@pytest.fixture
def project_member(user_factory, project):
    """Project member (non-admin) user."""
    user = user_factory()
    # Must be org member first
    Membership.objects.create(organisation=project.organisation, user=user, role="member")
    ProjectMembership.objects.create(
        project=project, user=user, role="editor", assignment_reason="manual"
    )
    return user


@pytest.fixture
def org_brand(brand_profile_factory, organisation):
    """Organisation-level brand profile."""
    return brand_profile_factory(organisation=organisation, name="Org Brand")


@pytest.fixture
def project_brand(brand_profile_factory, project):
    """Project-level brand profile."""
    return brand_profile_factory(project=project, name="Project Brand")


@pytest.fixture
def org_tokens(design_token_factory, org_brand):
    """Standard org-level design tokens."""
    tokens = [
        design_token_factory(
            profile=org_brand,
            key="primary_color",
            value="#FF6600",
            token_type="color",
            description="Primary brand color",
        ),
        design_token_factory(
            profile=org_brand,
            key="font_heading",
            value="Roboto",
            token_type="font",
            description="Heading font",
        ),
        design_token_factory(
            profile=org_brand,
            key="spacing_base",
            value="8px",
            token_type="spacing",
            description="Base spacing unit",
        ),
    ]
    return tokens


@pytest.fixture
def project_token(design_token_factory, project_brand):
    """Project-level token (overrides org)."""
    return design_token_factory(
        profile=project_brand,
        key="primary_color",
        value="#D2122E",
        token_type="color",
        description="Project-specific primary color",
    )
