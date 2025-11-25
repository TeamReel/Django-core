"""Custom managers for the Project model."""
from django.db import models


class ActiveProjectManager(models.Manager):
    """Manager that returns only active (non-archived) projects."""

    def get_queryset(self):
        """Return queryset filtered to active projects only."""
        return super().get_queryset().filter(is_active=True)


class AllProjectManager(models.Manager):
    """Manager that returns all projects including archived ones."""

    def get_queryset(self):
        """Return unfiltered queryset with all projects."""
        return super().get_queryset()
