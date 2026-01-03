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

    def get_visible_ids(self, user):
        if user.is_superuser:
            return User.objects.all().values_list("id", flat=True)
        # Users can see other users in the same organisations
        return (
            User.objects.filter(
                organisation_memberships__organisation__memberships__user=user,
                organisation_memberships__organisation__memberships__is_active=True,
            )
            .distinct()
            .values_list("id", flat=True)
        )


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

    def get_visible_ids(self, user):
        if user.is_superuser:
            return Organisation.objects.all().values_list("id", flat=True)
        return (
            Organisation.objects.filter(memberships__user=user, memberships__is_active=True)
            .distinct()
            .values_list("id", flat=True)
        )


class ProjectIndex(SearchIndex):
    model = Project

    def get_body_text(self, obj):
        # Project model uses 'name' not 'title' based on models.py check earlier
        # But the previous code used 'title'. Let's check models.py again.
        # Ah, I checked src/projects/models.py and it has 'name'.
        # The previous implementation of ProjectIndex used 'title'. This is a bug in WP02 implementation?
        # Let's fix it here.
        return f"{obj.name} {obj.description or ''}"

    def get_title(self, obj):
        return obj.name

    def get_description(self, obj):
        return obj.description or ""

    def get_url(self, obj):
        return f"/projects/{obj.pk}"

    def get_visible_ids(self, user):
        if user.is_superuser:
            return Project.objects.all().values_list("id", flat=True)
        return (
            Project.objects.filter(
                organisation__memberships__user=user,
                organisation__memberships__is_active=True,
            )
            .distinct()
            .values_list("id", flat=True)
        )
