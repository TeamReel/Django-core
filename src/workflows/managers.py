"""Custom model managers for workflows app."""
from django.db import models


class ActiveWorkflowManager(models.Manager):
    """Manager that filters for active (non-deleted) workflows."""

    def get_queryset(self):
        """Return only active workflows."""
        return super().get_queryset().filter(is_active=True)


class AllWorkflowManager(models.Manager):
    """Manager that returns all workflows including inactive."""

    def get_queryset(self):
        """Return all workflows."""
        return super().get_queryset()
