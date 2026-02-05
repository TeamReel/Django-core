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
from activities.models import Activity, Period


# Simple category tokens supported by the frontend.
# These are mapped to concrete content types (app_label.model).
CATEGORY_TO_MODEL_LABELS = {
    "users": ["accounts.user"],
    "organisations": ["organisations.organisation"],
    "projects": ["projects.project"],
    # clubs/teams are both projects.project, but with an additional hierarchy filter.
    "clubs": ["projects.project"],
    "teams": ["projects.project"],
    # Activities/Periods
    "activities": ["activities.activity"],
    "matches": ["activities.activity"],
    # periods are split by hierarchy into seasons vs competitions
    "periods": ["activities.period"],
    "seasons": ["activities.period"],
    "competitions": ["activities.period"],
}


def _normalize_types(
    types_param: str | None,
) -> tuple[list[str] | None, str | None, str | None, str | None]:
    """Return (model_labels, project_scope, activity_scope, period_scope).

    - model_labels: list of 'app.model' labels to filter content types.
    - project_scope: 'clubs' | 'teams' | None for additional project hierarchy filtering.
    - activity_scope: 'matches' | None for additional activity filtering.
    - period_scope: 'seasons' | 'competitions' | None for additional period hierarchy filtering.
    """
    if not types_param:
        return None, None, None, None

    raw_tokens = [t.strip() for t in types_param.split(",") if t.strip()]
    if not raw_tokens:
        return None, None, None, None

    model_labels: list[str] = []
    project_scope: str | None = None
    activity_scope: str | None = None
    period_scope: str | None = None

    for token in raw_tokens:
        lower = token.lower()
        if lower in CATEGORY_TO_MODEL_LABELS:
            model_labels.extend(CATEGORY_TO_MODEL_LABELS[lower])
            if lower in {"clubs", "teams"}:
                project_scope = lower
            if lower == "matches":
                activity_scope = "matches"
            if lower in {"seasons", "competitions"}:
                # If multiple period scopes are provided, don't apply hierarchy filtering.
                if period_scope is None:
                    period_scope = lower
                elif period_scope != lower:
                    period_scope = None
            continue

        # Assume it's already an 'app.model' label.
        model_labels.append(token)

    # De-duplicate while preserving order
    seen = set()
    model_labels = [x for x in model_labels if not (x in seen or seen.add(x))]
    return model_labels or None, project_scope, activity_scope, period_scope


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class SearchAPIView(APIView):
    """
    API Endpoint for Global and Filtered Search.
    Supports optional hierarchy navigation via ?hierarchy=true parameter.
    """

    def select_hierarchy_anchor(self, entries, request):
        """
        Select the best anchor entity from search results.

        Selection logic:
        1. Filter to anchor types from settings
        2. Prioritize exact title match
        3. Prioritize by type order in settings
        4. Select from top 3 ranked results

        Args:
            entries: List of SearchEntry objects
            request: Current HttpRequest

        Returns:
            Tuple of (content_object, anchor_data) or (None, None)
        """
        from django.conf import settings

        anchor_types = getattr(settings, "SEARCH_HIERARCHY_ANCHOR_TYPES", [])
        if not anchor_types:
            return None, None

        # Get query for exact match check
        query = request.GET.get("q", "").strip().lower()

        # Filter and rank results
        candidates = []
        for idx, entry in enumerate(entries[:3]):  # Top 3 only
            # Get ContentType label
            label = f"{entry.content_type.app_label}.{entry.content_type.model}"

            if label not in anchor_types:
                continue

            # Get the actual object
            try:
                obj = entry.content_object
                if obj is None:
                    continue
            except Exception:
                continue

            # Check for exact match
            title = getattr(obj, "title", None) or getattr(obj, "name", None) or str(obj)
            exact_match = title.lower() == query

            # Calculate priority
            type_priority = anchor_types.index(label)

            candidates.append(
                {
                    "instance": obj,
                    "entry": entry,
                    "label": label,
                    "exact_match": exact_match,
                    "type_priority": type_priority,
                    "rank_order": idx,
                }
            )

        if not candidates:
            return None, None

        # Sort: exact match first, then type priority, then rank order
        candidates.sort(key=lambda x: (not x["exact_match"], x["type_priority"], x["rank_order"]))

        best = candidates[0]
        instance = best["instance"]
        entry = best["entry"]

        # Build anchor metadata
        url = None
        if hasattr(instance, "get_absolute_url"):
            try:
                url = instance.get_absolute_url()
            except Exception:
                pass

        anchor_data = {
            "id": str(instance.pk),
            "type": best["label"],
            "title": getattr(instance, "title", None)
            or getattr(instance, "name", None)
            or str(instance),
            "url": url,
            "score": getattr(entry, "rank", None),
        }

        return instance, anchor_data

    def _find_hierarchy_root(self, instance):
        """
        Navigate up the hierarchy to find the root entity (Organisation).

        For Projects: Go up through parent_project to club, then to organisation
        For Periods: Go to project, then up to organisation
        For Activities: Go to period, then to project, then to organisation

        Returns:
            Tuple of (root_instance, path_to_anchor) where path_to_anchor is
            a list of instance IDs from root to the original anchor.
        """
        from organisations.models import Organisation
        from projects.models import Project
        from activities.models import Period, Activity

        path = [str(instance.pk)]
        current = instance

        # Navigate up based on instance type
        if isinstance(instance, Organisation):
            # Already at root
            return instance, path

        elif isinstance(instance, Project):
            # Go up through parent projects to organisation
            while current.parent_project:
                current = current.parent_project
                path.insert(0, str(current.pk))

            # Now at club level, get organisation
            if current.organisation:
                path.insert(0, str(current.organisation.pk))
                return current.organisation, path

            # No organisation, use club as root
            return current, path

        elif isinstance(instance, Period):
            # Period → Project → Organisation
            if instance.project:
                project = instance.project
                path.insert(0, str(project.pk))

                while project.parent_project:
                    project = project.parent_project
                    path.insert(0, str(project.pk))

                if project.organisation:
                    path.insert(0, str(project.organisation.pk))
                    return project.organisation, path

                return project, path

            return instance, path

        elif isinstance(instance, Activity):
            # Activity → Period → Project → Organisation
            if instance.period:
                period = instance.period
                path.insert(0, str(period.pk))

                if period.project:
                    project = period.project
                    path.insert(0, str(project.pk))

                    while project.parent_project:
                        project = project.parent_project
                        path.insert(0, str(project.pk))

                    if project.organisation:
                        path.insert(0, str(project.organisation.pk))
                        return project.organisation, path

                    return project, path

            return instance, path

        # Unknown type, use as-is
        return instance, path

    def resolve_hierarchy(self, instance, request):
        """
        Generate hierarchy tree starting from the root entity.

        Navigates up from the anchor to find the root (Organisation),
        then builds the tree downward, marking the path to the anchor.

        Args:
            instance: Django model instance (anchor - the search result)
            request: Current HttpRequest

        Returns:
            Tuple of (tree: HierarchyNode, anchor_path: list[str]) or (None, None)
        """
        from search.hierarchy.registry import get_resolver
        from search.hierarchy.nodes import HierarchyNode
        import logging

        logger = logging.getLogger(__name__)

        try:
            # Find the root entity and path to anchor
            root, anchor_path = self._find_hierarchy_root(instance)

            logger.info(
                "Hierarchy: anchor=%s, root=%s, path=%s",
                instance.__class__.__name__,
                root.__class__.__name__,
                anchor_path,
            )

            # Get resolver for root type
            resolver = get_resolver(root, request)
            if not resolver:
                logger.info("No resolver found for root %s", root.__class__.__name__)
                return None, None

            # Build root node
            root_title = getattr(root, "name", None) or getattr(root, "title", None) or str(root)
            root_url = None
            if hasattr(root, "get_absolute_url"):
                try:
                    root_url = root.get_absolute_url()
                except Exception:
                    pass
            elif hasattr(root, "slug"):
                root_url = f"/apps/identity/organisations/{root.slug}"

            root_type = f"{root._meta.app_label}.{root._meta.model_name}"

            # Build children tree
            children = resolver.build_tree(root)

            root_node = HierarchyNode(
                id=str(root.pk),
                type=root_type.split(".")[-1],  # Just model name
                title=root_title,
                url=root_url,
                description=getattr(root, "description", None),
                children=children,
                instance=None,  # Don't store instance in output
            )

            return root_node, anchor_path

        except Exception as e:
            # Fail-safe: log error but don't crash
            logger.error(
                "Hierarchy resolution failed for %s (id=%s): %s",
                instance.__class__.__name__,
                instance.pk,
                e,
                exc_info=True,
            )
            return None, None

    def _add_hierarchy_to_response(self, request, entries):
        """
        Generate hierarchy data for the response if requested.

        This method implements fail-safe error handling - hierarchy failures
        never crash the main search.

        Args:
            request: Current HttpRequest
            entries: List of search entry objects

        Returns:
            Dict with 'anchor' and 'tree' keys, or None if hierarchy not requested/failed
        """
        from django.conf import settings
        from search.hierarchy.serializers import HierarchyNodeSerializer, HierarchyAnchorSerializer
        import logging
        import time

        logger = logging.getLogger(__name__)

        # Check if hierarchy is requested
        include_hierarchy = request.GET.get("hierarchy", "").lower() == "true"
        enabled = getattr(settings, "SEARCH_HIERARCHY_ENABLED", True)

        if not include_hierarchy or not enabled:
            return None

        # Initialize hierarchy field
        hierarchy_data = None
        start_time = time.time()

        try:
            # Log hierarchy generation start
            logger.info(
                "Hierarchy generation started",
                extra={
                    "query": request.GET.get("q", ""),
                    "user_id": request.user.id if request.user.is_authenticated else None,
                },
            )

            # Convert queryset to list if needed
            if hasattr(entries, "__iter__") and not isinstance(entries, list):
                entries = list(entries)

            if entries:
                # Select anchor
                instance, anchor_data = self.select_hierarchy_anchor(entries, request)

                if instance and anchor_data:
                    # Resolve hierarchy (returns root tree node and path to anchor)
                    tree_root, anchor_path = self.resolve_hierarchy(instance, request)

                    if tree_root is not None:
                        # Serialize the tree (single root node, not a list)
                        hierarchy_data = {
                            "anchor": HierarchyAnchorSerializer(anchor_data).data,
                            "tree": HierarchyNodeSerializer(tree_root).data,
                            "anchor_path": anchor_path,  # IDs from root to anchor
                        }

                        # Log success
                        duration_ms = (time.time() - start_time) * 1000
                        logger.info(
                            "Hierarchy generation completed",
                            extra={
                                "anchor_type": anchor_data["type"],
                                "root_type": tree_root.type,
                                "path_length": len(anchor_path),
                                "duration_ms": duration_ms,
                            },
                        )
                    else:
                        # Log failure (no resolver or resolver returned None)
                        duration_ms = (time.time() - start_time) * 1000
                        logger.warning(
                            "Hierarchy generation failed",
                            extra={"reason": "no_resolver", "duration_ms": duration_ms},
                        )
                else:
                    # Log failure (no suitable anchor)
                    duration_ms = (time.time() - start_time) * 1000
                    logger.warning(
                        "Hierarchy generation failed",
                        extra={"reason": "no_anchor", "duration_ms": duration_ms},
                    )

        except Exception as e:
            # Fail-safe: log error but don't crash
            duration_ms = (time.time() - start_time) * 1000
            logger.error(
                "Hierarchy generation failed unexpectedly: %s",
                e,
                exc_info=True,
                extra={"reason": "exception", "duration_ms": duration_ms},
            )
            hierarchy_data = None

        return hierarchy_data

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
        # - ?types=users|organisations|projects|clubs|teams|matches|activities|periods|seasons|competitions (frontend category tokens)
        types_param = request.query_params.get("types")
        types, project_scope, activity_scope, period_scope = _normalize_types(types_param)

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

        # Optional activity subtype filter
        if activity_scope == "matches":
            activity_ct = ContentType.objects.get_for_model(Activity)
            match_ids = (
                Activity.objects.filter(activity_type="match")
                .annotate(id_str=Cast("id", CharField()))
                .values_list("id_str", flat=True)
            )
            queryset = queryset.filter(content_type=activity_ct, object_id__in=match_ids)

        # Optional period hierarchy filter
        if period_scope in {"seasons", "competitions"}:
            period_ct = ContentType.objects.get_for_model(Period)
            period_qs = Period.objects.all()
            if period_scope == "seasons":
                period_qs = period_qs.filter(parent_period__isnull=True)
            else:
                period_qs = period_qs.filter(parent_period__isnull=False)

            period_ids = period_qs.annotate(id_str=Cast("id", CharField())).values_list(
                "id_str", flat=True
            )
            queryset = queryset.filter(content_type=period_ct, object_id__in=period_ids)

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

            # Frontend grouping order:
            # Federation, Club, Team, Season, Competition, Match, User
            grouped: dict[str, list] = {
                "organisations": [],
                "clubs": [],
                "teams": [],
                "seasons": [],
                "competitions": [],
                "matches": [],
                "users": [],
            }
            max_per_group = 5

            for entry in results:
                model_name = entry.content_type.model

                if model_name == "project":
                    # Split projects into clubs vs teams based on hierarchy.
                    try:
                        obj = entry.content_object
                        is_team = bool(getattr(obj, "parent_project_id", None))
                        key = "teams" if is_team else "clubs"
                    except (AttributeError, TypeError, ValueError):
                        key = "clubs"
                elif model_name == "period":
                    try:
                        obj = entry.content_object
                        is_competition = bool(getattr(obj, "parent_period_id", None))
                        key = "competitions" if is_competition else "seasons"
                    except (AttributeError, TypeError, ValueError):
                        key = "seasons"
                elif model_name == "activity":
                    try:
                        obj = entry.content_object
                        key = "matches" if getattr(obj, "activity_type", None) == "match" else None
                    except (AttributeError, TypeError, ValueError):
                        key = None
                elif model_name == "user":
                    key = "users"
                elif model_name in {"organisation", "organization"}:
                    key = "organisations"
                else:
                    # Unknown model type; keep API stable by skipping for now.
                    continue

                if key and key in grouped and len(grouped[key]) < max_per_group:
                    grouped[key].append(entry)

            response_data: dict[str, list] = {}
            for key in [
                "organisations",
                "clubs",
                "teams",
                "seasons",
                "competitions",
                "matches",
                "users",
            ]:
                if grouped.get(key):
                    serializer = SearchEntrySerializer(
                        grouped[key], many=True, context={"request": request}
                    )
                    response_data[key] = serializer.data

            # Add hierarchy support for global search
            hierarchy_data = self._add_hierarchy_to_response(request, results)
            if hierarchy_data is not None:
                response_data["hierarchy"] = hierarchy_data

            return Response(response_data)

        # Filtered Search (Paginated)
        else:
            paginator = StandardResultsSetPagination()
            page = paginator.paginate_queryset(queryset, request)
            if page is not None:
                serializer = SearchEntrySerializer(page, many=True, context={"request": request})
                paginated_response = paginator.get_paginated_response(serializer.data)

                # Add hierarchy support for filtered search
                hierarchy_data = self._add_hierarchy_to_response(request, page)
                if hierarchy_data is not None:
                    paginated_response.data["hierarchy"] = hierarchy_data

                return paginated_response

            serializer = SearchEntrySerializer(queryset, many=True, context={"request": request})
            response_data = {"results": serializer.data}

            # Add hierarchy support
            hierarchy_data = self._add_hierarchy_to_response(request, queryset)
            if hierarchy_data is not None:
                response_data["hierarchy"] = hierarchy_data

            return Response(response_data)
