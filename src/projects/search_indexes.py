from django.db.models import CharField
from django.db.models.functions import Cast
from projects.models import ProjectMembership
from search.registry import SearchIndex


class ProjectMembershipIndex(SearchIndex):
    model = ProjectMembership

    def get_body_text(self, obj):
        user = obj.user
        project = obj.project
        # Include user name, email, project name, role
        # This ensures searching for "Ajax" finds members of Ajax
        # And searching for "Tadic" finds Tadic
        return f"{user.get_full_name()} {user.email} {project.name} {obj.get_role_display()}"

    def get_title(self, obj):
        name = obj.user.get_full_name() or obj.user.username
        return f"{name} ({obj.project.name})"

    def get_description(self, obj):
        desc = f"Team: {obj.project.name} • {obj.get_role_display()}"
        if obj.period:
            desc += f" • {obj.period.name}"
        return desc

    def get_url(self, obj):
        project = obj.project
        org_slug = project.organisation.slug if project.organisation else "_"

        if project.parent_project:
            # Team member - URL structure: /{org}/{club}/{team}/{season}/{membership_id}
            club_slug = project.parent_project.slug
            # Include season slug if period is set
            if obj.period:
                from django.utils.text import slugify

                season_slug = slugify(obj.period.name)
                return f"/{org_slug}/{club_slug}/{project.slug}/{season_slug}/{obj.id}"
            else:
                # Fallback: team page without season
                return f"/{org_slug}/{club_slug}/{project.slug}"
        else:
            # Club member - URL structure: /{org}/{club}
            return f"/{org_slug}/{project.slug}"

    def get_visible_ids(self, user):
        if user.is_superuser:
            return ProjectMembership.objects.annotate(id_str=Cast("id", CharField())).values_list(
                "id_str", flat=True
            )

        # User can see memberships if they are in the same organisation
        # This matches OrganisationIndex visibility
        return (
            ProjectMembership.objects.filter(
                project__organisation__memberships__user=user,
                project__organisation__memberships__is_active=True,
                deleted_at__isnull=True,
            )
            .distinct()
            .annotate(id_str=Cast("id", CharField()))
            .values_list("id_str", flat=True)
        )
