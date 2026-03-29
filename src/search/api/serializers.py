import logging

from rest_framework import serializers
from search.models import SearchEntry

logger = logging.getLogger(__name__)


class SearchEntrySerializer(serializers.ModelSerializer):
    content_type = serializers.SerializerMethodField()
    url = serializers.SerializerMethodField()
    highlight = serializers.CharField(read_only=True, default=None)

    class Meta:
        model = SearchEntry
        fields = [
            "id",
            "title",
            "description",
            "url",
            "image_url",
            "content_type",
            "highlight",
            "object_id",
        ]

    def get_content_type(self, obj):
        return f"{obj.content_type.app_label}.{obj.content_type.model}"

    def get_url(self, obj):
        request = self.context.get("request")
        current_user = getattr(request, "user", None)

        try:
            content_object = obj.content_object
        except Exception:
            content_object = None

        model = obj.content_type.model

        if model == "user" and content_object is not None:
            # Users without admin rights can't access /users/:id (guarded in demo).
            # Point to /profile when searching for yourself; otherwise keep canonical URL.
            try:
                if current_user and getattr(current_user, "is_authenticated", False):
                    if str(getattr(content_object, "pk", "")) == str(
                        getattr(current_user, "pk", "")
                    ):
                        return "/profile"
            except Exception:
                logger.debug("Failed to resolve profile URL for search entry", exc_info=True)
            return f"/users/{getattr(content_object, 'pk', obj.object_id)}"

        if model in {"organisation", "organization"} and content_object is not None:
            slug = getattr(content_object, "slug", None) or getattr(content_object, "pk", None)
            if slug:
                return f"/organisations/{slug}"

        if model == "project" and content_object is not None:
            organisation = getattr(content_object, "organisation", None)
            org_slug = getattr(organisation, "slug", None) or getattr(organisation, "pk", None)
            project_slug = getattr(content_object, "slug", None) or getattr(
                content_object, "pk", None
            )
            parent = getattr(content_object, "parent_project", None)

            if org_slug and parent is not None:
                parent_slug = getattr(parent, "slug", None) or getattr(parent, "pk", None)
                if parent_slug and project_slug:
                    return f"/organisations/{org_slug}/projects/{parent_slug}/teams/{project_slug}"

            if org_slug and project_slug:
                return f"/organisations/{org_slug}/projects/{project_slug}"

        # Fall back to stored URL (keeps API stable for unknown models).
        return obj.url
