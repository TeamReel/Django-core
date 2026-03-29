"""
B35 Smart Asset Library - API ViewSets
"""
from django.db.models import Prefetch
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .filters import MediaItemFilterSet
from .models import Collection, MediaItem, MediaItemRelation, MediaTag
from .pagination import MediaItemCursorPagination
from .serializers import (
    CollectionDetailSerializer,
    CollectionSerializer,
    MediaItemRelationSerializer,
    MediaItemSerializer,
    MediaTagSerializer,
    MediaThumbnailSerializer,
)
from .services.collections import CollectionService
from .services.relations import MediaItemRelationService
from .services.tags import MediaTagService
from .tasks import process_media_item


class MediaItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet for MediaItem with project scoping

    Filters:
    - state: Filter by processing state (raw/processing/processed/error)
    - tags: Filter by tag slug (comma-separated)
    - mime_type: Filter by MIME type prefix (e.g., "image/", "video/")
    - search: Full-text search on title and description
    """

    serializer_class = MediaItemSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = MediaItemFilterSet
    pagination_class = MediaItemCursorPagination
    ordering_fields = ["created_at", "updated_at", "title", "file_size_bytes"]
    ordering = ["-created_at"]

    def get_queryset(self):
        """Filter by projects user has access to.

        Access granted when the user:
        - is staff/superuser, OR
        - has a ProjectMembership for the item's project (or parent/child).

        Uses Exists subqueries instead of JOINs to avoid duplicates
        (no .distinct() needed), which is compatible with CursorPagination.
        """
        user = self.request.user

        if user.is_staff or user.is_superuser:
            queryset = MediaItem.objects.all()
        else:
            from django.db.models import Exists, OuterRef
            from projects.models import ProjectMembership

            queryset = MediaItem.objects.filter(
                # Direct project membership
                Exists(
                    ProjectMembership.objects.filter(
                        project_id=OuterRef("project_id"),
                        user=user,
                        deleted_at__isnull=True,
                    )
                )
                # Parent project membership (club admin sees team media)
                | Exists(
                    ProjectMembership.objects.filter(
                        project_id=OuterRef("project__parent_project_id"),
                        user=user,
                        deleted_at__isnull=True,
                    )
                )
                # Child project membership (team member sees club-level media)
                | Exists(
                    ProjectMembership.objects.filter(
                        project__parent_project_id=OuterRef("project_id"),
                        user=user,
                        deleted_at__isnull=True,
                    )
                )
                # Note: Organisation membership removed — gave access to ALL
                # projects in the org, which was too permissive. Access should
                # be scoped through explicit ProjectMembership.
            )  # No .distinct() needed with Exists subqueries

        queryset = queryset.select_related(
            "file", "project", "created_by", "activity"
        ).prefetch_related("tags")

        # Legacy manual filters removed in favor of MediaItemFilterSet
        # Target/Relation filtering
        target_type = self.request.query_params.get("target_type")
        target_id = self.request.query_params.get("target_id")
        if target_type and target_id:
            from django.contrib.contenttypes.models import ContentType

            try:
                app_label, model_name = target_type.split(".")

                ct = ContentType.objects.get(app_label=app_label, model=model_name)
                from django.db.models import Exists
                from django.db.models import OuterRef as OR2

                queryset = queryset.filter(
                    Exists(
                        MediaItemRelation.objects.filter(
                            media_item_id=OR2("pk"),
                            content_type=ct,
                            object_id=target_id,
                        )
                    )
                )
            except (ValueError, ContentType.DoesNotExist):
                # Return empty queryset if target type is invalid
                return queryset.none()

        return queryset

    def perform_create(self, serializer):
        """Set created_by to current user and trigger metadata extraction"""
        instance = serializer.save(created_by=self.request.user)
        # Trigger async metadata extraction
        process_media_item.delay(str(instance.id))

    @action(detail=True, methods=["get"])
    def thumbnails(self, request, pk=None):
        """List generated thumbnails for this media item"""
        item = self.get_object()
        thumbnails = item.thumbnails.all().order_by("width")
        serializer = MediaThumbnailSerializer(thumbnails, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def relations(self, request, pk=None):
        """List all context relations for this media item"""
        item = self.get_object()
        relations = MediaItemRelationService.get_relations(item)
        serializer = MediaItemRelationSerializer(relations, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def add_relation(self, request, pk=None):
        """Add a context relation to another object"""
        item = self.get_object()
        serializer = MediaItemRelationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Extract validated data
        target_type = serializer.validated_data["target_type"]
        target_id = serializer.validated_data["object_id"]
        relation_type = serializer.validated_data.get("relation_type", "reference")
        metadata = serializer.validated_data.get("metadata", {})

        # Resolve target object
        try:
            app_label, model_name = target_type.split(".")
            from django.contrib.contenttypes.models import ContentType

            ct = ContentType.objects.get(app_label=app_label, model=model_name)
            target = ct.get_object_for_this_type(pk=target_id)
        except Exception:
            return Response({"error": "Target object not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            relation = MediaItemRelationService.create_relation(
                item, target, relation_type, metadata
            )
        except Exception as e:
            from django.core.exceptions import ValidationError

            if isinstance(e, ValidationError):
                # Handle both single string and dictionary/list errors
                return Response(
                    {"error": e.message if hasattr(e, "message") else str(e)},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            raise e

        return Response(MediaItemRelationSerializer(relation).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def remove_relation(self, request, pk=None):
        """Remove a relation by target and type"""
        item = self.get_object()
        target_type = request.data.get("target_type")
        target_id = request.data.get("target_id")
        relation_type = request.data.get("relation_type")

        if not all([target_type, target_id]):
            return Response(
                {"error": "target_type and target_id required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            app_label, model_name = target_type.split(".")
            from django.contrib.contenttypes.models import ContentType

            ct = ContentType.objects.get(app_label=app_label, model=model_name)
            target = ct.get_object_for_this_type(pk=target_id)

            MediaItemRelationService.remove_relation(item, target, relation_type)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception:
            return Response(
                {"error": "Target object not found or relation does not exist"},
                status=status.HTTP_404_NOT_FOUND,
            )


class MediaTagViewSet(viewsets.ModelViewSet):
    """
    ViewSet for MediaTag with hybrid scope support

    Returns system tags (is_system=True) + project-scoped tags for user's projects
    """

    serializer_class = MediaTagSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name"]
    ordering = ["name"]

    def get_queryset(self):
        """Return system tags + project tags for user's projects"""
        from django.db.models import Q

        user_projects = self.request.user.project_memberships.values_list("project_id", flat=True)

        return MediaTag.objects.filter(
            Q(is_system=True) | Q(project_id__in=user_projects)
        ).select_related("project")

    def create(self, request, *args, **kwargs):
        """Create or return existing tag for project"""
        project_id = request.data.get("project_id") or request.query_params.get("project_id")
        if not project_id:
            return Response({"error": "project_id required"}, status=400)

        # Verify access
        if not request.user.project_memberships.filter(project_id=project_id).exists():
            return Response({"error": "Access denied to project"}, status=403)

        name = request.data.get("name")
        if not name:
            return Response({"error": "name required"}, status=400)

        # Use service to get or create tag
        tag, created = MediaTagService.get_or_create_tag(name, project_id)
        serializer = self.get_serializer(tag)
        return Response(serializer.data, status=201 if created else 200)

    @action(detail=False, methods=["get"])
    def available(self, request):
        """List tags available for a specific project"""
        project_id = request.query_params.get("project_id")
        if not project_id:
            return Response({"error": "project_id required"}, status=400)

        # Verify access
        if not request.user.project_memberships.filter(project_id=project_id).exists():
            return Response({"error": "Access denied to project"}, status=403)

        tags = MediaTagService.get_available_tags(project_id)
        serializer = self.get_serializer(tags, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def suggest(self, request):
        """Suggest tags from filename"""
        filename = request.query_params.get("filename")
        if not filename:
            return Response({"error": "filename required"}, status=400)

        candidates = MediaTagService.generate_tags_from_filename(filename)
        return Response(candidates)


class CollectionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Collection with project scoping
    """

    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        """Use detail serializer for retrieve action"""
        if self.action == "retrieve":
            return CollectionDetailSerializer
        return CollectionSerializer

    def get_queryset(self):
        """Filter by projects user has access to"""
        return (
            Collection.objects.filter(project__memberships__user=self.request.user)
            .select_related("project", "created_by")
            .prefetch_related(Prefetch("collectionmembership_set__media_item"))
        )

    def perform_create(self, serializer):
        """Set created_by to current user"""
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["get", "post", "put", "delete"])
    def items(self, request, pk=None):
        """
        Manage collection items
        GET: List items
        POST: Add items {item_ids: []}
        PUT: Reorder {item_ids: []}
        DELETE: Remove items {item_ids: []}
        """
        collection = self.get_object()

        if request.method == "GET":
            items = CollectionService.get_items(collection)
            serializer = MediaItemSerializer(items, many=True)
            return Response(serializer.data)

        item_ids = request.data.get("item_ids", [])
        if not isinstance(item_ids, list):
            return Response(
                {"error": "item_ids must be a list"}, status=status.HTTP_400_BAD_REQUEST
            )

        if request.method == "POST":
            added_items = CollectionService.add_items(collection, item_ids)
            count = len(added_items)
            return Response({"added": count}, status=status.HTTP_201_CREATED)

        if request.method == "PUT":
            CollectionService.reorder_items(collection, item_ids)
            return Response(status=status.HTTP_200_OK)

        if request.method == "DELETE":
            count = CollectionService.remove_items(collection, item_ids)
            return Response({"removed": count}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        """Duplicate collection"""
        collection = self.get_object()
        name = request.data.get("name")

        new_collection = CollectionService.duplicate_collection(
            collection, new_name=name, user=request.user
        )
        serializer = self.get_serializer(new_collection)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
