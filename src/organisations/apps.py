from django.apps import AppConfig


class OrganisationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "organisations"
    verbose_name = "Organisations"

    def ready(self):
        """Import signal handlers when app is ready."""
        import organisations.signals  # noqa: F401
        from audit.registry import register_event_type

        register_event_type(
            "organisation.membership.created",
            "organisation",
            "User added to organisation",
            required_metadata_keys=["user_id", "role"],
        )

        register_event_type(
            "organisation.membership.deleted",
            "organisation",
            "User removed from organisation",
            required_metadata_keys=["user_id", "role"],
        )
