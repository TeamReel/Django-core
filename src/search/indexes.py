from search.registry import SearchIndex
from accounts.models import User
from organisations.models import Organisation
from projects.models import Project


class UserIndex(SearchIndex):
    model = User

    def get_body_text(self, obj):
        return f"{obj.first_name} {obj.last_name} {obj.email}"

    def get_title(self, obj):
        return obj.get_full_name() or obj.email

    def get_description(self, obj):
        return obj.email

    def get_url(self, obj):
        # Assuming there's a detail view, but for now just a placeholder or actual method if exists
        # User model might not have get_absolute_url
        return f"/users/{obj.pk}"


class OrganisationIndex(SearchIndex):
    model = Organisation

    def get_body_text(self, obj):
        return obj.name

    def get_title(self, obj):
        return obj.name

    def get_description(self, obj):
        return f"Organisation: {obj.name}"

    def get_url(self, obj):
        return f"/organisations/{obj.pk}"


class ProjectIndex(SearchIndex):
    model = Project

    def get_body_text(self, obj):
        return f"{obj.title} {obj.description or ''}"

    def get_title(self, obj):
        return obj.title

    def get_description(self, obj):
        return obj.description or ""

    def get_url(self, obj):
        return f"/projects/{obj.pk}"
