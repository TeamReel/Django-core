"""Note model for CRUD API demonstration.

This module demonstrates Django model best practices including:
- Proper field definitions with constraints
- Foreign key relationships
- Auto-timestamping
- String representation
- Ordering configuration
"""

from django.conf import settings
from django.db import models


class Note(models.Model):
    """A simple note model for demonstrating CRUD operations.

    Attributes:
        title: The note title (max 200 characters).
        content: The note body text.
        author: The user who created the note.
        created_at: Timestamp when the note was created.
        updated_at: Timestamp when the note was last modified.

    Example:
        >>> note = Note.objects.create(
        ...     title="My First Note",
        ...     content="Hello, World!",
        ...     author=user
        ... )
        >>> print(note)
        My First Note
    """

    title = models.CharField(
        max_length=200,
        help_text="The title of the note",
    )
    content = models.TextField(
        help_text="The main content of the note",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notes",
        help_text="The user who created this note",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the note was created",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="When the note was last updated",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "note"
        verbose_name_plural = "notes"

    def __str__(self) -> str:
        """Return the note title as string representation."""
        return self.title
