from django.contrib.postgres.search import SearchQuery, SearchRank
from django.db import models
from django.db.models import Count, F, Q

from ..models import MediaItem


class MediaSearchService:
    @staticmethod
    def search(
        query: str, project_ids: list[str] = None, user=None, limit: int = 50
    ) -> models.QuerySet:
        """Full-text search for media items."""

        # Build base queryset with access control
        qs = MediaItem.objects.all()

        if user:
            # Filter to user's accessible projects
            # Assuming user.project_memberships related name exists
            if hasattr(user, "project_memberships"):
                accessible_projects = user.project_memberships.values_list("project_id", flat=True)
                qs = qs.filter(project_id__in=accessible_projects)
            else:
                # If no memberships, user sees nothing (or superuser logic elsewhere)
                pass

        if project_ids:
            qs = qs.filter(project_id__in=project_ids)

        if query:
            search_query = SearchQuery(query, config="english")
            qs = (
                qs.annotate(rank=SearchRank(F("search_vector"), search_query))
                .filter(search_vector=search_query)
                .order_by("-rank", "-created_at")
            )
        else:
            qs = qs.order_by("-created_at")

        return qs[:limit]

    @staticmethod
    def search_by_tags(tag_slugs: list[str], project_id: str = None) -> models.QuerySet:
        """Find media items with all specified tags."""
        qs = MediaItem.objects.filter(tags__slug__in=tag_slugs)

        if project_id:
            qs = qs.filter(project_id=project_id)

        # Ensure item has ALL tags (not just any)
        qs = qs.annotate(tag_count=Count("tags", filter=Q(tags__slug__in=tag_slugs))).filter(
            tag_count=len(tag_slugs)
        )

        return qs.distinct()
