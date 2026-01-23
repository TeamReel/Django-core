# Data Model: File & Media Management
*Path: [kitty-specs/034-file-media-management/data-model.md](kitty-specs/034-file-media-management/data-model.md)*

## Entities

### FileAsset
Represents a file stored in the system.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK, default=uuid4 | Unique identifier |
| `organization` | FK | `on_delete=CASCADE` | The organization that owns this file |
| `uploaded_by` | FK | `on_delete=SET_NULL`, null=True | The user who uploaded the file |
| `original_name` | CharField | max_length=255 | Original filename |
| `storage_path` | CharField | max_length=1024, unique=True | Path/Key in the storage backend |
| `file_size` | PositiveInteger | | Size in bytes |
| `mime_type` | CharField | max_length=100 | MIME type (e.g. image/jpeg) |
| `is_public` | Boolean | default=False | If true, accessible without auth |
| `is_deleted` | Boolean | default=False | Soft delete flag |
| `deleted_at` | DateTime | null=True | When it was soft deleted |
| `metadata` | JSONField | default=dict | Extra data (dimensions, etc) |
| `created_at` | DateTime | auto_now_add=True | Creation timestamp |
| `updated_at` | DateTime | auto_now=True | Update timestamp |

**Indexes:**
- `['organization', 'created_at']` (for listing)
- `['is_deleted', 'deleted_at']` (for cleanup task)

## Relationships

- **Organization (1) -> (N) FileAsset**: An organization has many files.
- **User (1) -> (N) FileAsset**: A user uploads many files.

## Validation Rules

- `file_size` must not exceed configured limit (default 10MB).
- `mime_type` must be in allowed whitelist (configurable).
- `storage_path` must be unique.
