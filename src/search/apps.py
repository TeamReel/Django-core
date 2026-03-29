from django.apps import AppConfig
from django.db.models.signals import post_delete, post_save


class SearchConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "search"

    def ready(self):
        from accounts.models import User
        from organisations.models import Organisation
        from projects.models import Project
        from search.indexes import OrganisationIndex, ProjectIndex, UserIndex
        from search.registry import search_registry
        from search.signals import handle_delete, handle_save

        post_save.connect(handle_save)
        post_delete.connect(handle_delete)

        search_registry.register(User, UserIndex)
        search_registry.register(Organisation, OrganisationIndex)
        search_registry.register(Project, ProjectIndex)
