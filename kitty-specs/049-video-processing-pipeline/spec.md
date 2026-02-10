# Feature Specification: Video Processing Pipeline

**Feature Branch**: `049-video-processing-pipeline`
**Created**: 2026-02-10
**Status**: Draft
**Input**: User description: "Video transcoding, thumbnail generation, and format conversion for sports content with optional B37 workflow integration for approval flows"

## Clarifications

### Session 2026-02-10

- Q: What is the maximum allowed input video file size? → A: 2 GB (configurable via VIDEO_MAX_FILE_SIZE_MB env var)
- Q: What is the maximum allowed video duration? → A: 15 minutes (focus on short reels/clips; configurable for future extension)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Submit Video for Transcoding (Priority: P1)

A content creator uploads a video file and requests it to be transcoded to specific output formats and quality presets for distribution across platforms.

**Why this priority**: Core functionality - without transcoding, no video pipeline exists. This enables the fundamental value proposition of processing raw footage into platform-ready formats.

**Independent Test**: Can be fully tested by uploading a video file, requesting MP4/720p transcode, and verifying the output file is created with correct format/resolution.

**Acceptance Scenarios**:

1. **Given** a user with project membership, **When** they submit a video file with format=MP4 and quality=720p, **Then** a VideoJob is created with status "queued" and a job ID is returned
2. **Given** a queued transcode job, **When** the Celery worker picks it up, **Then** status updates to "processing" and progress_percent is updated periodically
3. **Given** a processing transcode job, **When** FFmpeg completes successfully, **Then** status updates to "completed", output_file is created, and metadata (duration, resolution) is populated
4. **Given** a processing transcode job, **When** FFmpeg fails, **Then** status updates to "failed" and error_message contains diagnostic information
5. **Given** multiple quality presets requested, **When** job completes, **Then** all requested outputs are generated (e.g., 1080p + 720p + 480p)

---

### User Story 2 - Generate Video Thumbnails (Priority: P1)

A content creator needs thumbnail images extracted from their video at specific timestamps for use as preview images on platforms and in the content calendar.

**Why this priority**: Thumbnails are essential for video preview UX across all platforms. Often needed before full transcoding completes.

**Independent Test**: Can be tested by uploading a video and requesting thumbnail at timestamp 00:05, verifying a JPEG/PNG image is returned.

**Acceptance Scenarios**:

1. **Given** a video file, **When** user requests thumbnail at timestamp "00:00:05", **Then** a single thumbnail image is generated at that frame
2. **Given** a video file, **When** user requests thumbnail grid (e.g., 3x3), **Then** 9 evenly-distributed thumbnails are generated as a composite image
3. **Given** an invalid timestamp (beyond video duration), **When** thumbnail is requested, **Then** job fails with clear error message
4. **Given** thumbnail generation requested, **When** job completes, **Then** output file is linked and dimensions are recorded

---

### User Story 3 - Platform-Specific Export (Priority: P2)

A content creator needs to export videos in platform-specific aspect ratios and formats for Instagram, TikTok, YouTube, and Stories.

**Why this priority**: Critical for TeamReel's social media workflow - content must be properly formatted for each platform's requirements.

**Independent Test**: Can be tested by requesting an Instagram export (1:1 aspect ratio) and verifying the output matches platform specifications.

**Acceptance Scenarios**:

1. **Given** a 16:9 video, **When** user requests Instagram format (1:1), **Then** video is cropped/letterboxed to 1:1 with correct resolution
2. **Given** a video, **When** user requests TikTok format (9:16), **Then** video is converted to vertical format with platform-compliant bitrate
3. **Given** a video, **When** user requests YouTube format (16:9), **Then** video is optimized for YouTube upload with appropriate encoding settings
4. **Given** a video, **When** user requests Stories format (9:16), **Then** video is formatted for 9:16 aspect ratio (Note: automatic segmentation for >60s videos is post-MVP - initial version will validate duration constraints)
5. **Given** a platform preset, **When** export completes, **Then** output metadata includes platform_target field for downstream use

---

### User Story 4 - Video Composition with Overlays (Priority: P2)

A content creator wants to add team branding, player names, scores, or intro/outro sequences to their videos.

**Why this priority**: Brand consistency is key for sports clubs - logos, watermarks, and text overlays are standard requirements.

**Independent Test**: Can be tested by requesting a logo overlay at position top-right and verifying the output contains the overlay.

**Acceptance Scenarios**:

1. **Given** a video and logo image, **When** user requests overlay at position "top-right" with 10% padding, **Then** logo is composited onto video throughout duration
2. **Given** a video, **When** user requests text overlay with "Goal: Player Name", **Then** text is rendered at specified position with configurable font/size/color
3. **Given** a video and intro template, **When** user requests intro prepend, **Then** intro is added before main content with smooth transition
4. **Given** a video and outro template, **When** user requests outro append, **Then** outro is added after main content
5. **Given** composition with multiple overlays, **When** job completes, **Then** all overlays are correctly layered in specified z-order

---

### User Story 5 - Workflow-Integrated Video Approval (Priority: P2)

A club admin wants certain videos to go through an approval workflow before they can be published to social media.

**Why this priority**: Leverages B37 Workflow Engine for content governance - prevents unauthorized content from being published.

**Independent Test**: Can be tested by creating a VideoJob with workflow_instance linked to "Content Approval" template, then executing approval transitions.

**Acceptance Scenarios**:

1. **Given** a VideoJob with workflow integration enabled, **When** job completes successfully, **Then** workflow_instance status remains "pending_approval"
2. **Given** a completed VideoJob pending approval, **When** authorized user approves, **Then** workflow transitions to "approved" and video becomes publishable
3. **Given** a completed VideoJob pending approval, **When** user rejects with reason, **Then** workflow transitions to "rejected" with comment recorded
4. **Given** a VideoJob without workflow integration (workflow_instance=NULL), **When** job completes, **Then** video is immediately available (no approval needed)
5. **Given** any workflow transition on a VideoJob, **When** transition occurs, **Then** TransitionHistory records actor, timestamp, and comments

---

### User Story 6 - Job Status and Progress Monitoring (Priority: P3)

A content creator wants to check the status and progress of their submitted video jobs.

**Why this priority**: Essential for UX - users need feedback on long-running jobs. Foundation for future real-time updates via WebSocket.

**Independent Test**: Can be tested by submitting a job and polling the status endpoint to observe progress updates.

**Acceptance Scenarios**:

1. **Given** a job ID, **When** user queries status, **Then** current status, progress_percent, and processing timestamps are returned
2. **Given** multiple jobs, **When** user lists their jobs, **Then** jobs are returned with pagination, filterable by status and job_type
3. **Given** a failed job, **When** status is queried, **Then** error_message and failure_reason are included
4. **Given** a completed job, **When** status is queried, **Then** output_file reference and processing metadata are included

---

### User Story 7 - HLS Streaming Output (Priority: P3)

A content creator needs to generate HLS (HTTP Live Streaming) output for adaptive bitrate streaming.

**Why this priority**: Required for web/mobile players with varying network conditions. Less common than simple file downloads.

**Independent Test**: Can be tested by requesting HLS output and verifying m3u8 playlist and .ts segment files are generated.

**Acceptance Scenarios**:

1. **Given** a video, **When** user requests HLS output, **Then** master m3u8 playlist is generated with variant playlists
2. **Given** HLS request with multiple quality levels, **When** job completes, **Then** separate streams for each quality are generated
3. **Given** HLS output, **When** accessing master playlist, **Then** segments are playable in standard HLS-compatible players

---

### Edge Cases

- What happens when input file is corrupted or unreadable? → Job fails with status "failed" and descriptive error_message
- What happens when disk space is insufficient? → Job fails with "storage_error" failure_reason, admin notified
- What happens when FFmpeg process crashes? → Celery task retries up to 3 times, then marks as failed
- What happens when user cancels a processing job? → If in 'queued' state, job is immediately cancelled; if 'processing', Celery task termination is attempted
- What happens when input format is unsupported? → Validation fails at submission time with clear error
- What happens when workflow_instance is deleted while job is processing? → Job completes but workflow_instance becomes NULL (orphaned)
- What happens when output file already exists? → Unique filename is generated (UUID suffix)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept video uploads in formats: MP4, MOV, AVI, WebM, MKV with maximum file size of 2 GB and maximum duration of 15 minutes (both configurable)
- **FR-002**: System MUST transcode videos to output formats: MP4 (H.264), WebM (VP9), HLS
- **FR-003**: System MUST support quality presets: 1080p (1920x1080), 720p (1280x720), 480p (854x480), thumbnail (320x180)
- **FR-004**: System MUST track job status with states: queued, processing, completed, failed, cancelled (jobs start in 'queued' state immediately after creation)
- **FR-005**: System MUST update progress_percent during processing (0-100)
- **FR-006**: System MUST generate thumbnails at specified timestamps or as grid layouts
- **FR-007**: System MUST support platform-specific exports: Instagram (1:1, 4:5, 9:16), TikTok (9:16), YouTube (16:9), Stories (9:16)
- **FR-008**: System MUST composite overlays: logos, watermarks, text, intro/outro sequences
- **FR-009**: System MUST process jobs asynchronously via Celery workers
- **FR-010**: System MUST integrate with B22 File Storage for input/output file management
- **FR-011**: System MUST integrate with B35 Media Library for asset organization
- **FR-012**: System MUST optionally integrate with B37 Workflow Engine for approval flows (nullable FK)
- **FR-013**: System MUST store processing metadata: duration, resolution, bitrate, codec, file_size
- **FR-014**: System MUST support job cancellation for queued jobs
- **FR-015**: System MUST retry failed jobs up to 3 times before marking as permanently failed
- **FR-016**: System MUST scope all jobs to projects (B07 integration)
- **FR-017**: System MUST enforce project membership for job access

### Key Entities

- **VideoJob**: Represents a video processing request with job_type (transcode/thumbnail/compose), status, progress, input/output files, optional workflow_instance, and processing metadata
- **VideoPreset**: Defines reusable encoding settings (format, resolution, bitrate, codec) for common use cases
- **VideoOverlay**: Configuration for overlays to be composited onto videos (type, position, content, timing)
- **PlatformExport**: Platform-specific export configuration (platform, aspect_ratio, max_duration, encoding_settings)

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [x] All functionality is reusable across multiple downstream products
- [x] Extension points are clearly documented if product-specific behavior is needed

**Note**: TeamReel-specific platform presets (e.g., exact Instagram specs) are configurable via VideoPreset/PlatformExport models, not hardcoded.

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering and single responsibility per Django app
- [x] No circular dependencies introduced
- [x] Extension points are stable and documented

**Note**: `src/video/` app with services layer for FFmpeg operations. Depends on B22, B35, B15, B37 (all stable).

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained
- [x] Type hints will be used in core modules
- [x] Code will be formatted with Black and linted with Ruff

### Testing (Principle IV)
- [x] Test plan includes pytest + pytest-django tests
- [x] Coverage targets defined (>85%)
- [x] Integration tests planned for key flows

**Note**: FFmpeg calls will be mocked in unit tests; integration tests may use small sample videos.

### Security & Privacy (Principle V)
- [x] Secure defaults (CSRF, secure cookies, ALLOWED_HOSTS) maintained
- [x] No secrets in code; env vars/secret managers documented
- [x] Authentication/authorization handled through centralized mechanisms
- [x] No sensitive data will be logged

**Note**: Project membership enforced for all job access. No file paths logged.

### Performance & Reliability (Principle VI)
- [x] No N+1 queries (query optimization plan documented if applicable)
- [x] Pagination implemented for unbounded responses
- [x] Structured logging and metrics hooks included
- [x] Graceful degradation strategy defined for failure scenarios

**Note**: Video processing is async (Celery). Job listing uses cursor pagination. Failed jobs include diagnostic info.

### API Design (Principle VII)
- [x] DRF standards followed
- [x] API responses are consistent and documented
- [x] Breaking changes use versioning or deprecation paths
- [x] Validation occurs at boundary (serializers/forms)

### Documentation (Principle XI)
- [x] Feature documentation plan included
- [x] Extension guide updates identified if applicable
- [x] ADR planned if major architectural decision involved

### Delivery & Integration (Principle XIII)
- [x] Migration plan is production-safe (no destructive operations)
- [x] Seed data (fixtures/factories) requirements identified
- [x] Admin registration requirements identified
- [x] API documentation (Swagger) requirements defined
- [x] Demo app integration plan included (if applicable)
- [x] Manual test file location identified

**Violations Requiring Justification**: None

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Video transcode jobs complete within 2x the source video duration for 1080p standard preset on typical worker hardware (baseline: 4 CPU cores, excludes queue wait time)
- **SC-002**: Thumbnail generation completes within 5 seconds per thumbnail for videos up to 1 hour
- **SC-003**: System successfully processes 95% of submitted jobs (5% acceptable failure rate for edge cases)
- **SC-004**: All supported input formats (MP4, MOV, AVI, WebM, MKV) are correctly detected and processed
- **SC-005**: Platform-specific exports meet target platform's published specifications (aspect ratio, resolution, bitrate)
- **SC-006**: Workflow-integrated jobs correctly enforce approval before allowing downstream use
- **SC-007**: Users can monitor job progress with updates at least every 10% completion
- **SC-008**: Failed jobs include actionable error messages that help users understand the issue

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/video/jobs/` | Create a new video job (transcode/thumbnail/compose) |
| GET | `/api/v1/video/jobs/` | List jobs (paginated, filterable by status, type) |
| GET | `/api/v1/video/jobs/{id}/` | Get job details including status and output |
| DELETE | `/api/v1/video/jobs/{id}/` | Cancel a queued job |
| POST | `/api/v1/video/jobs/{id}/retry/` | Retry a failed job |
| GET | `/api/v1/video/presets/` | List available encoding presets |
| GET | `/api/v1/video/presets/{id}/` | Get preset details |
| GET | `/api/v1/video/platforms/` | List platform export configurations |

## Dependencies

- **B07 Projects**: Jobs scoped to projects, membership checks
- **B08 Authentication**: User context for job ownership
- **B15 Background Tasks**: Celery for async job processing
- **B22 File Storage**: Input/output file management, presigned URLs
- **B35 Media Library**: Asset organization and metadata
- **B37 Workflow Engine**: Optional approval workflow integration

## Out of Scope

- Real-time video streaming (live video)
- Live video capture/recording
- AI-based video analysis (object detection, scene recognition)
- Video editing UI (frontend responsibility)
- Audio-only processing (separate feature)
- DRM/encryption (future enhancement)
