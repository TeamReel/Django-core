"""Custom model managers and QuerySets for transactions app."""

from decimal import Decimal

from django.db import models
from django.db.models import Count, Q, Sum


class UsageEventQuerySet(models.QuerySet):
    """Custom QuerySet for UsageEvent model."""

    def for_organization(self, organization_id):
        """Filter events for a specific organization."""
        return self.filter(organization_id=organization_id)

    def for_project(self, project_id):
        """Filter events for a specific project."""
        return self.filter(project_id=project_id)

    def unbilled(self):
        """Return events not linked to any transaction."""
        return self.filter(transactions__isnull=True)

    def by_event_type(self, event_type):
        """Filter events by event type."""
        return self.filter(event_type=event_type)


class UsageEventManager(models.Manager):
    """Custom manager for UsageEvent model."""

    def get_queryset(self):
        """Return custom QuerySet."""
        return UsageEventQuerySet(self.model, using=self._db)

    def for_organization(self, organization_id):
        """Filter events for a specific organization."""
        return self.get_queryset().for_organization(organization_id)

    def for_project(self, project_id):
        """Filter events for a specific project."""
        return self.get_queryset().for_project(project_id)

    def unbilled(self):
        """Return events not linked to any transaction."""
        return self.get_queryset().unbilled()


class TransactionQuerySet(models.QuerySet):
    """Custom QuerySet for Transaction model."""

    def for_organization(self, organization_id):
        """Filter transactions for a specific organization."""
        return self.filter(organization_id=organization_id)

    def for_project(self, project_id):
        """Filter transactions for a specific project."""
        return self.filter(project_id=project_id)

    def compute_balance(self):
        """Compute current balance for filtered transactions.

        Returns:
            dict: Dictionary with balance statistics including:
                - current_balance: Total sum of all amounts
                - total_positive_amounts: Sum of positive amounts
                - total_negative_amounts: Sum of negative amounts
                - transaction_count: Number of transactions
        """
        result = self.aggregate(
            balance=Sum("amount"),
            positive_sum=Sum("amount", filter=Q(amount__gt=0)),
            negative_sum=Sum("amount", filter=Q(amount__lt=0)),
            count=Count("id"),
        )
        return {
            "current_balance": result["balance"] or Decimal("0"),
            "total_positive_amounts": result["positive_sum"] or Decimal("0"),
            "total_negative_amounts": result["negative_sum"] or Decimal("0"),
            "transaction_count": result["count"],
        }


class TransactionManager(models.Manager):
    """Custom manager for Transaction model."""

    def get_queryset(self):
        """Return custom QuerySet."""
        return TransactionQuerySet(self.model, using=self._db)

    def for_organization(self, organization_id):
        """Filter transactions for a specific organization."""
        return self.get_queryset().for_organization(organization_id)

    def for_project(self, project_id):
        """Filter transactions for a specific project."""
        return self.get_queryset().for_project(project_id)
