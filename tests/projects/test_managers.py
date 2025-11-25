"""Tests for Project managers."""

import pytest
from projects.models import Project


@pytest.mark.django_db
class TestProjectManagers:
    """Test Project custom managers."""

    def test_default_manager_active_only(self, project, archived_project):
        """Test default manager (objects) returns only active projects."""
        active_projects = Project.objects.all()

        assert project in active_projects
        assert archived_project not in active_projects
        assert active_projects.count() == 1

    def test_all_objects_manager_includes_archived(self, project, archived_project):
        """Test all_objects manager returns both active and archived projects."""
        all_projects = Project.all_objects.all()

        assert project in all_projects
        assert archived_project in all_projects
        assert all_projects.count() == 2

    def test_filter_by_organisation_active_only(self, organisation, project_factory, admin_user):
        """Test filtering by organisation with default manager."""
        # Create active and archived projects in same org
        active_proj = project_factory(organisation=organisation, creator=admin_user)
        archived_proj = project_factory(organisation=organisation, creator=admin_user)
        archived_proj.archive()

        org_projects = Project.objects.filter(organisation=organisation)

        assert active_proj in org_projects
        assert archived_proj not in org_projects
        assert org_projects.count() == 2  # project fixture + active_proj

    def test_filter_by_organisation_all_objects(self, organisation, project_factory, admin_user):
        """Test filtering by organisation with all_objects manager."""
        # Create active and archived projects in same org
        active_proj = project_factory(organisation=organisation, creator=admin_user)
        archived_proj = project_factory(organisation=organisation, creator=admin_user)
        archived_proj.archive()

        all_org_projects = Project.all_objects.filter(organisation=organisation)

        assert active_proj in all_org_projects
        assert archived_proj in all_org_projects
        assert all_org_projects.count() == 3  # project fixture + active + archived

    def test_get_active_project(self, project):
        """Test retrieving a specific active project."""
        retrieved = Project.objects.get(id=project.id)
        assert retrieved == project

    def test_get_archived_project_fails_with_default_manager(self, archived_project):
        """Test retrieving archived project fails with default manager."""
        with pytest.raises(Project.DoesNotExist):
            Project.objects.get(id=archived_project.id)

    def test_get_archived_project_succeeds_with_all_objects(self, archived_project):
        """Test retrieving archived project succeeds with all_objects."""
        retrieved = Project.all_objects.get(id=archived_project.id)
        assert retrieved == archived_project

    def test_create_via_objects_manager(self, organisation, admin_user):
        """Test creating project via default objects manager."""
        project = Project.objects.create(
            organisation=organisation,
            creator=admin_user,
            name="New Project",
            slug="new-project",
        )

        assert project.is_active is True
        assert Project.objects.filter(id=project.id).exists()

    def test_create_via_all_objects_manager(self, organisation, admin_user):
        """Test creating project via all_objects manager."""
        project = Project.all_objects.create(
            organisation=organisation,
            creator=admin_user,
            name="Another Project",
            slug="another-project",
        )

        assert project.is_active is True
        assert Project.all_objects.filter(id=project.id).exists()

    def test_bulk_create_active_projects(self, organisation, admin_user):
        """Test bulk creating multiple active projects."""
        projects_data = [
            Project(
                organisation=organisation,
                creator=admin_user,
                name=f"Bulk Project {i}",
                slug=f"bulk-{i}",
            )
            for i in range(5)
        ]

        created = Project.objects.bulk_create(projects_data)

        assert len(created) == 5
        assert Project.objects.filter(organisation=organisation).count() >= 5

    def test_archive_updates_queryset(self, project):
        """Test archiving removes from default manager queryset."""
        assert Project.objects.filter(id=project.id).exists()

        project.archive()

        assert not Project.objects.filter(id=project.id).exists()
        assert Project.all_objects.filter(id=project.id).exists()

    def test_restore_adds_to_queryset(self, archived_project):
        """Test restoring adds back to default manager queryset."""
        assert not Project.objects.filter(id=archived_project.id).exists()

        archived_project.restore()

        assert Project.objects.filter(id=archived_project.id).exists()
        assert Project.all_objects.filter(id=archived_project.id).exists()

    def test_count_active_vs_all(self, organisation, project_factory, admin_user, project):
        """Test count differences between managers."""
        # Create mix of active and archived
        for i in range(3):
            proj = project_factory(
                organisation=organisation,
                creator=admin_user,
                name=f"Project {i}",
            )
            if i % 2 == 0:
                proj.archive()

        active_count = Project.objects.filter(organisation=organisation).count()
        all_count = Project.all_objects.filter(organisation=organisation).count()

        # Should have different counts
        assert all_count > active_count
        assert active_count >= 1  # At least the fixture project
        assert all_count >= 4  # Fixture + 3 new (2 archived, 1 active)

    def test_manager_chaining_active(self, organisation, project_factory, admin_user):
        """Test chaining queryset methods with default manager."""
        # Create multiple projects
        for i in range(5):
            project_factory(
                organisation=organisation,
                creator=admin_user,
                name=f"Active {i}",
            )

        # Chain filters
        result = (
            Project.objects.filter(organisation=organisation)
            .filter(name__startswith="Active")
            .order_by("name")
        )

        assert result.count() >= 5
        assert all(proj.is_active for proj in result)

    def test_manager_chaining_all_objects(self, organisation, project_factory, admin_user):
        """Test chaining queryset methods with all_objects manager."""
        # Create mix
        active = project_factory(organisation=organisation, creator=admin_user)
        archived = project_factory(organisation=organisation, creator=admin_user)
        archived.archive()

        # Chain filters
        result = (
            Project.all_objects.filter(organisation=organisation)
            .filter(is_active=False)
            .order_by("-created_at")
        )

        assert archived in result
        assert active not in result
