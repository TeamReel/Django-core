"""B67: Bulk Content Generation — App configuration."""

from django.apps import AppConfig


class BulkGenerationConfig(AppConfig):
    """B67: Bulk Content Generation — generate multiple content items at once."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "src.bulk_generation"
    label = "bulk_generation"
    verbose_name = "Bulk Generation"
