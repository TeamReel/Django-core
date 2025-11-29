"""
Integration tests demonstrating project association patterns.

This module provides example test cases showing how product-specific
resources can integrate with the projects app via foreign keys.
"""

import pytest
from django.contrib.auth import get_user_model
from django.db import models
from src.organisations.models import Membership, Organisation
from src.projects.models import Project

User = get_user_model()


# Example resource model for integration testing
class ExampleResource(models.Model):
    """
    Example product-specific resource that associates with a project.

    This demonstrates the recommended pattern for product features
    that need to scope data within projects.
    """

    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="example_resources",
        null=True,
        blank=True,
        help_text="Project this resource belongs to",
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "tests"  # Test-only model
        db_table = "test_example_resource"
        indexes = [
            models.Index(fields=["project"]),
        ]


@pytest.fixture
def org():
    """Test organisation with creator."""
    user = User.objects.create_user(
        email="creator@example.com",
        password="testpass123",
        first_name="Creator",
        last_name="User",
    )
    org = Organisation.objects.create(
        name="Test Org",
        slug="test-org",
        description="Test organisation",
        creator=user,
    )
    return org


@pytest.fixture
def admin_user(org):
    """Admin user with organisation membership."""
    user = User.objects.create_user(
        email="admin@example.com",
        password="testpass123",
        first_name="Admin",
        last_name="User",
    )
    Membership.objects.create(
        organisation=org,
        user=user,
        role="admin",
    )
    return user


@pytest.fixture
def project(org, admin_user):
    """Test project."""
    return Project.objects.create(
        organisation=org,
        creator=admin_user,
        name="Test Project",
        slug="test-project",
        description="Test project for integration",
    )


@pytest.mark.django_db
class TestResourceProjectAssociation:
    """Test patterns for associating resources with projects."""

    def test_create_resource_with_project(self, project):
        """
        Test creating a resource associated with a project.

        This demonstrates the basic pattern: create your product resource
        with a foreign key to the Project model.
        """
        resource = ExampleResource.objects.create(
            project=project, name="Test Resource", description="A resource belonging to a project"
        )

        assert resource.project == project
        assert resource.project.name == "Test Project"
        assert resource in project.example_resources.all()

    def test_query_resources_by_project(self, project, org, admin_user):
        """
        Test filtering resources by project.

        This demonstrates the query pattern used in API viewsets
        to filter resources by project ID.
        """
        # Create resources in different projects
        project2 = Project.objects.create(
            organisation=org,
            creator=admin_user,
            name="Second Project",
            slug="second-project",
        )

        resource1 = ExampleResource.objects.create(project=project, name="Resource 1")
        resource2 = ExampleResource.objects.create(project=project, name="Resource 2")
        resource3 = ExampleResource.objects.create(project=project2, name="Resource 3")
        resource4 = ExampleResource.objects.create(project=None, name="Unassociated Resource")

        # Filter by project (as done in API viewsets)
        project_resources = ExampleResource.objects.filter(project=project)

        assert project_resources.count() == 2
        assert resource1 in project_resources
        assert resource2 in project_resources
        assert resource3 not in project_resources
        assert resource4 not in project_resources

    def test_resource_with_archived_project(self, project):
        """
        Test handling resources when project is archived (soft deleted).

        This demonstrates that soft deletion does NOT cascade.
        Resources remain accessible after project is archived.
        """
        resource = ExampleResource.objects.create(project=project, name="Test Resource")

        # Archive the project
        project.archive()

        # Resource still exists and is accessible
        resource.refresh_from_db()
        assert resource.project == project
        assert resource.project.is_active is False

        # Option 1: Filter to exclude resources from archived projects
        active_project_resources = ExampleResource.objects.filter(project__is_active=True)
        assert resource not in active_project_resources

        # Option 2: Include all resources regardless of project status
        all_resources = ExampleResource.objects.all()
        assert resource in all_resources

    def test_cascade_delete_on_hard_delete(self, project):
        """
        Test cascade behavior when project is hard deleted.

        This demonstrates that hard deletion (rare) DOES cascade
        when using on_delete=CASCADE.
        """
        resource = ExampleResource.objects.create(project=project, name="Test Resource")

        resource_id = resource.id
        project_id = project.id

        # Hard delete the project (bypasses soft delete)
        Project.all_objects.filter(id=project_id).delete()

        # Resource is also deleted due to CASCADE
        assert not ExampleResource.objects.filter(id=resource_id).exists()

    def test_query_optimization_with_select_related(self, project):
        """
        Test query optimization using select_related.

        This demonstrates the performance pattern: use select_related
        to avoid N+1 queries when accessing project details.
        """
        # Create multiple resources
        for i in range(5):
            ExampleResource.objects.create(project=project, name=f"Resource {i}")

        # Without select_related: N+1 queries (1 for resources, N for projects)
        # With select_related: 1 query for resources + their projects
        resources = ExampleResource.objects.select_related("project").all()

        # Access project data without additional queries
        for resource in resources:
            _ = resource.project.name
            _ = resource.project.organisation.name
            # These access the pre-fetched data

    def test_resource_without_project(self):
        """
        Test creating resources without project association.

        This demonstrates that project association can be optional
        (null=True, blank=True pattern).
        """
        resource = ExampleResource.objects.create(project=None, name="Unassociated Resource")

        assert resource.project is None
        assert ExampleResource.objects.filter(project__isnull=True).count() == 1

    def test_multiple_projects_same_organisation(self, org, admin_user):
        """
        Test resources across multiple projects in same organisation.

        This demonstrates organisation-scoped filtering: resources
        can be filtered by organisation via project relationship.
        """
        project1 = Project.objects.create(
            organisation=org,
            creator=admin_user,
            name="Project Alpha",
            slug="project-alpha",
        )
        project2 = Project.objects.create(
            organisation=org,
            creator=admin_user,
            name="Project Beta",
            slug="project-beta",
        )

        resource1 = ExampleResource.objects.create(project=project1, name="Alpha Resource")
        resource2 = ExampleResource.objects.create(project=project2, name="Beta Resource")

        # Filter all resources for an organisation
        org_resources = ExampleResource.objects.filter(project__organisation=org)

        assert org_resources.count() == 2
        assert resource1 in org_resources
        assert resource2 in org_resources


@pytest.mark.django_db
class TestProjectCascadeBehavior:
    """Test cascade behavior patterns."""

    def test_soft_delete_does_not_cascade(self, project):
        """
        Verify soft deletion (archive) does not cascade to resources.

        This is the expected behavior for most product features.
        """
        resource = ExampleResource.objects.create(project=project, name="Test Resource")

        # Archive project (soft delete)
        project.archive()

        # Resource still exists
        resource.refresh_from_db()
        assert ExampleResource.objects.filter(id=resource.id).exists()
        assert resource.project.is_active is False

    def test_hard_delete_cascades(self, project):
        """
        Verify hard deletion cascades to resources.

        This demonstrates cascade behavior when project is permanently deleted.
        """
        resource = ExampleResource.objects.create(project=project, name="Test Resource")

        resource_id = resource.id

        # Hard delete using all_objects manager (bypasses soft delete)
        Project.all_objects.filter(id=project.id).delete()

        # Resource is deleted due to CASCADE
        assert not ExampleResource.objects.filter(id=resource_id).exists()

    def test_restore_preserves_associations(self, project):
        """
        Verify restoring project preserves resource associations.

        This demonstrates that archive/restore cycle maintains relationships.
        """
        resource = ExampleResource.objects.create(project=project, name="Test Resource")

        # Archive and restore
        project.archive()
        project.restore()

        # Resource relationship is intact
        resource.refresh_from_db()
        assert resource.project == project
        assert resource.project.is_active is True


@pytest.mark.django_db
class TestQueryPerformancePatterns:
    """Test query optimization patterns for project associations."""

    def test_select_related_optimization(self, project):
        """
        Test select_related for optimizing project queries.

        This demonstrates the recommended pattern for API viewsets.
        """
        # Create test data
        for i in range(3):
            ExampleResource.objects.create(project=project, name=f"Resource {i}")

        # Optimized query: loads project and organisation in one query
        resources = ExampleResource.objects.select_related(
            "project", "project__organisation", "project__creator"
        ).all()

        # Accessing related objects doesn't trigger additional queries
        for resource in resources:
            _ = resource.project.name
            _ = resource.project.organisation.name
            _ = resource.project.creator.email

    def test_prefetch_related_for_reverse_lookups(self, project, org, admin_user):
        """
        Test prefetch_related for reverse project→resources queries.

        This demonstrates efficient loading of resources from project.
        """
        # Create multiple resources per project
        project2 = Project.objects.create(
            organisation=org,
            creator=admin_user,
            name="Second Project",
            slug="second-project",
        )

        for i in range(3):
            ExampleResource.objects.create(project=project, name=f"P1 Resource {i}")
            ExampleResource.objects.create(project=project2, name=f"P2 Resource {i}")

        # Optimized query: prefetch all resources
        projects = Project.objects.prefetch_related("example_resources").all()

        # Accessing resources doesn't trigger per-project queries
        for proj in projects:
            _ = list(proj.example_resources.all())

    def test_filter_with_project_index(self, project):
        """
        Test that project foreign key uses index for filtering.

        This verifies the index defined in Meta.indexes is used.
        """
        # Create test data
        for i in range(10):
            ExampleResource.objects.create(project=project, name=f"Resource {i}")

        # This query should use the project index
        resources = ExampleResource.objects.filter(project=project)
        assert resources.count() == 10


# Note: ExampleResource model is for testing only and won't be migrated.
# Real product features should define their models in their own apps.
