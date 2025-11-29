"""App configuration for i18n_preferences."""

from django.apps import AppConfig


class I18nPreferencesConfig(AppConfig):
    """Configuration for i18n_preferences Django app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "i18n_preferences"
    verbose_name = "Internationalization Preferences"
