---
lane: "doing"
agent: "GitHub Copilot"
shell_pid: "13484"
---
# WP01: Backend Foundation
*Tasks: T001, T002, T003, T004, T005*

## Context
We are initializing the `files` app for Feature 034 (File & Media Management). This foundation includes the Django app structure, the data model for file assets, and a storage abstraction layer that supports local development and can be extended for S3.

## Requirements
1.  **Create App**: Initialize `src/django_core/apps/files`.
2.  **Storage Backend**:
    *   Define an interface `StorageBackend` (protocol or abstract base class).
    *   Implement `LocalStorageBackend` using Django's default storage or `FileSystemStorage`.
    *   Ensure it handles file saving, retrieval, and deletion.
3.  **Data Model (`FileAsset`)**:
    *   `id`: UUID (PK).
    *   `organization`: FK to Organization (multi-tenancy).
    *   `uploaded_by`: FK to User.
    *   `file`: FileField (using the storage backend).
    *   `original_filename`: CharField.
    *   `file_size`: BigIntegerField.
    *   `mime_type`: CharField.
    *   `is_public`: BooleanField (default False).
    *   `deleted_at`: DateTimeField (nullable, for soft delete).
    *   `created_at`, `updated_at`: Timestamps.
    *   **Indexes**: On `organization`, `uploaded_by`, `deleted_at`.
4.  **Migrations**: Create and apply.
5.  **Tests**: Unit tests for the `LocalStorageBackend` and basic model creation.

## Definition of Done
- `files` app is installed in `INSTALLED_APPS`.
- `FileAsset` model exists and migrations are applied.
- `LocalStorageBackend` is working and tested.
- `pytest` passes for the new tests.

## Activity Log

- 2025-12-18T09:15:34Z – GitHub Copilot – shell_pid= – lane=doing – Started implementation
