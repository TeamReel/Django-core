from django.apps import AppConfig


class OrganisationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "organisations"
    verbose_name = "Organisations"

    def ready(self):
        """Import signal handlers when app is ready."""
        import organisations.signals  # noqa: F401
