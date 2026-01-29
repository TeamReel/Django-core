---
work_package_id: WP02
title: User Story 1 - Content Generation
lane: doing
subtasks:
  - T007
  - T008
  - T009
  - T010
  - T011
  - T012
  - T013
  - T014
priority: P1
estimated_effort: 2-3 days
dependencies: [WP01]
assignee: copilot
agent: copilot
shell_pid: "13668"
history:
  - date: 2026-01-29
    action: created
    author: spec-kitty
  - date: 2026-01-29T20:38:00Z
    action: moved_to_doing
    author: github-copilot
    shell_pid: "13668"
    note: "Started WP02: User Story 1 - Content Generation implementation"
---

# WP02: User Story 1 - Content Generation

## Objective

Implement the complete content generation workflow: API endpoints for creating ContentItems, duplicate detection, Celery task for async generation, B23 WebSocket integration for real-time status updates, B22 file storage integration, and B17 notification triggers.

## Context

**User Story**: Queue Content Generation from Template (Priority P1)
**Dependencies**: WP01 (models must exist), Celery + Redis, B22 Files, B23 WebSocket, B17 Notifications

This is the core value proposition of B31. Without content generation, the entire module has no purpose.

**Acceptance Criteria** (from spec.md):
- Team Admin can create ContentItem with status "queued"
- Duplicate detection warns but allows generation
- Background job updates status: queued → generating → completed/failed
- Real-time status updates via WebSocket (polling fallback)
- Output file stored via B22, notifications via B17

---

## Subtasks

### T007: ContentItemSerializer

**Goal**: Create DRF serializer with nested relationships, input_data validation

**Implementation** (`serializers.py`):

```python
from rest_framework import serializers
from .models import ContentItem, ContentTemplate

class ContentItemSerializer(serializers.ModelSerializer):
    template = serializers.PrimaryKeyRelatedField(
        queryset=ContentTemplate.objects.filter(is_active=True)
    )
    template_detail = serializers.SerializerMethodField()
    activity_detail = serializers.SerializerMethodField()
    output_file_detail = serializers.SerializerMethodField()
    created_by_detail = serializers.SerializerMethodField()
    approval_history = serializers.SerializerMethodField()

    class Meta:
        model = ContentItem
        fields = [
            'id', 'template', 'template_detail', 'project', 'activity', 'activity_detail',
            'status', 'input_data', 'output_file', 'output_file_detail', 'error_message',
            'metadata', 'created_by', 'created_by_detail', 'created_at', 'updated_at',
            'approval_history'
        ]
        read_only_fields = ['status', 'output_file', 'error_message', 'metadata', 'created_by', 'created_at', 'updated_at']

    def get_template_detail(self, obj):
        return {'id': obj.template.id, 'name': obj.template.name}

    def get_activity_detail(self, obj):
        if obj.activity:
            return {'id': obj.activity.id, 'name': obj.activity.name}
        return None

    def get_output_file_detail(self, obj):
        if obj.output_file:
            return {
                'id': obj.output_file.id,
                'url': obj.output_file.file.url,
                'thumbnail_url': obj.output_file.thumbnail_url,
                'file_size': obj.output_file.file_size,
                'mime_type': obj.output_file.mime_type
            }
        return None

    def get_created_by_detail(self, obj):
        return {'id': obj.created_by.id, 'username': obj.created_by.username}

    def get_approval_history(self, obj):
        from .serializers import ContentApprovalSerializer
        approvals = obj.contentapproval_set.all().order_by('-reviewed_at')
        return ContentApprovalSerializer(approvals, many=True).data

    def validate_template(self, value):
        if not value.is_active:
            raise serializers.ValidationError("Template is not active")
        return value

    def validate_input_data(self, value):
        # Basic validation - schema validation can be added per template type
        if not isinstance(value, dict):
            raise serializers.ValidationError("input_data must be a valid JSON object")
        return value
```

---

### T008: ContentItemViewSet with Duplicate Detection

**Goal**: Implement ViewSet with create action that checks for in-progress duplicates

**Implementation** (`views.py`):

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import ContentItem, ContentStatus
from .serializers import ContentItemSerializer
from .tasks import generate_content_task

class ContentItemViewSet(viewsets.ModelViewSet):
    queryset = ContentItem.objects.active().select_related(
        'template', 'project', 'activity', 'output_file', 'created_by'
    )
    serializer_class = ContentItemSerializer
    filterset_fields = ['project', 'status', 'template', 'activity']

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Check for existing in-progress generation (duplicate detection)
        template_id = serializer.validated_data['template'].id
        activity_id = serializer.validated_data.get('activity')

        existing = ContentItem.objects.filter(
            template_id=template_id,
            activity_id=activity_id,
            status__in=[ContentStatus.QUEUED, ContentStatus.GENERATING]
        ).first()

        if existing:
            # Warning response but allow user to proceed
            return Response({
                'warning': 'A generation for this template and activity is already in progress',
                'existing_item_id': existing.id,
                'existing_status': existing.status,
                'proceed': True
            }, status=status.HTTP_200_OK)

        # Create ContentItem with status "queued"
        content_item = serializer.save(
            created_by=request.user,
            status=ContentStatus.QUEUED
        )

        # Queue Celery task
        generate_content_task.delay(content_item.id)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
```

---

### T009: Status Polling Endpoint

**Goal**: Custom action for `/items/{id}/status/` (WebSocket fallback)

**Implementation** (`views.py`, add to ContentItemViewSet):

```python
@action(detail=True, methods=['get'], url_path='status')
def status(self, request, pk=None):
    """Get current generation status for polling"""
    item = self.get_object()

    response_data = {
        'id': item.id,
        'status': item.status,
    }

    # Add progress if available in metadata
    if 'progress_percent' in item.metadata:
        response_data['progress_percent'] = item.metadata['progress_percent']
    if 'estimated_completion_seconds' in item.metadata:
        response_data['estimated_completion_seconds'] = item.metadata['estimated_completion_seconds']

    return Response(response_data)
```

---

### T010: Retry Failed Generation

**Goal**: Custom action for `/items/{id}/retry/`

**Implementation** (`views.py`, add to ContentItemViewSet):

```python
@action(detail=True, methods=['post'], url_path='retry')
def retry(self, request, pk=None):
    """Re-queue failed generation"""
    item = self.get_object()

    if item.status not in [ContentStatus.FAILED, ContentStatus.REJECTED]:
        return Response({
            'error': f'Cannot retry content item with status "{item.status}"'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Reset status to queued
    item.status = ContentStatus.QUEUED
    item.error_message = None
    item.save()

    # Re-queue Celery task
    generate_content_task.delay(item.id)

    return Response({
        'id': item.id,
        'status': item.status,
        'message': 'Generation re-queued'
    })
```

---

### T011: Celery Generation Task

**Goal**: Implement async task with timeout, error handling, status updates

**Implementation** (`tasks.py`):

```python
from celery import shared_task
from django.utils import timezone
from .models import ContentItem, ContentStatus

@shared_task(bind=True, soft_time_limit=1800)  # 30 min default
def generate_content_task(self, content_item_id: int):
    """
    Async task for content generation

    Args:
        content_item_id: ID of ContentItem to generate
    """
    from .models import ContentItem
    from src.files.models import FileAsset
    from src.notifications.utils import send_notification

    try:
        # Fetch ContentItem
        item = ContentItem.objects.select_related('template', 'created_by').get(id=content_item_id)

        # Update status to generating
        item.status = ContentStatus.GENERATING
        item.metadata['generation_started_at'] = timezone.now().isoformat()
        item.save()

        # Broadcast status update via WebSocket (see T012)
        from .consumers import broadcast_content_status
        broadcast_content_status(item.id, item.status, progress_percent=0)

        # Call AI workflow (stub for now - B34 integration)
        # TODO: Replace with actual B34 integration
        ai_output = call_ai_workflow(
            workflow_id=item.template.ai_workflow_id,
            input_data=item.input_data,
            timeout=item.template.timeout_minutes or 30
        )

        # Store output file via B22
        output_file = FileAsset.objects.create(
            file=ai_output['file_path'],
            uploaded_by=item.created_by,
            project=item.project
        )

        # Update ContentItem
        item.output_file = output_file
        item.status = ContentStatus.COMPLETED
        item.metadata['generation_completed_at'] = timezone.now().isoformat()
        item.metadata['generation_duration_seconds'] = (
            timezone.now() - timezone.datetime.fromisoformat(item.metadata['generation_started_at'])
        ).total_seconds()
        item.save()

        # Broadcast completion
        broadcast_content_status(item.id, item.status, progress_percent=100)

        # Send notification (B17)
        send_notification(
            user=item.created_by,
            notification_type='content_generation_completed',
            message=f'Content generation completed: {item.template.name}',
            related_object=item
        )

    except Exception as e:
        # Handle failure
        item.status = ContentStatus.FAILED
        item.error_message = str(e)
        item.metadata['generation_failed_at'] = timezone.now().isoformat()
        item.save()

        broadcast_content_status(item.id, item.status, error=str(e))

        send_notification(
            user=item.created_by,
            notification_type='content_generation_failed',
            message=f'Content generation failed: {item.template.name}',
            related_object=item
        )

        raise  # Re-raise for Celery retry logic


def call_ai_workflow(workflow_id: str, input_data: dict, timeout: int) -> dict:
    """
    Stub for AI workflow integration (B34)

    TODO: Replace with actual B34 Generative Pipelines integration
    """
    import time
    import tempfile

    # Simulate AI processing
    time.sleep(2)

    # Create mock output file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as f:
        f.write(b'mock video content')
        return {'file_path': f.name}
```

**Timeout Configuration**:
- Use `soft_time_limit` from template.timeout_minutes (convert to seconds)
- Default: 1800 seconds (30 minutes)
- Handle `SoftTimeLimitExceeded` exception

---

### T012: WebSocket Consumer

**Goal**: Integrate B23 WebSocket for real-time status broadcast

**Implementation** (`consumers.py`):

```python
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async

class ContentGenerationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        await self.accept()

    async def disconnect(self, close_code):
        # Unsubscribe from all content item groups
        pass

    async def receive_json(self, content):
        action = content.get('action')

        if action == 'subscribe':
            content_item_id = content.get('contentItemId')
            group_name = f'content_item_{content_item_id}'
            await self.channel_layer.group_add(group_name, self.channel_name)

        elif action == 'unsubscribe':
            content_item_id = content.get('contentItemId')
            group_name = f'content_item_{content_item_id}'
            await self.channel_layer.group_discard(group_name, self.channel_name)

    async def content_status_update(self, event):
        """Send status update to WebSocket client"""
        await self.send_json({
            'id': event['content_item_id'],
            'status': event['status'],
            'progress_percent': event.get('progress_percent'),
            'error': event.get('error')
        })


# Helper function for broadcasting
def broadcast_content_status(content_item_id: int, status: str, progress_percent: int = None, error: str = None):
    """Broadcast status update to all subscribed clients"""
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync

    channel_layer = get_channel_layer()
    group_name = f'content_item_{content_item_id}'

    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            'type': 'content_status_update',
            'content_item_id': content_item_id,
            'status': status,
            'progress_percent': progress_percent,
            'error': error
        }
    )
```

**WebSocket URL** (`urls.py` in routing):
```python
from django.urls import path
from .consumers import ContentGenerationConsumer

websocket_urlpatterns = [
    path('ws/content-generation/', ContentGenerationConsumer.as_asgi()),
]
```

---

### T013: B22 File Storage Integration

**Goal**: Store generated files via B22 FileAsset, generate thumbnails

**Implementation**: Already covered in T011 (Celery task)

**Additional**: Configure B22 thumbnail generation:
```python
# In B22 FileAsset model or signal
def generate_thumbnail(file_path):
    """Generate thumbnail for video/image files"""
    # Use PIL or ffmpeg for thumbnail extraction
    pass
```

---

### T014: B17 Notification Triggers

**Goal**: Send notifications on completion/failure

**Implementation**: Already covered in T011 (Celery task)

**Notification Types**:
- `content_generation_completed` (success)
- `content_generation_failed` (error)

---

## Definition of Done

- [ ] All 8 subtasks (T007-T014) completed
- [ ] `POST /api/v1/content-generation/items/` creates ContentItem with status "queued"
- [ ] Duplicate detection returns 200 with warning (not 409 error)
- [ ] Celery task processes item: queued → generating → completed
- [ ] WebSocket broadcasts status updates to subscribed clients
- [ ] Polling endpoint `/items/{id}/status/` works as fallback
- [ ] Failed generation stores error_message, allows retry
- [ ] Output file stored in B22 with thumbnail
- [ ] B17 notification sent on completion/failure
- [ ] Integration tests pass

---

## Testing Verification

```bash
# Test ContentItem creation
curl -X POST http://localhost:8000/api/v1/content-generation/items/ \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"template": 1, "project": 5, "input_data": {"formation": "4-3-3"}}'

# Test status polling
curl http://localhost:8000/api/v1/content-generation/items/1/status/ \
  -H "Authorization: Bearer $TOKEN"

# Test retry
curl -X POST http://localhost:8000/api/v1/content-generation/items/1/retry/ \
  -H "Authorization: Bearer $TOKEN"

# Test WebSocket (JavaScript)
const ws = new WebSocket('ws://localhost:8000/ws/content-generation/');
ws.send(JSON.stringify({action: 'subscribe', contentItemId: 1}));
```

---

## Next: WP03 - Approval Workflow
