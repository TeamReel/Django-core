"""Signal handlers for B34 Generative Pipelines.

Invalidates prompt template caches when templates are created, updated, or deleted.
"""

import logging

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from src.generative.models import GenerationTemplate
from src.generative.services.prompt_service import invalidate_template_cache

logger = logging.getLogger(__name__)


@receiver(post_save, sender=GenerationTemplate)
def invalidate_template_cache_on_save(
    sender: type[GenerationTemplate],  # noqa: ARG001
    instance: GenerationTemplate,
    **kwargs: object,
) -> None:
    """Invalidate prompt template cache when a template is saved."""
    logger.info(
        "Invalidating template cache for %s",
        instance.slug,
        extra={"slug": instance.slug, "pk": instance.pk},
    )
    invalidate_template_cache(slug=instance.slug)


@receiver(post_delete, sender=GenerationTemplate)
def invalidate_template_cache_on_delete(
    sender: type[GenerationTemplate],  # noqa: ARG001
    instance: GenerationTemplate,
    **kwargs: object,
) -> None:
    """Invalidate prompt template cache when a template is deleted."""
    logger.info(
        "Invalidating template cache on delete for %s",
        instance.slug,
        extra={"slug": instance.slug, "pk": instance.pk},
    )
    invalidate_template_cache(slug=instance.slug)
