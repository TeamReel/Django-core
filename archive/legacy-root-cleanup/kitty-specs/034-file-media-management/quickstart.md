# Quickstart: File & Media Management
*Path: [kitty-specs/034-file-media-management/quickstart.md](kitty-specs/034-file-media-management/quickstart.md)*

## 1. Setup

Ensure you have the `files` app installed in `INSTALLED_APPS`.

```python
# config/settings/base.py
INSTALLED_APPS += ["files"]
```

## 2. Configuration

Configure storage settings in your `.env` or settings file.

```python
# config/settings/base.py
FILE_UPLOAD_MAX_SIZE = 10 * 1024 * 1024  # 10MB
FILE_STORAGE_BACKEND = "files.backends.local.LocalStorageBackend" # or S3
```

## 3. Usage (Backend)

```python
from files.services import FileService

# Upload a file
file_asset = FileService.upload(
    file_obj=request.FILES['file'],
    user=request.user,
    organization=request.user.organization,
    is_public=False
)

# Get download URL
url = FileService.get_download_url(file_asset)
```

## 4. Usage (Frontend)

Use the `FileUpload` component from the design system.

```tsx
import { FileUpload } from '@django-core/design-system';

<FileUpload
  onUploadComplete={(file) => console.log('Uploaded:', file)}
  acceptedTypes={['image/*', 'application/pdf']}
  maxSize={10 * 1024 * 1024}
/>
```
