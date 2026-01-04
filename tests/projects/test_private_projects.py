import pytest
from django.core.cache import cache
from organisations.models import Membership as OrganisationMembership
from projects.services.permission_resolution import PermissionResolutionService
from settings.models import FeatureFlag


@pytest.mark.django_db
class TestPrivateProjects:
    @pytest.fixture(autouse=True)
    def clear_cache(self):
        cache.clear()
        yield
        cache.clear()

    def test_private_projects_flag_disabled(self, project, user):
        """If private_projects flag is disabled, is_private is ignored."""
        # Disable private projects feature
        FeatureFlag.objects.create(
            key="project_access_control.private_projects", enabled=False, scope_type="GLOBAL"
        )

        # Make project private
        project.is_private = True
        project.save()

        # User is org member (should get implicit access if privacy ignored)
        OrganisationMembership.objects.create(
            organisation=project.organisation, user=user, role="member"
        )

        resolver = PermissionResolutionService()
        result = resolver.get_project_role(str(user.id), str(project.id))

        # Should be viewer (implicit) instead of no_access
        assert result["effective_role"] == "viewer"
        assert result["source"] == "implicit_org_access"

    def test_emergency_override_rate_limit(self, project, user):
        """Emergency override is rate limited to 5 per day."""
        # Enable private projects feature
        FeatureFlag.objects.create(
            key="project_access_control.private_projects", enabled=True, scope_type="GLOBAL"
        )

        # Enable override feature
        FeatureFlag.objects.create(
            key="project_access_control.org_admin_override", enabled=True, scope_type="GLOBAL"
        )

        # Make project private
        project.is_private = True
        project.save()

        # User is org admin
        OrganisationMembership.objects.create(
            organisation=project.organisation, user=user, role="admin"
        )

        resolver = PermissionResolutionService()
        perm_key = f"permissions:user:{user.id}:project:{project.id}"

        # Perform 5 overrides
        for _ in range(5):
            cache.delete(perm_key)  # Clear permission cache only
            result = resolver.get_project_role(str(user.id), str(project.id))
            assert result["effective_role"] == "admin"
            assert result["source"] == "emergency_override"

        # 6th override should fail
        cache.delete(perm_key)
        result = resolver.get_project_role(str(user.id), str(project.id))
        assert result["effective_role"] == "no_access"
        assert result["source"] == "no_access"

    def test_update_project_privacy(self, project, user):
        """Project privacy can be updated via API."""
        from projects.api.serializers import ProjectUpdateSerializer

        # Initially public
        assert not project.is_private

        serializer = ProjectUpdateSerializer(
            instance=project, data={"is_private": True}, partial=True
        )
        assert serializer.is_valid()
        serializer.save()

        project.refresh_from_db()
        assert project.is_private

        # Set back to public
        serializer = ProjectUpdateSerializer(
            instance=project, data={"is_private": False}, partial=True
        )
        assert serializer.is_valid()
        serializer.save()

        project.refresh_from_db()
        assert not project.is_private

    def test_emergency_override_audit_log(self, project, user):
        """Emergency override triggers an audit log."""
        from unittest.mock import patch

        # Enable private projects feature
        FeatureFlag.objects.create(
            key="project_access_control.private_projects", enabled=True, scope_type="GLOBAL"
        )

        # Enable override feature
        FeatureFlag.objects.create(
            key="project_access_control.org_admin_override", enabled=True, scope_type="GLOBAL"
        )

        # Make project private
        project.is_private = True
        project.save()

        # User is org admin
        OrganisationMembership.objects.create(
            organisation=project.organisation, user=user, role="admin"
        )

        resolver = PermissionResolutionService()

        with patch("audit.api.audit_log.record") as mock_record:
            result = resolver.get_project_role(str(user.id), str(project.id))

            assert result["effective_role"] == "admin"
            assert result["source"] == "emergency_override"

            mock_record.assert_called_once()
            args, kwargs = mock_record.call_args
            assert args[0] == "project.access.emergency_override"
            assert kwargs["user"] == user
            assert kwargs["project"] == project
            assert kwargs["metadata"]["override_type"] == "org_admin_private_project_access"
