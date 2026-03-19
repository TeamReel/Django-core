from django.apps import AppConfig


class {APP_CLASS}Config(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "{APP_NAME}"
    verbose_name = "{VERBOSE_NAME}"

    def ready(self):
        """Import signal handlers when app is ready."""
        try:
            import {APP_NAME}.signals  # noqa: F401
        except ImportError:
            pass
