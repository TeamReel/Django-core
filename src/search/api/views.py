from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework import status
from django.db import connection
from django.contrib.postgres.search import SearchHeadline, SearchQuery
from django.contrib.contenttypes.models import ContentType
from django.db.models import CharField
from django.db.models.functions import Cast

from search.backend.postgres import PostgresSearchBackend
from search.api.serializers import SearchEntrySerializer
from search.utils import sanitize_query
from projects.models import Project


# Simple category tokens supported by the frontend.
# These are mapped to concrete content types (app_label.model).
CATEGORY_TO_MODEL_LABELS = {
    "users": ["accounts.user"],
    "organisations": ["organisations.organisation"],
    "projects": ["projects.project"],
    # clubs/teams are both projects.project, but with an additional hierarchy filter.
    "clubs": ["projects.project"],
    "teams": ["projects.project"],
}


def _normalize_types(types_param: str | None) -> tuple[list[str] | None, str | None]:
    """Return (model_labels, project_scope).

    - model_labels: list of 'app.model' labels to filter content types.
    - project_scope: 'clubs' | 'teams' | None for additional project hierarchy filtering.
    """
    if not types_param:
        return None, None

    raw_tokens = [t.strip() for t in types_param.split(",") if t.strip()]
    if not raw_tokens:
        return None, None

    model_labels: list[str] = []
    project_scope: str | None = None

    for token in raw_tokens:
        lower = token.lower()
        if lower in CATEGORY_TO_MODEL_LABELS:
            model_labels.extend(CATEGORY_TO_MODEL_LABELS[lower])
            if lower in {"clubs", "teams"}:
                project_scope = lower
            continue

        # Assume it's already an 'app.model' label.
        model_labels.append(token)

    # De-duplicate while preserving order
    seen = set()
    model_labels = [x for x in model_labels if not (x in seen or seen.add(x))]
    return model_labels or None, project_scope


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class SearchAPIView(APIView):
    """
    API Endpoint for Global and Filtered Search.
    """

    def get(self, request):
        query_string = request.query_params.get("q", "").strip()

        # Debug logging
        print(
            f"Search request: q='{query_string}', user='{request.user}', auth={request.user.is_authenticated}, super={request.user.is_superuser}"
        )

        if not query_string:
            return Response({"results": []}, status=status.HTTP_200_OK)

        # Parse types
        # Supported:
        # - ?types=projects.project,accounts.user (explicit model labels)
        # - ?types=users|organisations|projects|clubs|teams (frontend category tokens)
        types_param = request.query_params.get("types")
        types, project_scope = _normalize_types(types_param)

        backend = PostgresSearchBackend()
        # Get base queryset from backend (includes permission filtering and ranking)
        queryset = backend.search(query_string, request.user, types=types)

        print(f"Search backend returned {queryset.count()} results")

        # Ensure unique results
        queryset = queryset.distinct()

        # Optional project hierarchy filter (for filtered search via category tokens)
        if project_scope in {"clubs", "teams"}:
            project_ct = ContentType.objects.get_for_model(Project)
            project_qs = Project.objects.all()
            if project_scope == "clubs":
                project_qs = project_qs.filter(parent_project__isnull=True)
            else:
                project_qs = project_qs.filter(parent_project__isnull=False)

            project_ids = project_qs.annotate(id_str=Cast("id", CharField())).values_list(
                "id_str", flat=True
            )
            queryset = queryset.filter(
                content_type=project_ct,
                object_id__in=project_ids,
            )

        # Add Highlighting
        # We need to reconstruct the SearchQuery to use in SearchHeadline
        # Ideally backend.search would return the query object or we re-parse it.
        # backend.search uses sanitize_query internally.
        clean_query = sanitize_query(query_string)
        # SearchHeadline is PostgreSQL-specific; on SQLite this will raise.
        if clean_query and connection.vendor == "postgresql":
            # Reconstruct the prefix query for highlighting to match the search behavior
            terms = [term for term in clean_query.split() if term]
            if terms:
                prefix_query = " & ".join(f"{term}:*" for term in terms)
                search_query = SearchQuery(prefix_query, search_type="raw")
            else:
                search_query = SearchQuery(clean_query)

            queryset = queryset.annotate(
                highlight=SearchHeadline(
                    "body_text",
                    search_query,
                    start_sel="<b>",
                    stop_sel="</b>",
                )
            )

        # Global Search (Grouped)
        if not types_param:
            results = queryset[:100]

            grouped: dict[str, list] = {
                "clubs": [],
                "teams": [],
                "users": [],
                "organisations": [],
            }
            max_per_group = 5

            for entry in results:
                model_name = entry.content_type.model

                if model_name == "project":
                    try:
                        obj = entry.content_object
                        is_team = bool(getattr(obj, "parent_project_id", None))
                        key = "teams" if is_team else "clubs"
                    except (AttributeError, TypeError, ValueError):
                        key = "clubs"
                elif model_name == "user":
                    key = "users"
                elif model_name in {"organisation", "organization"}:
                    key = "organisations"
                else:
                    # Unknown model type; keep API stable by skipping for now.
                    continue

                if key in grouped and len(grouped[key]) < max_per_group:
                    grouped[key].append(entry)

            response_data: dict[str, list] = {}
            for key in ["clubs", "teams", "users", "organisations"]:
                if grouped.get(key):
                    serializer = SearchEntrySerializer(grouped[key], many=True)
                    response_data[key] = serializer.data

            return Response(response_data)

        # Filtered Search (Paginated)
        else:
            paginator = StandardResultsSetPagination()
            page = paginator.paginate_queryset(queryset, request)
            if page is not None:
                serializer = SearchEntrySerializer(page, many=True)
                return paginator.get_paginated_response(serializer.data)

            serializer = SearchEntrySerializer(queryset, many=True)
            return Response(serializer.data)
