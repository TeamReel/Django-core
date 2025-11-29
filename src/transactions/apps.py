"""Django app configuration for transactions."""

from django.apps import AppConfig


class TransactionsConfig(AppConfig):
    """Configuration for the transactions app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "src.transactions"
    verbose_name = "Transactions & Credits Engine"

    def ready(self) -> None:
        """Import signal handlers when app is ready."""
        import src.transactions.signals  # noqa: F401
