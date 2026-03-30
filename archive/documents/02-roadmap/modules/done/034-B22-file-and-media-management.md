# B22: File & Media Management

**Phase:** 9
**Status:** ✅ Ready (Metadata seeded)
**Module ID:** 034
**Category:** Backend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 34. B22 – File & Media Management

**Doel**: Generieke file upload/download met storage adapters, image processing en tenant-scoped permissions.

**Waarom agnostisch**: File handling is universeel - avatars, documents, product images, media libraries.

**Wat moet er gebeuren**:
- **FileAsset model**: owner (User), org/project scope (FK), MIME type, size, storage path
- **Storage adapters**: Local filesystem (dev) + S3 interface (prod)
  - Adapter pattern: `StorageBackend` interface
  - Implementations: `LocalStorage`, `S3Storage`, `AzureBlobStorage`
- **Image processing**: Thumbnails, resize, crop (Pillow)
  - Generate thumbnails on upload (async via B15)
  - Support JPEG, PNG, GIF, WebP
  - EXIF stripping (privacy)
- **Permissions**: ACL integration (B08), tenant-scoped access
  - Org-scoped: all org members can view
  - Project-scoped: only project members can view
  - User-scoped: only owner can view
- **API endpoints**:
  - `POST /api/files/upload` (multipart/form-data, progress tracking)
  - `GET /api/files/:id/download` (presigned URLs for S3, direct download for local)
  - `DELETE /api/files/:id` (soft delete, audit log via B09)
  - `GET /api/files/` (list files, filtered by scope)
- **Validation**:
  - File size limits (configurable, default 10MB)
  - MIME type whitelist (images, PDFs, office docs)
  - Virus scan hooks (ClamAV integration optional, async)
- **Audit trail**: B09 integration for upload/download/delete events

**Demo Requirements**:
- 📁 **File Upload Page** (`/demo/files`):
  - Drag-and-drop upload zone
  - Progress bar (chunked upload for large files)
  - Preview for images (thumbnails)
  - File list with download/delete actions
  - Permission indicators (org/project/user scope)
  - Tests: upload image → see thumbnail → download → delete → verify audit log

**Status**: 🚧 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B22-file-media-management

[feature summary]
Provide tenant-scoped file and media management with storage adapters, image processing, and ACL-enforced access.

[goals]
- Generic file upload/download for any use case
- Storage adapter interface (local/S3/Azure)
- Image thumbnails and basic transformations
- Tenant isolation and ACL enforcement
- Audit trail for all file operations

[demo requirements]
Demo page: /demo/files
- Drag-and-drop upload zone
- File list with thumbnails
- Download (presigned URL), delete actions
- Tests: upload → thumbnail → download → delete
```

---
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Feature Specification: File & Media Management
*Path: [kitty-specs/034-file-media-management/spec.md](../../../../kitty-specs/034-file-media-management/spec.md)*

**Feature Branch**: `034-file-media-management`
**Created**: 2025-12-15
**Status**: Draft
**Input**: User description: "B22 File & Media Management - Interface + LocalStorage"

## Clarifications

### Session 2025-12-18
- Q: Thumbnail generation strategy? → A: Asynchronous via Celery (Option B).
- Q: Public file access? → A: Support Public via `is_public` flag (Option B).
- Q: Deletion strategy? → A: Hybrid (Soft delete immediately, async hard delete later) (Option C).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload File Asset (Priority: P1)

As a user, I want to upload a file (image, document) so that I can store it in the system for later use.

**Why this priority**: Core functionality. Without upload, the system has no data to manage.

**Independent Test**: Can be tested via API (Postman/Swagger) or a simple test UI. Upload a file, verify it exists on disk (local storage) and in the database.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** I POST a file to the upload endpoint, **Then** the file is saved to the configured storage backend (local disk), a `FileAsset` record is created, and I receive the file metadata in response.
2. **Given** an invalid file type (if restricted), **When** I attempt upload, **Then** I receive a 400 error.

---

### User Story 2 - Retrieve File URL (Priority: P1)

As a user, I want to get a public or signed URL for a file so that I can display it in the frontend or download it.

**Why this priority**: Essential for consuming the uploaded content.

**Independent Test**: Upload a file, get its ID, request its URL, and verify the URL opens the file.

**Acceptance Scenarios**:

1. **Given** a valid `FileAsset` ID, **When** I request the file details, **Then** I receive a URL that resolves to the actual file content.

---

### User Story 3 - List My Files (Priority: P2)

As a user, I want to see a list of files I have uploaded so that I can manage them.

**Why this priority**: Basic management capability.

**Independent Test**: Upload multiple files, call the list endpoint, verify all files appear.

**Acceptance Scenarios**:

1. **Given** I have uploaded 3 files, **When** I request the file list, **Then** I see 3 `FileAsset` records.
2. **Given** I am in Organization A, **When** I list files, **Then** I do not see files from Organization B (multi-tenancy check).

---

### User Story 4 - Delete File (Priority: P3)

As a user, I want to delete a file so that I can remove obsolete content and free up space.

**Why this priority**: Lifecycle management.

**Independent Test**: Upload a file, delete it via API, verify it is gone from DB and storage.

**Acceptance Scenarios**:

1. **Given** an existing file, **When** I send a DELETE request, **Then** the `FileAsset` is marked as deleted (`is_deleted=True`), the file remains on disk temporarily, and it disappears from standard lists.

### Edge Cases

- **Storage Failure**: What happens if the disk is full or permissions are denied? (Should return 500 with clear error log).
- **Duplicate Filenames**: How do we handle two files named "report.pdf"? (Should auto-rename or namespacing via UUID).
- **Large Files**: What is the max size? (Enforce limit, e.g., 10MB for MVP).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST implement a `StorageBackend` interface with methods: `save(file, path)`, `delete(path)`, `exists(path)`, `url(path, signed=True)`.
- **FR-002**: System MUST provide a `LocalStorageBackend` implementation of the interface for development/demo purposes.
- **FR-003**: System MUST provide stub implementations for `S3StorageBackend` and `AzureStorageBackend` (raising NotImplementedError or logging warning).
- **FR-004**: System MUST persist file metadata in a `FileAsset` model (original name, storage path, size, mime type, uploaded_by, organization, is_public).
- **FR-005**: System MUST enforce multi-tenancy (users can only access private files within their organization; public files are accessible to everyone).
- **FR-006**: System MUST generate unique storage paths to prevent filename collisions (e.g., `{org_id}/{uuid}/{filename}`).
- **FR-007**: System MUST generate image thumbnails asynchronously using Celery tasks to avoid blocking the request thread.
- **FR-008**: System MUST implement "Soft Delete" (mark `is_deleted=True`) for API delete operations.
- **FR-009**: System MUST implement a scheduled task (Celery Beat) to permanently remove soft-deleted files and records older than 30 days (configurable).

### Technical Requirements

- **TR-001**: Use Django's `FileField` or handle storage manually via the interface pattern (Decision: Use Interface pattern wrapping Django's storage API or custom logic to ensure switchability).
- **TR-002**: API endpoints MUST be RESTful (DRF).
- **TR-003**: Code MUST be typed (mypy) and tested (pytest).

## Architecture & Design

### Data Models

```python
class FileAsset(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey('orgs.Organization', on_delete=models.CASCADE, related_name='assets')
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    original_name = models.CharField(max_length=255)
    storage_path = models.CharField(max_length=1024, unique=True) # The key used by the backend
    file_size = models.PositiveIntegerField()
    mime_type = models.CharField(max_length=100)
    is_public = models.BooleanField(default=False)

    # Soft Delete support
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    # Metadata for future extensibility (e.g. image dimensions)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['organization', 'created_at']),
        ]
```

### Interface Definition

```python
class StorageBackend(ABC):
    @abstractmethod
    def save(self, file_obj: IO, path: str) -> str:
        """Save file and return the storage path/key"""
        pass

    @abstractmethod
    def delete(self, path: str) -> bool:
        """Delete file at path"""
        pass

    @abstractmethod
    def get_url(self, path: str) -> str:
        """Get public/signed URL"""
        pass
```

## Demo Plan

**Visual Verification**:
Since this is a backend-heavy feature, the demo will use a simple "File Manager" page in the frontend (or a raw HTML form if React is too heavy for this iteration, but React is preferred given the stack).

1.  **Upload**: Drag & drop a file.
2.  **List**: See the file appear in a grid/list.
3.  **View**: Click the file to open it in a new tab.
4.  **Delete**: Click trash icon, file disappears.

## Constitution v1.1.0 Compliance Check

- [x] **Demo Discipline**: Demo plan included.
- [x] **Database Integrity**: FKs to Organization and User defined.
- [x] **Performance**: Indexes on filtering fields (organization).
- [x] **Integration Testing**: Will test the LocalStorage adapter integration.
