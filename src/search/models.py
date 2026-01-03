import uuid

from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField
from django.db import models


class SearchEntry(models.Model):
    """
    Unified search entry table for global search.
    Stores denormalized data and a pre-computed search vector.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Source Object Link
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.CharField(max_length=255)
    content_object = GenericForeignKey("content_type", "object_id")

    # Search Data
    search_vector = SearchVectorField()
    body_text = models.TextField(help_text="Full text content for highlighting")

    # Denormalized Display Data
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    image_url = models.URLField(blank=True, null=True)
    url = models.CharField(max_length=500, help_text="Relative URL to the resource")

    # Metadata
    language = models.CharField(
        max_length=50, default="english", help_text="Language used for stemming"
    )
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Search entries"
        indexes = [
            GinIndex(fields=["search_vector"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["content_type", "object_id"], name="unique_search_entry"
            )
        ]

    def __str__(self):
        return f"{self.title} ({self.content_type})"
