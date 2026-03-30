"""URL routing for the Notes API.

This module demonstrates DRF router configuration.
The DefaultRouter automatically generates URL patterns for all ViewSet actions.

Generated URLs:
    GET    /api/notes/           - List notes
    POST   /api/notes/           - Create note
    GET    /api/notes/{id}/      - Retrieve note
    PUT    /api/notes/{id}/      - Full update
    PATCH  /api/notes/{id}/      - Partial update
    DELETE /api/notes/{id}/      - Delete note
    GET    /api/notes/recent/    - Get recent notes
    POST   /api/notes/{id}/duplicate/  - Duplicate note
"""

from rest_framework.routers import DefaultRouter

from .views import NoteViewSet

router = DefaultRouter()
router.register(r"notes", NoteViewSet, basename="note")

urlpatterns = router.urls
