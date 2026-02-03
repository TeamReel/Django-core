from django.apps import AppConfig


class MedialibConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "medialib"
    verbose_name = "Smart Asset Library"

    def ready(self):
        import medialib.signals  # noqa
