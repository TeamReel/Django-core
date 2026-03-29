"""
Custom QuerySet managers for Activities module.
Implements PostgreSQL recursive CTE for period hierarchy navigation.
Integrates with SoftDeleteMixin for soft-delete support.
"""

import uuid

from django.db import connection, models

from src.common.managers import SoftDeleteQuerySet


class PeriodQuerySet(SoftDeleteQuerySet):
    """
    Custom QuerySet for Period model with tree navigation methods.
    Uses PostgreSQL recursive CTE for efficient descendant queries.
    Inherits from SoftDeleteQuerySet for soft-delete support.
    """

    def get_descendants(self, period_id: uuid.UUID):
        """
        Return all descendants of a period using recursive CTE.

        Args:
            period_id: UUID of the parent period

        Returns:
            QuerySet of all descendant periods

        Example usage:
            season = Period.objects.get(name="Seizoen 2023/2024")
            descendants = Period.objects.get_descendants(season.id)
        """
        # PostgreSQL recursive CTE query
        query = """
            WITH RECURSIVE period_tree AS (
                -- Base case: direct children
                SELECT id, parent_period_id, name, start_date, end_date, organisation_id, project_id
                FROM activities_period
                WHERE parent_period_id = %s

                UNION ALL

                -- Recursive case: children of children
                SELECT p.id, p.parent_period_id, p.name,
                    p.start_date, p.end_date,
                    p.organisation_id, p.project_id
                FROM activities_period p
                INNER JOIN period_tree pt ON p.parent_period_id = pt.id
            )
            SELECT id FROM period_tree
        """

        # Execute raw query and return queryset
        with connection.cursor() as cursor:
            cursor.execute(query, [str(period_id)])  # Convert UUID to string for SQLite
            descendant_ids = [row[0] for row in cursor.fetchall()]

        return self.filter(id__in=descendant_ids)

    def get_ancestors(self, period):
        """
        Return all ancestors of a period (iterative climb).

        Args:
            period: Period instance

        Returns:
            List of ancestor Period instances (immediate parent to root)

        Example usage:
            november = Period.objects.get(name="November 2023")
            ancestors = Period.objects.get_ancestors(november)
            # Returns [fall_2023, season_2023]
        """
        ancestors = []
        current = period

        while current.parent_period:
            current = current.parent_period
            ancestors.append(current)

        return ancestors

    def roots(self):
        """Return all root periods (parent_period is NULL)"""
        return self.filter(parent_period__isnull=True)

    def children_of(self, period):
        """Return direct children of a period"""
        return self.filter(parent_period=period)


class PeriodSoftDeleteManager(models.Manager):
    """
    Manager for Period model that excludes soft-deleted records by default.
    Provides CTE methods via PeriodQuerySet while filtering out deleted items.

    Usage:
        Period.objects.all()          # Only active (non-deleted) periods
        Period.objects.deleted_only() # Only soft-deleted periods
        Period.objects.with_deleted() # All periods including deleted
        Period.objects.roots()        # Root periods (no parent)
        Period.objects.get_descendants(id)  # CTE-based descendants
    """

    def get_queryset(self):
        return PeriodQuerySet(self.model, using=self._db).filter(deleted_at__isnull=True)

    def deleted_only(self):
        """Return only soft-deleted periods."""
        return PeriodQuerySet(self.model, using=self._db).filter(deleted_at__isnull=False)

    def with_deleted(self):
        """Return all periods including soft-deleted."""
        return PeriodQuerySet(self.model, using=self._db)

    # Delegate CTE methods to queryset
    def get_descendants(self, period_id):
        """Return all descendants of a period using recursive CTE."""
        return self.get_queryset().get_descendants(period_id)

    def get_ancestors(self, period):
        """Return all ancestors of a period (iterative climb)."""
        return self.get_queryset().get_ancestors(period)

    def roots(self):
        """Return all root periods (parent_period is NULL)."""
        return self.get_queryset().roots()

    def children_of(self, period):
        """Return direct children of a period."""
        return self.get_queryset().children_of(period)
