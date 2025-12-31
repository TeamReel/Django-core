"""Tests for Project model."""

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.utils import timezone
from projects.models import Project


@pytest.mark.django_db
class TestProjectModel:
    """Test Project model functionality."""

    def test_create_project_success(self, organisation, admin_user):
        """Test successful project creation."""
        project = Project.objects.create(
            organisation=organisation,
            creator=admin_user,
            name="Test Project",
            slug="test-project",
            description="Test description",
        )

        assert project.id is not None
        assert project.name == "Test Project"
        assert project.slug == "test-project"
        assert project.organisation == organisation
        assert project.creator == admin_user
        assert project.is_active is True
        assert project.archived_at is None
        assert project.created_at is not None
        assert project.updated_at is not None

    def test_slug_uniqueness_per_organisation(self, organisation_factory, admin_user):
        """Test slug is unique per organisation."""
        org1 = organisation_factory(name="Org 1")
        org2 = organisation_factory(name="Org 2")

        # Same slug in different orgs should work
        project1 = Project.objects.create(
            organisation=org1,
            creator=admin_user,
            name="Project",
            slug="my-project",
        )
        project2 = Project.objects.create(
            organisation=org2,
            creator=admin_user,
            name="Project",
            slug="my-project",
        )

        assert project1.slug == project2.slug
        assert project1.organisation != project2.organisation

    def test_slug_collision_same_organisation(self, organisation, admin_user):
        """Test slug collision is handled by auto-generating new slug."""
        Project.objects.create(
            organisation=organisation,
            creator=admin_user,
            name="Project One",
            slug="my-project",
        )

        # Attempt to create project with same slug in same org
        # Should not raise IntegrityError, but generate new slug
        project2 = Project.objects.create(
            organisation=organisation,
            creator=admin_user,
            name="Project Two",
            slug="my-project",
        )

        assert project2.slug != "my-project"
        assert project2.slug.startswith("my-project-")

    def test_name_case_insensitive_uniqueness(self, organisation, admin_user):
        """Test name is unique (case-insensitive) per organisation."""
        Project.objects.create(
            organisation=organisation,
            creator=admin_user,
            name="My Project",
            slug="my-project",
        )

        # Different case should violate uniqueness
        # Note: Project.save() calls full_clean(), so ValidationError is raised before IntegrityError
        with pytest.raises((IntegrityError, ValidationError)):
            Project.objects.create(
                organisation=organisation,
                creator=admin_user,
                name="MY PROJECT",
                slug="my-project-2",
            )

    def test_str_representation(self, project):
        """Test string representation."""
        assert str(project) == f"{project.organisation.name}/{project.name}"

    def test_get_absolute_url(self, project):
        """Test get_absolute_url returns correct nested URL."""
        expected = f"/api/v1/organisations/{project.organisation.slug}/projects/{project.slug}/"
        assert project.get_absolute_url() == expected


@pytest.mark.django_db
class TestProjectSoftDelete:
    """Test Project soft deletion (archive/restore)."""

    def test_archive_project(self, project):
        """Test archiving a project."""
        assert project.is_active is True
        assert project.archived_at is None

        project.archive()

        assert project.is_active is False
        assert project.archived_at is not None
        assert isinstance(project.archived_at, timezone.datetime)

    def test_restore_project(self, archived_project):
        """Test restoring an archived project."""
        assert archived_project.is_active is False
        assert archived_project.archived_at is not None

        archived_project.restore()

        assert archived_project.is_active is True
        assert archived_project.archived_at is None

    def test_archive_already_archived(self, archived_project):
        """Test archiving an already archived project."""
        first_archived_at = archived_project.archived_at

        archived_project.archive()

        # archived_at should not change
        assert archived_project.archived_at == first_archived_at
        assert archived_project.is_active is False

    def test_restore_already_active(self, project):
        """Test restoring an already active project."""
        assert project.is_active is True

        project.restore()

        # Should remain active with no archived_at
        assert project.is_active is True
        assert project.archived_at is None


@pytest.mark.django_db
class TestProjectValidation:
    """Test Project model validation."""

    def test_archived_at_set_when_inactive(self, project):
        """Test archived_at is automatically set when is_active is False."""
        project.is_active = False
        project.archived_at = None  # Try to violate consistency

        # Model clean() should fix this
        project.full_clean()

        assert project.archived_at is not None

    def test_archived_at_none_when_active(self, archived_project):
        """Test archived_at is automatically cleared when is_active is True."""
        archived_project.is_active = True
        # archived_at still set - violates consistency

        # Model clean() should fix this
        archived_project.full_clean()

        assert archived_project.archived_at is None

    def test_name_not_blank(self, organisation, admin_user):
        """Test name cannot be blank."""
        project = Project(
            organisation=organisation,
            creator=admin_user,
            name="",
            slug="test",
        )

        with pytest.raises(ValidationError) as exc_info:
            project.full_clean()

        assert "name" in exc_info.value.error_dict

    def test_slug_not_blank(self, organisation, admin_user):
        """Test slug cannot be blank."""
        project = Project(
            organisation=organisation,
            creator=admin_user,
            name="Test",
            slug="",
        )

        with pytest.raises(ValidationError) as exc_info:
            project.full_clean()

        assert "slug" in exc_info.value.error_dict

    def test_name_max_length(self, organisation, admin_user):
        """Test name respects max_length constraint."""
        project = Project(
            organisation=organisation,
            creator=admin_user,
            name="x" * 201,  # Exceeds 200 char limit
            slug="test",
        )

        with pytest.raises(ValidationError) as exc_info:
            project.full_clean()

        assert "name" in exc_info.value.error_dict

    def test_slug_max_length(self, organisation, admin_user):
        """Test slug respects max_length constraint."""
        project = Project(
            organisation=organisation,
            creator=admin_user,
            name="Test",
            slug="x" * 201,  # Exceeds 200 char limit
        )

        with pytest.raises(ValidationError) as exc_info:
            project.full_clean()

        assert "slug" in exc_info.value.error_dict


@pytest.mark.django_db
class TestProjectRelationships:
    """Test Project model relationships."""

    def test_organisation_relationship(self, project, organisation):
        """Test organisation foreign key relationship."""
        assert project.organisation == organisation
        assert project in organisation.projects.all()

    def test_creator_relationship(self, project, admin_user):
        """Test creator foreign key relationship."""
        assert project.creator == admin_user

    def test_cascade_delete_organisation(self, project, organisation):
        """Test project is deleted when organisation is deleted."""
        project_id = project.id
        organisation.delete(hard=True)

        assert not Project.all_objects.filter(id=project_id).exists()

    def test_protect_delete_creator(self, project, admin_user):
        """Test creator cannot be deleted if they have projects."""
        with pytest.raises(IntegrityError):
            admin_user.delete()

        # Project should still exist
        assert Project.objects.filter(id=project.id).exists()


@pytest.mark.django_db
class TestProjectTimestamps:
    """Test Project timestamp behavior."""

    def test_created_at_auto_set(self, organisation, admin_user):
        """Test created_at is automatically set on creation."""
        before = timezone.now()
        project = Project.objects.create(
            organisation=organisation,
            creator=admin_user,
            name="Test",
            slug="test",
        )
        after = timezone.now()

        assert before <= project.created_at <= after

    def test_updated_at_auto_updates(self, project):
        """Test updated_at is automatically updated on save."""
        original_updated = project.updated_at

        # Wait a moment and update
        import time

        time.sleep(0.01)
        project.description = "Updated description"
        project.save()

        assert project.updated_at > original_updated

    def test_created_at_immutable(self, project):
        """Test created_at doesn't change on update."""
        original_created = project.created_at

        project.description = "Updated"
        project.save()

        assert project.created_at == original_created
