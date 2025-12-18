# Tasks: File & Media Management
*Path: [kitty-specs/034-file-media-management/tasks.md](kitty-specs/034-file-media-management/tasks.md)*

## Work Packages

### WP01: Backend Foundation
**Goal**: Establish the `files` app, data model, and storage abstraction layer.
**Priority**: P0 (Blocker)
**Independent Test**: Can create `FileAsset` records via Django shell and verify files are saved to disk via `LocalStorageBackend`.

- [x] **T001**: Create `files` Django app and register in settings.
- [x] **T002**: Implement `StorageBackend` interface and `LocalStorageBackend` (plus S3 stub).
- [x] **T003**: Define `FileAsset` model with fields and indexes.
- [x] **T004**: Create migrations and run them.
- [x] **T005**: Write unit tests for `LocalStorageBackend` (save, exists, delete, url).

### WP02: API Implementation
**Goal**: Expose REST endpoints for file management with security and multi-tenancy.
**Priority**: P0 (Blocker)
**Independent Test**: Can upload, list, and delete files via Postman/curl.

- [x] **T006**: Create `FileAssetSerializer` (read) and `FileUploadSerializer` (write).
- [x] **T007**: Implement `FileViewSet` with `list`, `create`, `retrieve`, `destroy`.
- [x] **T008**: Implement `download` action to return signed/public URLs.
- [x] **T009**: Enforce multi-tenancy permissions (org-scoped access).
- [x] **T010**: Write integration tests for all endpoints (happy path + error cases).

### WP03: Async Processing
**Goal**: Offload heavy processing (thumbnails) and maintenance (cleanup) to background workers.
**Priority**: P1 (Core Feature)
**Independent Test**: Upload an image and verify thumbnail appears later; Soft delete a file and verify it's gone after cleanup task runs (mocked time).

- [ ] **T011**: Configure Celery for `files` app (if not already global).
- [ ] **T012**: Implement `generate_thumbnail` task using Pillow.
- [ ] **T013**: Trigger thumbnail generation on file upload (view or signal).
- [ ] **T014**: Implement `cleanup_deleted_files` task for soft-deleted assets.
- [ ] **T015**: Write tests for tasks (mocking storage and Celery).

### WP04: Frontend Component
**Goal**: Create a reusable, accessible file upload component in the Design System.
**Priority**: P1 (UX)
**Independent Test**: View component in Storybook, verify drag-and-drop and progress states.

- [ ] **T016**: Scaffold `FileUpload` component in `@django-core/design-system`.
- [ ] **T017**: Implement drag-and-drop zone with visual feedback.
- [ ] **T018**: Implement file selection and progress bar state.
- [ ] **T019**: Add Storybook stories for all states (idle, dragging, uploading, error, success).
- [ ] **T020**: Write unit tests (Vitest) for component logic.

### WP05: Demo & Integration
**Goal**: Prove the feature works end-to-end in the demo shell.
**Priority**: P2 (Verification)
**Independent Test**: Full user flow: Upload -> List -> Download -> Delete on the demo page.

- [ ] **T021**: Create `/demo/files` route and page in `examples/demo-shell`.
- [ ] **T022**: Integrate `FileUpload` component with `POST /api/files/upload`.
- [ ] **T023**: Fetch and display file list (with thumbnails if available).
- [ ] **T024**: Implement delete action (soft delete) in the UI.
- [ ] **T025**: Document manual verification steps in `DEMO_TEST_GUIDE.md`.
- [ ] **T026**: Implement Playwright E2E tests for file upload flow.
