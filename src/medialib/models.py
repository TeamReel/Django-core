"""
B35 Smart Asset Library - Core Models
--------------------------------------
MediaItem: Core media asset with processing state
MediaTag: Hybrid scope tagging (system/project)
Collection: Grouped media with ordering
MediaItemRelation: Generic linking
"""
import uuid

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField
from django.db import models
from django.utils.text import slugify


class MediaItemState(models.TextChoices):
    RAW = "raw", "Raw Upload"
    PROCESSING = "processing", "Processing"
    PROCESSED = "processed", "Processed"
    ERROR = "error", "Error"
    ARCHIVED = "archived", "Archived"


class MediaItem(models.Model):
    """Core media asset model with B22 File Storage integration"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="media_items"
    )
    file = models.ForeignKey("files.FileAsset", on_delete=models.CASCADE)

    # Metadata
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    mime_type = models.CharField(max_length=127)
    file_size_bytes = models.BigIntegerField()

    # Media-specific (populated by extraction)
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    duration_seconds = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    # Processing
    state = models.CharField(
        max_length=20, choices=MediaItemState.choices, default=MediaItemState.RAW
    )
    extraction_metadata = models.JSONField(default=dict, blank=True)

    # Search
    search_vector = SearchVectorField(null=True)

    # Ownership
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    # Optional context (explicit FKs for performance)
    activity = models.ForeignKey(
        "activities.Activity", on_delete=models.SET_NULL, null=True, blank=True
    )
    generation_request = models.ForeignKey(
        "generative.GenerationRequest", on_delete=models.SET_NULL, null=True, blank=True
    )

    # Tags
    tags = models.ManyToManyField("MediaTag", related_name="items", blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["project", "-created_at"]),
            models.Index(fields=["state"]),
            GinIndex(fields=["search_vector"]),
        ]
        db_table = "medialib_items"

    def __str__(self):
        return f"{self.title} ({self.mime_type})"


class MediaTag(models.Model):
    """Hybrid scope tag: system global or project-scoped"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100)
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="media_tags",
    )
    is_system = models.BooleanField(default=False)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("project", "slug")]
        ordering = ["name"]
        db_table = "medialib_tags"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        scope = "system" if self.is_system else f"project-{self.project_id}"
        return f"{self.name} ({scope})"


class Collection(models.Model):
    """Grouped media assets with ordering"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="media_collections"
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    items = models.ManyToManyField(
        MediaItem, through="CollectionMembership", related_name="collections"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        db_table = "medialib_collections"

    def __str__(self):
        return f"{self.name} ({self.items.count()} items)"


class CollectionMembership(models.Model):
    """Through table for Collection ↔ MediaItem with position"""

    collection = models.ForeignKey(Collection, on_delete=models.CASCADE)
    media_item = models.ForeignKey(MediaItem, on_delete=models.CASCADE)
    position = models.PositiveIntegerField(default=0)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("collection", "media_item")]
        ordering = ["position", "added_at"]
        db_table = "medialib_collection_membership"

    def __str__(self):
        return f"{self.collection.name} → {self.media_item.title} (pos {self.position})"


class MediaItemRelation(models.Model):
    """Generic relation linking media items to any model."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    media_item = models.ForeignKey(MediaItem, on_delete=models.CASCADE, related_name="relations")

    # Generic FK target
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField()
    target = GenericForeignKey("content_type", "object_id")

    # Relation metadata
    relation_type = models.CharField(max_length=50, default="related")
    metadata = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("media_item", "content_type", "object_id")]
        indexes = [
            models.Index(fields=["content_type", "object_id"]),
        ]
        db_table = "medialib_relations"

    def __str__(self):
        return f"{self.media_item_id} -> {self.content_type}:{self.object_id}"


class MediaThumbnail(models.Model):
    """
    Generated thumbnail for a MediaItem.
    Stored as a separate FileAsset for unified management.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    media_item = models.ForeignKey(MediaItem, on_delete=models.CASCADE, related_name="thumbnails")
    file = models.ForeignKey("files.FileAsset", on_delete=models.CASCADE)

    size_label = models.CharField(max_length=20)  # small, medium, large
    width = models.PositiveIntegerField()
    height = models.PositiveIntegerField()

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("media_item", "size_label")]
        ordering = ["width"]
        db_table = "medialib_thumbnails"

    def __str__(self):
        return f"{self.media_item.title} ({self.size_label})"
