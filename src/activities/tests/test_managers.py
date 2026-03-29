"""
Test cases for PeriodQuerySet manager methods.
Target coverage: ≥85% for managers.py
"""

from datetime import date

import pytest
from activities.models import Period
from django.db import connection

# Skip CTE tests if not using PostgreSQL
pytestmark = pytest.mark.skipif(
    connection.vendor != "postgresql",
    reason="CTE tests require PostgreSQL (test database uses SQLite)",
)


@pytest.mark.django_db
class TestPeriodQuerySet:
    """Test PeriodQuerySet custom methods using PostgreSQL CTEs."""

    def test_get_descendants_single_level(self, organisation):
        """get_descendants() returns all direct children."""
        parent = Period.objects.create(
            name="Parent",
            start_date=date(2023, 1, 1),
            end_date=date(2023, 12, 31),
            organisation=organisation,
        )
        child1 = Period.objects.create(
            name="Child 1",
            start_date=date(2023, 1, 1),
            end_date=date(2023, 6, 30),
            parent_period=parent,
            organisation=organisation,
        )
        child2 = Period.objects.create(
            name="Child 2",
            start_date=date(2023, 7, 1),
            end_date=date(2023, 12, 31),
            parent_period=parent,
            organisation=organisation,
        )

        descendants = Period.objects.get_descendants(parent.id)
        assert descendants.count() == 2
        assert child1 in descendants
        assert child2 in descendants

    def test_get_descendants_multi_level(self, organisation):
        """get_descendants() recursively returns all descendants."""
        root = Period.objects.create(
            name="Root",
            start_date=date(2023, 1, 1),
            end_date=date(2023, 12, 31),
            organisation=organisation,
        )
        level1 = Period.objects.create(
            name="Level 1",
            start_date=date(2023, 1, 1),
            end_date=date(2023, 6, 30),
            parent_period=root,
            organisation=organisation,
        )
        level2 = Period.objects.create(
            name="Level 2",
            start_date=date(2023, 1, 1),
            end_date=date(2023, 3, 31),
            parent_period=level1,
            organisation=organisation,
        )

        descendants = Period.objects.get_descendants(root.id)
        assert descendants.count() == 2
        assert level1 in descendants
        assert level2 in descendants

    def test_get_ancestors_single_level(self, organisation):
        """get_ancestors() returns direct parent."""
        parent = Period.objects.create(
            name="Parent",
            start_date=date(2023, 1, 1),
            end_date=date(2023, 12, 31),
            organisation=organisation,
        )
        child = Period.objects.create(
            name="Child",
            start_date=date(2023, 1, 1),
            end_date=date(2023, 6, 30),
            parent_period=parent,
            organisation=organisation,
        )

        ancestors = Period.objects.get_ancestors(child)
        assert len(ancestors) == 1
        assert parent in ancestors

    def test_get_ancestors_multi_level(self, organisation):
        """get_ancestors() iteratively returns all ancestors."""
        root = Period.objects.create(
            name="Root",
            start_date=date(2023, 1, 1),
            end_date=date(2023, 12, 31),
            organisation=organisation,
        )
        level1 = Period.objects.create(
            name="Level 1",
            start_date=date(2023, 1, 1),
            end_date=date(2023, 6, 30),
            parent_period=root,
            organisation=organisation,
        )
        level2 = Period.objects.create(
            name="Level 2",
            start_date=date(2023, 1, 1),
            end_date=date(2023, 3, 31),
            parent_period=level1,
            organisation=organisation,
        )

        ancestors = Period.objects.get_ancestors(level2)
        assert len(ancestors) == 2
        assert root in ancestors
        assert level1 in ancestors
