"""Django admin configuration for the Notes app."""

from django.contrib import admin

from .models import Note


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    """Admin configuration for Note model."""

    list_display = ["title", "author", "created_at", "updated_at"]
    list_filter = ["created_at", "author"]
    search_fields = ["title", "content", "author__email"]
    readonly_fields = ["created_at", "updated_at"]
    ordering = ["-created_at"]

    fieldsets = [
        (None, {"fields": ["title", "content", "author"]}),
        ("Timestamps", {"fields": ["created_at", "updated_at"], "classes": ["collapse"]}),
    ]
