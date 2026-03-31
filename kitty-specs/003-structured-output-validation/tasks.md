# Tasks: Media Pipeline Hardening

**Feature**: 003-structured-output-validation  
**Date**: 2026-03-31  
**Branch**: `main`

---

## Subtask Index

| ID | Subtask | WP | Priority | Parallel |
|----|---------|-----|----------|----------|
| T001 | Create src/media/validation/ directory structure | WP01 | P0 | - |
| T002 | Create ImageValidationError enum | WP01 | P0 | - |
| T003 | Create ImageValidationResult dataclass | WP01 | P0 | - |
| T004 | Implement validate_format() with magic byte check | WP01 | P0 | - |
| T005 | Implement validate_size() with 20MB limit | WP01 | P0 | [P] |
| T006 | Implement validate_dimensions() with 8192x8192 limit | WP01 | P0 | [P] |
| T007 | Create unit tests for ImageValidator | WP01 | P0 | - |
| T008 | Integrate ImageValidator in files/views.py | WP01 | P0 | - |
| T009 | Create retry_config.py module | WP02 | P0 | - |
| T010 | Define GEMINI_RETRY decorator with tenacity | WP02 | P0 | - |
| T011 | Add retry decorator to gemini_image.py API calls | WP02 | P0 | - |
| T012 | Add logging for retry attempts | WP02 | P0 | - |
| T013 | Create tests for retry behavior | WP02 | P0 | - |
| T014 | Create FFmpegErrorCategory enum | WP03 | P1 | - |
| T015 | Create FFmpegError dataclass | WP03 | P1 | - |
| T016 | Implement error pattern matching | WP03 | P1 | - |
| T017 | Create FFmpegErrorParser.parse() method | WP03 | P1 | - |
| T018 | Create tests with real stderr samples | WP03 | P1 | - |
| T019 | Integrate parser in video/services/_common.py | WP03 | P1 | - |
| T020 | Create QualityStatus enum | WP04 | P1 | - |
| T021 | Create VideoQualityResult dataclass | WP04 | P1 | - |
| T022 | Implement VideoQualityChecker.check() method | WP04 | P1 | - |
| T023 | Create tests for quality degradation scenarios | WP04 | P1 | - |
| T024 | Integrate quality checker in minimax_client.py | WP04 | P1 | - |
| T025 | Create MediaOperation and MediaProvider enums | WP05 | P1 | - |
| T026 | Create MediaLogEntry dataclass | WP05 | P1 | - |
| T027 | Create MediaLogger utility class | WP05 | P1 | - |
| T028 | Add log_operation() with structlog | WP05 | P1 | - |
| T029 | Create tests for log format compliance | WP05 | P1 | - |
| T030 | Retrofit existing log calls to MediaLogger | WP05 | P1 | - |

---

## Phase 1: Foundation (P0)

### WP01: Image Validation Module

**Priority**: P0 | **Effort**: 4h | **Dependencies**: None

**Goal**: Create centralized PIL-based image validation that validates format (magic bytes), file size (20MB), and dimensions (8192x8192) before any processing.

**Requirements**: FR-001, FR-002

**Subtasks**:
- [x] T001: Create src/media/validation/ directory structure
- [x] T002: Create ImageValidationError enum
- [x] T003: Create ImageValidationResult dataclass
- [x] T004: Implement validate_format() with magic byte check
- [x] T005: Implement validate_size() with 20MB limit [P]
- [x] T006: Implement validate_dimensions() with 8192x8192 limit [P]
- [x] T007: Create unit tests for ImageValidator
- [x] T008: Integrate ImageValidator in files/views.py

**Prompt**: [WP01-image-validation.md](tasks/WP01-image-validation.md)

**Implementation Sketch**:
1. Create module structure with __init__.py exports
2. Define enums and dataclasses from data-model.md
3. Implement validators using PIL - format check opens image, validates header
4. Add tests covering corrupt images, oversized, wrong format, edge cases
5. Wire into files/views.py upload endpoint before save

**Parallel Opportunities**: T005 and T006 can be developed in parallel after T004.

**Risks**:
- PIL validation overhead on large images - profile and optimize if >100ms
- Backwards compatibility with existing uploads - use soft fail initially

---

### WP02: Gemini Retry

**Priority**: P0 | **Effort**: 2h | **Dependencies**: None

**Goal**: Add tenacity retry decorator to Gemini API calls with exponential backoff (1s → 2s → 4s), max 3 attempts, capped at 30s total.

**Requirements**: FR-003

**Subtasks**:
- [x] T009: Create retry_config.py module
- [x] T010: Define GEMINI_RETRY decorator with tenacity
- [x] T011: Add retry decorator to gemini_image.py API calls
- [x] T012: Add logging for retry attempts
- [x] T013: Create tests for retry behavior

**Prompt**: [WP02-gemini-retry.md](tasks/WP02-gemini-retry.md)

**Implementation Sketch**:
1. Create retry_config.py with configurable retry decorator
2. Define exception types to retry on (RateLimitError, ConnectionError, TimeoutError)
3. Add @GEMINI_RETRY decorator to API methods in gemini_image.py
4. Log retry attempts with attempt number and wait time
5. Test with mocked rate limit responses

**Parallel Opportunities**: WP01 and WP02 are independent and can be built simultaneously.

**Risks**:
- Retry with jitter to avoid thundering herd
- Cap total wait to 30s to prevent blocking user too long

---

## Phase 2: Error Handling (P1)

### WP03: FFmpeg Error Parser

**Priority**: P1 | **Effort**: 3h | **Dependencies**: None

**Goal**: Parse FFmpeg stderr into actionable error categories (OOM, TIMEOUT, CODEC, IO, CORRUPT) for better debugging and user feedback.

**Requirements**: FR-004

**Subtasks**:
- [x] T014: Create FFmpegErrorCategory enum
- [x] T015: Create FFmpegError dataclass
- [x] T016: Implement error pattern matching
- [x] T017: Create FFmpegErrorParser.parse() method
- [x] T018: Create tests with real stderr samples
- [x] T019: Integrate parser in video/services/_common.py

**Prompt**: [WP03-ffmpeg-error-parser.md](tasks/WP03-ffmpeg-error-parser.md)

**Implementation Sketch**:
1. Define FFmpegErrorCategory enum with 5 categories
2. Create FFmpegError dataclass with is_transient property and user_message
3. Build pattern dictionary mapping regexes to categories
4. Implement parse() that scans stderr and returns first matching category
5. Add tests with real production stderr samples
6. Replace raw stderr logging with parsed errors in video services

**Parallel Opportunities**: Can be built in parallel with WP04.

**Risks**:
- Patterns may miss edge cases - log unmatched errors for iteration
- UNKNOWN category as fallback for debugging

---

### WP04: Output Quality Checker

**Priority**: P1 | **Effort**: 3h | **Dependencies**: WP01 (reuses validation patterns)

**Goal**: Verify AI-generated images and videos meet quality thresholds (resolution, dimensions, file size) and mark as DEGRADED if below expected.

**Requirements**: FR-005

**Subtasks**:
- [ ] T020: Create QualityStatus enum
- [ ] T021: Create VideoQualityResult dataclass
- [ ] T022: Implement VideoQualityChecker.check() method
- [ ] T023: Create tests for quality degradation scenarios
- [ ] T024: Integrate quality checker in minimax_client.py

**Prompt**: [WP04-output-quality-checker.md](tasks/WP04-output-quality-checker.md)

**Implementation Sketch**:
1. Define QualityStatus enum: OK, DEGRADED, FAILED
2. Create VideoQualityResult with resolution, duration, warnings
3. Implement check() that compares against thresholds (720p minimum)
4. Test degradation scenarios (low-res, truncated, wrong format)
5. Wire into minimax_client.py after video download

**Parallel Opportunities**: Can be built in parallel with WP03 after WP01.

**Risks**:
- Define clear threshold boundaries to avoid flip-flopping
- DEGRADED should log warning but not fail the job

---

## Phase 3: Observability (P1)

### WP05: Unified Logging

**Priority**: P1 | **Effort**: 2h | **Dependencies**: WP01-04 (retrofits all)

**Goal**: Create structured logging with consistent fields (job_id, provider, operation, duration_ms, status) across all media operations.

**Requirements**: FR-006

**Subtasks**:
- [ ] T025: Create MediaOperation and MediaProvider enums
- [ ] T026: Create MediaLogEntry dataclass
- [ ] T027: Create MediaLogger utility class
- [ ] T028: Add log_operation() with structlog
- [ ] T029: Create tests for log format compliance
- [ ] T030: Retrofit existing log calls to MediaLogger

**Prompt**: [WP05-unified-logging.md](tasks/WP05-unified-logging.md)

**Implementation Sketch**:
1. Define MediaOperation and MediaProvider enums
2. Create MediaLogEntry dataclass with all required fields
3. Build MediaLogger class using structlog.get_logger()
4. Implement log_operation() context manager for timing
5. Add tests verifying log structure
6. Update validators and parsers from WP01-04 to use MediaLogger

**Parallel Opportunities**: None - must wait for WP01-04 to know what to log.

**Risks**:
- Keep logging overhead minimal (<1ms per call)
- Don't break existing log aggregation

---

## Summary

| WP | Title | Subtasks | Priority | Est. Lines | Dependencies |
|----|-------|----------|----------|------------|--------------|
| WP01 | Image Validation Module | 8 | P0 | ~400 | None |
| WP02 | Gemini Retry | 5 | P0 | ~250 | None |
| WP03 | FFmpeg Error Parser | 6 | P1 | ~350 | None |
| WP04 | Output Quality Checker | 5 | P1 | ~300 | WP01 |
| WP05 | Unified Logging | 6 | P1 | ~350 | WP01-04 |

**Total**: 30 subtasks across 5 work packages

**Parallelization**: WP01 + WP02 can run in parallel. WP03 can start early. WP04 waits for WP01 patterns. WP05 waits for all.

**MVP Scope**: WP01 + WP02 (P0 requirements, 13 subtasks, ~6h)

---

## Deferred Requirements (P2)

The following requirements are intentionally deferred to a future iteration:

| ID | Requirement | Priority | Reason |
|----|-------------|----------|--------|
| FR-007 | Circuit breaker: disable provider after 5 consecutive failures | P2 | Nice-to-have, requires monitoring infra |
| FR-008 | Health checks: endpoint per provider for monitoring | P2 | Nice-to-have, requires ops integration |

These will be addressed in a follow-up feature when monitoring infrastructure is ready.

<!-- status-model:start -->
## Canonical Status (Generated)
- WP01: approved
- WP02: approved
- WP03: for_review
<!-- status-model:end -->
