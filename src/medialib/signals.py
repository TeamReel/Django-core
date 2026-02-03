from django.db import connection
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.postgres.search import SearchVector

from src.generative.models import GenerationOutput
from files.models import FileAsset
from .models import MediaItem, MediaItemState, MediaTag


@receiver(post_save, sender=MediaItem)
def update_search_vector(sender, instance, **kwargs):
    """Update search vector when title/description changes."""
    # Skip if not PostgreSQL (e.g. SQLite tests)
    if connection.vendor != "postgresql":
        return

    # Avoid recursion
    if kwargs.get("update_fields") and "search_vector" in kwargs["update_fields"]:
        return

    MediaItem.objects.filter(pk=instance.pk).update(
        search_vector=(SearchVector("title", weight="A") + SearchVector("description", weight="B"))
    )


@receiver(post_save, sender=GenerationOutput)
def create_media_item_from_generation(sender, instance, created, **kwargs):
    """
    WP08: Auto-link generated content to Media Library.
    Triggered when GenerationOutput is created.
    """
    if not created or not instance.file_id:
        return

    request = instance.request

    # Requirement T034: Auto-set project, activity
    project = request.project
    if not project:
        # Without project, we cannot create MediaItem (it's required)
        return

    # Check for duplicates
    if MediaItem.objects.filter(generation_request=request).exists():
        return

    try:
        file_asset = FileAsset.objects.get(id=instance.file_id)
    except FileAsset.DoesNotExist:
        return

    # Create MediaItem
    media_item = MediaItem.objects.create(
        project=project,
        file=file_asset,
        title=f"Generated: {request.template.name}",
        description=f"Generated from template v{request.template_version}. Request ID: {request.id}",
        mime_type=file_asset.mime_type,
        file_size_bytes=file_asset.file_size or 0,
        width=file_asset.metadata.get("width") if file_asset.metadata else None,
        height=file_asset.metadata.get("height") if file_asset.metadata else None,
        created_by=request.requester,
        generation_request=request,
        activity_id=request.metadata.get("activity_id") if request.metadata else None,
        state=MediaItemState.PROCESSED,
    )

    # T035: Auto-generate tag from template slug
    slug = request.template.slug
    if slug:
        tag_slug = f"template-{slug}"
        tag_name = f"Template: {request.template.name}"

        tag, _ = MediaTag.objects.get_or_create(
            slug=tag_slug, project=project, defaults={"name": tag_name, "is_system": False}
        )
        media_item.tags.add(tag)
