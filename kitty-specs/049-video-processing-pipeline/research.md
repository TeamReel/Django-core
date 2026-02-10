# Research: Video Processing Pipeline

**Feature**: B55 Video Processing Pipeline
**Date**: 2026-02-10
**Status**: Complete

## Executive Summary

This document captures research findings for implementing a video processing pipeline using FFmpeg subprocess calls with Celery task queues and AWS S3 storage integration.

## Decision Log

### D1: FFmpeg Execution Strategy

**Decision**: Subprocess calls via `subprocess.run()`

**Rationale**:
- Simplest approach with full control over encoding parameters
- No vendor lock-in or per-video processing costs
- FFmpeg installed in Docker image (`apt-get install ffmpeg`)
- Railway workers support custom Dockerfiles
- Proven pattern used by major platforms (Netflix, YouTube started similarly)

**Alternatives Considered**:
- Docker sidecar: Added complexity, shared volume management
- AWS MediaConvert: €0.02-0.05/min = €300-750/month at 1000 videos
- Hybrid approach: Premature optimization

### D2: Celery Queue Architecture

**Decision**: Tiered queues (`video_fast`, `video_slow`, `default`)

**Rationale**:
- Thumbnails (5s) shouldn't wait behind transcodes (30 min)
- Each queue scales independently on Railway
- Future modules (B54, B58) can add their own queues
- Clear separation of concerns for monitoring

**Queue Configuration**:
```python
CELERY_TASK_ROUTES = {
    'video.tasks.generate_thumbnail': {'queue': 'video_fast'},
    'video.tasks.extract_metadata': {'queue': 'video_fast'},
    'video.tasks.transcode_video': {'queue': 'video_slow'},
    'video.tasks.compose_video': {'queue': 'video_slow'},
}
```

**Worker Deployment**:
- `worker-video-fast`: concurrency=2 (I/O bound)
- `worker-video-slow`: concurrency=1 (CPU bound, memory intensive)
- `worker-default`: concurrency=4 (emails, webhooks)

### D3: Temporary File Storage

**Decision**: Worker local disk (`/tmp/video_jobs/{job_id}/`)

**Rationale**:
- Fastest I/O performance
- No additional infrastructure (EFS = €50-100/month)
- Idempotent retry: failed job downloads from S3 again
- Auto-cleanup in task `finally` block
- Railway workers have sufficient ephemeral storage (8GB)

**Flow**:
1. Download input from S3 → `/tmp/video_jobs/{job_id}/input/`
2. FFmpeg processes → `/tmp/video_jobs/{job_id}/output/`
3. Upload result to S3
4. Delete temp directory (always, via `finally`)

### D4: Video Constraints

**Decision**: Max 2GB file size, 15 minutes duration (both configurable)

**Rationale**:
- Focus on short-form content (Instagram Reels, TikTok, YouTube Shorts)
- 15 min covers: highlights (5-15 min), training clips, lineup videos
- 2GB accommodates 4K source at reasonable bitrate
- Limits ensure predictable processing time (~30 min max)
- Configurable via `VIDEO_MAX_FILE_SIZE_MB` and `VIDEO_MAX_DURATION_SECONDS`

## Technical Research

### FFmpeg Command Patterns

**Transcode to MP4 (H.264)**:
```bash
ffmpeg -i input.mov -c:v libx264 -preset medium -crf 23 \
  -c:a aac -b:a 128k -movflags +faststart \
  -vf "scale=1280:720" output.mp4
```

**Transcode to WebM (VP9)**:
```bash
ffmpeg -i input.mov -c:v libvpx-vp9 -crf 30 -b:v 0 \
  -c:a libopus -b:a 128k output.webm
```

**Generate HLS**:
```bash
ffmpeg -i input.mp4 -c:v libx264 -c:a aac \
  -hls_time 10 -hls_playlist_type vod \
  -hls_segment_filename "segment_%03d.ts" output.m3u8
```

**Extract Thumbnail**:
```bash
ffmpeg -i input.mp4 -ss 00:00:05 -vframes 1 thumbnail.jpg
```

**Thumbnail Grid (3x3)**:
```bash
ffmpeg -i input.mp4 -vf "select='not(mod(n,300))',scale=320:180,tile=3x3" \
  -frames:v 1 grid.jpg
```

**Platform-Specific Crops**:
```bash
# Instagram 1:1
ffmpeg -i input.mp4 -vf "crop=min(iw\,ih):min(iw\,ih),scale=1080:1080" out.mp4

# TikTok/Stories 9:16
ffmpeg -i input.mp4 -vf "crop=ih*9/16:ih,scale=1080:1920" out.mp4
```

### Progress Tracking

FFmpeg supports progress output via `-progress pipe:1`:
```python
process = subprocess.Popen(
    ['ffmpeg', '-i', input, '-progress', 'pipe:1', output],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
)
for line in process.stdout:
    if line.startswith(b'out_time_ms='):
        current_ms = int(line.split(b'=')[1])
        progress = (current_ms / total_duration_ms) * 100
        update_job_progress(job_id, progress)
```

### S3 Integration (B22)

Existing B22 File Storage provides:
- `FileService.upload(file, path)` → S3 key
- `FileService.download(key)` → file stream
- `FileService.get_presigned_url(key, expires)` → temporary URL
- `File` model with metadata (size, mime_type, checksum)

Integration pattern:
```python
# Download for processing
input_path = file_service.download_to_temp(input_file.storage_key)

# Upload result
output_key = file_service.upload(output_path, f"video/{job_id}/output.mp4")
```

### B37 Workflow Integration

Optional FK to `WorkflowInstance` enables approval flows:
```python
class VideoJob(models.Model):
    workflow_instance = models.ForeignKey(
        'workflows.WorkflowInstance',
        on_delete=models.SET_NULL,
        null=True, blank=True,
    )
```

When `workflow_instance` is set:
- Job completion triggers workflow evaluation
- Video not "publishable" until workflow reaches approved state
- Rejection records reason in TransitionHistory

### Error Handling Strategy

1. **Validation errors** (format, size, duration): Reject at API level, no job created
2. **Processing errors** (FFmpeg crash): Retry up to 3 times with exponential backoff
3. **Storage errors** (S3 unavailable): Retry with exponential backoff
4. **Timeout errors**: Mark as failed after 2x expected duration

```python
@celery_app.task(
    bind=True,
    autoretry_for=(subprocess.CalledProcessError, S3Error),
    retry_backoff=60,
    retry_backoff_max=3600,
    max_retries=3,
)
def transcode_video(self, job_id: str):
    ...
```

## Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| FFmpeg | 6.x | Video processing |
| ffmpeg-python | 0.2.0 | Python FFmpeg bindings (optional, for complex filters) |
| celery | existing | Async task processing |
| boto3 | existing | S3 integration (via B22) |

## Security Considerations

1. **Input validation**: Verify file magic bytes match claimed MIME type
2. **Resource limits**: Timeout FFmpeg processes, limit temp disk usage
3. **No path injection**: Use job UUIDs for temp directories, never user input
4. **Presigned URLs**: Output files accessed via expiring S3 URLs only
5. **Project scoping**: All jobs scoped to projects, membership enforced

## Performance Targets

| Operation | Target | Measurement |
|-----------|--------|-------------|
| Thumbnail generation | < 5s | For videos up to 1 hour |
| Transcode (15 min source) | < 30 min | Standard quality presets |
| API response (job create) | < 500ms | Return job ID immediately |
| Progress updates | Every 10% | Via database polling or WebSocket |

## Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| FFmpeg execution method? | Subprocess calls |
| Queue strategy? | Tiered (fast/slow/default) |
| Temp storage? | Worker local disk |
| Max file size? | 2GB (configurable) |
| Max duration? | 15 minutes (configurable) |
