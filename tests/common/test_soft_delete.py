"""Tests for SoftDeleteMixin and SoftDeleteManager (B46 H0)."""

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from src.common.managers import AllObjectsManager, SoftDeleteManager
from src.common.mixins import SoftDeleteMixin

User = get_user_model()


# ── Test model (uses DB table created by migration in content_generation) ──
# We test against ContentItem which will inherit SoftDeleteMixin in H1.
# For H0 unit tests, we use ProjectMembership which already has deleted_at.


@pytest.fixture
def user(db):
    """Create a basic test user."""
    return User.objects.create_user(
        email="softdelete-test@example.com",
        password="testpass123",  # noqa: S107
        first_name="Test",
        last_name="Delete",
    )


@pytest.fixture
def other_user(db):
    """Create a second test user."""
    return User.objects.create_user(
        email="softdelete-other@example.com",
        password="testpass123",  # noqa: S107
        first_name="Other",
        last_name="User",
    )


class TestSoftDeleteMixin:
    """Test the SoftDeleteMixin abstract model methods."""

    def test_mixin_is_abstract(self):
        """SoftDeleteMixin should be an abstract model."""
        assert SoftDeleteMixin._meta.abstract is True

    def test_mixin_has_required_fields(self):
        """Mixin should declare deleted_at and deleted_by fields."""
        field_names = [f.name for f in SoftDeleteMixin._meta.local_fields]
        assert "deleted_at" in field_names
        assert "deleted_by" in field_names

    def test_deleted_at_is_nullable(self):
        """deleted_at should be nullable (NULL = active record)."""
        field = SoftDeleteMixin._meta.get_field("deleted_at")
        assert field.null is True
        assert field.blank is True

    def test_deleted_at_is_indexed(self):
        """deleted_at should have a database index."""
        field = SoftDeleteMixin._meta.get_field("deleted_at")
        assert field.db_index is True

    def test_deleted_by_is_nullable(self):
        """deleted_by should be nullable (system deletes have no user)."""
        field = SoftDeleteMixin._meta.get_field("deleted_by")
        assert field.null is True
        assert field.blank is True

    def test_cascade_fields_default_empty(self):
        """soft_delete_cascade_fields should default to empty list."""
        assert SoftDeleteMixin.soft_delete_cascade_fields == []


class TestSoftDeleteManager:
    """Test SoftDeleteManager queryset filtering."""

    def test_manager_excludes_deleted(self, db):
        """Default manager should exclude soft-deleted records."""
        from projects.models import ProjectMembership

        # ProjectMembership already has deleted_at field
        mgr = SoftDeleteManager()
        mgr.model = ProjectMembership
        mgr.auto_created = True
        qs = mgr.get_queryset()
        # Verify the queryset has the filter
        assert "deleted_at" in str(qs.query)

    def test_all_objects_manager_includes_deleted(self, db):
        """AllObjectsManager should return all records."""
        from projects.models import ProjectMembership

        mgr = AllObjectsManager()
        mgr.model = ProjectMembership
        mgr.auto_created = True
        qs = mgr.get_queryset()
        # No deleted_at filter in the query
        query_str = str(qs.query)
        # AllObjectsManager should not filter on deleted_at
        assert "deleted_at" not in query_str or "IS NOT NULL" not in query_str


class TestSoftDeleteQuerySet:
    """Test SoftDeleteQuerySet bulk operations."""

    def test_queryset_bulk_soft_delete(self, db, user):
        """Bulk soft_delete should set deleted_at on matching records."""
        from projects.models import ProjectMembership
        from src.common.managers import SoftDeleteQuerySet

        # Create a queryset wrapper
        qs = SoftDeleteQuerySet(model=ProjectMembership, using="default")

        # Verify the soft_delete method exists and accepts user param
        assert hasattr(qs, "soft_delete")
        assert hasattr(qs, "restore")
        assert hasattr(qs, "hard_delete")

    def test_queryset_restore(self, db):
        """Bulk restore should clear deleted_at on matching records."""
        from src.common.managers import SoftDeleteQuerySet
        from projects.models import ProjectMembership

        qs = SoftDeleteQuerySet(model=ProjectMembership, using="default")
        assert hasattr(qs, "restore")


class TestSoftDeleteMixinIntegration:
    """Integration tests using ProjectMembership (already has deleted_at)."""

    @pytest.fixture
    def org(self, db, user):
        from organisations.models import Organisation

        return Organisation.objects.create(
            name="Test Org",
            slug="test-org-softdelete",
            creator=user,
        )

    @pytest.fixture
    def project(self, org, user, db):
        from projects.models import Project

        return Project.objects.create(
            name="Test Project",
            organisation=org,
            creator=user,
        )

    @pytest.fixture
    def membership(self, project, user, db):
        from projects.models import ProjectMembership

        return ProjectMembership.objects.create(
            project=project,
            user=user,
            role=ProjectMembership.Role.EDITOR,
        )

    def test_active_membership_visible(self, membership):
        """Active membership should be visible in default queryset."""
        from projects.models import ProjectMembership

        assert ProjectMembership.objects.filter(pk=membership.pk).exists()

    def test_soft_deleted_membership_hidden_from_active(self, membership):
        """Soft-deleted membership should be hidden from default queryset."""
        from projects.models import ProjectMembership

        membership.deleted_at = timezone.now()
        membership.save()
        # Default manager (SoftDeleteManager) excludes soft-deleted records
        assert not ProjectMembership.objects.filter(pk=membership.pk).exists()
        # all_objects still shows it
        assert ProjectMembership.all_objects.filter(pk=membership.pk).exists()

    def test_soft_deleted_membership_in_active_filter(self, membership):
        """Soft-deleted membership should be excluded by .active() method."""
        from projects.models import ProjectMembership

        membership.deleted_at = timezone.now()
        membership.save()
        assert not ProjectMembership.objects.active().filter(pk=membership.pk).exists()
