from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework import status
from django.contrib.postgres.search import SearchHeadline, SearchQuery

from search.backend.postgres import PostgresSearchBackend
from search.api.serializers import SearchEntrySerializer
from search.utils import sanitize_query


# Mapping for model names to plural API keys
MODEL_NAME_TO_PLURAL = {
    "user": "users",
    "project": "projects",
    "organisation": "organisations",
    "organization": "organizations",  # US spelling fallback
}


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class SearchAPIView(APIView):
    """
    API Endpoint for Global and Filtered Search.
    """

    def get(self, request, *args, **kwargs):
        query_string = request.query_params.get("q", "").strip()

        # Debug logging
        print(
            f"Search request: q='{query_string}', user='{request.user}', auth={request.user.is_authenticated}, super={request.user.is_superuser}"
        )

        if not query_string:
            return Response({"results": []}, status=status.HTTP_200_OK)

        # Parse types
        # Expected format: ?types=projects.project,accounts.user
        # OR ?types=projects (if we want to support simple names, but let's stick to app.model for precision first)
        types_param = request.query_params.get("types")
        types = types_param.split(",") if types_param else None

        backend = PostgresSearchBackend()
        # Get base queryset from backend (includes permission filtering and ranking)
        queryset = backend.search(query_string, request.user, types=types)

        print(f"Search backend returned {queryset.count()} results")

        # Ensure unique results
        queryset = queryset.distinct()

        # Add Highlighting
        # We need to reconstruct the SearchQuery to use in SearchHeadline
        # Ideally backend.search would return the query object or we re-parse it.
        # backend.search uses sanitize_query internally.
        clean_query = sanitize_query(query_string)
        if clean_query:
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
        if not types:
            # Fetch top N results to group
            # We fetch more than needed to ensure we fill categories
            # But this is an approximation.
            results = queryset[:100]

            grouped_results = {}

            for entry in results:
                # Use plural form for API response keys
                model_name = entry.content_type.model
                key = MODEL_NAME_TO_PLURAL.get(model_name, f"{model_name}s")

                if key not in grouped_results:
                    grouped_results[key] = []

                if len(grouped_results[key]) < 5:
                    grouped_results[key].append(entry)

            # Serialize each group
            response_data = {}
            for key, entries in grouped_results.items():
                serializer = SearchEntrySerializer(entries, many=True)
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
