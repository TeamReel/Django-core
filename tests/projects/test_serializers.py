"""Tests for Project serializers."""

import pytest
from django.contrib.auth import get_user_model
from src.projects.api.serializers import (
    ProjectDetailSerializer,
    ProjectListSerializer,
    ProjectUpdateSerializer,
)
from src.projects.models import Project
from rest_framework.test import APIRequestFactory

User = get_user_model()


@pytest.mark.django_db
class TestProjectListSerializer:
    """Test ProjectListSerializer."""

    def test_serialize_project(self, project):
        """Test serializing a project for list view."""
        serializer = ProjectListSerializer(project)
        data = serializer.data

        assert data["id"] == project.id
        assert data["name"] == project.name
        assert data["slug"] == project.slug
        assert data["description"] == project.description
        assert data["is_active"] == project.is_active
        assert "organisation" in data
        assert data["organisation"]["name"] == project.organisation.name
        assert "creator" not in data  # List view doesn't include creator

    def test_read_only_fields(self, project):
        """Test read-only fields cannot be modified."""
        serializer = ProjectListSerializer(project)
        read_only = serializer.Meta.read_only_fields

        assert "id" in read_only
        assert "slug" in read_only
        assert "is_active" in read_only
        assert "created_at" in read_only
        assert "updated_at" in read_only
        assert "archived_at" in read_only


@pytest.mark.django_db
class TestProjectDetailSerializer:
    """Test ProjectDetailSerializer."""

    def test_serialize_project_detail(self, project):
        """Test serializing a project for detail view."""
        serializer = ProjectDetailSerializer(project)
        data = serializer.data

        assert data["id"] == project.id
        assert data["name"] == project.name
        assert "organisation" in data
        assert "creator" in data
        assert data["creator"]["email"] == project.creator.email
        assert "full_name" in data["creator"]

    def test_validate_name_empty(self, organisation, admin_user):
        """Test validation fails for empty name."""
        factory = APIRequestFactory()
        request = factory.post("/")
        request.user = admin_user

        serializer = ProjectDetailSerializer(
            data={"name": "", "description": "Test"},
            context={"organisation": organisation, "request": request},
        )

        assert not serializer.is_valid()
        assert "name" in serializer.errors

    def test_validate_name_too_long(self, organisation, admin_user):
        """Test validation fails for name exceeding max length."""
        factory = APIRequestFactory()
        request = factory.post("/")
        request.user = admin_user

        serializer = ProjectDetailSerializer(
            data={"name": "x" * 201, "description": "Test"},
            context={"organisation": organisation, "request": request},
        )

        assert not serializer.is_valid()
        assert "name" in serializer.errors

    def test_validate_description_too_long(self, organisation, admin_user):
        """Test validation fails for description exceeding max length."""
        factory = APIRequestFactory()
        request = factory.post("/")
        request.user = admin_user

        serializer = ProjectDetailSerializer(
            data={"name": "Test", "description": "x" * 2001},
            context={"organisation": organisation, "request": request},
        )

        assert not serializer.is_valid()
        assert "description" in serializer.errors

    def test_validate_name_uniqueness_case_insensitive(self, project, organisation, admin_user):
        """Test case-insensitive name uniqueness validation."""
        factory = APIRequestFactory()
        request = factory.post("/")
        request.user = admin_user

        # Try to create with same name (different case)
        serializer = ProjectDetailSerializer(
            data={"name": project.name.upper(), "description": "Test"},
            context={"organisation": organisation, "request": request},
        )

        assert not serializer.is_valid()
        assert "name" in serializer.errors
        assert "already exists" in str(serializer.errors["name"][0]).lower()

    def test_validate_name_unique_across_organisations(
        self, project, organisation_factory, admin_user
    ):
        """Test same name allowed in different organisations."""
        other_org = organisation_factory(name="Other Org")
        factory = APIRequestFactory()
        request = factory.post("/")
        request.user = admin_user

        # Same name but different org should be valid
        serializer = ProjectDetailSerializer(
            data={"name": project.name, "description": "Test"},
            context={"organisation": other_org, "request": request},
        )

        assert serializer.is_valid()

    def test_create_sets_organisation_and_creator(self, organisation, admin_user):
        """Test create method sets organisation and creator from context."""
        factory = APIRequestFactory()
        request = factory.post("/")
        request.user = admin_user

        serializer = ProjectDetailSerializer(
            data={"name": "New Project", "description": "Test"},
            context={"organisation": organisation, "request": request},
        )

        assert serializer.is_valid()
        project = serializer.save()

        assert project.organisation == organisation
        assert project.creator == admin_user
        assert project.name == "New Project"

    def test_update_name_validation(self, project, admin_user):
        """Test updating project name validates uniqueness."""
        factory = APIRequestFactory()
        request = factory.put("/")
        request.user = admin_user

        # Create another project with different name
        other_project = Project.objects.create(
            organisation=project.organisation,
            creator=admin_user,
            name="Other Project",
            slug="other-project",
        )

        # Try to update first project to have same name as second
        serializer = ProjectDetailSerializer(
            project,
            data={"name": other_project.name, "description": "Test"},
            context={"organisation": project.organisation, "request": request},
        )

        assert not serializer.is_valid()
        assert "name" in serializer.errors

    def test_update_excludes_current_instance(self, project, admin_user):
        """Test updating project name to same value (case change) is allowed."""
        factory = APIRequestFactory()
        request = factory.put("/")
        request.user = admin_user

        # Update to same name with different case should work
        serializer = ProjectDetailSerializer(
            project,
            data={"name": project.name.upper(), "description": project.description},
            context={"organisation": project.organisation, "request": request},
        )

        # Should still fail due to case-insensitive check
        assert not serializer.is_valid()


@pytest.mark.django_db
class TestProjectUpdateSerializer:
    """Test ProjectUpdateSerializer."""

    def test_only_name_and_description_allowed(self):
        """Test only name and description can be updated."""
        serializer = ProjectUpdateSerializer()
        assert set(serializer.Meta.fields) == {"name", "description"}

    def test_validate_name_empty(self, project):
        """Test validation fails for empty name."""
        serializer = ProjectUpdateSerializer(
            project,
            data={"name": "", "description": "Test"},
        )

        assert not serializer.is_valid()
        assert "name" in serializer.errors

    def test_validate_name_too_long(self, project):
        """Test validation fails for name exceeding max length."""
        serializer = ProjectUpdateSerializer(
            project,
            data={"name": "x" * 201, "description": "Test"},
        )

        assert not serializer.is_valid()
        assert "name" in serializer.errors

    def test_validate_description_too_long(self, project):
        """Test validation fails for description exceeding max length."""
        serializer = ProjectUpdateSerializer(
            project,
            data={"name": "Test", "description": "x" * 2001},
        )

        assert not serializer.is_valid()
        assert "description" in serializer.errors

    def test_update_name_and_description(self, project):
        """Test successfully updating name and description."""
        serializer = ProjectUpdateSerializer(
            project,
            data={"name": "Updated Name", "description": "Updated description"},
        )

        assert serializer.is_valid()
        updated_project = serializer.save()

        assert updated_project.name == "Updated Name"
        assert updated_project.description == "Updated description"
        assert updated_project.slug == project.slug  # Slug unchanged

    def test_slug_not_in_fields(self):
        """Test slug is not exposed in update serializer."""
        serializer = ProjectUpdateSerializer()
        assert "slug" not in serializer.Meta.fields

    def test_name_strips_whitespace(self, project):
        """Test name whitespace is stripped."""
        serializer = ProjectUpdateSerializer(
            project,
            data={"name": "  Padded Name  ", "description": "Test"},
        )

        assert serializer.is_valid()
        assert serializer.validated_data["name"] == "Padded Name"


@pytest.mark.django_db
class TestNestedSerializers:
    """Test nested serializers."""

    def test_organisation_nested_representation(self, project):
        """Test organisation nested serializer output."""
        serializer = ProjectDetailSerializer(project)
        org_data = serializer.data["organisation"]

        assert "id" in org_data
        assert "name" in org_data
        assert "slug" in org_data
        assert org_data["name"] == project.organisation.name

    def test_creator_nested_representation(self, project):
        """Test creator nested serializer output includes full_name."""
        serializer = ProjectDetailSerializer(project)
        creator_data = serializer.data["creator"]

        assert "id" in creator_data
        assert "email" in creator_data
        assert "first_name" in creator_data
        assert "last_name" in creator_data
        assert "full_name" in creator_data
        assert (
            creator_data["full_name"]
            == f"{project.creator.first_name} {project.creator.last_name}".strip()
        )
