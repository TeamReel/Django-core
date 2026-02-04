"""
Unit tests for navigation services.

Tests cover:
- Pruning logic (FIFO, max count)
- Log visit (create, update, timestamp bump)
- Hybrid cap enforcement
"""

import time

import pytest
from django.core.exceptions import ValidationError
from django.contrib.contenttypes.models import ContentType

from navigation.models import UserRecent
from navigation.services import prune_recents, log_visit
from projects.models import Project


@pytest.mark.django_db
class TestPruneRecents:
    """Test the prune_recents service function."""

    def test_prune_when_under_limit(self, user_factory, project_factory):
        """No pruning when count is under limit."""
        user = user_factory()

        # Create only 10 items (well under 50 limit)
        for i in range(10):
            project = project_factory()
            UserRecent.objects.create(
                user=user,
                content_type=ContentType.objects.get_for_model(Project),
                object_id=str(project.id),
                label=f"Item {i}",
                path=f"/items/{i}",
            )

        deleted = prune_recents(user)
        assert deleted == 0
        assert UserRecent.objects.filter(user=user).count() == 10

    def test_prune_when_over_limit(self, user_factory, project_factory):
        """Prune oldest items when over limit."""
        user = user_factory()

        # Create 55 items (over 50 limit)
        for i in range(55):
            project = project_factory()
            UserRecent.objects.create(
                user=user,
                content_type=ContentType.objects.get_for_model(Project),
                object_id=str(project.id),
                label=f"Item {i}",
                path=f"/items/{i}",
            )

        deleted = prune_recents(user)
        assert deleted == 5
        assert UserRecent.objects.filter(user=user).count() == 50

    def test_prune_keeps_most_recent(self, user_factory, project_factory):
        """Verify pruning keeps the most recent items."""
        user = user_factory()

        # Create items with predictable order
        old_items = []
        for i in range(10):
            project = project_factory()
            item = UserRecent.objects.create(
                user=user,
                content_type=ContentType.objects.get_for_model(Project),
                object_id=str(project.id),
                label=f"Old Item {i}",
                path=f"/old/{i}",
            )
            old_items.append(item)

        new_items = []
        for i in range(45):
            project = project_factory()
            item = UserRecent.objects.create(
                user=user,
                content_type=ContentType.objects.get_for_model(Project),
                object_id=str(project.id),
                label=f"New Item {i}",
                path=f"/new/{i}",
            )
            new_items.append(item)

        # Total: 55 items, should prune 5 oldest
        deleted = prune_recents(user)
        assert deleted == 5

        # Verify old items were deleted
        remaining_ids = set(UserRecent.objects.filter(user=user).values_list("id", flat=True))
        for old_item in old_items[:5]:
            assert old_item.id not in remaining_ids

        # Verify newer items still exist
        for new_item in new_items:
            assert new_item.id in remaining_ids


@pytest.mark.django_db
class TestLogVisit:
    """Test the log_visit service function."""

    def test_create_new_visit(self, user_factory, project_factory):
        """Create a new visit when none exists."""
        user = user_factory()
        project = project_factory()

        recent = log_visit(
            user=user,
            path=f"/projects/{project.id}",
            label=project.name,
            content_object=project,
            context={"org_id": str(project.organisation.id)},
        )

        assert recent.id is not None
        assert recent.user == user
        assert recent.content_object == project
        assert recent.label == project.name
        assert recent.context["org_id"] == str(project.organisation.id)

    def test_update_existing_visit(self, user_factory, project_factory):
        """Update timestamp when visiting existing item."""
        user = user_factory()
        project = project_factory()

        # First visit
        recent1 = log_visit(
            user=user,
            path=f"/projects/{project.id}",
            label=project.name,
            content_object=project,
        )
        first_timestamp = recent1.last_seen_at

        # Second visit (should update, not create)
        recent2 = log_visit(
            user=user,
            path=f"/projects/{project.id}",
            label=project.name,
            content_object=project,
        )

        assert recent1.id == recent2.id  # Same object
        assert recent2.last_seen_at >= first_timestamp
        assert UserRecent.objects.filter(user=user).count() == 1

    def test_timestamp_bump_on_revisit(self, user_factory, project_factory):
        """Verify revisiting bumps item to top of recents."""
        user = user_factory()
        project1 = project_factory()
        project2 = project_factory()

        # Visit item A
        recent_a = log_visit(
            user=user,
            path=f"/projects/{project1.id}",
            label=project1.name,
            content_object=project1,
        )
        time.sleep(0.01)  # Ensure timestamp difference

        # Visit item B
        recent_b = log_visit(
            user=user,
            path=f"/projects/{project2.id}",
            label=project2.name,
            content_object=project2,
        )
        time.sleep(0.01)  # Ensure timestamp difference

        # Visit item A again (should bump to top)
        recent_a_updated = log_visit(
            user=user,
            path=f"/projects/{project1.id}",
            label=project1.name,
            content_object=project1,
        )

        # Verify order: A (most recent), B (older)
        recents = list(UserRecent.objects.filter(user=user).order_by("-last_seen_at"))
        assert recents[0].id == recent_a_updated.id
        assert recents[1].id == recent_b.id
        assert recent_a_updated.last_seen_at > recent_b.last_seen_at

    def test_hybrid_cap_enforcement(self, user_factory, project_factory):
        """Verify automatic pruning maintains max count."""
        user = user_factory()

        # Create 50 items (at limit) with timestamps spread out
        for i in range(50):
            log_visit(
                user=user,
                path=f"/items/{i}",
                label=f"Item {i}",
            )
            if i % 10 == 0:
                time.sleep(0.01)  # Ensure timestamp ordering

        count_before = UserRecent.objects.filter(user=user).count()
        assert count_before == 50

        # Visit item #51 (should trigger pruning)
        time.sleep(0.01)
        log_visit(
            user=user,
            path="/items/51",
            label="Item 51",
        )

        # Should still be at 50 (oldest deleted)
        count_after = UserRecent.objects.filter(user=user).count()
        assert count_after == 50, f"Expected 50 items, got {count_after}"

        # Verify oldest item (#0) is gone
        assert not UserRecent.objects.filter(
            user=user, path="/items/0"
        ).exists(), "Item #0 should have been pruned but still exists"

        # Verify newest item (#51) exists
        assert UserRecent.objects.filter(
            user=user, path="/items/51"
        ).exists(), "Item #51 should exist after creation"

    def test_path_validation_rejects_absolute_url(self, user_factory):
        """Reject absolute URLs for security."""
        user = user_factory()

        with pytest.raises(ValidationError) as exc_info:
            log_visit(
                user=user,
                path="https://evil.com/phishing",
                label="Evil Site",
            )

        assert "path" in str(exc_info.value).lower() or "absolute" in str(exc_info.value).lower()

    def test_path_validation_accepts_relative_path(self, user_factory):
        """Accept valid relative paths."""
        user = user_factory()

        # Should not raise
        recent = log_visit(
            user=user,
            path="/valid/relative/path",
            label="Valid Path",
        )

        assert recent.id is not None
        assert recent.path == "/valid/relative/path"

    def test_path_based_fallback_without_object(self, user_factory):
        """Support path-only visits without content_object."""
        user = user_factory()

        recent = log_visit(
            user=user,
            path="/custom/path",
            label="Custom Page",
        )

        assert recent.content_type is None
        assert recent.object_id is None
        assert recent.path == "/custom/path"

    def test_different_users_independent_limits(self, user_factory, project_factory):
        """Each user has independent item limits."""
        user1 = user_factory()
        user2 = user_factory()
        project = project_factory()

        # User 1: Create 50 items
        for i in range(50):
            log_visit(
                user=user1,
                path=f"/user1-items/{i}",
                label=f"User1 Item {i}",
            )

        # User 2: Create 30 items
        for i in range(30):
            log_visit(
                user=user2,
                path=f"/user2-items/{i}",
                label=f"User2 Item {i}",
            )

        # Verify counts are independent
        assert UserRecent.objects.filter(user=user1).count() == 50
        assert UserRecent.objects.filter(user=user2).count() == 30
