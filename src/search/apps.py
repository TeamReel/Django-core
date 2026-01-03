from django.apps import AppConfig
from django.db.models.signals import post_save, post_delete


class SearchConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "search"

    def ready(self):
        from search.signals import handle_save, handle_delete
        from search.registry import search_registry
        from search.indexes import UserIndex, OrganisationIndex, ProjectIndex
        from accounts.models import User
        from organisations.models import Organisation
        from projects.models import Project

        post_save.connect(handle_save)
        post_delete.connect(handle_delete)

        search_registry.register(User, UserIndex)
        search_registry.register(Organisation, OrganisationIndex)
        search_registry.register(Project, ProjectIndex)
