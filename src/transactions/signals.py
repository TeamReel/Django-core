"""
Django signals for the transactions app.

This module defines signal handlers for automatic cache invalidation
when transactions are created or modified.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Transaction
from .services import invalidate_balance_cache


@receiver(post_save, sender=Transaction)
def invalidate_cache_on_transaction(sender, instance, created, **kwargs):  # noqa: ARG001
    """
    Invalidate balance cache when a transaction is created.

    This ensures that subsequent balance queries reflect the new transaction
    without requiring manual cache invalidation in every code path.

    Args:
        sender: The model class (Transaction)
        instance: The transaction instance that was saved
        created: Boolean indicating if this is a new instance
        **kwargs: Additional signal arguments
    """
    if created:
        invalidate_balance_cache(
            organization_id=instance.organization_id,
            project_id=instance.project_id if instance.project else None,
        )
