---
lane: "for_review"
agent: "claude"
shell_pid: "13484"
---
# WP03: Async Processing
*Tasks: T011, T012, T013, T014, T015*

## Context
File processing (thumbnails) and maintenance (cleanup) should happen asynchronously to keep the API responsive. We will use Celery.

## Requirements
1.  **Thumbnail Generation**:
    *   Create a Celery task `generate_thumbnail(file_id)`.
    *   Use `Pillow` to resize images (e.g., max 300x300).
    *   Save the thumbnail to storage (e.g., `thumbnails/{uuid}.jpg`).
    *   Update `FileAsset` with the thumbnail path/URL (you might need to add a `thumbnail` field to the model in this step if not added in WP01).
2.  **Triggering**:
    *   Call `generate_thumbnail.delay()` after a successful upload in `FileViewSet` (or use a post-save signal).
3.  **Cleanup Task**:
    *   Create a Celery task `cleanup_deleted_files`.
    *   Query `FileAsset`s where `deleted_at` is older than 30 days.
    *   Delete the physical file from storage.
    *   Delete the database record (Hard Delete).
    *   Configure this to run daily via Celery Beat.
4.  **Tests**:
    *   Unit tests for the tasks.
    *   Mock the storage backend to avoid actual file I/O during tests.
    *   Mock `timezone.now` to test the 30-day cleanup logic.

## Definition of Done
- Uploading an image triggers a background task.
- Thumbnails are generated and linked to the asset.
- `cleanup_deleted_files` correctly identifies and removes old soft-deleted records.
- Tests pass.

## Activity Log

- 2025-12-18T09:56:00Z – claude – shell_pid=13484 – lane=for_review – All WP03 tasks complete - Async processing ready for review
