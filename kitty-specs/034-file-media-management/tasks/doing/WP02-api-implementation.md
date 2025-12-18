---
lane: "doing"
agent: "copilot"
shell_pid: "13484"
---
# WP02: API Implementation
*Tasks: T006, T007, T008, T009, T010*

## Context
We need to expose the `FileAsset` model via a REST API. This API must be secure (multi-tenancy), performant (exclude signed URLs from lists), and support file uploads and downloads.

## Requirements
1.  **Serializers**:
    *   `FileAssetSerializer`: For read operations. Should include standard fields.
    *   `FileUploadSerializer`: For write operations. Handles the file upload.
2.  **ViewSet (`FileViewSet`)**:
    *   `list`: Filter by `organization` (from request context). **Do not** generate signed URLs here (performance).
    *   `create`: Handle file upload. Set `uploaded_by` and `organization` automatically.
    *   `retrieve`: Return details.
    *   `destroy`: Implement **Soft Delete** (set `deleted_at`).
3.  **Download Action**:
    *   `@action(detail=True, methods=['get'])`
    *   Returns a JSON response with a `url` (signed or public) and `expires_in`.
    *   Redirecting directly is also an option, but JSON is preferred for the frontend to handle the window opening.
4.  **Permissions**:
    *   Ensure users can only access files in their active organization.
    *   Public files might be accessible without auth if we were serving them directly, but the *API* to get the URL should probably still be protected or check the `is_public` flag.
5.  **Tests**:
    *   Integration tests using `APIClient`.
    *   Verify tenant isolation (User A cannot see User B's files).
    *   Verify soft delete behavior.

## Definition of Done
- Endpoints `/api/files/` (List, Create) and `/api/files/{id}/` (Retrieve, Delete) are functional.
- `/api/files/{id}/download/` returns a valid URL.
- Tests pass covering all CRUD operations and permission checks.

## Activity Log

- 2025-12-18T09:28:45Z – copilot – shell_pid=13484 – lane=doing – Started implementation
