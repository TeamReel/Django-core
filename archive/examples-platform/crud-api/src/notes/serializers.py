"""Serializers for the Notes API.

This module demonstrates DRF serializer best practices including:
- ModelSerializer usage
- Read-only fields
- Custom field validation
- Nested representation
"""

from rest_framework import serializers

from .models import Note


class NoteSerializer(serializers.ModelSerializer):
    """Serializer for Note model.

    Provides JSON representation of Note objects with:
    - Read-only author field (set automatically from request.user)
    - Read-only timestamps
    - Title validation (minimum 3 characters)

    Example:
        >>> serializer = NoteSerializer(note)
        >>> serializer.data
        {
            'id': 1,
            'title': 'My Note',
            'content': 'Note content...',
            'author': 'user@example.com',
            'created_at': '2025-12-05T10:00:00Z',
            'updated_at': '2025-12-05T10:00:00Z'
        }
    """

    author = serializers.ReadOnlyField(source="author.email")

    class Meta:
        model = Note
        fields = [
            "id",
            "title",
            "content",
            "author",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "author", "created_at", "updated_at"]

    def validate_title(self, value: str) -> str:
        """Validate that the title is at least 3 characters.

        Args:
            value: The title value to validate.

        Returns:
            The validated title.

        Raises:
            ValidationError: If title is less than 3 characters.
        """
        if len(value) < 3:
            raise serializers.ValidationError(
                "Title must be at least 3 characters."
            )
        return value


class NoteListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for note lists.

    Excludes content for faster list views.
    """

    author = serializers.ReadOnlyField(source="author.email")

    class Meta:
        model = Note
        fields = ["id", "title", "author", "created_at"]
        read_only_fields = ["id", "author", "created_at"]
