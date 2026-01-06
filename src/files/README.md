# File & Media Management (B22)

**Status**: ✅ Complete
**Location**: `src/files/`

## Purpose

The Files module manages user-uploaded content with storage backend abstraction, providing metadata tracking, access control, and asynchronous processing capabilities.

## Scope

**✅ Included**:
- FileAsset metadata model with organisation scoping
- Pluggable storage backends (local, S3, R2)
- Public vs private file access modes
- Soft-delete with retention period
- Thumbnail generation via async tasks
- Pre-signed URL generation for private files
- Multi-part upload support (future)

**❌ Excluded** (Product-Agnostic Constraint):
- File versioning (use downstream extensions)
- Collaborative editing (use B23 WebSockets)
- File sharing permissions (use B08 Permissions)
- Custom metadata schemas (use JSONField extension)

## Key Components

### Models
- **`FileAsset`**: Metadata record with UUID primary key, organisation FK, storage path reference, mime type, file size, and thumbnail path

### APIs/Views
- **`GET /api/files/`**: List files in organisation (requires X-Organisation-ID header)
- **`POST /api/files/`**: Upload file to storage backend
- **`GET /api/files/{id}/`**: Retrieve file metadata
- **`GET /api/files/{id}/download/`**: Generate signed download URL (private files)
- **`DELETE /api/files/{id}/`**: Soft-delete file (marks is_deleted=True)

### Services/Managers
- **`get_storage_backend()`**: Returns configured storage backend (S3/local)
- **`generate_signed_url()`**: Creates time-limited download URL
- **`get_file_url()`**: Returns public URL or signed URL based on is_public flag

### Utilities
- **`utils.py`**: Storage backend helpers, MIME type detection, path generation
- **`tasks.py`**: Celery tasks for thumbnail generation and cleanup
- **`backends/`**: Storage backend implementations (S3, local filesystem)

## Public Interface

**Safe to Import** (Stable API):
```python
from files.models import FileAsset
from files.serializers import FileAssetSerializer, FileUploadSerializer
from files.utils import get_storage_backend, get_file_url
```

**Internal Use Only** (May change):
```python
# Do NOT import these from downstream projects
from files.backends.s3 import S3StorageBackend
from files.tasks import generate_thumbnail
```

## Integration Example

**Minimal Working Example**:
```python
from files.models import FileAsset
from files.utils import get_storage_backend, get_file_url
from organisations.models import Organisation

# Upload file programmatically
organisation = Organisation.objects.get(slug="acme-corp")
backend = get_storage_backend()

# Save file to storage
file_content = request.FILES['upload']
storage_path = f"{organisation.id}/{uuid.uuid4()}/{file_content.name}"
backend.save(storage_path, file_content)

# Create metadata record
file_asset = FileAsset.objects.create(
    organization=organisation,
    uploaded_by=request.user,
    original_name=file_content.name,
    storage_path=storage_path,
    file_size=file_content.size,
    mime_type=file_content.content_type,
    is_public=False
)

# Get download URL
download_url = get_file_url(file_asset)
# Returns signed URL with 1-hour expiry for private files

# Generate thumbnail (async)
from files.tasks import generate_thumbnail
generate_thumbnail.delay(file_asset.id)
```

**API Upload Example**:
```python
# Client-side upload via multipart form
import requests

headers = {
    "Authorization": "Bearer <access_token>",
    "X-Organisation-ID": "<org-uuid>"
}

files = {
    'file': open('document.pdf', 'rb')
}

data = {
    'is_public': False
}

response = requests.post(
    "https://api.example.com/api/files/",
    headers=headers,
    files=files,
    data=data
)

file_metadata = response.json()["data"]
```

## Related Modules

**Dependencies** (This module requires):
- [B06 Organisations] - Organisation scoping
- [B05 Accounts] - User ownership tracking
- [B15 Tasks] - Async thumbnail generation
- Django Storages - S3 backend support
- Pillow - Image processing

**Used By** (Modules that depend on this):
- [B07 Projects] - Project file attachments
- [B05 Accounts] - User avatar uploads
- Product-specific modules - Document management, media libraries

## Extension Points

**How Downstream Products Can Extend**:

1. **Custom File Types**:
   ```python
   # your_product/models.py
   from django.db import models
   from files.models import FileAsset

   class DocumentFile(models.Model):
       file_asset = models.OneToOneField(
           FileAsset,
           on_delete=models.CASCADE,
           related_name="document"
       )
       document_type = models.CharField(max_length=50)  # Invoice, Contract, etc.
       status = models.CharField(max_length=20)  # Draft, Approved, etc.
       version = models.IntegerField(default=1)
   ```

2. **Custom Storage Backend**:
   ```python
   # your_product/storage.py
   from files.backends.base import BaseStorageBackend

   class AzureBlobStorage(BaseStorageBackend):
       def save(self, path, content):
           # Azure Blob Storage implementation
           pass

       def get_url(self, path):
           # Generate Azure SAS URL
           pass

   # Configure in settings
   FILE_STORAGE_BACKEND = "your_product.storage.AzureBlobStorage"
   ```

3. **Custom Processing Tasks**:
   ```python
   # your_product/tasks.py
   from celery import shared_task
   from files.models import FileAsset

   @shared_task
   def extract_pdf_text(file_asset_id):
       file_asset = FileAsset.objects.get(id=file_asset_id)
       if file_asset.mime_type == "application/pdf":
           # Extract text for search indexing
           backend = get_storage_backend()
           content = backend.read(file_asset.storage_path)
           text = extract_text_from_pdf(content)
           # Index in search module
   ```

4. **Access Control Hooks**:
   ```python
   # your_product/permissions.py
   from files.models import FileAsset
   from permissions.evaluator import check_permission

   def can_download_file(user, file_asset):
       # Check organisation membership
       if not file_asset.organization.memberships.filter(
           user=user, is_active=True
       ).exists():
           return False

       # Check project-level permissions if file belongs to project
       if hasattr(file_asset, 'project'):
           return check_permission(
               user.id, "files.download",
               resource_id=file_asset.project.id,
               resource_type="project"
           )

       return True
   ```

## Configuration

**Required Settings**:
```python
# settings.py
INSTALLED_APPS = [
    ...
    'files',
    'storages',  # django-storages for S3
]

# Storage Backend (choose one)
FILE_STORAGE_BACKEND = "files.backends.s3.S3StorageBackend"
# or FILE_STORAGE_BACKEND = "files.backends.local.LocalStorageBackend"
```

**Environment Variables for S3**:
```bash
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_STORAGE_BUCKET_NAME=your-bucket-name
AWS_S3_REGION_NAME=us-east-1
AWS_S3_CUSTOM_DOMAIN=cdn.example.com  # Optional CDN

# Cloudflare R2 Configuration (S3-compatible)
AWS_S3_ENDPOINT_URL=https://account.r2.cloudflarestorage.com
AWS_ACCESS_KEY_ID=your-r2-access-key
AWS_SECRET_ACCESS_KEY=your-r2-secret-key
AWS_STORAGE_BUCKET_NAME=your-r2-bucket
```

**Environment Variables for Local Storage**:
```bash
MEDIA_ROOT=/var/www/media  # Local filesystem path
MEDIA_URL=/media/  # URL prefix for serving files
```

**Optional Settings**:
```python
# settings.py (optional)
FILE_UPLOAD_MAX_SIZE = 100 * 1024 * 1024  # 100MB (default: 10MB)
FILE_SIGNED_URL_EXPIRY = 3600  # 1 hour (default: 3600 seconds)
FILE_THUMBNAIL_SIZE = (300, 300)  # Thumbnail dimensions (default: (200, 200))
FILE_ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.png', '.docx']  # Whitelist (default: all)
```

## Testing

**Run Module Tests**:
```bash
pytest tests/files/ -v
```

**Key Test Coverage**:
- ✅ File upload via API
- ✅ Metadata record creation
- ✅ Public vs private URL generation
- ✅ Signed URL expiry validation
- ✅ Soft-delete functionality
- ✅ Thumbnail generation task
- ✅ Storage backend integration (S3 mocked)
- ✅ Organisation access control

## References

- **Spec**: [documents/02-roadmap/modules/done/034-B22-file-and-media-management.md](../../documents/02-roadmap/modules/done/034-B22-file-and-media-management.md)
- **Module Doc**: [documents/04-modules/backend/B22-files.md](../../documents/04-modules/backend/B22-files.md)
- **API Docs**: Auto-generated via drf-spectacular at `/api/schema/`
- **Django Storages**: https://django-storages.readthedocs.io/

## Troubleshooting

**Common Issues**:

1. **Issue**: File upload returns 413 (payload too large)
   - **Cause**: File exceeds `FILE_UPLOAD_MAX_SIZE` or nginx limit
   - **Solution**: Increase `FILE_UPLOAD_MAX_SIZE` in settings and nginx `client_max_body_size`

2. **Issue**: Cannot download private file (403 Forbidden)
   - **Cause**: Signed URL expired or user not in organisation
   - **Solution**: Generate new signed URL via `/api/files/{id}/download/` endpoint

3. **Issue**: S3 uploads failing with authentication error
   - **Cause**: Invalid AWS credentials or missing IAM permissions
   - **Solution**: Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`, ensure IAM policy allows `s3:PutObject`

4. **Issue**: Thumbnails not generating
   - **Cause**: Celery worker not running or Pillow not installed
   - **Solution**: Start Celery worker: `celery -A config worker -l info`, install Pillow: `pip install Pillow`

5. **Issue**: Duplicate filename conflicts
   - **Cause**: Multiple files with same name uploaded
   - **Solution**: Storage path includes UUID to prevent conflicts: `{org_id}/{uuid}/{filename}`

## Migration Notes

**Breaking Changes**:
- **v1.1.0**: Changed storage path format from `{org_id}/{filename}` to `{org_id}/{uuid}/{filename}` for uniqueness

**Deprecations**:
- `FileAsset.url` field (deprecated v1.0): Use `get_file_url(file_asset)` helper instead
