"""
Custom model managers and querysets for organisations.

Provides:
- OrganisationQuerySet: Custom filtering methods
- OrganisationManager: Manager with queryset methods
"""

from datetime import timedelta

from django.db import models
from django.utils import timezone


class OrganisationQuerySet(models.QuerySet):
    """Custom queryset for Organisation model."""

    def active(self):
        """Return only active (non-deleted) organisations."""
        return self.filter(is_active=True)

    def deleted(self):
        """Return only soft-deleted organisations."""
        return self.filter(is_active=False)

    def pending_cleanup(self, days=30):
        """Return deleted orgs past retention period."""
        threshold = timezone.now() - timedelta(days=days)
        return self.deleted().filter(deleted_at__lt=threshold)


class OrganisationManager(models.Manager):
    """Custom manager for Organisation model."""

    def get_queryset(self):
        return OrganisationQuerySet(self.model, using=self._db)

    def active(self):
        return self.get_queryset().active()

    def deleted(self):
        return self.get_queryset().deleted()

    def pending_cleanup(self, days=30):
        return self.get_queryset().pending_cleanup(days)
