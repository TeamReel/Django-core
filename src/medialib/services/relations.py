import uuid
from typing import Optional

from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.db.models import QuerySet

from ..models import MediaItem, MediaItemRelation


class MediaItemRelationService:
    # Whitelist of allowed models for context relations
    # Format: (app_label, model_name_lowercase)
    ALLOWED_TARGETS = {
        ("activities", "activity"),
        ("activities", "period"),
        ("projects", "project"),
        ("organisations", "organisation"),
        ("organisations", "membership"),
        ("sport_configuration", "sport"),
        ("sport_configuration", "sportconfiguration"),
        ("medialib", "collection"),
        ("medialib", "mediaitem"),
    }

    @staticmethod
    def validate_target(target):
        """Ensure the target model is in the allowed whitelist."""
        content_type = ContentType.objects.get_for_model(target)
        key = (content_type.app_label, content_type.model)

        if key not in MediaItemRelationService.ALLOWED_TARGETS:
            raise ValidationError(
                f"Relations to {content_type.app_label}.{content_type.model} are not allowed. "
                "Allowed targets: activities.Activity,"
                " projects.Project, organisations.Organisation, etc."
            )

    @staticmethod
    def create_relation(
        media_item, target, relation_type: str = "related", metadata: Optional[dict] = None
    ) -> MediaItemRelation:
        """Create a link between a media item and any other object."""

        MediaItemRelationService.validate_target(target)

        content_type = ContentType.objects.get_for_model(target)

        # Ensure ID is handled correctly (UUID vs String)
        object_id = target.id
        if isinstance(object_id, str):
            # Verify it's a valid UUID string to prevent db errors
            try:
                uuid.UUID(object_id)
            except ValueError:
                raise ValidationError(f"Target ID '{object_id}' is not a valid UUID.") from None

        relation, created = MediaItemRelation.objects.update_or_create(
            media_item=media_item,
            content_type=content_type,
            object_id=object_id,
            defaults={"relation_type": relation_type, "metadata": metadata or {}},
        )
        return relation

    @staticmethod
    def get_relations(media_item) -> QuerySet:
        """Get all relations for a media item."""
        return MediaItemRelation.objects.filter(media_item=media_item)

    @staticmethod
    def get_media_for_target(target, relation_type: Optional[str] = None) -> QuerySet:
        """Get all media items related to a specific target."""
        content_type = ContentType.objects.get_for_model(target)
        query = {"relations__content_type": content_type, "relations__object_id": target.id}
        if relation_type:
            query["relations__relation_type"] = relation_type

        return MediaItem.objects.filter(**query).distinct()

    @staticmethod
    def remove_relation(media_item, target, relation_type: Optional[str] = None):
        """Remove a relation."""
        content_type = ContentType.objects.get_for_model(target)
        qs = MediaItemRelation.objects.filter(
            media_item=media_item, content_type=content_type, object_id=target.id
        )
        if relation_type:
            qs = qs.filter(relation_type=relation_type)

        qs.delete()
