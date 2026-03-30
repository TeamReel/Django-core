# B22: Files & Media

## 1. Purpose & Responsibility
The **Files** module manages user-uploaded content. It abstracts the storage backend (S3, Local) and provides metadata management.

**Responsibilities:**
*   **Storage Abstraction:** Stores references (`storage_path`) to the actual file.
*   **Metadata:** Tracks size, mime-type, and ownership.
*   **Access Control:** Enforces Organisation-level boundaries.

## 2. Domain-Agnostic Rationale
Handling files directly on disk is fragile in cloud environments. This module uses a database record (`FileAsset`) to track files, allowing the actual binary data to live in object storage (S3/R2).

## 3. Key Concepts & Data Model

### 3.1 FileAsset (`src/files/models.py`)
The metadata record.
*   **`organization`**: The owner tenant.
*   **`storage_path`**: The key in the storage bucket.
*   **`original_name`**: Filename as uploaded.
*   **`mime_type`**: Content type (e.g., `image/png`).
*   **`is_public`**: If true, can be accessed without auth (e.g., avatars).
*   **`thumbnail_path`**: Path to generated thumbnail (if image).

## 4. Public Interfaces (API)
*   **Upload:** Typically involves a pre-signed URL flow or direct upload depending on config.
*   **Download:** Generates temporary signed URLs for private files.

## 5. Integrations & Dependencies
*   **Storage Backend:** Django Storages (S3, etc.).
*   **Tasks (`tasks`)**: For async processing (thumbnails).

## 6. Status & Phase History
*   **Phase:** 9 (Backend Infrastructure)
*   **Status:** ✅ Ready (Metadata seeded)
*   **Source Code:** `src/files/`
