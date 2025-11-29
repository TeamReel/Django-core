"""Django app configuration for transactions."""

from django.apps import AppConfig


class TransactionsConfig(AppConfig):
    """Configuration for the transactions app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "transactions"
    verbose_name = "Transactions & Credits Engine"

    def ready(self) -> None:
        """Import signal handlers when app is ready."""
        import transactions.signals  # noqa: F401
