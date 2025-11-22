"""Test app models."""

from django.db import models


class TestModel(models.Model):
    """A test model."""
    name = models.CharField(max_length=100)
    
    class Meta:
        app_label = "testapp"
