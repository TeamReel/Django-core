# Implementation Plan: Video Processing Pipeline

**Branch**: `049-video-processing-pipeline` | **Date**: 2026-02-10 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/kitty-specs/049-video-processing-pipeline/spec.md`

## Summary

Build a Django app (`src/video/`) providing FFmpeg-based video processing with:
- VideoJob model tracking transcode/thumbnail/compose jobs with status progression
- Support for MP4/WebM/HLS output formats with quality presets (1080p/720p/480p/thumb)
- Thumbnail extraction at timestamps and grid layouts
- Platform-specific exports (Instagram, TikTok, YouTube, Stories)
- Video composition with overlays, text, intro/outro
- Celery async workers with tiered queues (video_fast, video_slow)
- Optional B37 workflow integration for approval flows

## Technical Context

**Language/Version**: Python 3.12+
**Primary Dependencies**: Django 5.x, DRF, Celery, FFmpeg (subprocess), boto3 (via B22)
**Storage**: PostgreSQL (models), AWS S3 (video files via B22)
**Testing**: pytest + pytest-django, mocked FFmpeg calls
**Target Platform**: Railway (Docker containers)
**Project Type**: Django app (src/video/)
**Performance Goals**: Transcode < 2x video duration, thumbnails < 5s
**Constraints**: Max 2GB file size, max 15 min duration, tiered Celery queues
**Scale/Scope**: 1000+ videos/month, short-form content focus

### Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| FFmpeg Execution | Subprocess calls | Simple, full control, no vendor costs |
| Celery Queues | Tiered (video_fast, video_slow, default) | Isolation, independent scaling |
| Temp Storage | Worker local `/tmp/video_jobs/` | Fast I/O, auto-cleanup, idempotent retry |
| File Storage | AWS S3 (existing B22) | Already integrated |
| Workflow Integration | Optional B37 FK | Approval flows when needed |

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Purpose and Scope
- [x] **Product-Agnostic**: Video processing is generic, platform presets are configurable
- [x] **Core Focus**: Extends media capabilities (B22, B35)
- [x] **Downstream Extension**: Custom presets/processors via extension points

### II. Architecture and Modularity
- [x] **Single Responsibility**: `src/video/` handles video processing only
- [x] **Stable APIs**: REST API with OpenAPI spec
- [x] **Minimal Dependencies**: FFmpeg (essential), existing B07/B08/B15/B22/B35/B37
- [x] **No Circular Deps**: video → files, workflows (one-way)
- [x] **No Downstream Imports**: Core does not import from products

### III. Code Quality and Style
- [x] **Python 3.12+**: Maintained
- [x] **Type Hints**: Throughout core modules
- [x] **Black Formatting**: Enforced
- [x] **Ruff Linting**: Enforced
- [x] **No Dead Code**: Clean implementation
- [x] **Readable Code**: Service layer pattern
- [x] **Curated Dependencies**: FFmpeg only new system dep

### IV. Testing Strategy
- [x] **pytest + pytest-django**: Yes
- [x] **Test Coverage**: >85% target
- [x] **Regression Tests**: Included
- [x] **Deterministic**: Mocked FFmpeg calls
- [x] **Coverage Thresholds**: Models >90%, API >85%
- [x] **Integration Tests**: Key flows tested

### V. Security and Privacy
- [x] **Secure Defaults**: Project membership enforced
- [x] **DEBUG Off**: Via environment
- [x] **No Secrets**: S3 creds via env vars
- [x] **Dependency Scanning**: CI pipeline
- [x] **Centralized Auth**: B08 authentication
- [x] **No Sensitive Logging**: No file paths logged

### VI. Performance and Reliability
- [x] **No N+1 Queries**: select_related for FKs
- [x] **Pagination**: Job listing paginated
- [x] **Explicit Caching**: No caching needed (async jobs)
- [x] **Structured Logging**: Job status logging
- [x] **Health Checks**: Celery worker health
- [x] **Metrics Hooks**: Job duration, success rate
- [x] **Graceful Degradation**: Retry with backoff

### VII. UX and API Design
- [x] **DRF Required**: Yes
- [x] **Consistent Responses**: Standard format
- [x] **Versioning Strategy**: /api/v1/video/
- [x] **Clear Errors**: Descriptive error messages
- [x] **Boundary Validation**: Serializer validation

### VIII. Developer Experience and Tooling
- [x] **Easy Setup**: quickstart.md provided
- [x] **Mandatory Tools**: Configured
- [x] **Pre-commit Hooks**: Match CI
- [x] **Type Checking**: mypy clean
- [x] **Task Scripts**: Celery commands documented
- [x] **Developer Docs**: README + quickstart

### IX. Branching and Git Workflow
- [x] **Feature Branch**: `049-video-processing-pipeline`
- [x] **Linked to Spec**: PR will reference spec
- [x] **Focused PRs**: Work packages
- [x] **main Stable**: No direct commits

### X. CI/CD and Quality Gates
- [x] **CI Checks**: All gates pass
- [x] **Merge Gates**: Required
- [x] **Scripted Deployment**: Railway config

### XI. Documentation and Knowledge Sharing
- [x] **In-Repo Docs**: kitty-specs/049/
- [x] **App README**: src/video/README.md
- [x] **Getting Started**: quickstart.md
- [x] **Extension Guide**: Processor extension documented
- [x] **Spec Sync**: Maintained
- [x] **ADR Required**: FFmpeg subprocess decision documented

### XII. Constitution Evolution
- [x] **No Constitution Changes**: None required
- [x] **Template Updates**: None required

### XIII. Feature Delivery & Production Integration
- [x] **Migrations Ready**: Production-safe, no destructive ops
- [x] **Seed Data Planned**: System presets, platform exports
- [x] **Admin Registration**: All models in admin
- [x] **API Documentation**: OpenAPI spec complete
- [x] **Demo Integration**: N/A (backend only)
- [x] **Manual Test File**: Will be created
- [x] **Documentation**: README + quickstart

### Violations Requiring Justification

None.

**Constitution Check Status**: ✅ PASS

## Project Structure

### Documentation (this feature)

```
kitty-specs/049-video-processing-pipeline/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── openapi.yaml     # API contract
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks/               # Work packages (Phase 2)
```

### Source Code (repository root)

```
src/video/
├── __init__.py
├── apps.py
├── admin.py
├── models/
│   ├── __init__.py
│   ├── job.py           # VideoJob model
│   ├── preset.py        # VideoPreset model
│   ├── platform.py      # PlatformExport model
│   └── overlay.py       # VideoOverlay model
├── serializers/
│   ├── __init__.py
│   ├── job.py
│   ├── preset.py
│   └── platform.py
├── views/
│   ├── __init__.py
│   ├── job.py           # VideoJob ViewSet
│   ├── preset.py        # VideoPreset ViewSet
│   └── platform.py      # PlatformExport ViewSet
├── services/
│   ├── __init__.py
│   ├── video_service.py # Main service
│   └── processors/
│       ├── __init__.py
│       ├── base.py      # BaseVideoProcessor ABC
│       ├── transcode.py # TranscodeProcessor
│       ├── thumbnail.py # ThumbnailProcessor
│       └── compose.py   # ComposeProcessor
├── tasks/
│   ├── __init__.py
│   ├── transcode.py     # Celery transcode task
│   ├── thumbnail.py     # Celery thumbnail task
│   └── compose.py       # Celery compose task
├── management/
│   └── commands/
│       └── seed_video_presets.py
├── urls.py
└── README.md

tests/video/
├── __init__.py
├── conftest.py          # Fixtures, mocked FFmpeg
├── test_models.py
├── test_serializers.py
├── test_api.py
├── test_services.py
├── test_tasks.py
└── test_processors.py
```

**Structure Decision**: Standard Django app structure with service layer pattern for FFmpeg operations. Processors are strategy pattern for different job types.

## Complexity Tracking

No violations requiring justification.

## Phase 0 Complete

See [research.md](research.md) for:
- FFmpeg command patterns
- Progress tracking approach
- Error handling strategy
- S3 integration patterns
- B37 workflow integration

## Phase 1 Complete

Artifacts generated:
- [data-model.md](data-model.md) - 4 models with full schema
- [contracts/openapi.yaml](contracts/openapi.yaml) - 8 API endpoints
- [quickstart.md](quickstart.md) - Setup and usage guide

## Next Steps

Run `/spec-kitty.tasks` to generate work packages for implementation.
