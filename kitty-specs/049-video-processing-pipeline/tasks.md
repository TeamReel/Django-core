# Work Packages: Video Processing Pipeline

**Feature**: B55 Video Processing Pipeline
**Branch**: `049-video-processing-pipeline`
**Inputs**: Design documents from `kitty-specs/049-video-processing-pipeline/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/openapi.yaml ✓, quickstart.md ✓

**Tests**: Included per Constitution Principle IV (>85% coverage target)

**Organization**: Fine-grained subtasks (`Txxx`) roll up into work packages (`WPxx`). Each work package is independently deliverable and testable.

**Prompt Files**: Each work package references a prompt file in `tasks/planned/`

## Subtask Format: `[Txxx] [P?] Description`
- **[P]** indicates the subtask can proceed in parallel (different files/components).

## Path Conventions
- **Django app**: `src/video/`
- **Tests**: `tests/video/`

---

## Work Package WP01: App Skeleton & Models (Priority: P0)

**Goal**: Create `src/video/` Django app with all 4 models and migrations per data-model.md
**Independent Test**: `python manage.py migrate video` succeeds, models queryable in shell
**Prompt**: `tasks/done/WP01-app-skeleton-and-models.md`

### Included Subtasks
- [x] T001 Create `src/video/` app structure (apps.py, __init__.py, urls.py)
- [x] T002 [P] Create VideoPreset model in `src/video/models/preset.py`
- [x] T003 [P] Create PlatformExport model in `src/video/models/platform.py`
- [x] T004 [P] Create VideoJob model in `src/video/models/job.py`
- [x] T005 [P] Create VideoOverlay model in `src/video/models/overlay.py`
- [x] T006 Create model __init__.py with exports
- [x] T007 Generate and validate migrations
- [x] T008 Register models in Django Admin (`src/video/admin.py`)
- [x] T009 Add app to INSTALLED_APPS in settings

### Constitutional Alignment
- Principle II (Architecture): Single-purpose app, clear model boundaries
- Principle XIII (Delivery): Migrations production-safe, Admin registered

### Dependencies
- None (starting package)

### Risks & Mitigations
- FK to B22 File model → Verify import path, use string reference if needed
- FK to B37 WorkflowInstance → SET_NULL on delete, optional field

---

## Work Package WP02: Serializers & API Views (Priority: P0)

**Goal**: Implement DRF serializers and ViewSets for all 8 API endpoints per openapi.yaml
**Independent Test**: Swagger UI shows all endpoints, CRUD operations work
**Prompt**: `tasks/done/WP02-serializers-and-api-views.md`

### Included Subtasks
- [x] T010 [P] Create VideoJobSerializer (list, detail, create variants)
- [x] T011 [P] Create VideoPresetSerializer
- [x] T012 [P] Create PlatformExportSerializer
- [x] T013 [P] Create VideoOverlaySerializer (nested in job)
- [x] T014 Create VideoJobViewSet with list, retrieve, create, destroy, retry actions
- [x] T015 [P] Create VideoPresetViewSet (read-only)
- [x] T016 [P] Create PlatformExportViewSet (read-only, filterable)
- [x] T017 Configure URL routing in `src/video/urls.py`
- [x] T018 Register URLs in main API router
- [x] T019 Add project membership permission checks
- [x] T020 Add pagination to job listing

### Constitutional Alignment
- Principle VII (API Design): DRF, pagination, consistent responses
- Principle V (Security): Project membership enforced

### Dependencies
- Depends on WP01 (models must exist)

### Risks & Mitigations
- Permission complexity → Reuse existing B07 project membership mixins
- Nested serializer validation → Use separate create/update serializers

---

## Work Package WP03: Video Service & Processors (Priority: P1) 🎯 MVP

**Goal**: Implement VideoService and processor classes for FFmpeg operations
**Independent Test**: `VideoService.create_job()` creates job, processor generates correct FFmpeg command
**Prompt**: `tasks/planned/WP03-video-service-and-processors.md`

### Included Subtasks
- [ ] T021 Create BaseVideoProcessor ABC in `src/video/services/processors/base.py`
- [ ] T022 [P] Create TranscodeProcessor with FFmpeg command generation
- [ ] T023 [P] Create ThumbnailProcessor with timestamp/grid support
- [ ] T024 [P] Create ComposeProcessor with overlay support
- [ ] T025 Create VideoService in `src/video/services/video_service.py`
- [ ] T026 Implement job creation with validation (size, duration, format)
- [ ] T027 Implement progress tracking callback mechanism
- [ ] T028 Implement S3 download/upload integration (via B22)
- [ ] T029 Implement temp directory management with cleanup
- [ ] T030 Add structured logging for all operations

### Constitutional Alignment
- Principle II (Architecture): Service layer pattern, strategy pattern for processors
- Principle VI (Performance): Structured logging, progress tracking

### Dependencies
- Depends on WP01 (models), WP02 (serializers for validation)

### Risks & Mitigations
- FFmpeg not installed → Add Dockerfile instruction, document in README
- Temp disk full → Cleanup in finally block, monitor disk usage
- Large files → Stream to S3, don't load in memory

---

## Work Package WP04: Celery Tasks & Queue Config (Priority: P1)

**Goal**: Implement Celery tasks with tiered queues (video_fast, video_slow)
**Independent Test**: Task appears in Celery inspect, job status updates correctly
**Prompt**: `tasks/planned/WP04-celery-tasks-and-queue-config.md`

### Included Subtasks
- [ ] T031 Configure tiered Celery queues in settings
- [ ] T032 [P] Create transcode_video task in `src/video/tasks/transcode.py`
- [ ] T033 [P] Create generate_thumbnail task in `src/video/tasks/thumbnail.py`
- [ ] T034 [P] Create compose_video task in `src/video/tasks/compose.py`
- [ ] T035 Implement retry logic with exponential backoff
- [ ] T036 Implement job status updates (queued → processing → completed/failed)
- [ ] T037 Implement progress_percent updates during processing
- [ ] T038 Wire task dispatch from VideoService.create_job()
- [ ] T039 Add task routing configuration
- [ ] T040 Document worker startup commands

### Constitutional Alignment
- Principle VI (Reliability): Retry with backoff, graceful failure handling
- Principle XI (Documentation): Worker commands documented

### Dependencies
- Depends on WP03 (processors must exist)

### Risks & Mitigations
- Queue misconfiguration → Integration test with actual Celery
- Worker timeout → Set soft/hard time limits per task type
- Lost jobs on crash → Celery acks_late=True

---

## Work Package WP05: B37 Workflow Integration (Priority: P2)

**Goal**: Integrate optional B37 workflow for video approval flows
**Independent Test**: Job with workflow_instance transitions correctly on completion
**Prompt**: `tasks/planned/WP05-workflow-integration.md`

### Included Subtasks
- [ ] T041 Add workflow_instance FK handling in VideoJobSerializer
- [ ] T042 Create workflow on job creation (if template specified)
- [ ] T043 Update workflow state on job completion
- [ ] T044 Add workflow status to job detail response
- [ ] T045 Prevent downstream use of unapproved videos (publishable flag)
- [ ] T046 Add workflow transition history to API response

### Constitutional Alignment
- Principle II (Architecture): Clean integration, no circular deps
- Principle I (Product-Agnostic): Workflow is optional, not hardcoded

### Dependencies
- Depends on WP02 (API), WP04 (task completion triggers workflow)
- B37 Workflow Engine must be deployed

### Risks & Mitigations
- B37 not available → Graceful fallback (workflow_instance=NULL)
- Orphaned workflows → SET_NULL on delete, cleanup task

---

## Work Package WP06: Seed Data & Presets (Priority: P2)

**Goal**: Create management command and seed system presets + platform exports
**Independent Test**: `python manage.py seed_video_presets` populates database
**Prompt**: `tasks/planned/WP06-seed-data-and-presets.md`

### Included Subtasks
- [ ] T047 Create seed_video_presets management command
- [ ] T048 Define system presets (1080p_high, 1080p_standard, 720p_standard, 480p_web, thumbnail)
- [ ] T049 Define platform exports (Instagram 1:1/4:5/9:16, TikTok, YouTube, Stories)
- [ ] T050 Use update_or_create for idempotent seeding
- [ ] T051 Mark system presets as is_system=True (read-only in API)
- [ ] T052 Add Railway deployment seed step to docs

### Constitutional Alignment
- Principle XIII (Delivery): Seed data for testing and demo
- Principle VI (Reliability): Idempotent operations

### Dependencies
- Depends on WP01 (models)

### Risks & Mitigations
- Platform spec changes → Document source (Instagram dev docs, etc.)
- Duplicate runs → update_or_create pattern

---

## Work Package WP07: Unit & Integration Tests (Priority: P2)

**Goal**: Achieve >85% test coverage with mocked FFmpeg calls
**Independent Test**: `pytest tests/video/ -v` passes, coverage report shows >85%
**Prompt**: `tasks/planned/WP07-unit-and-integration-tests.md`

### Included Subtasks
- [ ] T053 Create test fixtures and factories in `tests/video/conftest.py`
- [ ] T054 [P] Write model tests in `tests/video/test_models.py` (>90% coverage)
- [ ] T055 [P] Write serializer tests in `tests/video/test_serializers.py`
- [ ] T056 [P] Write API tests in `tests/video/test_api.py` (>85% coverage)
- [ ] T057 [P] Write service tests in `tests/video/test_services.py`
- [ ] T058 [P] Write task tests in `tests/video/test_tasks.py` (mocked Celery)
- [ ] T059 [P] Write processor tests in `tests/video/test_processors.py` (mocked FFmpeg)
- [ ] T060 Create FFmpeg mock fixtures (return sample output)
- [ ] T061 Create S3 mock fixtures (localstack or moto)
- [ ] T062 Add coverage configuration to pytest.ini

### Constitutional Alignment
- Principle IV (Testing): pytest-django, >85% coverage, mocked externals

### Dependencies
- Depends on WP01-WP04 (all code must exist to test)

### Risks & Mitigations
- Flaky tests → No real FFmpeg/S3 calls, all mocked
- Coverage gaps → Run coverage report in CI, fail below threshold

---

## Work Package WP08: Documentation & Polish (Priority: P3)

**Goal**: Complete README, manual test file, mypy compliance, final cleanup
**Independent Test**: `mypy src/video/` passes, README renders correctly
**Prompt**: `tasks/planned/WP08-documentation-and-polish.md`

### Included Subtasks
- [ ] T063 Write `src/video/README.md` per module template
- [ ] T064 Create manual test file in `documents/08-testing/manual-tests/B55-video-processing.md`
- [ ] T065 Run mypy and fix all type errors
- [ ] T066 Run Black and Ruff, fix any issues
- [ ] T067 Update quickstart.md with actual usage examples
- [ ] T068 Add FFmpeg installation to Dockerfile
- [ ] T069 Update CHANGELOG.md with B55 entry
- [ ] T070 Final review of constitutional compliance

### Constitutional Alignment
- Principle III (Code Quality): mypy, Black, Ruff
- Principle XI (Documentation): README, manual tests
- Principle XIII (Delivery): Production-ready

### Dependencies
- Depends on WP01-WP07 (all implementation complete)

### Risks & Mitigations
- mypy errors → Fix incrementally, don't delay
- Missing docs → Use module README template

---

## Summary

| WP | Title | Priority | Subtasks | Parallel | Dependencies |
|----|-------|----------|----------|----------|--------------|
| WP01 | App Skeleton & Models | P0 | T001-T009 (9) | T002-T005 | None |
| WP02 | Serializers & API Views | P0 | T010-T020 (11) | T010-T016 | WP01 |
| WP03 | Video Service & Processors | P1 🎯 | T021-T030 (10) | T022-T024 | WP01, WP02 |
| WP04 | Celery Tasks & Queue Config | P1 | T031-T040 (10) | T032-T034 | WP03 |
| WP05 | B37 Workflow Integration | P2 | T041-T046 (6) | - | WP02, WP04 |
| WP06 | Seed Data & Presets | P2 | T047-T052 (6) | - | WP01 |
| WP07 | Unit & Integration Tests | P2 | T053-T062 (10) | T054-T059 | WP01-WP04 |
| WP08 | Documentation & Polish | P3 | T063-T070 (8) | - | WP01-WP07 |

**Total**: 8 work packages, 70 subtasks

## MVP Scope

**WP01 + WP02 + WP03 + WP04** = Minimum viable video processing pipeline
- Models, API, Service, Celery tasks
- Can transcode videos, generate thumbnails
- ~40 subtasks, ~2-3 days

## Execution Order

```
WP01 (Models)
    ↓
WP02 (API) ──────────────────┬──→ WP06 (Seed Data)
    ↓                        │
WP03 (Service) ──────────────┤
    ↓                        │
WP04 (Celery) ───────────────┼──→ WP05 (Workflow)
    ↓                        │
WP07 (Tests) ←───────────────┘
    ↓
WP08 (Polish)
```
