"""Other app models."""

from django.db import models


class OtherModel(models.Model):
    """Another test model."""
    title = models.CharField(max_length=200)
    
    class Meta:
        app_label = "otherapp"
