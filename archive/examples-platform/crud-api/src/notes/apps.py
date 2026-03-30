"""Django app configuration for the Notes app."""

from django.apps import AppConfig


class NotesConfig(AppConfig):
    """Configuration for the Notes example app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "notes"
    verbose_name = "Notes"
