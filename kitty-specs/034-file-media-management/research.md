# Research: File & Media Management
*Path: [kitty-specs/034-file-media-management/research.md](kitty-specs/034-file-media-management/research.md)*

## Decisions

### 1. Storage Backend Interface
- **Decision**: Implement a custom `StorageBackend` interface wrapping Django's storage API.
- **Rationale**: Allows switching between Local (dev) and S3/Azure (prod) without changing application code. Django's `DEFAULT_FILE_STORAGE` is good, but a custom wrapper allows us to enforce tenant isolation logic and signed URL generation more explicitly.
- **Alternatives**: Using Django's storage API directly (less control over signed URLs), using a third-party library like `django-storages` directly (tight coupling).

### 2. Thumbnail Generation
- **Decision**: Asynchronous generation via Celery.
- **Rationale**: Prevents blocking the request thread during upload. Better user experience and scalability.
- **Alternatives**: Synchronous (simpler but blocks), On-demand (latency on first view).

### 3. API List Response Strategy
- **Decision**: Exclude download URLs from the list endpoint.
- **Rationale**: Performance and scalability. Generating signed URLs for a list of 50+ files is expensive and prevents caching. Clients must request a specific file ID to get a download URL.
- **Alternatives**: Include URLs (performance hit), Hybrid (inconsistent).

### 4. Frontend Component
- **Decision**: Add `FileUpload` component to `@django-core/design-system`.
- **Rationale**: Reusability across the Core platform. Ensures consistent UI/UX.
- **Alternatives**: Local implementation (faster but creates technical debt).

### 5. Deletion Strategy
- **Decision**: Hybrid (Soft Delete immediately, Async Hard Delete after 30 days).
- **Rationale**: Safety (undo capability) combined with GDPR compliance and storage optimization (eventual cleanup).
- **Alternatives**: Hard delete (risky), Soft delete only (storage bloat).

## Unknowns & Risks
- **Risk**: Large file uploads might timeout. **Mitigation**: Implement chunked uploads in the frontend component and backend handler.
- **Risk**: Virus scanning. **Mitigation**: Add a hook for ClamAV scanning in the async processing pipeline (out of scope for MVP but architected for).
