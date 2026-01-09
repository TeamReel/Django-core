"""Tests for the Notes API.

This module demonstrates pytest-django testing patterns including:
- Fixture-based test setup
- API client testing
- Permission testing
- CRUD operation verification
"""

import pytest
from rest_framework import status

from notes.models import Note


@pytest.mark.django_db
class TestNotesAPI:
    """Test suite for Notes CRUD operations."""

    # ==================== CREATE Tests ====================

    def test_create_note_success(self, authenticated_client):
        """Test successful note creation."""
        response = authenticated_client.post(
            "/api/notes/",
            {"title": "Test Note", "content": "Test content"},
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["title"] == "Test Note"
        assert response.data["content"] == "Test content"
        assert "id" in response.data
        assert "created_at" in response.data

    def test_create_note_without_auth_fails(self, api_client):
        """Test that unauthenticated users cannot create notes."""
        response = api_client.post(
            "/api/notes/",
            {"title": "Test Note", "content": "Test content"},
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_note_short_title_fails(self, authenticated_client):
        """Test that title validation rejects short titles."""
        response = authenticated_client.post(
            "/api/notes/",
            {"title": "AB", "content": "Test content"},
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "title" in response.data

    def test_create_note_missing_title_fails(self, authenticated_client):
        """Test that title is required."""
        response = authenticated_client.post(
            "/api/notes/",
            {"content": "Test content"},
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "title" in response.data

    # ==================== READ Tests ====================

    def test_list_notes_returns_own_notes_only(self, authenticated_client, user, other_user):
        """Test that list only returns the current user's notes."""
        # Create notes for both users
        Note.objects.create(title="My Note", content="Content", author=user)
        Note.objects.create(title="Other Note", content="Content", author=other_user)

        response = authenticated_client.get("/api/notes/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["title"] == "My Note"

    def test_retrieve_note_success(self, authenticated_client, user):
        """Test retrieving a specific note."""
        note = Note.objects.create(
            title="My Note",
            content="My content",
            author=user,
        )

        response = authenticated_client.get(f"/api/notes/{note.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "My Note"
        assert response.data["content"] == "My content"

    def test_retrieve_nonexistent_note_returns_404(self, authenticated_client):
        """Test that retrieving a nonexistent note returns 404."""
        response = authenticated_client.get("/api/notes/99999/")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    # ==================== UPDATE Tests ====================

    def test_update_own_note_success(self, authenticated_client, user):
        """Test updating own note."""
        note = Note.objects.create(
            title="Original Title",
            content="Original content",
            author=user,
        )

        response = authenticated_client.patch(
            f"/api/notes/{note.id}/",
            {"title": "Updated Title"},
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "Updated Title"
        assert response.data["content"] == "Original content"

    def test_full_update_own_note_success(self, authenticated_client, user):
        """Test full update of own note."""
        note = Note.objects.create(
            title="Original",
            content="Original",
            author=user,
        )

        response = authenticated_client.put(
            f"/api/notes/{note.id}/",
            {"title": "New Title", "content": "New content"},
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "New Title"
        assert response.data["content"] == "New content"

    def test_update_others_note_forbidden(self, authenticated_client, other_user):
        """Test that updating another user's note is forbidden."""
        note = Note.objects.create(
            title="Other's Note",
            content="Content",
            author=other_user,
        )

        response = authenticated_client.patch(
            f"/api/notes/{note.id}/",
            {"title": "Hacked Title"},
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    # ==================== DELETE Tests ====================

    def test_delete_own_note_success(self, authenticated_client, user):
        """Test deleting own note."""
        note = Note.objects.create(
            title="To Delete",
            content="Content",
            author=user,
        )

        response = authenticated_client.delete(f"/api/notes/{note.id}/")

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Note.objects.filter(id=note.id).exists()

    def test_delete_others_note_forbidden(self, authenticated_client, other_user):
        """Test that deleting another user's note is forbidden."""
        note = Note.objects.create(
            title="Other's Note",
            content="Content",
            author=other_user,
        )

        response = authenticated_client.delete(f"/api/notes/{note.id}/")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert Note.objects.filter(id=note.id).exists()

    # ==================== Custom Actions Tests ====================

    def test_recent_notes_action(self, authenticated_client, user):
        """Test the recent notes custom action."""
        # Create 7 notes
        for i in range(7):
            Note.objects.create(
                title=f"Note {i}",
                content="Content",
                author=user,
            )

        response = authenticated_client.get("/api/notes/recent/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 5  # Only returns 5 most recent

    def test_duplicate_note_action(self, authenticated_client, user):
        """Test the duplicate note custom action."""
        note = Note.objects.create(
            title="Original Note",
            content="Original content",
            author=user,
        )

        response = authenticated_client.post(f"/api/notes/{note.id}/duplicate/")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["title"] == "Copy of Original Note"
        assert response.data["content"] == "Original content"
        assert Note.objects.count() == 2


@pytest.mark.django_db
class TestNoteModel:
    """Test suite for Note model."""

    def test_note_str_representation(self, user):
        """Test the string representation of a note."""
        note = Note.objects.create(
            title="Test Title",
            content="Test content",
            author=user,
        )

        assert str(note) == "Test Title"

    def test_note_ordering(self, user):
        """Test that notes are ordered by created_at descending."""
        note1 = Note.objects.create(title="First", content="...", author=user)
        note2 = Note.objects.create(title="Second", content="...", author=user)
        note3 = Note.objects.create(title="Third", content="...", author=user)

        notes = list(Note.objects.all())

        assert notes[0] == note3
        assert notes[1] == note2
        assert notes[2] == note1

    def test_note_auto_timestamps(self, user):
        """Test that created_at and updated_at are set automatically."""
        note = Note.objects.create(
            title="Test",
            content="Content",
            author=user,
        )

        assert note.created_at is not None
        assert note.updated_at is not None
