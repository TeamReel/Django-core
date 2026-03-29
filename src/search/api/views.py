import logging
import unicodedata

from activities.models import Activity, Period
from django.contrib.contenttypes.models import ContentType
from django.contrib.postgres.search import SearchHeadline, SearchQuery
from django.db import connection
from django.db.models import CharField
from django.db.models.functions import Cast
from projects.models import Project
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from search.api.serializers import SearchEntrySerializer
from search.backend.postgres import PostgresSearchBackend
from search.utils import sanitize_query

logger = logging.getLogger(__name__)

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
    "members": ["projects.projectmembership"],
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

    permission_classes = [IsAuthenticated]

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
        for idx, entry in enumerate(entries[:10]):  # Look at top 10 results to find an anchor
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
        from activities.models import Activity, Period
        from organisations.models import Organisation
        from projects.models import Project, ProjectMembership

        path = [str(instance.pk)]
        current = instance

        # Navigate up based on instance type
        if isinstance(instance, Organisation):
            # Already at root
            return instance, path

        elif isinstance(instance, ProjectMembership):
            # Member -> Project -> Organisation
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
        Generate hierarchy tree focused on the anchor entity.

        Builds a tree that:
        1. Shows the path from root to anchor (with limited siblings)
        2. Fully expands the anchor with all its children

        Args:
            instance: Django model instance (anchor - the search result)
            request: Current HttpRequest

        Returns:
            Tuple of (tree: HierarchyNode, anchor_path: list[str]) or (None, None)
        """
        try:
            # Find the root entity and path to anchor
            root, anchor_path = self._find_hierarchy_root(instance)

            logger.info(
                "Hierarchy: anchor=%s, root=%s, path=%s",
                instance.__class__.__name__,
                root.__class__.__name__,
                anchor_path,
            )

            # Build focused tree from root, expanding the path to anchor
            root_node = self._build_focused_tree(root, anchor_path, instance, request)

            if root_node is None:
                return None, None

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

    def _build_focused_tree(self, current, anchor_path, anchor_instance, request, depth=0):
        """
        Build a tree node that focuses on the anchor path.

        For nodes IN the path: fully expand children
        For the anchor itself: expand all children recursively
        For siblings not in path: show but don't expand

        Args:
            current: Current entity to build node for
            anchor_path: List of IDs from root to anchor
            anchor_instance: The actual anchor entity
            request: HttpRequest for resolver
            depth: Current recursion depth

        Returns:
            HierarchyNode or None
        """
        from django.conf import settings
        from search.hierarchy.nodes import HierarchyNode
        from search.hierarchy.registry import get_resolver

        max_depth = getattr(settings, "SEARCH_HIERARCHY_MAX_DEPTH", 8)
        if depth > max_depth:
            return None

        current_id = str(current.pk)
        is_in_path = current_id in anchor_path
        is_anchor = current_id == anchor_path[-1] if anchor_path else False
        # When anchor_path is empty, we're expanding below the anchor - always expand
        expand_all = len(anchor_path) == 0

        # Determine node type and URL
        model_name = current._meta.model_name
        node_type = model_name

        # Special handling for projects (club vs team)
        if model_name == "project":
            if current.parent_project is None:
                node_type = "club"
            else:
                node_type = "team"

        # Special handling for periods (season vs competition)
        if model_name == "period":
            if current.parent_period is None:
                node_type = "season"
            else:
                node_type = "competition"

        # Build URL
        url = None
        if hasattr(current, "get_absolute_url"):
            try:
                url = current.get_absolute_url()
            except Exception:
                pass
        elif hasattr(current, "slug"):
            if model_name == "organisation":
                url = f"/apps/identity/organisations/{current.slug}"

        # Get title
        title = getattr(current, "name", None) or getattr(current, "title", None) or str(current)

        # Get children
        children = []
        resolver = get_resolver(current, request)

        if resolver and (is_in_path or is_anchor or expand_all):
            # Get all direct children
            child_nodes = resolver.get_children(current)

            for child_node in child_nodes:
                if child_node.instance is None:
                    # Leaf node, add as-is
                    children.append(child_node)
                    continue

                child_id = str(child_node.instance.pk)
                child_in_path = child_id in anchor_path
                child_is_anchor = child_id == anchor_path[-1] if anchor_path else False

                if child_in_path or child_is_anchor:
                    # Recursively build this branch
                    expanded_child = self._build_focused_tree(
                        child_node.instance, anchor_path, anchor_instance, request, depth + 1
                    )
                    if expanded_child:
                        children.append(expanded_child)
                elif is_anchor or expand_all:
                    # We're at/below the anchor - expand all children recursively
                    expanded_child = self._build_focused_tree(
                        child_node.instance, [], anchor_instance, request, depth + 1
                    )
                    if expanded_child:
                        children.append(expanded_child)
                else:
                    # Sibling not in path - show but don't expand
                    children.append(
                        HierarchyNode(
                            id=child_node.id,
                            type=child_node.type,
                            title=child_node.title,
                            url=child_node.url,
                            description=child_node.description,
                            children=[],
                            instance=None,
                        )
                    )

        return HierarchyNode(
            id=current_id,
            type=node_type,
            title=title,
            url=url,
            description=getattr(current, "description", None),
            children=children,
            instance=None,
        )

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
        import time

        from django.conf import settings
        from search.hierarchy.serializers import HierarchyAnchorSerializer, HierarchyNodeSerializer

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

        logger.debug(
            "Search request: q='%s', user='%s', auth=%s, super=%s",
            query_string, request.user, request.user.is_authenticated, request.user.is_superuser,
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

        logger.debug("Search backend returned %d results", queryset.count())

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
            # Federation, Club, Team, Season, Competition, Match, Member, User
            grouped: dict[str, list] = {
                "organisations": [],
                "clubs": [],
                "teams": [],
                "seasons": [],
                "competitions": [],
                "matches": [],
                "members": [],
                "users": [],
            }
            max_per_group = 5

            # Deduplication sets
            seen_members: set[tuple] = set()
            seen_users: set[str] = set()

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
                    try:
                        obj = entry.content_object
                        # Robust deduplication: lower, strip, remove accents
                        email = getattr(obj, "email", "")
                        norm_email = ""
                        if email:
                            # NORMALIZE: NFKD decomposes chars, encode ASCII ignores non-ascii/accents
                            norm_email = (
                                unicodedata.normalize("NFKD", email.lower().strip())
                                .encode("ASCII", "ignore")
                                .decode("utf-8")
                            )

                        if norm_email and norm_email in seen_users:
                            continue
                        if norm_email:
                            seen_users.add(norm_email)
                        key = "users"

                    except Exception:
                        key = "users"
                elif model_name == "projectmembership":
                    try:
                        obj = entry.content_object

                        # Deduplicate by (normalized_email, project) to handle duplicate user accounts
                        u_email = getattr(obj.user, "email", "")
                        if u_email:
                            u_norm = (
                                unicodedata.normalize("NFKD", u_email.lower().strip())
                                .encode("ASCII", "ignore")
                                .decode("utf-8")
                            )
                        else:
                            u_norm = str(obj.user_id)

                        dedup_key = (u_norm, obj.project_id)
                        if dedup_key in seen_members:
                            continue
                        seen_members.add(dedup_key)
                        key = "members"
                    except Exception:
                        key = "members"
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
                "members",
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
