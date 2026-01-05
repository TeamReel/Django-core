import pytest
from django.core.cache import cache
from projects.models import ProjectMembership
from organisations.models import Membership as OrganisationMembership
from projects.services.permission_resolution import PermissionResolutionService


@pytest.mark.django_db
class TestPermissionResolution:
    @pytest.fixture(autouse=True)
    def clear_cache(self):
        cache.clear()
        yield
        cache.clear()

    def test_explicit_membership_overrides_org(self, project, user):
        """Explicit membership takes precedence."""
        # User is org admin
        OrganisationMembership.objects.create(
            organisation=project.organisation, user=user, role="admin"
        )
        # But explicit membership is viewer
        ProjectMembership.objects.create(project=project, user=user, role="viewer")

        resolver = PermissionResolutionService()
        result = resolver.get_project_role(str(user.id), str(project.id))

        assert result["effective_role"] == "viewer"
        assert result["source"] == "explicit_membership"

    def test_private_project_denies_org_member(self, project, user):
        """Private projects deny implicit access."""
        # Make project private
        project.is_private = True
        project.save()

        # User is org member
        OrganisationMembership.objects.create(
            organisation=project.organisation, user=user, role="member"
        )

        resolver = PermissionResolutionService()
        result = resolver.get_project_role(str(user.id), str(project.id))

        assert result["effective_role"] == "no_access"
        assert result["source"] == "no_access"

    def test_cache_invalidation_on_role_change(self, project, user):
        """Cache invalidates when role changes."""
        membership = ProjectMembership.objects.create(project=project, user=user, role="viewer")

        resolver = PermissionResolutionService()

        # First call - cache miss
        result1 = resolver.get_project_role(str(user.id), str(project.id))
        assert result1["effective_role"] == "viewer"

        # Update role
        membership.role = "editor"
        membership.save()

        # Second call - cache should be invalidated
        result2 = resolver.get_project_role(str(user.id), str(project.id))
        assert result2["effective_role"] == "editor"

    def test_implicit_org_access(self, project, user):
        """Org members get implicit access to public projects."""
        # Project is public by default
        assert not project.is_private

        # User is org admin
        OrganisationMembership.objects.create(
            organisation=project.organisation, user=user, role="admin"
        )

        resolver = PermissionResolutionService()
        result = resolver.get_project_role(str(user.id), str(project.id))

        assert result["effective_role"] == "admin"
        assert result["source"] == "implicit_org_access"

    def test_emergency_override(self, project, user):
        """Global admin override grants admin access to private projects."""
        from settings.models import FeatureFlag

        # Make project private
        project.is_private = True
        project.save()

        # User is org admin
        OrganisationMembership.objects.create(
            organisation=project.organisation, user=user, role="admin"
        )

        # Enable override feature flag
        FeatureFlag.objects.create(
            key="project_access_control.org_admin_override",
            enabled=True,
            scope_type="GLOBAL",
            description="Allow org admins to access private projects",
        )

        resolver = PermissionResolutionService()
        result = resolver.get_project_role(str(user.id), str(project.id))

        assert result["effective_role"] == "admin"
        assert result["source"] == "emergency_override"

    def test_no_access(self, project, user):
        """User with no relation gets no access."""
        resolver = PermissionResolutionService()
        result = resolver.get_project_role(str(user.id), str(project.id))

        assert result["effective_role"] == "no_access"
        assert result["source"] == "no_access"
