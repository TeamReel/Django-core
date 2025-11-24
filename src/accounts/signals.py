"""Signal handlers for accounts module."""

from django.contrib.auth.models import Group
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User


@receiver(post_save, sender=User)
def assign_default_group(sender, instance, created, **kwargs):
    """Automatically assign 'user' group to newly created users."""
    if created and not instance.is_superuser:
        user_group, _ = Group.objects.get_or_create(name="user")
        instance.groups.add(user_group)
