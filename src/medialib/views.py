"""
B35 Smart Asset Library - API ViewSets
"""
from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Prefetch
from .models import MediaItem, MediaTag, Collection
from .serializers import (
    MediaItemSerializer,
    MediaTagSerializer,
    CollectionSerializer,
    CollectionDetailSerializer,
)
from .tasks import process_media_item
from .services.tags import MediaTagService


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
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "description"]
    ordering_fields = ["created_at", "updated_at", "title", "file_size_bytes"]
    ordering = ["-created_at"]

    def get_queryset(self):
        """Filter by projects user has access to"""
        queryset = (
            MediaItem.objects.filter(project__memberships__user=self.request.user)
            .select_related("file", "project", "created_by")
            .prefetch_related("tags")
        )

        # Filter by state
        state = self.request.query_params.get("state")
        if state:
            queryset = queryset.filter(state=state)

        # Filter by tags
        tags = self.request.query_params.get("tags")
        if tags:
            tag_slugs = tags.split(",")
            queryset = queryset.filter(tags__slug__in=tag_slugs).distinct()

        # Filter by MIME type prefix
        mime_type = self.request.query_params.get("mime_type")
        if mime_type:
            queryset = queryset.filter(mime_type__startswith=mime_type)

        return queryset

    def perform_create(self, serializer):
        """Set created_by to current user and trigger metadata extraction"""
        instance = serializer.save(created_by=self.request.user)
        # Trigger async metadata extraction
        process_media_item.delay(str(instance.id))


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

    @action(detail=True, methods=["post"])
    def add_item(self, request, pk=None):
        """Add a media item to the collection"""
        collection = self.get_object()
        media_item_id = request.data.get("media_item_id")
        position = request.data.get("position", collection.items.count())

        if not media_item_id:
            return Response({"error": "media_item_id required"}, status=400)

        try:
            media_item = MediaItem.objects.get(id=media_item_id, project=collection.project)
        except MediaItem.DoesNotExist:
            return Response({"error": "Media item not found in this project"}, status=404)

        # Create membership
        from .models import CollectionMembership

        CollectionMembership.objects.get_or_create(
            collection=collection, media_item=media_item, defaults={"position": position}
        )

        return Response({"status": "added"})

    @action(detail=True, methods=["post"])
    def remove_item(self, request, pk=None):
        """Remove a media item from the collection"""
        collection = self.get_object()
        media_item_id = request.data.get("media_item_id")

        if not media_item_id:
            return Response({"error": "media_item_id required"}, status=400)

        from .models import CollectionMembership

        CollectionMembership.objects.filter(
            collection=collection, media_item_id=media_item_id
        ).delete()

        return Response({"status": "removed"})
