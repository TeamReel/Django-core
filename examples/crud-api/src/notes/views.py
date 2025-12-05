"""Views for the Notes API.

This module demonstrates DRF ViewSet best practices including:
- ModelViewSet for full CRUD
- Custom permissions
- Queryset filtering
- Custom actions
- Automatic author assignment
"""

from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from .models import Note
from .serializers import NoteListSerializer, NoteSerializer


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Custom permission to only allow owners to edit their notes.

    - Safe methods (GET, HEAD, OPTIONS) are allowed for any request.
    - Write methods (POST, PUT, PATCH, DELETE) only allowed for the note author.

    Example:
        >>> permission = IsOwnerOrReadOnly()
        >>> permission.has_object_permission(request, view, note)
        True  # if request.user == note.author
    """

    def has_object_permission(
        self, request: Request, view: viewsets.ViewSet, obj: Note
    ) -> bool:
        """Check if the user has permission for the object.

        Args:
            request: The incoming request.
            view: The view handling the request.
            obj: The Note object being accessed.

        Returns:
            True if permission is granted, False otherwise.
        """
        # Read permissions are allowed for any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions only for the author
        return obj.author == request.user


class NoteViewSet(viewsets.ModelViewSet):
    """ViewSet for Note CRUD operations.

    Provides complete CRUD functionality for notes:
    - list: Get all notes (filtered to current user)
    - create: Create a new note (author set automatically)
    - retrieve: Get a specific note
    - update: Update a note (owner only)
    - partial_update: Partial update (owner only)
    - destroy: Delete a note (owner only)
    - recent: Custom action to get 5 most recent notes

    Example:
        GET /api/notes/           # List user's notes
        POST /api/notes/          # Create new note
        GET /api/notes/1/         # Get note by ID
        PATCH /api/notes/1/       # Update note
        DELETE /api/notes/1/      # Delete note
        GET /api/notes/recent/    # Get 5 most recent
    """

    queryset = Note.objects.all()
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def get_serializer_class(self) -> type[NoteSerializer | NoteListSerializer]:
        """Use lightweight serializer for list action."""
        if self.action == "list":
            return NoteListSerializer
        return NoteSerializer

    def get_queryset(self):
        """Filter notes by current user for list action.

        For list action, only return the current user's notes.
        For other actions (retrieve, update, delete), return all notes
        so that permissions can handle access control.

        Returns:
            QuerySet of Note objects.
        """
        queryset = super().get_queryset()
        if self.action == "list":
            return queryset.filter(author=self.request.user)
        return queryset

    def perform_create(self, serializer: NoteSerializer) -> None:
        """Set the author to the current user when creating a note.

        Args:
            serializer: The validated serializer with note data.
        """
        serializer.save(author=self.request.user)

    @action(detail=False, methods=["get"])
    def recent(self, request: Request) -> Response:
        """Get the 5 most recent notes for the current user.

        Args:
            request: The incoming request.

        Returns:
            Response with serialized notes data.

        Example:
            GET /api/notes/recent/
            Response: [
                {"id": 5, "title": "Latest", ...},
                {"id": 4, "title": "Previous", ...},
                ...
            ]
        """
        recent_notes = self.get_queryset().filter(author=request.user)[:5]
        serializer = NoteListSerializer(recent_notes, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def duplicate(self, request: Request, pk: int = None) -> Response:
        """Create a copy of an existing note.

        Args:
            request: The incoming request.
            pk: The primary key of the note to duplicate.

        Returns:
            Response with the new note data.

        Example:
            POST /api/notes/1/duplicate/
            Response: {"id": 6, "title": "Copy of My Note", ...}
        """
        original_note = self.get_object()
        new_note = Note.objects.create(
            title=f"Copy of {original_note.title}",
            content=original_note.content,
            author=request.user,
        )
        serializer = self.get_serializer(new_note)
        return Response(serializer.data, status=201)
