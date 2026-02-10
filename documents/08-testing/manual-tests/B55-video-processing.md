# B55 Video Processing - Manual Test Checklist

**Module**: Video Processing Pipeline (B55)
**Version**: 1.0.0
**Date**: 2026-02-10

## Prerequisites

- [ ] FFmpeg installed and in PATH (`ffmpeg -version` shows 4.4+)
- [ ] Celery workers running
  ```bash
  celery -A src.tasks.celery worker -Q video_fast,video_slow -c 4 --loglevel=info
  ```
- [ ] Redis running and accessible
- [ ] S3 bucket configured with valid credentials
- [ ] Test video file uploaded to S3 (sample: 30s MP4, 1920x1080)
- [ ] Test logo image uploaded to S3 (PNG with transparency)
- [ ] Valid auth token for API requests

## Test Environment

```bash
# Set environment variables
export API_URL="http://localhost:8000/api/v1"
export AUTH_TOKEN="your_jwt_token_here"
export PROJECT_ID="project-uuid-here"
export VIDEO_FILE_ID="video-file-uuid-here"
export LOGO_FILE_ID="logo-file-uuid-here"
```

---

## Test Cases

### TC01: Basic Transcode (Happy Path)

**Objective**: Verify video transcoding with standard preset

**Steps**:
1. POST to `/api/v1/video/jobs/`
   ```bash
   curl -X POST "$API_URL/video/jobs/" \
     -H "Authorization: Bearer $AUTH_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "job_type": "transcode",
       "input_file_id": "'$VIDEO_FILE_ID'",
       "preset_id": "preset-1080p-standard-uuid"
     }'
   ```
2. Verify response status `201 Created`
3. Verify response body contains:
   - `id` (UUID)
   - `status: "queued"`
   - `progress_percent: 0`
   - `input_file` object with URL
4. Poll GET `/api/v1/video/jobs/{id}/` every 2 seconds
5. Wait for `status: "completed"` (typically 10-30s for 30s video)
6. Verify `output_file` has valid `url`
7. Download output file from URL
8. Verify downloaded video:
   - Plays correctly in VLC/browser
   - Resolution matches preset (1920x1080)
   - Duration matches input (±1s)
   - Audio is present

**Expected Result**: ✅ Video transcoded successfully, output playable

**Actual Result**: _____________________

**Status**: ☐ Pass ☐ Fail

---

### TC02: Thumbnail Generation

**Objective**: Verify single frame thumbnail extraction

**Steps**:
1. POST to `/api/v1/video/jobs/`
   ```bash
   curl -X POST "$API_URL/video/jobs/" \
     -H "Authorization: Bearer $AUTH_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "job_type": "thumbnail",
       "input_file_id": "'$VIDEO_FILE_ID'",
       "config": {"timestamp": 5.0, "quality": "high"}
     }'
   ```
2. Verify response status `201 Created`
3. Wait for `status: "completed"` (typically <5s)
4. Verify response contains:
   - `output_file.url` pointing to PNG/JPEG
   - `metadata.thumbnail_url` (same as output_file.url)
5. Download thumbnail image
6. Verify image:
   - Opens correctly in image viewer
   - Frame corresponds to 5s timestamp
   - Resolution reasonable (1920x1080 or scaled)

**Expected Result**: ✅ Thumbnail extracted at correct timestamp

**Actual Result**: _____________________

**Status**: ☐ Pass ☐ Fail

---

### TC03: Platform Export - Instagram Reels

**Objective**: Verify platform-specific export constraints

**Steps**:
1. GET `/api/v1/video/platforms/` to find Instagram Reels config
   ```bash
   curl "$API_URL/video/platforms/" \
     -H "Authorization: Bearer $AUTH_TOKEN"
   ```
2. Note the `platform_export_id` for `platform: "instagram_reels"`
3. POST transcode job with platform export:
   ```bash
   curl -X POST "$API_URL/video/jobs/" \
     -H "Authorization: Bearer $AUTH_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "job_type": "transcode",
       "input_file_id": "'$VIDEO_FILE_ID'",
       "platform_export_id": "instagram-reels-uuid"
     }'
   ```
4. Wait for completion
5. Download output video
6. Verify video meets Instagram Reels specs:
   - Aspect ratio: 9:16 (1080x1920)
   - Duration: ≤90 seconds (trimmed if input longer)
   - Format: MP4 (H.264)
   - Audio: AAC

**Expected Result**: ✅ Video matches Instagram Reels specifications

**Actual Result**: _____________________

**Status**: ☐ Pass ☐ Fail

---

### TC04: Video Composition with Logo Overlay

**Objective**: Verify overlay positioning and rendering

**Steps**:
1. POST compose job with logo overlay:
   ```bash
   curl -X POST "$API_URL/video/jobs/" \
     -H "Authorization: Bearer $AUTH_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "job_type": "compose",
       "input_file_id": "'$VIDEO_FILE_ID'",
       "overlays": [
         {
           "overlay_type": "logo",
           "source_file_id": "'$LOGO_FILE_ID'",
           "position": "bottom_right",
           "scale": 0.2,
           "opacity": 0.8
         }
       ]
     }'
   ```
2. Wait for completion (typically 15-45s)
3. Download output video
4. Verify overlay:
   - Logo visible in bottom-right corner
   - Size approximately 20% of video width
   - Opacity allows seeing video behind
   - Logo present throughout video duration

**Expected Result**: ✅ Logo overlay correctly positioned and rendered

**Actual Result**: _____________________

**Status**: ☐ Pass ☐ Fail

---

### TC05: Text Overlay

**Objective**: Verify text rendering with custom styling

**Steps**:
1. POST compose job with text overlay:
   ```bash
   curl -X POST "$API_URL/video/jobs/" \
     -H "Authorization: Bearer $AUTH_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "job_type": "compose",
       "input_file_id": "'$VIDEO_FILE_ID'",
       "overlays": [
         {
           "overlay_type": "text",
           "text_content": "TeamReel ⚽ 2026",
           "position": "top_center",
           "font_size": 48,
           "font_color": "white",
           "background_color": "black",
           "padding": 10
         }
       ]
     }'
   ```
2. Wait for completion
3. Download output video
4. Verify text overlay:
   - Text visible at top center
   - Font size readable (48px)
   - White text on black background
   - Emoji renders correctly (⚽)

**Expected Result**: ✅ Text overlay rendered with correct styling

**Actual Result**: _____________________

**Status**: ☐ Pass ☐ Fail

---

### TC06: Workflow Integration (B37)

**Objective**: Verify approval workflow creates and transitions

**Prerequisites**: B37 Workflow module installed and configured

**Steps**:
1. Create workflow template via admin (if not exists)
2. POST job with workflow template:
   ```bash
   curl -X POST "$API_URL/video/jobs/" \
     -H "Authorization: Bearer $AUTH_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "job_type": "transcode",
       "input_file_id": "'$VIDEO_FILE_ID'",
       "preset_id": "preset-1080p-standard-uuid",
       "workflow_template_id": "workflow-template-uuid"
     }'
   ```
3. Verify response includes:
   - `workflow_instance.id`
   - `workflow_instance.current_state: "processing"`
4. Wait for job completion
5. GET job detail, verify workflow transitioned:
   - `workflow_instance.current_state: "ready_for_review"`
   - `workflow_status.can_transition` includes "approve" action
   - `publishable: false`
6. Approve workflow via B37 API
7. GET job detail again, verify:
   - `workflow_instance.current_state: "approved"`
   - `publishable: true`
8. Check `workflow_history` contains all transitions

**Expected Result**: ✅ Workflow created, transitioned on completion, publishable after approval

**Actual Result**: _____________________

**Status**: ☐ Pass ☐ Fail

---

### TC07: Error Handling - Invalid File Type

**Objective**: Verify graceful failure for non-video files

**Steps**:
1. Upload a PDF/image file (non-video)
2. POST transcode job with non-video file ID:
   ```bash
   curl -X POST "$API_URL/video/jobs/" \
     -H "Authorization: Bearer $AUTH_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "job_type": "transcode",
       "input_file_id": "'$PDF_FILE_ID'",
       "preset_id": "preset-1080p-standard-uuid"
     }'
   ```
3. Wait for job to fail (typically <5s)
4. GET job detail
5. Verify:
   - `status: "failed"`
   - `error_message` contains clear description (e.g., "Invalid video format")
   - `retry_count: 0` (or attempts made)

**Expected Result**: ✅ Job fails with clear error message

**Actual Result**: _____________________

**Status**: ☐ Pass ☐ Fail

---

### TC08: Job Retry After Failure

**Objective**: Verify retry mechanism for transient failures

**Steps**:
1. Create a failed job (from TC07 or simulate)
2. Note the `job_id`
3. POST retry request:
   ```bash
   curl -X POST "$API_URL/video/jobs/$JOB_ID/retry/" \
     -H "Authorization: Bearer $AUTH_TOKEN"
   ```
4. Verify response status `200 OK`
5. GET job detail
6. Verify:
   - `status: "queued"` (or "processing")
   - `error_message: null` (cleared)
   - `retry_count` incremented

**Expected Result**: ✅ Job requeued with cleared error state

**Actual Result**: _____________________

**Status**: ☐ Pass ☐ Fail

---

### TC09: Job Cancellation

**Objective**: Verify DELETE cancels queued/processing jobs

**Steps**:
1. POST a long-running job (4K transcode or large file)
2. Note the `job_id`
3. Immediately DELETE the job:
   ```bash
   curl -X DELETE "$API_URL/video/jobs/$JOB_ID/" \
     -H "Authorization: Bearer $AUTH_TOKEN"
   ```
4. Verify response status `204 No Content`
5. GET job detail (if still exists)
6. Verify:
   - `status: "cancelled"` (or job deleted)
   - Celery task revoked (no continued processing)

**Expected Result**: ✅ Job cancelled, processing stopped

**Actual Result**: _____________________

**Status**: ☐ Pass ☐ Fail

---

### TC10: List Jobs with Pagination

**Objective**: Verify job list API with filtering and pagination

**Steps**:
1. Create 15 test jobs (mix of transcode/thumbnail/compose)
2. GET jobs list:
   ```bash
   curl "$API_URL/video/jobs/?page=1&page_size=10" \
     -H "Authorization: Bearer $AUTH_TOKEN"
   ```
3. Verify response:
   - `count: 15` (total)
   - `next: <url>` (link to page 2)
   - `results` contains 10 items
4. GET page 2:
   ```bash
   curl "$API_URL/video/jobs/?page=2&page_size=10" \
     -H "Authorization: Bearer $AUTH_TOKEN"
   ```
5. Verify:
   - `results` contains 5 items
   - `previous: <url>` (link to page 1)
6. Test filtering by status:
   ```bash
   curl "$API_URL/video/jobs/?status=completed" \
     -H "Authorization: Bearer $AUTH_TOKEN"
   ```
7. Verify only completed jobs returned

**Expected Result**: ✅ Pagination and filtering work correctly

**Actual Result**: _____________________

**Status**: ☐ Pass ☐ Fail

---

### TC11: Preset and Platform Configuration

**Objective**: Verify reference data endpoints

**Steps**:
1. GET presets list:
   ```bash
   curl "$API_URL/video/presets/" \
     -H "Authorization: Bearer $AUTH_TOKEN"
   ```
2. Verify response contains:
   - `1080p_standard`
   - `720p_mobile`
   - `instagram_reels`
   - Each with `width`, `height`, `fps`, `codec`
3. GET platforms list:
   ```bash
   curl "$API_URL/video/platforms/" \
     -H "Authorization: Bearer $AUTH_TOKEN"
   ```
4. Verify response contains:
   - `instagram_reels` (9:16, 90s max)
   - `tiktok` (9:16, 180s max)
   - `youtube_shorts` (9:16, 60s max)
   - `twitter` (16:9 or 1:1, 140s max)

**Expected Result**: ✅ Reference data complete and accurate

**Actual Result**: _____________________

**Status**: ☐ Pass ☐ Fail

---

## Performance Tests

### PT01: Concurrent Job Processing

**Objective**: Verify multiple jobs process simultaneously

**Steps**:
1. Submit 5 transcode jobs simultaneously (via parallel curl)
2. Monitor Celery worker logs
3. Verify:
   - Multiple jobs processing in parallel (up to worker concurrency)
   - No job blocking others
   - All complete successfully

**Expected Result**: ✅ Concurrent processing works

**Status**: ☐ Pass ☐ Fail

---

### PT02: Queue Separation

**Objective**: Verify fast/slow queue isolation

**Steps**:
1. Submit 2 thumbnail jobs (fast queue)
2. Submit 2 transcode jobs (slow queue)
3. Monitor queue activity:
   ```bash
   celery -A src.tasks.celery inspect active
   ```
4. Verify:
   - Thumbnails go to `video_fast` queue
   - Transcodes go to `video_slow` queue
   - Fast jobs complete quickly (< 10s)
   - Slow jobs run independently

**Expected Result**: ✅ Queue routing works correctly

**Status**: ☐ Pass ☐ Fail

---

## Test Summary

**Total Test Cases**: 13
**Passed**: ___ / 13
**Failed**: ___ / 13
**Blocked**: ___ / 13

**Critical Issues**:
- _____________________

**Non-Critical Issues**:
- _____________________

**Tested By**: _____________________
**Date**: _____________________
**Environment**: _____________________
**Build Version**: _____________________

## Notes

- All API endpoints tested against project-scoped permissions
- FFmpeg version: _____________________
- Celery version: _____________________
- Storage backend: _____________________ (S3/Azure/Local)

## Sign-Off

**Tester**: _____________________ **Date**: _____________________

**Reviewer**: _____________________ **Date**: _____________________
